"""
Database connection and session management.
"""
from sqlalchemy import create_engine, event
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from app.config import settings

# Create database engine.
# SQLite (used by the test suite) does not accept pool_size/max_overflow,
# so only pass those pooling options for non-SQLite backends.
_engine_kwargs = {"pool_pre_ping": True, "echo": settings.debug}
if not settings.database_url.startswith("sqlite"):
    _engine_kwargs.update(pool_size=10, max_overflow=20)

engine = create_engine(settings.database_url, **_engine_kwargs)

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
