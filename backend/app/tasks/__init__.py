"""
Celery application configuration.
"""
from celery import Celery
from app.config import settings

# Create Celery app
celery_app = Celery(
    "digital_twin",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
    include=[
        "app.tasks.ingestion_tasks",
        "app.tasks.ml_tasks",
        "app.tasks.notification_tasks"
    ]
)

# Configure Celery
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=30 * 60,  # 30 minutes
    task_soft_time_limit=25 * 60,  # 25 minutes
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=1000,
)

# Define periodic tasks
celery_app.conf.beat_schedule = {
    "retrain-anomaly-models-nightly": {
        "task": "app.tasks.ml_tasks.retrain_anomaly_models",
        "schedule": 86400.0,  # Once per day (in seconds)
    },
    "generate-recommendations-hourly": {
        "task": "app.tasks.ml_tasks.generate_recommendations_for_all_projects",
        "schedule": 3600.0,  # Once per hour
    },
}
