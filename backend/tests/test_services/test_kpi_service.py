"""
Unit tests for KPI service.
Tests KPI calculations for all verticals: Manufacturing, Energy, and Retail.
"""
import pytest
from datetime import date, timedelta
from uuid import uuid4
from sqlalchemy.orm import Session

from app.models.site import Site
from app.models.project import VerticalType
from app.models.manufacturing import ManufacturingData
from app.models.energy import EnergyData, PeriodType
from app.models.retail import RetailData
from app.services import kpi_service
from app.services.verticals import manufacturing, energy, retail
from app.core.exceptions import ValidationError


@pytest.mark.unit
class TestManufacturingKPIs:
    """Test manufacturing KPI calculations."""
    
    @pytest.mark.parametrize("availability,performance,quality,expected_oee", [
        (100, 100, 100, 100.0),
        (90, 95, 98, 83.79),
        (85, 80, 95, 64.6),
        (0, 100, 100, 0.0),
        (100, 0, 100, 0.0),
        (100, 100, 0, 0.0),
    ])
    def test_calculate_oee(self, availability, performance, quality, expected_oee):
        """Test OEE calculation with parametrized inputs."""
        result = manufacturing.calculate_oee(availability, performance, quality)
        assert result == expected_oee
    
    @pytest.mark.parametrize("uptime,planned_time,expected_availability", [
        (1000, 1000, 100.0),
        (900, 1000, 90.0),
        (500, 1000, 50.0),
        (0, 1000, 0.0),
        (1200, 1000, 100.0),  # Capped at 100%
    ])
    def test_calculate_availability(self, uptime, planned_time, expected_availability):
        """Test availability calculation."""
        result = manufacturing.calculate_availability(uptime, planned_time)
        assert result == expected_availability
    
    @pytest.mark.parametrize("actual,planned,expected_performance", [
        (100, 100, 100.0),
        (90, 100, 90.0),
        (50, 100, 50.0),
        (0, 100, 0.0),
        (110, 100, 100.0),  # Capped at 100%
    ])
    def test_calculate_performance(self, actual, planned, expected_performance):
        """Test performance calculation."""
        result = manufacturing.calculate_performance(actual, planned)
        assert result == expected_performance
    
    @pytest.mark.parametrize("good_units,total_units,expected_quality", [
        (100, 100, 100.0),
        (95, 100, 95.0),
        (90, 100, 90.0),
        (0, 100, 0.0),
    ])
    def test_calculate_quality(self, good_units, total_units, expected_quality):
        """Test quality calculation."""
        result = manufacturing.calculate_quality(good_units, total_units)
        assert result == expected_quality
    
    def test_calculate_mtbf(self):
        """Test MTBF calculation."""
        downtime_events = [
            {'timestamp': 0, 'duration': 1.0},
            {'timestamp': 10, 'duration': 1.5},
            {'timestamp': 25, 'duration': 2.0},
        ]
        result = manufacturing.calculate_mtbf(downtime_events)
        assert result == 12.5  # (25-0) / 2 = 12.5 hours between failures
    
    def test_calculate_mtbf_empty(self):
        """Test MTBF with no downtime events."""
        result = manufacturing.calculate_mtbf([])
        assert result == 0.0
    
    @pytest.mark.parametrize("downtime_events,expected_mttr", [
        ([{'duration': 1.0}, {'duration': 2.0}, {'duration': 3.0}], 2.0),
        ([{'duration': 1.5}, {'duration': 1.5}], 1.5),
        ([{'duration': 5.0}], 5.0),
        ([], 0.0),
    ])
    def test_calculate_mttr(self, downtime_events, expected_mttr):
        """Test MTTR calculation."""
        result = manufacturing.calculate_mttr(downtime_events)
        assert result == expected_mttr
    
    def test_compute_manufacturing_kpis(self, db: Session, manufacturing_site: Site):
        """Test end-to-end manufacturing KPI computation."""
        # Create test data
        start_date = date(2024, 1, 1)
        end_date = date(2024, 1, 8)
        
        for i in range(7):
            data = ManufacturingData(
                site_id=manufacturing_site.id,
                time=start_date + timedelta(days=i),
                uptime_minutes=1200,  # 20 hours uptime per day
                throughput_units=100,
                defect_count=2,
                cycle_time_seconds=120,
                quality_score=0.98,
                downtime_events=[{'timestamp': i, 'duration': 0.5}]
            )
            db.add(data)
        db.commit()
        
        # Compute KPIs
        result = kpi_service.compute_manufacturing_kpis(
            manufacturing_site.id, start_date, end_date, db
        )
        
        assert result['site_id'] == manufacturing_site.id
        assert 'oee' in result
        assert 'availability' in result
        assert 'performance' in result
        assert 'quality' in result
        assert 'mtbf' in result
        assert 'mttr' in result
        assert result['total_throughput'] == 700
        assert result['total_defects'] == 14
    
    def test_compute_manufacturing_kpis_no_data(self, db: Session, manufacturing_site: Site):
        """Test KPI computation with no data raises error."""
        start_date = date(2024, 1, 1)
        end_date = date(2024, 1, 8)
        
        with pytest.raises(ValidationError, match="No manufacturing data found"):
            kpi_service.compute_manufacturing_kpis(
                manufacturing_site.id, start_date, end_date, db
            )
    
    def test_compute_manufacturing_kpis_invalid_site(self, db: Session):
        """Test KPI computation with invalid site."""
        fake_site_id = uuid4()
        start_date = date(2024, 1, 1)
        end_date = date(2024, 1, 8)
        
        with pytest.raises(ValidationError, match="Site .* not found"):
            kpi_service.compute_manufacturing_kpis(
                fake_site_id, start_date, end_date, db
            )
    
    def test_compute_manufacturing_kpis_wrong_vertical(self, db: Session, energy_site: Site):
        """Test KPI computation with wrong vertical type."""
        start_date = date(2024, 1, 1)
        end_date = date(2024, 1, 8)
        
        with pytest.raises(ValidationError, match="not a manufacturing site"):
            kpi_service.compute_manufacturing_kpis(
                energy_site.id, start_date, end_date, db
            )


