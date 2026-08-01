from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from research_copilot.api.deps import get_current_user_id
from research_copilot.db.models import Paper, Project, Subscription, User, UserRole
from research_copilot.db.session import get_db

router = APIRouter(prefix="/admin", tags=["admin"])


def _require_admin(db: Session, user_id: str) -> User:
    user = db.execute(select(User).where(User.clerk_user_id == user_id)).scalar_one_or_none()
    if not user or user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


@router.get("/overview")
def admin_overview(
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
) -> dict:
    _require_admin(db, user_id)
    total_users = db.execute(select(func.count(User.id))).scalar_one()
    total_projects = db.execute(select(func.count(Project.id))).scalar_one()
    total_papers = db.execute(select(func.count(Paper.id))).scalar_one()
    active_subscriptions = db.execute(
        select(func.count(Subscription.id)).where(Subscription.status == "active")
    ).scalar_one()
    monthly_revenue = db.execute(
        select(func.coalesce(func.sum(Subscription.unit_price_usd * Subscription.seats), 0))
        .where(Subscription.status == "active")
    ).scalar_one()
    return {
        "total_users": int(total_users),
        "total_projects": int(total_projects),
        "total_papers": int(total_papers),
        "active_subscriptions": int(active_subscriptions),
        "estimated_mrr_usd": float(monthly_revenue),
    }
