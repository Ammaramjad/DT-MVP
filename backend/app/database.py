"""
Database connection and session management.
"""
from sqlalchemy import create_engine, event
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from app.config import settings

# Create database engine
engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    echo=settings.debug
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()


def get_db() -> Session:
    """
    Dependency for getting database session.
    Yields a database session and ensures it's closed after use.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Initialize database with all tables."""
    Base.metadata.create_all(bind=engine)


# Enable TimescaleDB extension on connection
@event.listens_for(engine, "connect")
def receive_connect(dbapi_conn, connection_record):
    """Enable TimescaleDB extension on new connections."""
    cursor = dbapi_conn.cursor()
    try:
        cursor.execute("CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;")
        dbapi_conn.commit()
    except Exception:
        # Extension might already exist or insufficient permissions
        pass
    finally:
        cursor.close()
