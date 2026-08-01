import json
from typing import Any

from anthropic import Anthropic
from google import genai
from openai import OpenAI

from research_copilot.core.config import get_settings


class AIProviderRouter:
    def __init__(self) -> None:
        settings = get_settings()
        self.openai = OpenAI(api_key=settings.openai_api_key) if settings.openai_api_key else None
        self.anthropic = Anthropic(api_key=settings.anthropic_api_key) if settings.anthropic_api_key else None
        self.gemini = genai.Client(api_key=settings.google_api_key) if settings.google_api_key else None
        self.deepseek = OpenAI(
            api_key=settings.deepseek_api_key,
            base_url="https://api.deepseek.com",
        ) if settings.deepseek_api_key else None

    def generate_json(self, prompt: str, provider_order: list[str]) -> dict[str, Any]:
        for provider in provider_order:
            try:
                if provider == "openai" and self.openai:
                    response = self.openai.responses.create(
                        model="gpt-4.1-mini",
                        input=prompt,
                        text={"format": {"type": "json_object"}},
                    )
                    return json.loads(response.output_text)

                if provider == "anthropic" and self.anthropic:
                    response = self.anthropic.messages.create(
                        model="claude-3-7-sonnet-latest",
                        max_tokens=2000,
                        messages=[{"role": "user", "content": prompt}],
                    )
                    return json.loads(response.content[0].text)

                if provider == "gemini" and self.gemini:
                    response = self.gemini.models.generate_content(
                        model="gemini-2.0-flash",
                        contents=prompt,
                    )
                    return json.loads(response.text)

                if provider == "deepseek" and self.deepseek:
                    response = self.deepseek.responses.create(
                        model="deepseek-chat",
                        input=prompt,
                    )
                    return json.loads(response.output_text)
            except Exception:
                continue
        raise RuntimeError("No AI provider generated a valid JSON response.")
