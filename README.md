# AI Digital Twin SaaS Platform

[![Python Version](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.129.0-009688.svg)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.x-61DAFB.svg)](https://reactjs.org/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

A multi-tenant AI-powered Digital Twin SaaS platform that provides predictive analytics, anomaly detection, and intelligent recommendations for Manufacturing, Energy, and Retail verticals.

## 🌟 Features

### Core Capabilities
- **Multi-Tenant Architecture**: Secure organization-based isolation with RBAC
- **Industry Verticals**: Pre-configured for Manufacturing, Energy, and Retail sectors
- **Time-Series Analytics**: Powered by TimescaleDB for efficient IoT data storage
- **Predictive Forecasting**: Prophet and ARIMA models for accurate predictions
- **Anomaly Detection**: Isolation Forest algorithm for real-time anomaly identification
- **What-If Simulations**: Scenario analysis and impact modeling
- **AI Recommendations**: Intelligent, context-aware optimization suggestions
- **KPI Dashboard**: Real-time computation of industry-specific metrics

### Technical Features
- RESTful API with automatic OpenAPI/Swagger documentation
- JWT-based authentication with refresh tokens
- Asynchronous task processing with Celery
- Redis caching and message broker
- Docker-based deployment
- Comprehensive test coverage (80%+)
- Structured logging and monitoring

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                         │
│                  TypeScript + Vite + TailwindCSS                 │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTP/REST
┌────────────────────────┴────────────────────────────────────────┐
│                    API Gateway (FastAPI)                         │
│                  JWT Auth | CORS | Rate Limiting                │
└─────┬───────────────────┬──────────────────┬────────────────────┘
      │                   │                  │
      ▼                   ▼                  ▼
┌──────────┐      ┌──────────────┐    ┌─────────────┐
│ PostgreSQL│      │  ML Service  │    │    Redis    │
│   +       │◄─────┤   (FastAPI)  │◄───┤  + Celery   │
│TimescaleDB│      │Prophet|ARIMA │    │   Workers   │
└──────────┘      └──────────────┘    └─────────────┘
      │
      └──► Hypertables: Manufacturing, Energy, Retail Data
```

### Service Components

| Service | Port | Purpose |
|---------|------|---------|
| **Frontend** | 3000 | React UI with responsive dashboard |
| **Backend API** | 8000 | FastAPI REST API with business logic |
| **ML Service** | 8001 | Machine learning inference service |
| **PostgreSQL** | 5432 | TimescaleDB for time-series data |
| **Redis** | 6379 | Cache and Celery message broker |
| **Celery Workers** | - | Background task processing |
| **Celery Beat** | - | Scheduled task executor |

## 🚀 Quick Start

### Prerequisites

- **Docker** and **Docker Compose** (recommended)
- OR: Python 3.11+, PostgreSQL 15+, Redis 7+, Node.js 18+

### Using Docker Compose (Recommended)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd DT-MVP
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env and update SECRET_KEY, database passwords, etc.
   ```

3. **Start all services**
   ```bash
   docker-compose up -d
   ```

4. **Run database migrations**
   ```bash
   docker-compose exec api alembic upgrade head
   ```

5. **Seed sample data (optional)**
   ```bash
   docker-compose exec api python scripts/seed_data.py
   ```

6. **Access the platform**
   - Frontend UI: http://localhost:3000
   - API Documentation: http://localhost:8000/docs
   - API Base URL: http://localhost:8000/api/v1

### Verify Installation

```bash
# Check all services are running
docker-compose ps

# Test API health
curl http://localhost:8000/health

# Test ML service
curl http://localhost:8001/health
```

## 💻 Local Development Setup

### Backend Development

1. **Setup Python environment**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   pip install -r requirements-dev.txt
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Update DATABASE_URL, REDIS_URL, etc.
   ```

3. **Run database migrations**
   ```bash
   alembic upgrade head
   ```

4. **Start development server**
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

5. **Run tests**
   ```bash
   pytest -v --cov=app --cov-report=term-missing
   ```

### Frontend Development

1. **Install dependencies**
   ```bash
   cd frontend
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Update REACT_APP_API_URL
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Run tests**
   ```bash
   npm test
   ```

5. **Build for production**
   ```bash
   npm run build
   ```

### ML Service Development

1. **Setup Python environment**
   ```bash
   cd ml-service
   python -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

2. **Start development server**
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
   ```

3. **Run tests**
   ```bash
   pytest -v
   ```

## 📊 Running Seed Data

The seed data generator creates a complete demo environment with:
- 3 organizations (Manufacturing Co, Energy Corp, Retail Group)
- Multiple users with different roles
- Sample projects and sites
- Historical time-series data for all verticals
- Pre-computed KPIs

```bash
# Using Docker
docker-compose exec api python scripts/seed_data.py

# Clear existing data and reseed
docker-compose exec api python scripts/seed_data.py --clear

# Local development
cd backend
python scripts/seed_data.py
```

**Demo Credentials:**
```
Email: admin@acme.com
Password: password123

Email: john@manufacturing.com
Password: password123

Email: sarah@energycorp.com
Password: password123
```

## 📚 API Documentation

### Interactive Documentation
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### API Base URL
```
Production: https://api.yourplatform.com/api/v1
Development: http://localhost:8000/api/v1
```

### Quick Example
```bash
# Register a new user
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123",
    "full_name": "John Doe",
    "organization_name": "My Company"
  }'

# Login and get token
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123"
  }'

# Use token for authenticated requests
curl -X GET http://localhost:8000/api/v1/organizations/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

For detailed API documentation, see [docs/API.md](docs/API.md)

## 🛠️ Tech Stack

### Backend
- **Framework**: FastAPI 0.129.0
- **Language**: Python 3.11+
- **Database**: PostgreSQL 15 + TimescaleDB
- **ORM**: SQLAlchemy 2.0
- **Migrations**: Alembic
- **Task Queue**: Celery + Redis
- **Authentication**: JWT (python-jose)
- **Testing**: Pytest + Coverage

### ML Service
- **Framework**: FastAPI
- **ML Libraries**: Prophet, scikit-learn, statsmodels
- **Data Processing**: Pandas, NumPy
- **Models**: Prophet (forecasting), ARIMA (time-series), Isolation Forest (anomaly detection)

### Frontend
- **Framework**: React 18.x
- **Language**: TypeScript
- **Build Tool**: Vite
- **Styling**: TailwindCSS
- **State Management**: React Context + Hooks
- **HTTP Client**: Axios

### Infrastructure
- **Containerization**: Docker + Docker Compose
- **Cache**: Redis 7
- **Message Broker**: Redis + Celery
- **Web Server**: Uvicorn (ASGI)
- **Reverse Proxy**: Nginx (production)

## 📁 Project Structure

```
DT-MVP/
├── backend/                    # FastAPI backend service
│   ├── app/
│   │   ├── api/v1/            # API endpoints
│   │   ├── core/              # Security, RBAC, exceptions
│   │   ├── models/            # SQLAlchemy models
│   │   ├── schemas/           # Pydantic schemas
│   │   ├── services/          # Business logic
│   │   │   └── verticals/     # Industry-specific services
│   │   ├── tasks/             # Celery tasks
│   │   ├── config.py          # Configuration
│   │   ├── database.py        # Database connection
│   │   └── main.py            # FastAPI app
│   ├── alembic/               # Database migrations
│   ├── scripts/               # Utility scripts
│   ├── tests/                 # Pytest test suite
│   └── requirements.txt       # Python dependencies
│
├── ml-service/                 # ML inference service
│   ├── app/
│   │   ├── api/               # ML API endpoints
│   │   ├── models/            # ML model implementations
│   │   ├── services/          # Training and inference
│   │   └── utils/             # Preprocessing, evaluation
│   └── tests/                 # ML service tests
│
├── frontend/                   # React frontend
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── contexts/          # React contexts
│   │   ├── pages/             # Page components
│   │   ├── services/          # API clients
│   │   ├── types/             # TypeScript types
│   │   └── utils/             # Utility functions
│   └── public/                # Static assets
│
├── docs/                       # Documentation
│   ├── ARCHITECTURE.md        # System architecture
│   ├── API.md                 # API documentation
│   ├── DATA_MODELS.md         # Database schemas
│   ├── DEPLOYMENT.md          # Deployment guide
│   ├── DEVELOPMENT.md         # Developer guide
│   └── VERTICALS.md           # Industry-specific docs
│
├── docker-compose.yml         # Docker orchestration
├── .env.example               # Environment template
└── README.md                  # This file
```

## 🔐 Environment Variables

Essential environment variables to configure:

| Variable | Description | Default |
|----------|-------------|---------|
| `SECRET_KEY` | JWT secret key (32+ chars) | - |
| `DATABASE_URL` | PostgreSQL connection string | - |
| `REDIS_URL` | Redis connection string | - |
| `ML_SERVICE_URL` | ML service endpoint | http://ml-service:8001 |
| `CORS_ORIGINS` | Allowed CORS origins | http://localhost:3000 |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | JWT expiration | 30 |

See [.env.example](.env.example) for complete list.

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

1. **Fork the repository** and create a feature branch
   ```bash
   git checkout -b feature/amazing-feature
   ```

2. **Follow coding standards**
   - Python: PEP 8, type hints, docstrings
   - TypeScript: ESLint configuration
   - Write tests for new features

3. **Commit your changes**
   ```bash
   git commit -m "feat: add amazing feature"
   ```
   Follow [Conventional Commits](https://www.conventionalcommits.org/)

4. **Run tests and linting**
   ```bash
   # Backend
   cd backend
   pytest
   black app/ tests/
   flake8 app/ tests/
   
   # Frontend
   cd frontend
   npm test
   npm run lint
   ```

5. **Push and create Pull Request**
   ```bash
   git push origin feature/amazing-feature
   ```

### Development Workflow
- Create issues for bugs and feature requests
- Use feature branches for development
- Ensure CI/CD pipeline passes
- Request code review from maintainers
- Update documentation as needed

See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for detailed guidelines.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Additional Resources

- [Architecture Documentation](docs/ARCHITECTURE.md) - System design and data flow
- [API Reference](docs/API.md) - Complete API endpoint documentation
- [Data Models](docs/DATA_MODELS.md) - Database schema and relationships
- [Deployment Guide](docs/DEPLOYMENT.md) - Production deployment instructions
- [Developer Guide](docs/DEVELOPMENT.md) - Development setup and best practices
- [Verticals Guide](docs/VERTICALS.md) - Industry-specific documentation

## 📞 Support

- **Documentation**: [docs/](docs/)
- **Issues**: GitHub Issues
- **Email**: support@yourplatform.com

## 🙏 Acknowledgments

- FastAPI for the excellent web framework
- Prophet team for time-series forecasting
- TimescaleDB for time-series optimization
- React and TypeScript communities

---

**Built with ❤️ for the Digital Twin revolution**
