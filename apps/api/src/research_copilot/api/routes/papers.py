from datetime import datetime
from functools import lru_cache
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from research_copilot.api.deps import get_current_user_id
from research_copilot.db.models import Paper, Project, User
from research_copilot.db.session import get_db
from research_copilot.schemas import PaperSummaryRequest, PaperSummaryResponse
from research_copilot.services.pdf_processing import PdfProcessor
from research_copilot.services.rag import RAGService
from research_copilot.services.research_assistant import ResearchAssistantService
from research_copilot.services.storage import StorageService

router = APIRouter(prefix="/papers", tags=["papers"])

pdf_processor = PdfProcessor()
storage = StorageService()
assistant = ResearchAssistantService()


@lru_cache
def get_rag_service() -> RAGService | None:
    try:
        return RAGService()
    except Exception:
        return None


def _resolve_user(db: Session, user_id: str) -> User:
    user = db.execute(select(User).where(User.clerk_user_id == user_id)).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    return user


@router.post("/upload")
async def upload_paper(
    project_id: str = Form(...),
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
) -> dict:
    user = _resolve_user(db, user_id)
    project = db.execute(
        select(Project).where(Project.id == project_id, Project.owner_id == user.id)
    ).scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF uploads are allowed.")

    pdf_bytes = await file.read()
    extracted = pdf_processor.extract_text(pdf_bytes)
    storage_key = f"papers/{project_id}/{datetime.utcnow().date().isoformat()}-{uuid4()}.pdf"
    storage.upload_bytes(storage_key, pdf_bytes)

    paper = Paper(
        project_id=project.id,
        title=extracted.title_guess,
        storage_key=storage_key,
        paper_metadata={
            "filename": file.filename,
            "page_count": extracted.page_count,
            "extracted_chars": len(extracted.full_text),
        },
        abstract=extracted.full_text[:4000],
    )
    db.add(paper)
    db.commit()
    db.refresh(paper)

    rag_service = get_rag_service()
    indexed_chunks = rag_service.index_paper(paper.id, extracted.full_text) if rag_service else 0
    return {"paper_id": paper.id, "title": paper.title, "indexed_chunks": indexed_chunks}


@router.post("/summarize", response_model=PaperSummaryResponse)
def summarize_paper(
    payload: PaperSummaryRequest,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
) -> PaperSummaryResponse:
    user = _resolve_user(db, user_id)
    paper = db.execute(
        select(Paper)
        .join(Project, Paper.project_id == Project.id)
        .where(Paper.id == payload.paper_id, Project.owner_id == user.id)
    ).scalar_one_or_none()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")

    summary = assistant.summarize_paper(paper.abstract or "", payload.level)
    return summary
