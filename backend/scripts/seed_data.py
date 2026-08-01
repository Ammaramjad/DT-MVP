#!/usr/bin/env python3
"""
Comprehensive seed data generator for AI Digital Twin SaaS Platform.

Usage:
    python scripts/seed_data.py [--clear]
    
Options:
    --clear    Clear all existing data before seeding
"""
import sys
import os
import argparse
import random
from datetime import datetime, timedelta
from typing import List, Dict, Any
import logging

# Add parent directory to path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy.orm import Session
import pytz

from app.database import SessionLocal, engine
from app.models import (
    Organization, PlanType,
    User,
    Project, VerticalType,
    Site,
    ManufacturingData,
    EnergyData, PeriodType,
    RetailData,
    OrgMembership, OrgRole,
)
from app.core.security import get_password_hash

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Timezone
UTC = pytz.UTC


class SeedDataGenerator:
    """Main seed data generator class."""
    
    def __init__(self, db: Session, clear_existing: bool = False):
        self.db = db
        self.clear_existing = clear_existing
        self.organizations: List[Organization] = []
        self.users: Dict[str, List[User]] = {}
        self.projects: Dict[str, List[Project]] = {}
        self.sites: Dict[str, List[Site]] = {}
        
    def run(self):
        """Execute the complete seed data generation process."""
        try:
            if self.clear_existing:
                logger.info("Clearing existing data...")
                self._clear_data()
                
            logger.info("Starting seed data generation...")
            
            # Core entities
            self._create_organizations()
            self._create_users()
            self._create_projects()
            self._create_sites()
            
            # Time-series data
            self._generate_manufacturing_data()
            self._generate_energy_data()
            self._generate_retail_data()
            
            logger.info("✓ Seed data generation completed successfully!")
            self._print_summary()
            
        except Exception as e:
            logger.error(f"Error during seed data generation: {e}")
            self.db.rollback()
            raise
            
    def _clear_data(self):
        """Clear all existing data from database."""
        try:
            # Delete in proper order to respect foreign keys
            self.db.execute(ManufacturingData.__table__.delete())
            self.db.execute(EnergyData.__table__.delete())
            self.db.execute(RetailData.__table__.delete())
            self.db.execute(Site.__table__.delete())
            self.db.execute(Project.__table__.delete())
            self.db.execute(OrgMembership.__table__.delete())
            self.db.execute(User.__table__.delete())
            self.db.execute(Organization.__table__.delete())
            self.db.commit()
            logger.info("✓ Existing data cleared")
        except Exception as e:
            logger.error(f"Error clearing data: {e}")
            self.db.rollback()
            raise
            
    def _create_organizations(self):
        """Create sample organizations."""
        logger.info("Creating organizations...")
        
        org_configs = [
            {
                "name": "Acme Manufacturing",
                "slug": "acme-manufacturing",
                "plan_type": PlanType.PROFESSIONAL,
                "settings": {"industry": "manufacturing", "size": "large"}
            },
            {
                "name": "TechCorp Industries",
                "slug": "techcorp-industries",
                "plan_type": PlanType.ENTERPRISE,
                "settings": {"industry": "multi-sector", "size": "enterprise"}
            }
        ]
        
        for config in org_configs:
            org = Organization(**config)
            self.db.add(org)
            self.organizations.append(org)
            
        self.db.commit()
        logger.info(f"✓ Created {len(self.organizations)} organizations")
        
    def _create_users(self):
        """Create users for each organization with different roles."""
        logger.info("Creating users...")
        
        # User templates with realistic names
        user_templates = [
            {"name": "Admin User", "role": OrgRole.ADMIN},
            {"name": "Sarah Johnson", "role": OrgRole.MEMBER},
            {"name": "Mike Chen", "role": OrgRole.MEMBER},
            {"name": "Emma Davis", "role": OrgRole.VIEWER},
            {"name": "Alex Rodriguez", "role": OrgRole.VIEWER},
        ]
        
        hashed_password = get_password_hash("password123")
        
        for org in self.organizations:
            org_users = []
            
            for i, template in enumerate(user_templates):
                # Generate email from name and org slug
                email_name = template["name"].lower().replace(" ", ".")
                email = f"{email_name}@{org.slug}.com"
                
                user = User(
                    email=email,
                    full_name=template["name"],
                    hashed_password=hashed_password,
                    is_active=True
                )
                self.db.add(user)
                self.db.flush()  # Get user ID
                
                # Create membership
                membership = OrgMembership(
                    user_id=user.id,
                    org_id=org.id,
                    role=template["role"]
                )
                self.db.add(membership)
                org_users.append(user)
                
            self.users[org.slug] = org_users
            
        self.db.commit()
        total_users = sum(len(users) for users in self.users.values())
        logger.info(f"✓ Created {total_users} users")
        
    def _create_projects(self):
        """Create projects for each organization."""
        logger.info("Creating projects...")
        
        project_configs = [
            {
                "vertical": VerticalType.MANUFACTURING,
                "name": "Manufacturing Operations",
                "description": "Digital twin for manufacturing facilities and production lines"
            },
            {
                "vertical": VerticalType.ENERGY,
                "name": "Energy Management",
                "description": "Smart energy monitoring and optimization"
            },
            {
                "vertical": VerticalType.RETAIL,
                "name": "Retail Analytics",
                "description": "Store operations and inventory optimization"
            }
        ]
        
        for org in self.organizations:
            org_projects = []
            
            for config in project_configs:
                project = Project(
                    org_id=org.id,
                    name=config["name"],
                    description=config["description"],
                    vertical=config["vertical"]
                )
                self.db.add(project)
                org_projects.append(project)
                
            self.projects[org.slug] = org_projects
            
        self.db.commit()
        total_projects = sum(len(projects) for projects in self.projects.values())
        logger.info(f"✓ Created {total_projects} projects")
        
    def _create_sites(self):
        """Create sites for each project."""
        logger.info("Creating sites...")
        
        site_configs = {
            VerticalType.MANUFACTURING: [
                {
                    "name": "Factory-A",
                    "site_type": "Production Facility",
                    "location": "Detroit, MI",
                    "metadata": {"capacity": 10000, "machines": 5}
                },
                {
                    "name": "Factory-B",
                    "site_type": "Production Facility",
                    "location": "Chicago, IL",
                    "metadata": {"capacity": 8000, "machines": 4}
                }
            ],
            VerticalType.ENERGY: [
                {
                    "name": "Building-North",
                    "site_type": "Commercial Building",
                    "location": "Seattle, WA",
                    "metadata": {"floor_area_sqft": 50000, "solar_capacity_kw": 100}
                },
                {
                    "name": "Building-South",
                    "site_type": "Commercial Building",
                    "location": "Portland, OR",
                    "metadata": {"floor_area_sqft": 75000, "solar_capacity_kw": 150}
                }
            ],
            VerticalType.RETAIL: [
                {
                    "name": "Store-1",
                    "site_type": "Retail Store",
                    "location": "New York, NY",
                    "metadata": {"store_size_sqft": 5000, "sku_count": 500}
                },
                {
                    "name": "Store-2",
                    "site_type": "Retail Store",
                    "location": "Boston, MA",
                    "metadata": {"store_size_sqft": 6000, "sku_count": 600}
                }
            ]
        }
        
        for org in self.organizations:
            org_sites = []
            
            for project in self.projects[org.slug]:
                configs = site_configs[project.vertical]
                
                for config in configs:
                    site = Site(
                        org_id=org.id,
                        project_id=project.id,
                        name=config["name"],
                        site_type=config["site_type"],
                        vertical=project.vertical,
                        location=config["location"],
                        site_metadata=config["metadata"]
                    )
                    self.db.add(site)
                    org_sites.append(site)
                    
            self.sites[org.slug] = org_sites
            
        self.db.commit()
        total_sites = sum(len(sites) for sites in self.sites.values())
        logger.info(f"✓ Created {total_sites} sites")
        
    def _generate_manufacturing_data(self):
        """Generate 90 days of hourly manufacturing data."""
        logger.info("Generating manufacturing data (this may take a while)...")
        
        end_time = datetime.now(UTC)
        start_time = end_time - timedelta(days=90)
        
        for org in self.organizations:
            manufacturing_sites = [
                s for s in self.sites[org.slug]
                if s.vertical == VerticalType.MANUFACTURING
            ]
            
            for site in manufacturing_sites:
                logger.info(f"  Generating data for {site.name}...")
                batch = []
                machine_count = site.site_metadata.get("machines", 3)
                
                current_time = start_time
                while current_time <= end_time:
                    # Weekly seasonality - lower production on weekends
                    is_weekend = current_time.weekday() >= 5
                    base_uptime = 45 if is_weekend else 55
                    base_throughput = 700 if is_weekend else 1000
                    
                    for machine_idx in range(machine_count):
                        machine_id = f"MACHINE-{machine_idx + 1:02d}"
                        
                        # Random variations
                        uptime_var = random.randint(-5, 5)
                        throughput_var = random.randint(-100, 100)
                        
                        uptime = max(0, min(60, base_uptime + uptime_var))
                        throughput = max(0, base_throughput + throughput_var)
                        
                        # Defect rate 1-5%
                        defect_rate = random.uniform(0.01, 0.05)
                        defect_count = int(throughput * defect_rate)
                        
                        # Cycle time (seconds per unit)
                        base_cycle_time = 3.6  # 1000 units/hour = 3.6 sec/unit
                        cycle_time = base_cycle_time * random.uniform(0.9, 1.1)
                        
                        # Quality score
                        quality_score = random.uniform(0.88, 0.98)
                        
                        # Occasional downtime events (5% chance)
                        downtime_events = []
                        if random.random() < 0.05:
                            downtime_events = [
                                {
                                    "reason": random.choice([
                                        "scheduled_maintenance",
                                        "material_shortage",
                                        "equipment_failure",
                                        "quality_check"
                                    ]),
                                    "duration_minutes": random.randint(10, 30)
                                }
                            ]
                        
                        # Occasional anomalies (2% chance)
                        if random.random() < 0.02:
                            throughput = int(throughput * random.uniform(0.3, 0.7))
                            quality_score = random.uniform(0.5, 0.7)
                            defect_count = int(throughput * random.uniform(0.1, 0.2))
                        
                        data_point = ManufacturingData(
                            time=current_time,
                            site_id=site.id,
                            machine_id=machine_id,
                            uptime_minutes=uptime,
                            throughput_units=throughput,
                            defect_count=defect_count,
                            cycle_time_seconds=cycle_time,
                            quality_score=quality_score,
                            downtime_events=downtime_events
                        )
                        batch.append(data_point)
                        
                        # Bulk insert every 1000 records
                        if len(batch) >= 1000:
                            self.db.bulk_save_objects(batch)
                            self.db.commit()
                            batch = []
                    
                    current_time += timedelta(hours=1)
                
                # Insert remaining records
                if batch:
                    self.db.bulk_save_objects(batch)
                    self.db.commit()
                    
        logger.info("✓ Manufacturing data generated")
        
    def _generate_energy_data(self):
        """Generate 90 days of 15-minute energy readings."""
        logger.info("Generating energy data (this may take a while)...")
        
        end_time = datetime.now(UTC)
        start_time = end_time - timedelta(days=90)
        
        for org in self.organizations:
            energy_sites = [
                s for s in self.sites[org.slug]
                if s.vertical == VerticalType.ENERGY
            ]
            
            for site in energy_sites:
                logger.info(f"  Generating data for {site.name}...")
                batch = []
                meter_id = f"METER-{site.name}"
                solar_capacity = site.site_metadata.get("solar_capacity_kw", 100)
                
                current_time = start_time
                while current_time <= end_time:
                    hour = current_time.hour
                    is_weekend = current_time.weekday() >= 5
                    
                    # Base consumption patterns
                    if 6 <= hour < 9 or 17 <= hour < 21:  # Peak hours
                        base_consumption = 80
                        period_type = PeriodType.PEAK
                        tariff_rate = 0.25
                    elif 21 <= hour or hour < 6:  # Off-peak
                        base_consumption = 30
                        period_type = PeriodType.OFF_PEAK
                        tariff_rate = 0.10
                    else:  # Standard
                        base_consumption = 50
                        period_type = PeriodType.STANDARD
                        tariff_rate = 0.15
                    
                    # Weekend reduction
                    if is_weekend:
                        base_consumption *= 0.7
                    
                    # 15-minute consumption (kwh)
                    kwh_consumed = base_consumption / 4 * random.uniform(0.85, 1.15)
                    
                    # Solar generation (only during daylight)
                    solar_generation = 0.0
                    if 6 <= hour <= 18:
                        # Peak solar at noon
                        solar_factor = 1 - abs(hour - 12) / 6.5
                        solar_generation = solar_capacity * solar_factor * random.uniform(0.7, 0.95) / 4
                    
                    # Power factor
                    power_factor = random.uniform(0.85, 0.95)
                    
                    # Demand (kW)
                    demand_kw = kwh_consumed * 4  # Convert to power
                    
                    # Occasional demand spikes (3% chance)
                    if random.random() < 0.03:
                        demand_kw *= random.uniform(1.5, 2.0)
                        kwh_consumed = demand_kw / 4
                    
                    # Rare load shedding events (0.5% chance)
                    load_shedding = random.random() < 0.005
                    if load_shedding:
                        kwh_consumed *= 0.3
                        demand_kw *= 0.3
                    
                    data_point = EnergyData(
                        time=current_time,
                        site_id=site.id,
                        meter_id=meter_id,
                        kwh_consumed=round(kwh_consumed, 3),
                        tariff_rate=tariff_rate,
                        period_type=period_type,
                        solar_generation_kwh=round(solar_generation, 3),
                        load_shedding_event=load_shedding,
                        power_factor=round(power_factor, 3),
                        demand_kw=round(demand_kw, 2)
                    )
                    batch.append(data_point)
                    
                    # Bulk insert every 1000 records
                    if len(batch) >= 1000:
                        self.db.bulk_save_objects(batch)
                        self.db.commit()
                        batch = []
                    
                    current_time += timedelta(minutes=15)
                
                # Insert remaining records
                if batch:
                    self.db.bulk_save_objects(batch)
                    self.db.commit()
                    
        logger.info("✓ Energy data generated")
        
    def _generate_retail_data(self):
        """Generate 90 days of daily retail data."""
        logger.info("Generating retail data...")
        
        end_time = datetime.now(UTC).replace(hour=0, minute=0, second=0, microsecond=0)
        start_time = end_time - timedelta(days=90)
        
        weather_conditions = ["sunny", "cloudy", "rainy", "partly_cloudy"]
        
        for org in self.organizations:
            retail_sites = [
                s for s in self.sites[org.slug]
                if s.vertical == VerticalType.RETAIL
            ]
            
            for site in retail_sites:
                logger.info(f"  Generating data for {site.name}...")
                batch = []
                store_id = f"STORE-{site.name.split('-')[1]}"
                sku_count = site.site_metadata.get("sku_count", 500)
                
                # Generate for top 10 SKUs
                top_skus = [f"SKU-{i:04d}" for i in range(1, 11)]
                
                current_date = start_time
                while current_date <= end_time:
                    is_weekend = current_date.weekday() >= 5
                    day_of_year = current_date.timetuple().tm_yday
                    
                    # Seasonal trend (higher in Q4)
                    seasonal_factor = 1.0 + 0.3 * ((day_of_year % 365) / 365)
                    
                    for sku in top_skus:
                        # Base sales with weekly seasonality
                        base_sales = 250 if is_weekend else 180
                        base_sales = int(base_sales * seasonal_factor)
                        
                        # Promotional periods (20% of days)
                        promo_active = random.random() < 0.20
                        promo_discount_pct = 0.0
                        
                        if promo_active:
                            promo_discount_pct = random.choice([10, 15, 20, 25])
                            # Promotions increase sales
                            base_sales = int(base_sales * random.uniform(1.3, 1.8))
                        
                        # Random variation
                        sales_units = max(0, base_sales + random.randint(-50, 50))
                        
                        # Revenue calculation
                        base_price = random.uniform(25, 45)
                        discount_multiplier = 1 - (promo_discount_pct / 100)
                        revenue = sales_units * base_price * discount_multiplier
                        
                        # Inventory level
                        inventory = random.randint(100, 1000)
                        
                        # Footfall count (correlated with sales)
                        footfall = int(sales_units * random.uniform(8, 12))
                        if is_weekend:
                            footfall = int(footfall * 1.5)
                        
                        # Weather condition
                        weather = random.choice(weather_conditions)
                        
                        # Occasional anomalies (1% chance)
                        if random.random() < 0.01:
                            sales_units = int(sales_units * random.uniform(0.2, 0.4))
                            revenue = sales_units * base_price * discount_multiplier
                        
                        data_point = RetailData(
                            time=current_date,
                            site_id=site.id,
                            store_id=store_id,
                            sku=sku,
                            daily_sales_units=sales_units,
                            daily_revenue=round(revenue, 2),
                            inventory_level=inventory,
                            promo_active=promo_active,
                            promo_discount_pct=promo_discount_pct if promo_active else None,
                            footfall_count=footfall,
                            weather_condition=weather
                        )
                        batch.append(data_point)
                    
                    # Bulk insert every 500 records
                    if len(batch) >= 500:
                        self.db.bulk_save_objects(batch)
                        self.db.commit()
                        batch = []
                    
                    current_date += timedelta(days=1)
                
                # Insert remaining records
                if batch:
                    self.db.bulk_save_objects(batch)
                    self.db.commit()
                    
        logger.info("✓ Retail data generated")
        
    def _print_summary(self):
        """Print summary of generated data."""
        logger.info("\n" + "="*60)
        logger.info("SEED DATA SUMMARY")
        logger.info("="*60)
        logger.info(f"Organizations: {len(self.organizations)}")
        
        for org in self.organizations:
            logger.info(f"\n{org.name} ({org.slug}):")
            logger.info(f"  - Users: {len(self.users[org.slug])}")
            logger.info(f"  - Projects: {len(self.projects[org.slug])}")
            logger.info(f"  - Sites: {len(self.sites[org.slug])}")
            
            # Count time-series records
            mfg_count = self.db.query(ManufacturingData).join(Site).filter(
                Site.org_id == org.id
            ).count()
            energy_count = self.db.query(EnergyData).join(Site).filter(
                Site.org_id == org.id
            ).count()
            retail_count = self.db.query(RetailData).join(Site).filter(
                Site.org_id == org.id
            ).count()
            
            logger.info(f"  - Manufacturing records: {mfg_count:,}")
            logger.info(f"  - Energy records: {energy_count:,}")
            logger.info(f"  - Retail records: {retail_count:,}")
        
        logger.info("\n" + "="*60)
        logger.info("TEST CREDENTIALS")
        logger.info("="*60)
        logger.info("Email: admin.user@acme-manufacturing.com")
        logger.info("Password: password123")
        logger.info("="*60 + "\n")


def main():
    """Main entry point for seed data generation."""
    parser = argparse.ArgumentParser(description="Generate seed data for Digital Twin platform")
    parser.add_argument(
        "--clear",
        action="store_true",
        help="Clear existing data before seeding"
    )
    args = parser.parse_args()
    
    # Create database session
    db = SessionLocal()
    
    try:
        generator = SeedDataGenerator(db, clear_existing=args.clear)
        generator.run()
    except Exception as e:
        logger.error(f"Failed to generate seed data: {e}")
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()