@pytest.mark.unit
class TestEnergyKPIs:
    """Test energy KPI calculations."""
    
    @pytest.mark.parametrize("consumption_data,expected_cost", [
        ([{'kwh': 100, 'tariff_rate': 0.10}], 10.0),
        ([{'kwh': 100, 'tariff_rate': 0.10}, {'kwh': 200, 'tariff_rate': 0.15}], 40.0),
        ([{'kwh': 0, 'tariff_rate': 0.10}], 0.0),
        ([], 0.0),
    ])
    def test_calculate_total_cost(self, consumption_data, expected_cost):
        """Test total cost calculation."""
        result = energy.calculate_total_cost(consumption_data)
        assert result == expected_cost
    
    @pytest.mark.parametrize("demand_data,demand_charge,expected_cost", [
        ([100, 150, 200, 175], 15.0, 3000.0),  # Peak: 200 kW
        ([50, 75, 60], 10.0, 750.0),  # Peak: 75 kW
        ([100], 20.0, 2000.0),
        ([], 15.0, 0.0),
    ])
    def test_calculate_peak_demand_cost(self, demand_data, demand_charge, expected_cost):
        """Test peak demand cost calculation."""
        result = energy.calculate_peak_demand_cost(demand_data, demand_charge)
        assert result == expected_cost
    
    @pytest.mark.parametrize("kwh,production_units,expected_intensity", [
        (1000, 100, 10.0),
        (5000, 500, 10.0),
        (1200, 80, 15.0),
        (0, 100, 0.0),
    ])
    def test_calculate_energy_intensity(self, kwh, production_units, expected_intensity):
        """Test energy intensity calculation."""
        result = energy.calculate_energy_intensity(kwh, production_units)
        assert result == expected_intensity
    
    @pytest.mark.parametrize("solar_kwh,total_kwh,expected_pct", [
        (500, 1000, 50.0),
        (250, 1000, 25.0),
        (1000, 1000, 100.0),
        (0, 1000, 0.0),
    ])
    def test_calculate_solar_contribution(self, solar_kwh, total_kwh, expected_pct):
        """Test solar contribution percentage."""
        result = energy.calculate_solar_contribution(solar_kwh, total_kwh)
        assert result == expected_pct
    
    @pytest.mark.parametrize("avg_demand,peak_demand,expected_factor", [
        (80, 100, 0.8),
        (50, 100, 0.5),
        (100, 100, 1.0),
        (0, 100, 0.0),
    ])
    def test_calculate_load_factor(self, avg_demand, peak_demand, expected_factor):
        """Test load factor calculation."""
        result = energy.calculate_load_factor(avg_demand, peak_demand)
        assert result == expected_factor
    
    def test_compute_energy_kpis(self, db: Session, energy_site: Site):
        """Test end-to-end energy KPI computation."""
        start_date = date(2024, 1, 1)
        end_date = date(2024, 1, 8)
        
        for i in range(7):
            data = EnergyData(
                site_id=energy_site.id,
                time=start_date + timedelta(days=i),
                kwh_consumed=1000 + i * 50,
                solar_generation_kwh=200 + i * 10,
                demand_kw=150 + i * 5,
                tariff_rate=0.12,
                period_type=PeriodType.STANDARD,
                power_factor=0.95
            )
            db.add(data)
        db.commit()
        
        result = kpi_service.compute_energy_kpis(
            energy_site.id, start_date, end_date, db
        )
        
        assert result['site_id'] == energy_site.id
        assert 'total_cost' in result
        assert 'peak_demand_cost' in result
        assert 'energy_intensity' in result
        assert 'solar_contribution_pct' in result
        assert 'load_factor' in result
        assert result['total_kwh'] > 0
        assert result['total_solar_kwh'] > 0
    
    def test_compute_energy_kpis_invalid_dates(self, db: Session, energy_site: Site):
        """Test KPI computation with invalid date range."""
        start_date = date(2024, 1, 8)
        end_date = date(2024, 1, 1)
        
        with pytest.raises(ValidationError, match="end_date must be after start_date"):
            kpi_service.compute_energy_kpis(
                energy_site.id, start_date, end_date, db
            )


