from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from research_copilot.api.deps import get_current_user_id
from research_copilot.db.models import Paper, Project, User
from research_copilot.db.session import get_db
from research_copilot.schemas import (
    GapFinderRequest,
    GapFinderResponse,
    PaperScoreRequest,
    PaperScoreResponse,
    ReviewerSimulationRequest,
    ReviewerSimulationResponse,
)
from research_copilot.services.research_assistant import ResearchAssistantService

router = APIRouter(prefix="/intelligence", tags=["intelligence"])
assistant = ResearchAssistantService()


def _resolve_user(db: Session, user_id: str) -> User:
    user = db.execute(select(User).where(User.clerk_user_id == user_id)).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    return user


@router.post("/gap-finder", response_model=GapFinderResponse)
def gap_finder(
    payload: GapFinderRequest,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
) -> GapFinderResponse:
    user = _resolve_user(db, user_id)
    papers = db.execute(
        select(Paper)
        .join(Project, Paper.project_id == Project.id)
        .where(Paper.id.in_(payload.paper_ids), Project.owner_id == user.id)
    ).scalars().all()
    if len(papers) < 2:
        raise HTTPException(status_code=400, detail="At least 2 accessible papers are required")
    merged = "\n\n".join((paper.abstract or "") for paper in papers)
    return assistant.find_research_gaps(payload.research_topic, merged_context=merged)


@router.post("/reviewer-simulator", response_model=ReviewerSimulationResponse)
def reviewer_simulator(payload: ReviewerSimulationRequest) -> ReviewerSimulationResponse:
    return assistant.simulate_reviewer(payload.manuscript, payload.venue)


@router.post("/paper-score", response_model=PaperScoreResponse)
def paper_score(payload: PaperScoreRequest) -> PaperScoreResponse:
    return assistant.score_paper(payload.manuscript)
