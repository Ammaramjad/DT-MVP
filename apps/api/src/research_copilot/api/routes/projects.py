from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from research_copilot.api.deps import get_current_user_id
from research_copilot.db.models import Project, User
from research_copilot.db.session import get_db
from research_copilot.schemas import ProjectCreate, ProjectOut

router = APIRouter(prefix="/projects", tags=["projects"])


def _ensure_user(db: Session, user_id: str) -> User:
    user = db.execute(select(User).where(User.clerk_user_id == user_id)).scalar_one_or_none()
    if user:
        return user

    synthetic_email = f"{user_id}@researchcopilot.local"
    user = User(clerk_user_id=user_id, email=synthetic_email, full_name="Research User")
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("", response_model=ProjectOut)
def create_project(
    payload: ProjectCreate,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
) -> ProjectOut:
    user = _ensure_user(db, user_id)
    project = Project(
        owner_id=user.id,
        name=payload.name,
        description=payload.description,
        tags=payload.tags,
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return ProjectOut.model_validate(project)


@router.get("", response_model=list[ProjectOut])
def list_projects(
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
) -> list[ProjectOut]:
    user = _ensure_user(db, user_id)
    projects = db.execute(
        select(Project).where(Project.owner_id == user.id).order_by(Project.created_at.desc())
    ).scalars()
    return [ProjectOut.model_validate(project) for project in projects]


@router.get("/{project_id}", response_model=ProjectOut)
def get_project(
    project_id: str,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
) -> ProjectOut:
    user = _ensure_user(db, user_id)
    project = db.execute(
        select(Project).where(Project.id == project_id, Project.owner_id == user.id)
    ).scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return ProjectOut.model_validate(project)