@pytest.mark.unit
class TestRetailKPIs:
    """Test retail KPI calculations."""
    
    @pytest.mark.parametrize("units_sold,days,expected_velocity", [
        (1000, 10, 100.0),
        (500, 5, 100.0),
        (750, 30, 25.0),
        (0, 10, 0.0),
    ])
    def test_calculate_sales_velocity(self, units_sold, days, expected_velocity):
        """Test sales velocity calculation."""
        result = retail.calculate_sales_velocity(units_sold, days)
        assert result == expected_velocity
    
    @pytest.mark.parametrize("revenue,cost,expected_margin", [
        (1000, 600, 40.0),
        (1000, 700, 30.0),
        (1000, 350, 65.0),
        (1000, 1000, 0.0),
    ])
    def test_calculate_margin(self, revenue, cost, expected_margin):
        """Test margin calculation."""
        result = retail.calculate_margin(revenue, cost)
        assert result == expected_margin
    
    @pytest.mark.parametrize("cogs,avg_inventory,expected_turnover", [
        (12000, 2000, 6.0),
        (24000, 3000, 8.0),
        (6000, 1000, 6.0),
        (0, 1000, 0.0),
    ])
    def test_calculate_inventory_turnover(self, cogs, avg_inventory, expected_turnover):
        """Test inventory turnover calculation."""
        result = retail.calculate_inventory_turnover(cogs, avg_inventory)
        assert result == expected_turnover
    
    @pytest.mark.parametrize("stockout_days,total_days,expected_rate", [
        (3, 30, 10.0),
        (1, 30, 3.33),
        (5, 100, 5.0),
        (0, 30, 0.0),
    ])
    def test_calculate_stockout_rate(self, stockout_days, total_days, expected_rate):
        """Test stockout rate calculation."""
        result = retail.calculate_stockout_rate(stockout_days, total_days)
        assert result == expected_rate
    
    @pytest.mark.parametrize("sales,footfall,expected_conversion", [
        (50, 500, 10.0),
        (100, 1000, 10.0),
        (25, 1000, 2.5),
        (0, 500, 0.0),
    ])
    def test_calculate_conversion_rate(self, sales, footfall, expected_conversion):
        """Test conversion rate calculation."""
        result = retail.calculate_conversion_rate(sales, footfall)
        assert result == expected_conversion
    
    def test_compute_retail_kpis(self, db: Session, retail_site: Site):
        """Test end-to-end retail KPI computation."""
        start_date = date(2024, 1, 1)
        end_date = date(2024, 1, 8)
        
        for i in range(7):
            data = RetailData(
                site_id=retail_site.id,
                time=start_date + timedelta(days=i),
                daily_sales_units=100 + i * 5,
                daily_revenue=5000 + i * 250,
                inventory_level=500 - i * 10,
                footfall_count=500 + i * 20,
                promo_active=i % 2 == 0,
                promo_discount_pct=10.0 if i % 2 == 0 else None,
                weather_condition="sunny"
            )
            db.add(data)
        db.commit()
        
        result = kpi_service.compute_retail_kpis(
            retail_site.id, start_date, end_date, db
        )
        
        assert result['site_id'] == retail_site.id
        assert 'sales_velocity' in result
        assert 'margin_pct' in result
        assert 'inventory_turnover' in result
        assert 'stockout_rate' in result
        assert 'conversion_rate' in result
        assert result['total_sales_units'] > 0
        assert result['total_revenue'] > 0
    
    def test_compute_retail_kpis_with_stockout(self, db: Session, retail_site: Site):
        """Test retail KPIs with stockout scenarios."""
        start_date = date(2024, 1, 1)
        end_date = date(2024, 1, 8)
        
        for i in range(7):
            data = RetailData(
                site_id=retail_site.id,
                time=start_date + timedelta(days=i),
                daily_sales_units=100,
                daily_revenue=5000,
                inventory_level=0 if i < 2 else 500,  # 2 stockout days
                footfall_count=500,
                promo_active=False,
                weather_condition="sunny"
            )
            db.add(data)
        db.commit()
        
        result = kpi_service.compute_retail_kpis(
            retail_site.id, start_date, end_date, db
        )
        
        # Should detect 2 stockout days out of 7
        assert result['stockout_rate'] > 0


