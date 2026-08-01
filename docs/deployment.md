# Deployment Guide

## Environments

- **Local:** Docker Compose
- **Staging:** Kubernetes or ECS/Fargate with managed Postgres/Redis/Qdrant
- **Production:** Multi-AZ, autoscaling, CDN, WAF, observability stack

## Cloud Support

The architecture is portable across AWS, Azure, and GCP.

- **AWS**: ECS/EKS + RDS + ElastiCache + S3 + ALB + CloudFront
- **Azure**: AKS + Azure Database for PostgreSQL + Azure Cache for Redis + Blob Storage
- **GCP**: GKE + Cloud SQL + Memorystore + Cloud Storage

## Production Hardening Checklist

1. Enable TLS end-to-end.
2. Use managed secrets (AWS Secrets Manager / Azure Key Vault / GCP Secret Manager).
3. Enforce Clerk JWT verification and org-based RBAC.
4. Add rate limits via Redis and API gateway policies.
5. Configure backups + retention policies for Postgres and object storage.
6. Set error budget alerts, SLO dashboards, and incident runbooks.

## Scaling Strategy for 100k+ Users

- Stateless API pods with horizontal autoscaling.
- Async work queue for long AI jobs.
- Read replicas for analytics-heavy queries.
- Cached materialized views for dashboard aggregates.
- Model routing by cost/latency constraints.
