"""
Factory functions for creating test data objects.
Provides convenient helpers for generating test fixtures.
"""
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
import uuid
from faker import Faker

from app.models.user import User
from app.models.organization import Organization, PlanType
from app.models.org_membership import OrgMembership, OrgRole
from app.models.project import Project, VerticalType
from app.models.site import Site
from app.core.security import get_password_hash

fake = Faker()


class UserFactory:
    """Factory for creating User objects."""
    
    @staticmethod
    def create(
        email: Optional[str] = None,
        password: str = "TestPass123!",
        full_name: Optional[str] = None,
        is_active: bool = True,
        **kwargs
    ) -> User:
        """Create a User instance."""
        return User(
            email=email or fake.email(),
            hashed_password=get_password_hash(password),
            full_name=full_name or fake.name(),
            is_active=is_active,
            **kwargs
        )
    
    @staticmethod
    def build_dict(
        email: Optional[str] = None,
        full_name: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """Build a user data dictionary for API requests."""
        return {
            "email": email or fake.email(),
            "full_name": full_name or fake.name(),
            **kwargs
        }


class OrganizationFactory:
    """Factory for creating Organization objects."""
    
    @staticmethod
    def create(
        name: Optional[str] = None,
        slug: Optional[str] = None,
        plan_type: PlanType = PlanType.PROFESSIONAL,
        settings: Optional[Dict] = None,
        **kwargs
    ) -> Organization:
        """Create an Organization instance."""
        org_name = name or fake.company()
        return Organization(
            name=org_name,
            slug=slug or org_name.lower().replace(" ", "-").replace(".", ""),
            plan_type=plan_type,
            settings=settings or {},
            **kwargs
        )
    
    @staticmethod
    def build_dict(
        name: Optional[str] = None,
        plan_type: str = "professional",
        **kwargs
    ) -> Dict[str, Any]:
        """Build an organization data dictionary for API requests."""
        return {
            "name": name or fake.company(),
            "plan_type": plan_type,
            **kwargs
        }


class OrgMembershipFactory:
    """Factory for creating OrgMembership objects."""
    
    @staticmethod
    def create(
        user_id: uuid.UUID,
        org_id: uuid.UUID,
        role: OrgRole = OrgRole.MEMBER,
        **kwargs
    ) -> OrgMembership:
        """Create an OrgMembership instance."""
        return OrgMembership(
            user_id=user_id,
            org_id=org_id,
            role=role,
            **kwargs
        )


class ProjectFactory:
    """Factory for creating Project objects."""
    
    @staticmethod
    def create(
        org_id: uuid.UUID,
        name: Optional[str] = None,
        description: Optional[str] = None,
        vertical: VerticalType = VerticalType.MANUFACTURING,
        **kwargs
    ) -> Project:
        """Create a Project instance."""
        return Project(
            org_id=org_id,
            name=name or f"{vertical.value.title()} Project {fake.word()}",
            description=description or fake.text(max_nb_chars=200),
            vertical=vertical,
            **kwargs
        )
    
    @staticmethod
    def build_dict(
        name: Optional[str] = None,
        description: Optional[str] = None,
        vertical: str = "manufacturing",
        **kwargs
    ) -> Dict[str, Any]:
        """Build a project data dictionary for API requests."""
        return {
            "name": name or f"Test {vertical.title()} Project",
            "description": description or "Test project description",
            "vertical": vertical,
            **kwargs
        }


class SiteFactory:
    """Factory for creating Site objects."""
    
    @staticmethod
    def create(
        org_id: uuid.UUID,
        project_id: uuid.UUID,
        name: Optional[str] = None,
        location: Optional[str] = None,
        vertical: VerticalType = VerticalType.MANUFACTURING,
        config: Optional[Dict] = None,
        **kwargs
    ) -> Site:
        """Create a Site instance."""
        return Site(
            org_id=org_id,
            project_id=project_id,
            name=name or f"Site {fake.city()}",
            location=location or f"{fake.city()}, {fake.state_abbr()}",
            vertical=vertical,
            config=config or {},
            **kwargs
        )
    
    @staticmethod
    def build_dict(
        name: Optional[str] = None,
        location: Optional[str] = None,
        vertical: str = "manufacturing",
        config: Optional[Dict] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """Build a site data dictionary for API requests."""
        return {
            "name": name or f"Test Site {fake.city()}",
            "location": location or f"{fake.city()}, {fake.state_abbr()}",
            "vertical": vertical,
            "config": config or {},
            **kwargs
        }


class ManufacturingDataFactory:
    """Factory for creating manufacturing sensor data."""
    
    @staticmethod
    def create(
        timestamp: Optional[datetime] = None,
        machine_id: Optional[str] = None,
        production_count: int = 100,
        target_count: int = 150,
        downtime_minutes: int = 15,
        defect_count: int = 2,
        **kwargs
    ) -> Dict[str, Any]:
        """Create manufacturing data dictionary."""
        return {
            "timestamp": (timestamp or datetime.utcnow()).isoformat(),
            "machine_id": machine_id or f"MACHINE-{fake.random_int(1, 999):03d}",
            "production_count": production_count,
            "target_count": target_count,
            "downtime_minutes": downtime_minutes,
            "defect_count": defect_count,
            "cycle_time_seconds": fake.random_int(60, 180),
            "temperature_celsius": fake.random_int(70, 90),
            "pressure_psi": fake.random_int(100, 200),
            "vibration_hz": fake.random_int(50, 70),
            **kwargs
        }
    
    @staticmethod
    def create_batch(count: int = 10, **kwargs) -> list[Dict[str, Any]]:
        """Create a batch of manufacturing data."""
        base_time = datetime.utcnow()
        return [
            ManufacturingDataFactory.create(
                timestamp=base_time + timedelta(hours=i),
                **kwargs
            )
            for i in range(count)
        ]


class EnergyDataFactory:
    """Factory for creating energy consumption data."""
    
    @staticmethod
    def create(
        timestamp: Optional[datetime] = None,
        meter_id: Optional[str] = None,
        consumption_kwh: float = 1000.0,
        generation_kwh: float = 500.0,
        **kwargs
    ) -> Dict[str, Any]:
        """Create energy data dictionary."""
        return {
            "timestamp": (timestamp or datetime.utcnow()).isoformat(),
            "meter_id": meter_id or f"METER-{fake.random_int(1, 999):03d}",
            "consumption_kwh": consumption_kwh,
            "generation_kwh": generation_kwh,
            "grid_import_kwh": max(0, consumption_kwh - generation_kwh),
            "grid_export_kwh": max(0, generation_kwh - consumption_kwh),
            "cost_usd": consumption_kwh * 0.12,
            "power_factor": fake.random_int(85, 100) / 100.0,
            "voltage": fake.random_int(230, 250),
            "frequency": 60.0,
            **kwargs
        }
    
    @staticmethod
    def create_batch(count: int = 10, **kwargs) -> list[Dict[str, Any]]:
        """Create a batch of energy data."""
        base_time = datetime.utcnow()
        return [
            EnergyDataFactory.create(
                timestamp=base_time + timedelta(hours=i),
                **kwargs
            )
            for i in range(count)
        ]


class RetailDataFactory:
    """Factory for creating retail transaction data."""
    
    @staticmethod
    def create(
        timestamp: Optional[datetime] = None,
        transaction_id: Optional[str] = None,
        sku: Optional[str] = None,
        quantity: int = 1,
        unit_price: float = 49.99,
        **kwargs
    ) -> Dict[str, Any]:
        """Create retail data dictionary."""
        qty = quantity
        price = unit_price
        return {
            "timestamp": (timestamp or datetime.utcnow()).isoformat(),
            "transaction_id": transaction_id or f"TXN-{fake.uuid4()[:8]}",
            "sku": sku or f"SKU-{fake.random_int(10000, 99999)}",
            "quantity": qty,
            "unit_price": price,
            "total_price": qty * price,
            "cost": price * 0.6,  # 40% margin
            "category": fake.random_element(["Electronics", "Clothing", "Food", "Home"]),
            "store_id": f"STORE-{fake.random_int(100, 999)}",
            **kwargs
        }
    
    @staticmethod
    def create_batch(count: int = 10, **kwargs) -> list[Dict[str, Any]]:
        """Create a batch of retail data."""
        base_time = datetime.utcnow()
        return [
            RetailDataFactory.create(
                timestamp=base_time + timedelta(minutes=i * 5),
                **kwargs
            )
            for i in range(count)
        ]