@pytest.mark.unit
class TestKPIServiceDispatch:
    """Test KPI service vertical dispatch."""
    
    def test_compute_kpis_by_vertical_manufacturing(
        self, db: Session, manufacturing_site: Site
    ):
        """Test KPI computation dispatch for manufacturing."""
        start_date = date(2024, 1, 1)
        end_date = date(2024, 1, 2)
        
        # Add minimal data
        data = ManufacturingData(
            site_id=manufacturing_site.id,
            time=start_date,
            uptime_minutes=1200,
            throughput_units=100,
            defect_count=2,
            cycle_time_seconds=120,
            quality_score=0.98
        )
        db.add(data)
        db.commit()
        
        result = kpi_service.compute_kpis_by_vertical(
            manufacturing_site.id, start_date, end_date, db
        )
        
        assert 'oee' in result
        assert 'availability' in result
    
    def test_compute_kpis_by_vertical_energy(self, db: Session, energy_site: Site):
        """Test KPI computation dispatch for energy."""
        start_date = date(2024, 1, 1)
        end_date = date(2024, 1, 2)
        
        data = EnergyData(
            site_id=energy_site.id,
            time=start_date,
            kwh_consumed=1000,
            solar_generation_kwh=200,
            demand_kw=150,
            tariff_rate=0.12,
            period_type=PeriodType.STANDARD
        )
        db.add(data)
        db.commit()
        
        result = kpi_service.compute_kpis_by_vertical(
            energy_site.id, start_date, end_date, db
        )
        
        assert 'total_cost' in result
        assert 'solar_contribution_pct' in result
    
    def test_compute_kpis_by_vertical_retail(self, db: Session, retail_site: Site):
        """Test KPI computation dispatch for retail."""
        start_date = date(2024, 1, 1)
        end_date = date(2024, 1, 2)
        
        data = RetailData(
            site_id=retail_site.id,
            time=start_date,
            daily_sales_units=100,
            daily_revenue=5000,
            inventory_level=500,
            footfall_count=500,
            promo_active=False
        )
        db.add(data)
        db.commit()
        
        result = kpi_service.compute_kpis_by_vertical(
            retail_site.id, start_date, end_date, db
        )
        
        assert 'sales_velocity' in result
        assert 'margin_pct' in result
