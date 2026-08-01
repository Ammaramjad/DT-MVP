from datetime import datetime

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str = "ok"
    service: str


class ProjectCreate(BaseModel):
    name: str = Field(min_length=3, max_length=255)
    description: str | None = None
    tags: list[str] = Field(default_factory=list)


class ProjectOut(BaseModel):
    id: str
    name: str
    description: str | None
    tags: list[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PaperSummaryRequest(BaseModel):
    paper_id: str
    level: str = Field(default="standard", pattern="^(beginner|standard|professor)$")


class PaperSummaryResponse(BaseModel):
    tldr: str
    five_bullets: list[str]
    detailed_summary: str
    key_findings: list[str]
    limitations: list[str]
    future_work: list[str]


class GapFinderRequest(BaseModel):
    paper_ids: list[str] = Field(min_length=2)
    research_topic: str = Field(min_length=10)


class GapItem(BaseModel):
    title: str
    description: str
    category: str
    confidence_score: float
    commercial_potential_score: float
    patent_potential_score: float
    evidence: list[str]


class GapFinderResponse(BaseModel):
    topic: str
    gaps: list[GapItem]


class ReviewerSimulationRequest(BaseModel):
    manuscript: str = Field(min_length=300)
    venue: str = Field(default="Nature", min_length=2)


class ReviewerSimulationResponse(BaseModel):
    major_comments: list[str]
    minor_comments: list[str]
    novelty_review: str
    technical_review: str
    grammar_review: str
    publication_recommendation: str
    revision_plan: list[str]


class PaperScoreRequest(BaseModel):
    manuscript: str = Field(min_length=300)


class DimensionScore(BaseModel):
    name: str
    score: float
    explanation: str


class PaperScoreResponse(BaseModel):
    overall_score: float
    publication_chance_score: float
    conference_suitability: str
    journal_suitability: str
    dimensions: list[DimensionScore]
