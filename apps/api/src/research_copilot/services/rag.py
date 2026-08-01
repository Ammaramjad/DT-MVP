from uuid import uuid4

from openai import OpenAI
from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    FieldCondition,
    Filter,
    MatchAny,
    PointStruct,
    VectorParams,
)

from research_copilot.core.config import get_settings


class RAGService:
    def __init__(self) -> None:
        settings = get_settings()
        self.collection = settings.qdrant_collection
        self.qdrant = QdrantClient(url=settings.qdrant_url)
        self.openai = OpenAI(api_key=settings.openai_api_key) if settings.openai_api_key else None
        self._ensure_collection()

    def _ensure_collection(self) -> None:
        collections = [col.name for col in self.qdrant.get_collections().collections]
        if self.collection not in collections:
            self.qdrant.create_collection(
                collection_name=self.collection,
                vectors_config=VectorParams(size=1536, distance=Distance.COSINE),
            )

    @staticmethod
    def _chunk(text: str, chunk_size: int = 1200, overlap: int = 200) -> list[str]:
        chunks: list[str] = []
        start = 0
        while start < len(text):
            end = min(start + chunk_size, len(text))
            chunks.append(text[start:end])
            start += max(1, chunk_size - overlap)
        return [chunk.strip() for chunk in chunks if chunk.strip()]

    def index_paper(self, paper_id: str, full_text: str) -> int:
        if not self.openai:
            return 0
        chunks = self._chunk(full_text)
        vectors = self.openai.embeddings.create(model="text-embedding-3-small", input=chunks)
        points = [
            PointStruct(
                id=str(uuid4()),
                vector=item.embedding,
                payload={"paper_id": paper_id, "chunk": chunks[idx]},
            )
            for idx, item in enumerate(vectors.data)
        ]
        self.qdrant.upsert(collection_name=self.collection, points=points)
        return len(points)

    def retrieve(self, query: str, paper_ids: list[str], limit: int = 8) -> list[str]:
        if not self.openai:
            return []
        vector = self.openai.embeddings.create(model="text-embedding-3-small", input=[query]).data[0].embedding
        filter_payload = Filter(
            must=[FieldCondition(key="paper_id", match=MatchAny(any=paper_ids))]
        )
        results = self.qdrant.search(
            collection_name=self.collection,
            query_vector=vector,
            query_filter=filter_payload,
            limit=limit,
        )
        return [item.payload["chunk"] for item in results]
