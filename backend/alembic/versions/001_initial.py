"""Initial schema with all tables and TimescaleDB hypertables

Revision ID: 001_initial
Revises: 
Create Date: 2026-02-18 03:05:00

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '001_initial'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Enable TimescaleDB extension
    op.execute("CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE")
    
    # Organizations table
    op.create_table(
        'organizations',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('slug', sa.String(length=255), nullable=False),
        sa.Column('plan_type', sa.String(length=50), nullable=True),
        sa.Column('settings', postgresql.JSONB(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('slug')
    )
    op.create_index('ix_organizations_name', 'organizations', ['name'])
    
    # Users table
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('hashed_password', sa.String(length=255), nullable=False),
        sa.Column('full_name', sa.String(length=255), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email')
    )
    op.create_index('ix_users_email', 'users', ['email'])
    
    # OrgMemberships table
    op.create_table(
        'org_memberships',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('org_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('role', sa.String(length=50), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['org_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('org_id', 'user_id', name='uix_org_user')
    )
    op.create_index('ix_org_memberships_org_id', 'org_memberships', ['org_id'])
    op.create_index('ix_org_memberships_user_id', 'org_memberships', ['user_id'])
    
    # Projects table
    op.create_table(
        'projects',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('org_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('vertical', sa.String(length=50), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['org_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_projects_org_id', 'projects', ['org_id'])
    op.create_index('ix_projects_vertical', 'projects', ['vertical'])
    
    # Sites table
    op.create_table(
        'sites',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('org_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('site_type', sa.String(length=100), nullable=True),
        sa.Column('vertical', sa.String(length=50), nullable=False),
        sa.Column('location', sa.String(length=500), nullable=True),
        sa.Column('site_metadata', postgresql.JSONB(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['org_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_sites_org_id', 'sites', ['org_id'])
    op.create_index('ix_sites_project_id', 'sites', ['project_id'])
    op.create_index('ix_sites_vertical', 'sites', ['vertical'])
    
    # Manufacturing data table (TimescaleDB hypertable)
    op.create_table(
        'manufacturing_data',
        sa.Column('time', sa.DateTime(timezone=True), nullable=False),
        sa.Column('site_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('machine_id', sa.String(length=100), nullable=False),
        sa.Column('uptime_minutes', sa.Float(), nullable=True),
        sa.Column('throughput_units', sa.Integer(), nullable=True),
        sa.Column('defect_count', sa.Integer(), nullable=True),
        sa.Column('cycle_time_seconds', sa.Float(), nullable=True),
        sa.Column('quality_score', sa.Float(), nullable=True),
        sa.Column('downtime_events', postgresql.JSONB(), nullable=True),
        sa.ForeignKeyConstraint(['site_id'], ['sites.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('time', 'site_id', 'machine_id')
    )
    op.create_index('ix_manufacturing_data_site_id', 'manufacturing_data', ['site_id'])
    op.create_index('ix_manufacturing_data_machine_id', 'manufacturing_data', ['machine_id'])
    op.execute("SELECT create_hypertable('manufacturing_data', 'time', if_not_exists => TRUE)")
    
    # Energy data table (TimescaleDB hypertable)
    op.create_table(
        'energy_data',
        sa.Column('time', sa.DateTime(timezone=True), nullable=False),
        sa.Column('site_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('meter_id', sa.String(length=100), nullable=False),
        sa.Column('kwh_consumed', sa.Float(), nullable=True),
        sa.Column('tariff_rate', sa.Float(), nullable=True),
        sa.Column('period_type', sa.String(length=20), nullable=True),
        sa.Column('solar_generation_kwh', sa.Float(), nullable=True),
        sa.Column('load_shedding_event', sa.Boolean(), nullable=True),
        sa.Column('power_factor', sa.Float(), nullable=True),
        sa.Column('demand_kw', sa.Float(), nullable=True),
        sa.ForeignKeyConstraint(['site_id'], ['sites.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('time', 'site_id', 'meter_id')
    )
    op.create_index('ix_energy_data_site_id', 'energy_data', ['site_id'])
    op.create_index('ix_energy_data_meter_id', 'energy_data', ['meter_id'])
    op.execute("SELECT create_hypertable('energy_data', 'time', if_not_exists => TRUE)")
    
    # Retail data table (TimescaleDB hypertable)
    op.create_table(
        'retail_data',
        sa.Column('time', sa.DateTime(timezone=True), nullable=False),
        sa.Column('site_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('store_id', sa.String(length=100), nullable=False),
        sa.Column('sku', sa.String(length=100), nullable=False),
        sa.Column('daily_sales_units', sa.Integer(), nullable=True),
        sa.Column('daily_revenue', sa.Float(), nullable=True),
        sa.Column('inventory_level', sa.Integer(), nullable=True),
        sa.Column('promo_active', sa.Boolean(), nullable=True),
        sa.Column('promo_discount_pct', sa.Float(), nullable=True),
        sa.Column('footfall_count', sa.Integer(), nullable=True),
        sa.Column('weather_condition', sa.String(length=50), nullable=True),
        sa.ForeignKeyConstraint(['site_id'], ['sites.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('time', 'site_id', 'store_id', 'sku')
    )
    op.create_index('ix_retail_data_site_id', 'retail_data', ['site_id'])
    op.create_index('ix_retail_data_store_id', 'retail_data', ['store_id'])
    op.create_index('ix_retail_data_sku', 'retail_data', ['sku'])
    op.execute("SELECT create_hypertable('retail_data', 'time', if_not_exists => TRUE)")
    
    # Forecasts table
    op.create_table(
        'forecasts',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('vertical', sa.String(length=50), nullable=False),
        sa.Column('model_type', sa.String(length=50), nullable=False),
        sa.Column('trained_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('metrics', postgresql.JSONB(), nullable=True),
        sa.Column('config', postgresql.JSONB(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_forecasts_project_id', 'forecasts', ['project_id'])
    
    # Forecast results table
    op.create_table(
        'forecast_results',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('forecast_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('timestamp', sa.DateTime(timezone=True), nullable=False),
        sa.Column('predicted_value', sa.Float(), nullable=False),
        sa.Column('lower_bound', sa.Float(), nullable=True),
        sa.Column('upper_bound', sa.Float(), nullable=True),
        sa.Column('actual_value', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['forecast_id'], ['forecasts.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_forecast_results_forecast_id', 'forecast_results', ['forecast_id'])
    op.create_index('ix_forecast_results_timestamp', 'forecast_results', ['timestamp'])
    
    # Simulations table
    op.create_table(
        'simulations',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('parameters', postgresql.JSONB(), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False),
        sa.Column('results', postgresql.JSONB(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_simulations_project_id', 'simulations', ['project_id'])
    op.create_index('ix_simulations_status', 'simulations', ['status'])
    
    # Recommendations table
    op.create_table(
        'recommendations',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('title', sa.String(length=500), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('category', sa.String(length=100), nullable=False),
        sa.Column('confidence_score', sa.Float(), nullable=False),
        sa.Column('priority', sa.String(length=50), nullable=False),
        sa.Column('actions', postgresql.JSONB(), nullable=False),
        sa.Column('vertical', sa.String(length=50), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='pending'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_recommendations_project_id', 'recommendations', ['project_id'])
    op.create_index('ix_recommendations_priority', 'recommendations', ['priority'])
    op.create_index('ix_recommendations_status', 'recommendations', ['status'])
    
    # Anomalies table
    op.create_table(
        'anomalies',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('site_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('timestamp', sa.DateTime(timezone=True), nullable=False),
        sa.Column('metric_name', sa.String(length=100), nullable=False),
        sa.Column('anomaly_score', sa.Float(), nullable=False),
        sa.Column('severity', sa.String(length=50), nullable=False),
        sa.Column('acknowledged', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['site_id'], ['sites.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_anomalies_site_id', 'anomalies', ['site_id'])
    op.create_index('ix_anomalies_timestamp', 'anomalies', ['timestamp'])
    op.create_index('ix_anomalies_severity', 'anomalies', ['severity'])
    
    # Data quality logs table
    op.create_table(
        'data_quality_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('site_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('timestamp', sa.DateTime(timezone=True), nullable=False),
        sa.Column('ingestion_batch_id', sa.String(length=100), nullable=True),
        sa.Column('quality_score', sa.Float(), nullable=False),
        sa.Column('errors', postgresql.JSONB(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['site_id'], ['sites.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_data_quality_logs_site_id', 'data_quality_logs', ['site_id'])
    op.create_index('ix_data_quality_logs_timestamp', 'data_quality_logs', ['timestamp'])
    
    # API keys table
    op.create_table(
        'api_keys',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('org_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('key_hash', sa.String(length=255), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('permissions', postgresql.JSONB(), nullable=True),
        sa.Column('last_used', sa.DateTime(timezone=True), nullable=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['org_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('key_hash')
    )
    op.create_index('ix_api_keys_org_id', 'api_keys', ['org_id'])


def downgrade() -> None:
    op.drop_table('api_keys')
    op.drop_table('data_quality_logs')
    op.drop_table('anomalies')
    op.drop_table('recommendations')
    op.drop_table('simulations')
    op.drop_table('forecast_results')
    op.drop_table('forecasts')
    op.drop_table('retail_data')
    op.drop_table('energy_data')
    op.drop_table('manufacturing_data')
    op.drop_table('sites')
    op.drop_table('projects')
    op.drop_table('org_memberships')
    op.drop_table('users')
    op.drop_table('organizations')
