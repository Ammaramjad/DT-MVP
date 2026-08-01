# Deployment Guide

Production deployment guide for the AI Digital Twin SaaS Platform.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Configuration](#environment-configuration)
- [Docker Compose Production Setup](#docker-compose-production-setup)
- [Database Setup](#database-setup)
- [Reverse Proxy Configuration](#reverse-proxy-configuration)
- [SSL/TLS Configuration](#ssltls-configuration)
- [Monitoring and Logging](#monitoring-and-logging)
- [Backup Strategy](#backup-strategy)
- [Scaling Considerations](#scaling-considerations)
- [Security Checklist](#security-checklist)
- [Health Checks](#health-checks)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements

**Minimum (Development)**:
- 4 CPU cores
- 8 GB RAM
- 50 GB disk space
- Ubuntu 20.04+ or similar Linux distribution

**Recommended (Production)**:
- 8+ CPU cores
- 16+ GB RAM
- 200+ GB SSD storage
- Ubuntu 22.04 LTS

### Required Software

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version
```

### Firewall Configuration

```bash
# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw --force enable
sudo ufw status
```

## Environment Configuration

### Environment Variables Checklist

Create `.env` file in project root:

```bash
# Copy from example
cp .env.example .env

# Edit with your production values
nano .env
```

### Required Environment Variables

```bash
# ===== Application =====
APP_NAME="AI Digital Twin SaaS"
APP_ENV=production
DEBUG=false
API_V1_PREFIX=/api/v1
ML_V1_PREFIX=/ml/v1

# ===== Database =====
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=digital_twin_prod
POSTGRES_USER=dtuser_prod
POSTGRES_PASSWORD=<CHANGE_ME_STRONG_PASSWORD>
DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}

# ===== Redis =====
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=<CHANGE_ME_STRONG_PASSWORD>
REDIS_URL=redis://:${REDIS_PASSWORD}@${REDIS_HOST}:${REDIS_PORT}/0

# ===== Celery =====
CELERY_BROKER_URL=${REDIS_URL}
CELERY_RESULT_BACKEND=${REDIS_URL}

# ===== Security (CRITICAL - CHANGE THESE) =====
# Generate with: openssl rand -hex 32
SECRET_KEY=<GENERATE_RANDOM_32_CHAR_STRING>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# ===== CORS =====
# Add your domain(s)
CORS_ORIGINS=https://yourplatform.com,https://www.yourplatform.com

# ===== ML Service =====
ML_SERVICE_URL=http://ml-service:8001
ML_MODEL_PATH=/app/models

# ===== Kafka (if enabled) =====
KAFKA_BOOTSTRAP_SERVERS=kafka:9092
KAFKA_ENABLED=false

# ===== Monitoring =====
LOG_LEVEL=INFO
REQUEST_ID_HEADER=X-Request-ID

# ===== Rate Limiting =====
RATE_LIMIT_PER_MINUTE=100

# ===== TimescaleDB =====
TIMESCALEDB_RETENTION_DAYS=365

# ===== Frontend =====
REACT_APP_API_URL=https://api.yourplatform.com
REACT_APP_WS_URL=wss://api.yourplatform.com

# ===== Email (Optional) =====
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@yourplatform.com
SMTP_PASSWORD=<EMAIL_PASSWORD>
SMTP_FROM=noreply@yourplatform.com

# ===== Sentry (Optional) =====
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project
```

### Generate Secret Keys

```bash
# Generate SECRET_KEY
python3 -c "import secrets; print(secrets.token_urlsafe(32))"

# Or using openssl
openssl rand -hex 32

# Generate strong passwords
openssl rand -base64 24
```

## Docker Compose Production Setup

### Production docker-compose.yml

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: timescale/timescaledb:latest-pg15
    container_name: dt_postgres_prod
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    ports:
      - "127.0.0.1:5432:5432"  # Bind to localhost only
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - dt_network

  redis:
    image: redis:7-alpine
    container_name: dt_redis_prod
    restart: unless-stopped
    command: redis-server --requirepass ${REDIS_PASSWORD}
    ports:
      - "127.0.0.1:6379:6379"  # Bind to localhost only
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - dt_network

  api:
    build:
      context: ./backend
      dockerfile: Dockerfile
      args:
        - BUILD_ENV=production
    container_name: dt_api_prod
    restart: unless-stopped
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
    expose:
      - "8000"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - ML_SERVICE_URL=http://ml-service:8001
      - SECRET_KEY=${SECRET_KEY}
      - APP_ENV=production
      - DEBUG=false
      - CORS_ORIGINS=${CORS_ORIGINS}
    volumes:
      - ./logs:/app/logs
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - dt_network

  ml-service:
    build:
      context: ./ml-service
      dockerfile: Dockerfile
    container_name: dt_ml_service_prod
    restart: unless-stopped
    command: uvicorn app.main:app --host 0.0.0.0 --port 8001 --workers 2
    expose:
      - "8001"
    volumes:
      - ml_models:/app/models
      - ./logs:/app/logs
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - dt_network

  celery-worker:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: dt_celery_worker_prod
    restart: unless-stopped
    command: celery -A app.tasks.celery_app worker --loglevel=info --concurrency=4
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - ML_SERVICE_URL=http://ml-service:8001
    volumes:
      - ./logs:/app/logs
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - dt_network

  celery-beat:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: dt_celery_beat_prod
    restart: unless-stopped
    command: celery -A app.tasks.celery_app beat --loglevel=info
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
    volumes:
      - ./logs:/app/logs
    depends_on:
      redis:
        condition: service_healthy
    networks:
      - dt_network

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        - REACT_APP_API_URL=${REACT_APP_API_URL}
    container_name: dt_frontend_prod
    restart: unless-stopped
    expose:
      - "80"
    depends_on:
      - api
    networks:
      - dt_network

  nginx:
    image: nginx:alpine
    container_name: dt_nginx_prod
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - ./logs/nginx:/var/log/nginx
    depends_on:
      - api
      - frontend
    networks:
      - dt_network

networks:
  dt_network:
    driver: bridge

volumes:
  postgres_data:
  redis_data:
  ml_models:
```

### Deploy with Docker Compose

```bash
# Build and start services
docker-compose -f docker-compose.prod.yml up -d --build

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Check service status
docker-compose -f docker-compose.prod.yml ps

# Stop services
docker-compose -f docker-compose.prod.yml down

# Stop and remove volumes (DANGER - deletes data)
docker-compose -f docker-compose.prod.yml down -v
```

## Database Setup

### Run Migrations

```bash
# Run database migrations
docker-compose -f docker-compose.prod.yml exec api alembic upgrade head

# Verify migration
docker-compose -f docker-compose.prod.yml exec api alembic current

# View migration history
docker-compose -f docker-compose.prod.yml exec api alembic history
```

### Create TimescaleDB Hypertables

```bash
# Connect to database
docker-compose -f docker-compose.prod.yml exec postgres psql -U dtuser_prod -d digital_twin_prod

# Create hypertables (run in psql)
SELECT create_hypertable('manufacturing_data', 'time', if_not_exists => TRUE);
SELECT create_hypertable('energy_data', 'time', if_not_exists => TRUE);
SELECT create_hypertable('retail_data', 'time', if_not_exists => TRUE);

# Enable compression
ALTER TABLE manufacturing_data SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'site_id,machine_id',
  timescaledb.compress_orderby = 'time DESC'
);

SELECT add_compression_policy('manufacturing_data', INTERVAL '7 days');

# Exit psql
\q
```

### Database Connection Pooling

For production, use PgBouncer for connection pooling:

```yaml
# Add to docker-compose.prod.yml
  pgbouncer:
    image: pgbouncer/pgbouncer:latest
    container_name: dt_pgbouncer
    environment:
      - DATABASES_HOST=postgres
      - DATABASES_PORT=5432
      - DATABASES_USER=${POSTGRES_USER}
      - DATABASES_PASSWORD=${POSTGRES_PASSWORD}
      - DATABASES_DBNAME=${POSTGRES_DB}
      - POOL_MODE=transaction
      - MAX_CLIENT_CONN=1000
      - DEFAULT_POOL_SIZE=25
    ports:
      - "127.0.0.1:6432:6432"
    depends_on:
      - postgres
    networks:
      - dt_network
```

Update `DATABASE_URL` to use PgBouncer:
```
DATABASE_URL=postgresql://dtuser_prod:password@pgbouncer:6432/digital_twin_prod
```

## Reverse Proxy Configuration

### Nginx Configuration

Create `nginx/nginx.conf`:

```nginx
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 2048;
    use epoll;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;

    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 20M;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript
               application/json application/javascript application/xml+rss;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/m;
    limit_req_zone $binary_remote_addr zone=login_limit:10m rate=10r/m;

    # Upstream services
    upstream backend_api {
        server api:8000;
        keepalive 32;
    }

    upstream frontend_app {
        server frontend:80;
        keepalive 32;
    }

    # Redirect HTTP to HTTPS
    server {
        listen 80;
        server_name yourplatform.com www.yourplatform.com api.yourplatform.com;
        
        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        location / {
            return 301 https://$host$request_uri;
        }
    }

    # Frontend - Main website
    server {
        listen 443 ssl http2;
        server_name yourplatform.com www.yourplatform.com;

        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;
        ssl_prefer_server_ciphers on;

        # Security headers
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;

        location / {
            proxy_pass http://frontend_app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }

    # Backend API
    server {
        listen 443 ssl http2;
        server_name api.yourplatform.com;

        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;
        ssl_prefer_server_ciphers on;

        # Security headers
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
        add_header X-Frame-Options "DENY" always;
        add_header X-Content-Type-Options "nosniff" always;

        # Health check (no rate limit)
        location /health {
            proxy_pass http://backend_api/health;
            access_log off;
        }

        # Login endpoint (stricter rate limit)
        location /api/v1/auth/login {
            limit_req zone=login_limit burst=5 nodelay;
            proxy_pass http://backend_api/api/v1/auth/login;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # API endpoints
        location /api/ {
            limit_req zone=api_limit burst=20 nodelay;
            proxy_pass http://backend_api/api/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_set_header X-Request-ID $request_id;
            
            # Timeouts for long-running requests
            proxy_read_timeout 300s;
            proxy_connect_timeout 75s;
        }

        # API documentation
        location ~ ^/(docs|redoc|openapi.json) {
            proxy_pass http://backend_api$request_uri;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }
    }
}
```

## SSL/TLS Configuration

### Using Let's Encrypt (Certbot)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d yourplatform.com -d www.yourplatform.com -d api.yourplatform.com

# Test renewal
sudo certbot renew --dry-run

# Setup auto-renewal (cron)
sudo crontab -e
# Add line:
0 0 * * * certbot renew --quiet --post-hook "docker-compose -f /path/to/docker-compose.prod.yml restart nginx"
```

### Manual SSL Certificate

If using commercial SSL:

```bash
# Create SSL directory
mkdir -p nginx/ssl

# Copy your certificates
cp /path/to/fullchain.pem nginx/ssl/
cp /path/to/privkey.pem nginx/ssl/

# Set permissions
chmod 644 nginx/ssl/fullchain.pem
chmod 600 nginx/ssl/privkey.pem
```

## Monitoring and Logging

### Centralized Logging

Add logging driver to docker-compose.prod.yml:

```yaml
services:
  api:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

### Log Aggregation with ELK Stack (Optional)

Add Elasticsearch, Logstash, Kibana to `docker-compose.prod.yml`:

```yaml
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
    environment:
      - discovery.type=single-node
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    volumes:
      - es_data:/usr/share/elasticsearch/data
    networks:
      - dt_network

  kibana:
    image: docker.elastic.co/kibana/kibana:8.11.0
    ports:
      - "127.0.0.1:5601:5601"
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
    depends_on:
      - elasticsearch
    networks:
      - dt_network
```

### Application Monitoring with Prometheus

Create `prometheus.yml`:

```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'fastapi'
    static_configs:
      - targets: ['api:8000']
```

Add to docker-compose.prod.yml:

```yaml
  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    ports:
      - "127.0.0.1:9090:9090"
    networks:
      - dt_network

  grafana:
    image: grafana/grafana:latest
    ports:
      - "127.0.0.1:3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD}
    volumes:
      - grafana_data:/var/lib/grafana
    depends_on:
      - prometheus
    networks:
      - dt_network
```

## Backup Strategy

### Database Backups

Create backup script `scripts/backup.sh`:

```bash
#!/bin/bash
set -e

BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_$DATE.sql.gz"

# Create backup
docker-compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U $POSTGRES_USER $POSTGRES_DB | gzip > $BACKUP_FILE

# Keep only last 30 days
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete

echo "Backup completed: $BACKUP_FILE"
```

Make executable and schedule:

```bash
chmod +x scripts/backup.sh

# Add to crontab
crontab -e
# Daily backup at 2 AM
0 2 * * * /path/to/scripts/backup.sh >> /var/log/backup.log 2>&1
```

### Volume Backups

```bash
# Backup Docker volumes
docker run --rm \
  -v dt_postgres_data:/source:ro \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/postgres_volume_$(date +%Y%m%d).tar.gz -C /source .
```

### Restore from Backup

```bash
# Restore database
gunzip -c backup_20240115.sql.gz | \
  docker-compose -f docker-compose.prod.yml exec -T postgres \
  psql -U $POSTGRES_USER $POSTGRES_DB
```

## Scaling Considerations

### Horizontal Scaling

**API Service**:
```bash
# Scale API containers
docker-compose -f docker-compose.prod.yml up -d --scale api=4
```

**Celery Workers**:
```bash
# Scale workers
docker-compose -f docker-compose.prod.yml up -d --scale celery-worker=8
```

### Load Balancer Configuration

For multiple API instances, update nginx upstream:

```nginx
upstream backend_api {
    least_conn;  # Load balancing algorithm
    server api_1:8000;
    server api_2:8000;
    server api_3:8000;
    server api_4:8000;
    keepalive 32;
}
```

### Database Read Replicas

For high read traffic, setup PostgreSQL streaming replication and direct read queries to replicas.

## Security Checklist

### Pre-Deployment Security

- [ ] Change `SECRET_KEY` to strong random value
- [ ] Update `POSTGRES_PASSWORD` and `REDIS_PASSWORD`
- [ ] Set `DEBUG=false` in production
- [ ] Configure `CORS_ORIGINS` to allowed domains only
- [ ] Enable firewall (ufw) and allow only necessary ports
- [ ] Setup SSL/TLS certificates
- [ ] Review and restrict database access
- [ ] Enable Redis password authentication
- [ ] Configure rate limiting in Nginx
- [ ] Setup fail2ban for SSH protection
- [ ] Regular security updates: `apt update && apt upgrade`

### Post-Deployment Security

- [ ] Monitor logs for suspicious activity
- [ ] Setup intrusion detection (OSSEC, Wazuh)
- [ ] Enable database audit logging
- [ ] Implement backup verification
- [ ] Conduct security audit
- [ ] Setup vulnerability scanning
- [ ] Enable 2FA for admin accounts
- [ ] Regular dependency updates

### Network Security

```bash
# Block all except whitelisted IPs for database
sudo ufw deny 5432/tcp
sudo ufw allow from TRUSTED_IP to any port 5432

# Block Redis from external access
sudo ufw deny 6379/tcp
```

## Health Checks

### Application Health Endpoint

```bash
# Check API health
curl https://api.yourplatform.com/health

# Expected response
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "services": {
    "database": "connected",
    "redis": "connected",
    "ml_service": "healthy"
  }
}
```

### Monitoring Script

Create `scripts/healthcheck.sh`:

```bash
#!/bin/bash

SERVICES=("api" "ml-service" "postgres" "redis")

for service in "${SERVICES[@]}"; do
    if docker-compose -f docker-compose.prod.yml ps $service | grep -q "Up"; then
        echo "✓ $service is running"
    else
        echo "✗ $service is down"
        # Send alert (email, Slack, etc.)
    fi
done
```

## Troubleshooting

### Common Issues

**Issue**: Database connection refused
```bash
# Check if PostgreSQL is running
docker-compose -f docker-compose.prod.yml ps postgres

# View logs
docker-compose -f docker-compose.prod.yml logs postgres

# Restart service
docker-compose -f docker-compose.prod.yml restart postgres
```

**Issue**: High memory usage
```bash
# Check container resource usage
docker stats

# Limit container memory
docker-compose.prod.yml:
  api:
    deploy:
      resources:
        limits:
          memory: 2G
```

**Issue**: Slow API responses
```bash
# Check database query performance
docker-compose -f docker-compose.prod.yml exec postgres psql -U dtuser_prod -d digital_twin_prod
# Run in psql:
SELECT * FROM pg_stat_statements ORDER BY total_exec_time DESC LIMIT 10;

# Add missing indexes if needed
```

**Issue**: SSL certificate expired
```bash
# Renew certificate
sudo certbot renew

# Restart Nginx
docker-compose -f docker-compose.prod.yml restart nginx
```

### Debug Mode (Temporary)

```bash
# Enable debug logging
docker-compose -f docker-compose.prod.yml exec api \
  sh -c 'export LOG_LEVEL=DEBUG && uvicorn app.main:app --reload'
```

### Performance Tuning

```bash
# Increase PostgreSQL connections
docker-compose -f docker-compose.prod.yml exec postgres psql -U dtuser_prod
ALTER SYSTEM SET max_connections = 200;
SELECT pg_reload_conf();

# Tune shared buffers
ALTER SYSTEM SET shared_buffers = '2GB';
```

## Maintenance

### Regular Maintenance Tasks

**Daily**:
- Check application logs for errors
- Verify backups completed successfully
- Monitor disk space usage

**Weekly**:
- Review security logs
- Update Docker images
- Check SSL certificate expiration

**Monthly**:
- Apply security patches
- Review and optimize database
- Test disaster recovery

### Updating Application

```bash
# Pull latest code
git pull origin main

# Rebuild containers
docker-compose -f docker-compose.prod.yml build

# Run migrations
docker-compose -f docker-compose.prod.yml exec api alembic upgrade head

# Restart services (zero-downtime with multiple instances)
docker-compose -f docker-compose.prod.yml up -d --no-deps --build api
```

## See Also

- [Architecture Documentation](ARCHITECTURE.md)
- [Development Guide](DEVELOPMENT.md)
- [Data Models](DATA_MODELS.md)
- [API Documentation](API.md)
