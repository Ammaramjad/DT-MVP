from research_copilot.schemas import (
    GapFinderResponse,
    PaperScoreResponse,
    PaperSummaryResponse,
    ReviewerSimulationResponse,
)
from research_copilot.services.ai import AIProviderRouter


class ResearchAssistantService:
    def __init__(self) -> None:
        self.ai = AIProviderRouter()

    def summarize_paper(self, paper_text: str, level: str) -> PaperSummaryResponse:
        prompt = f"""
You are an expert research analyst.
Summarize the paper text below as strict JSON with keys:
tldr, five_bullets, detailed_summary, key_findings, limitations, future_work.
Use level "{level}".
Paper text:
{paper_text[:30000]}
"""
        result = self.ai.generate_json(prompt, provider_order=["openai", "anthropic", "gemini", "deepseek"])
        return PaperSummaryResponse(**result)

    def find_research_gaps(self, topic: str, merged_context: str) -> GapFinderResponse:
        prompt = f"""
Identify high-quality research gaps for this topic: {topic}.
Return strict JSON:
{{
  "topic": "...",
  "gaps": [
    {{
      "title": "...",
      "description": "...",
      "category": "research_gap|conflict|dataset|method|future|commercial|patent",
      "confidence_score": 0-100,
      "commercial_potential_score": 0-100,
      "patent_potential_score": 0-100,
      "evidence": ["..."]
    }}
  ]
}}
Context:
{merged_context[:45000]}
"""
        result = self.ai.generate_json(prompt, provider_order=["anthropic", "openai", "gemini", "deepseek"])
        return GapFinderResponse(**result)

    def simulate_reviewer(self, manuscript: str, venue: str) -> ReviewerSimulationResponse:
        prompt = f"""
You are simulating a {venue} reviewer.
Return strict JSON with keys:
major_comments, minor_comments, novelty_review, technical_review, grammar_review,
publication_recommendation, revision_plan.
Manuscript:
{manuscript[:35000]}
"""
        result = self.ai.generate_json(prompt, provider_order=["anthropic", "openai", "gemini", "deepseek"])
        return ReviewerSimulationResponse(**result)

    def score_paper(self, manuscript: str) -> PaperScoreResponse:
        prompt = f"""
Score this manuscript and return strict JSON:
{{
  "overall_score": 0-100,
  "publication_chance_score": 0-100,
  "conference_suitability": "...",
  "journal_suitability": "...",
  "dimensions": [
    {{"name": "Novelty", "score": 0-100, "explanation": "..."}},
    {{"name": "Technical Quality", "score": 0-100, "explanation": "..."}},
    {{"name": "Writing", "score": 0-100, "explanation": "..."}},
    {{"name": "Methods", "score": 0-100, "explanation": "..."}},
    {{"name": "Reproducibility", "score": 0-100, "explanation": "..."}}
  ]
}}
Manuscript:
{manuscript[:35000]}
"""
        result = self.ai.generate_json(prompt, provider_order=["openai", "anthropic", "gemini", "deepseek"])
        return PaperScoreResponse(**result)
