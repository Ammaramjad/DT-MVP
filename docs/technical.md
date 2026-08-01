# Technical Documentation

## AI Accuracy Strategy

- **Grounding-first generation**: whenever possible, generate from retrieved passages.
- **Structured JSON contracts**: prompts enforce typed outputs to reduce hallucination.
- **Provider fallback chain**: OpenAI/Anthropic/Gemini/DeepSeek routing prevents outages.
- **Post-generation validation**: schema parsing rejects malformed responses.

## Prompt Engineering Guidelines

1. Define role and objective clearly.
2. Specify strict output JSON schema.
3. Bound context length and include source passages.
4. Request uncertainty reporting (confidence scores).
5. Add domain-specific rubric (novelty, methods, reproducibility).

## Vector Search Guidelines

- Embedding model: `text-embedding-3-small`
- Chunk size: ~1200 chars with 200 overlap
- Re-rank with metadata signals (project relevance, recency)
- Use hybrid retrieval (semantic + keyword) in later phases

## Performance Strategy

- Cache expensive outputs in Redis
- Queue long AI jobs asynchronously
- Stream response tokens to improve perceived latency
- Batch embedding requests for throughput

## Security Strategy

- Clerk JWT verification for all authenticated endpoints
- Rate limiting middleware backed by Redis
- Principle-of-least-privilege IAM for object storage
- Centralized audit logs for privileged actions
- Encryption in transit and at rest
