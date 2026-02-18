"""
Unit tests for simulation service.
Tests what-if scenario analysis including variable overrides and result calculations.
"""
import pytest
from datetime import date, timedelta
from uuid import uuid4
from sqlalchemy.orm import Session

from app.models.site import Site
from app.models.manufacturing import ManufacturingData
from app.models.energy import EnergyData, PeriodType
from app.schemas.simulation import SimulationRequest
from app.services import simulation_service
from app.core.exceptions import ValidationError


@pytest.mark.unit
class TestVariableOverrides:
    """Test variable override application logic."""
    
    def test_apply_multiplier_override(self):
        """Test applying multiplier overrides."""
        base_data = {
            'throughput': 100.0,
            'quality': 95.0,
            'availability': 90.0
        }
        overrides = {
            'throughput_multiplier': 1.1,
            'quality_multiplier': 1.05
        }
        
        result = simulation_service.apply_variable_overrides(base_data, overrides)
        
        assert result['throughput'] == 110.0
        assert result['quality'] == 99.75
        assert result['availability'] == 90.0  # Unchanged
    
    def test_apply_target_override(self):
        """Test applying target (absolute) overrides."""
        base_data = {
            'quality': 95.0,
            'availability': 90.0
        }
        overrides = {
            'quality_target': 98.0
        }
        
        result = simulation_service.apply_variable_overrides(base_data, overrides)
        
        assert result['quality'] == 98.0
        assert result['availability'] == 90.0
    
    def test_apply_direct_override(self):
        """Test applying direct value overrides."""
        base_data = {
            'oee': 85.0,
            'throughput': 1000.0
        }
        overrides = {
            'oee': 90.0
        }
        
        result = simulation_service.apply_variable_overrides(base_data, overrides)
        
        assert result['oee'] == 90.0
        assert result['throughput'] == 1000.0
    
    def test_apply_mixed_overrides(self):
        """Test applying multiple types of overrides."""
        base_data = {
            'throughput': 1000.0,
            'quality': 95.0,
            'availability': 85.0,
            'oee': 80.0
        }
        overrides = {
            'throughput_multiplier': 1.15,
            'quality_target': 98.0,
            'availability': 90.0
        }
        
        result = simulation_service.apply_variable_overrides(base_data, overrides)
        
        assert result['throughput'] == 1150.0
        assert result['quality'] == 98.0
        assert result['availability'] == 90.0
        assert result['oee'] == 80.0  # Unchanged
    
    def test_apply_override_nonexistent_key(self):
        """Test overrides don't add new keys."""
        base_data = {'throughput': 100.0}
        overrides = {'nonexistent_multiplier': 1.5}
        
        result = simulation_service.apply_variable_overrides(base_data, overrides)
        
        assert 'nonexistent' not in result
        assert result['throughput'] == 100.0


@pytest.mark.unit
class TestSimulationResults:
    """Test simulation result calculations."""
    
    def test_calculate_absolute_deltas(self):
        """Test absolute delta calculation."""
        baseline = {
            'oee': 85.0,
            'throughput': 1000.0,
            'quality': 95.0
        }
        simulated = {
            'oee': 90.0,
            'throughput': 1100.0,
            'quality': 98.0
        }
        
        deltas = simulation_service.calculate_simulation_results(baseline, simulated)
        
        assert deltas['oee']['absolute'] == 5.0
        assert deltas['throughput']['absolute'] == 100.0
        assert deltas['quality']['absolute'] == 3.0
    
    def test_calculate_percentage_deltas(self):
        """Test percentage delta calculation."""
        baseline = {
            'oee': 80.0,
            'throughput': 1000.0,
            'quality': 95.0
        }
        simulated = {
            'oee': 88.0,
            'throughput': 1200.0,
            'quality': 98.5
        }
        
        deltas = simulation_service.calculate_simulation_results(baseline, simulated)
        
        assert deltas['oee']['percentage'] == 10.0
        assert deltas['throughput']['percentage'] == 20.0
        assert deltas['quality']['percentage'] == pytest.approx(3.68, rel=0.01)
    
    def test_calculate_negative_deltas(self):
        """Test negative deltas (decreases)."""
        baseline = {
            'cost': 10000.0,
            'defects': 50.0
        }
        simulated = {
            'cost': 8000.0,
            'defects': 30.0
        }
        
        deltas = simulation_service.calculate_simulation_results(baseline, simulated)
        
        assert deltas['cost']['absolute'] == -2000.0
        assert deltas['cost']['percentage'] == -20.0
        assert deltas['defects']['absolute'] == -20.0
        assert deltas['defects']['percentage'] == -40.0
    
    def test_calculate_deltas_zero_baseline(self):
        """Test deltas with zero baseline values."""
        baseline = {
            'new_metric': 0.0,
            'existing_metric': 100.0
        }
        simulated = {
            'new_metric': 50.0,
            'existing_metric': 150.0
        }
        
        deltas = simulation_service.calculate_simulation_results(baseline, simulated)
        
        assert deltas['new_metric']['absolute'] == 50.0
        assert deltas['new_metric']['percentage'] == 0.0  # Zero baseline
        assert deltas['existing_metric']['percentage'] == 50.0
    
    def test_calculate_deltas_skips_non_numeric(self):
        """Test that non-numeric values are skipped."""
        baseline = {
            'oee': 85.0,
            'site_id': 'abc123',
            'start_date': '2024-01-01'
        }
        simulated = {
            'oee': 90.0,
            'site_id': 'abc123',
            'start_date': '2024-01-01'
        }
        
        deltas = simulation_service.calculate_simulation_results(baseline, simulated)
        
        assert 'oee' in deltas
        assert 'site_id' not in deltas
        assert 'start_date' not in deltas


@pytest.mark.unit
class TestConfidenceScoring:
    """Test confidence score generation."""
    
    @pytest.mark.parametrize("data_quality,accuracy,completeness,expected", [
        (1.0, 1.0, 1.0, 1.0),
        (0.8, 0.9, 0.85, 0.85),
        (0.5, 0.7, 0.6, 0.6),
        (0.0, 0.0, 0.0, 0.0),
    ])
    def test_generate_confidence_score(
        self, data_quality, accuracy, completeness, expected
    ):
        """Test confidence score calculation with parametrized inputs."""
        model_metrics = {
            'accuracy': accuracy,
            'completeness': completeness
        }
        
        result = simulation_service.generate_confidence_score(
            data_quality, model_metrics
        )
        
        assert result == pytest.approx(expected, rel=0.01)
    
    def test_confidence_score_weighted_average(self):
        """Test confidence score uses weighted average."""
        # Weights: data_quality=0.4, accuracy=0.4, completeness=0.2
        model_metrics = {
            'accuracy': 0.9,
            'completeness': 0.8
        }
        
        result = simulation_service.generate_confidence_score(0.7, model_metrics)
        
        # 0.7*0.4 + 0.9*0.4 + 0.8*0.2 = 0.28 + 0.36 + 0.16 = 0.80
        assert result == 0.8
    
    def test_confidence_score_capped_at_one(self):
        """Test confidence score is capped at 1.0."""
        model_metrics = {'accuracy': 1.0, 'completeness': 1.0}
        
        result = simulation_service.generate_confidence_score(1.0, model_metrics)
        
        assert result <= 1.0
    
    def test_confidence_score_floored_at_zero(self):
        """Test confidence score is floored at 0.0."""
        model_metrics = {'accuracy': 0.0, 'completeness': 0.0}
        
        result = simulation_service.generate_confidence_score(0.0, model_metrics)
        
        assert result >= 0.0


@pytest.mark.unit
class TestSimulationService:
    """Test end-to-end simulation service."""
    
    def test_run_simulation_manufacturing(
        self, db: Session, manufacturing_site: Site
    ):
        """Test simulation for manufacturing site."""
        # Create baseline data
        start_date = date(2024, 1, 1)
        end_date = date(2024, 1, 8)
        
        for i in range(7):
            data = ManufacturingData(
                site_id=manufacturing_site.id,
                time=start_date + timedelta(days=i),
                uptime_minutes=1200,
                throughput_units=1000,
                defect_count=20,
                cycle_time_seconds=120,
                quality_score=0.98
            )
            db.add(data)
        db.commit()
        
        # Create simulation request
        request = SimulationRequest(
            site_id=manufacturing_site.id,
            scenario_name="Increase throughput by 10%",
            base_period=(start_date, end_date),
            forecast_period=(end_date, end_date + timedelta(days=30)),
            variable_overrides={
                'throughput_multiplier': 1.1
            }
        )
        
        # Run simulation
        result = simulation_service.run_simulation(request, db)
        
        assert result['site_id'] == manufacturing_site.id
        assert result['scenario_name'] == "Increase throughput by 10%"
        assert 'baseline_kpis' in result
        assert 'simulated_kpis' in result
        assert 'deltas' in result
        assert 'timeseries' in result
        assert 'confidence_score' in result
        assert 0 <= result['confidence_score'] <= 1
    
    def test_run_simulation_energy(self, db: Session, energy_site: Site):
        """Test simulation for energy site."""
        start_date = date(2024, 1, 1)
        end_date = date(2024, 1, 8)
        
        for i in range(7):
            data = EnergyData(
                site_id=energy_site.id,
                time=start_date + timedelta(days=i),
                kwh_consumed=1000,
                solar_generation_kwh=200,
                demand_kw=150,
                tariff_rate=0.12,
                period_type=PeriodType.STANDARD
            )
            db.add(data)
        db.commit()
        
        request = SimulationRequest(
            site_id=energy_site.id,
            scenario_name="Increase solar generation by 50%",
            base_period=(start_date, end_date),
            forecast_period=(end_date, end_date + timedelta(days=30)),
            variable_overrides={
                'total_solar_kwh_multiplier': 1.5
            }
        )
        
        result = simulation_service.run_simulation(request, db)
        
        assert result['site_id'] == energy_site.id
        assert 'baseline_kpis' in result
        assert 'simulated_kpis' in result
        assert 'deltas' in result
    
    def test_run_simulation_invalid_site(self, db: Session):
        """Test simulation with invalid site."""
        fake_site_id = uuid4()
        request = SimulationRequest(
            site_id=fake_site_id,
            scenario_name="Test scenario",
            base_period=(date(2024, 1, 1), date(2024, 1, 8)),
            forecast_period=(date(2024, 1, 8), date(2024, 2, 8)),
            variable_overrides={'throughput_multiplier': 1.1}
        )
        
        with pytest.raises(ValidationError, match="Site .* not found"):
            simulation_service.run_simulation(request, db)
    
    def test_simulation_generates_notes(self, db: Session, manufacturing_site: Site):
        """Test that simulation generates descriptive notes."""
        start_date = date(2024, 1, 1)
        end_date = date(2024, 1, 8)
        
        for i in range(7):
            data = ManufacturingData(
                site_id=manufacturing_site.id,
                time=start_date + timedelta(days=i),
                uptime_minutes=1200,
                throughput_units=1000,
                defect_count=20,
                cycle_time_seconds=120,
                quality_score=0.98
            )
            db.add(data)
        db.commit()
        
        request = SimulationRequest(
            site_id=manufacturing_site.id,
            scenario_name="Multi-variable optimization",
            base_period=(start_date, end_date),
            forecast_period=(end_date, end_date + timedelta(days=30)),
            variable_overrides={
                'throughput_multiplier': 1.2,
                'quality_target': 98.5
            }
        )
        
        result = simulation_service.run_simulation(request, db)
        
        assert 'simulation_notes' in result
        assert len(result['simulation_notes']) > 0
        assert '2 variable override(s)' in result['simulation_notes']
    
    def test_simulation_timeseries_generation(
        self, db: Session, manufacturing_site: Site
    ):
        """Test that timeseries data is generated."""
        start_date = date(2024, 1, 1)
        end_date = date(2024, 1, 8)
        
        for i in range(7):
            data = ManufacturingData(
                site_id=manufacturing_site.id,
                time=start_date + timedelta(days=i),
                uptime_minutes=1200,
                throughput_units=1000,
                defect_count=20,
                cycle_time_seconds=120,
                quality_score=0.98
            )
            db.add(data)
        db.commit()
        
        forecast_start = date(2024, 2, 1)
        forecast_end = date(2024, 4, 1)
        
        request = SimulationRequest(
            site_id=manufacturing_site.id,
            scenario_name="Test",
            base_period=(start_date, end_date),
            forecast_period=(forecast_start, forecast_end),
            variable_overrides={'throughput_multiplier': 1.1}
        )
        
        result = simulation_service.run_simulation(request, db)
        
        assert 'timeseries' in result
        assert len(result['timeseries']) > 0
        
        # Check first timeseries point
        first_point = result['timeseries'][0]
        assert 'timestamp' in first_point
        assert any(k.startswith('baseline_') for k in first_point.keys())
        assert any(k.startswith('simulated_') for k in first_point.keys())


@pytest.mark.unit
class TestSimulationNotes:
    """Test simulation notes generation."""
    
    def test_generate_simulation_notes_basic(self):
        """Test basic notes generation."""
        overrides = {
            'throughput_multiplier': 1.1,
            'quality_target': 98.0
        }
        deltas = {
            'throughput': {'absolute': 100.0, 'percentage': 10.0},
            'quality': {'absolute': 2.0, 'percentage': 2.1}
        }
        
        notes = simulation_service.generate_simulation_notes(overrides, deltas)
        
        assert '2 variable override(s)' in notes
        assert 'throughput_multiplier: 1.1' in notes
        assert 'quality_target: 98.0' in notes
        assert 'throughput: 10.0%' in notes
    
    def test_generate_simulation_notes_significant_changes(self):
        """Test notes highlight significant changes."""
        overrides = {'throughput_multiplier': 1.2}
        deltas = {
            'throughput': {'absolute': 200.0, 'percentage': 20.0},
            'oee': {'absolute': 8.0, 'percentage': 10.0},
            'quality': {'absolute': 0.5, 'percentage': 0.5}  # Not significant
        }
        
        notes = simulation_service.generate_simulation_notes(overrides, deltas)
        
        assert 'Significant KPI changes' in notes
        assert 'throughput: 20.0%' in notes
        assert 'oee: 10.0%' in notes
        assert 'quality' not in notes.split('Significant')[1]  # After "Significant"
    
    def test_generate_simulation_notes_no_significant_changes(self):
        """Test notes when no significant changes."""
        overrides = {'throughput_multiplier': 1.01}
        deltas = {
            'throughput': {'absolute': 10.0, 'percentage': 1.0},
            'quality': {'absolute': 0.5, 'percentage': 0.5}
        }
        
        notes = simulation_service.generate_simulation_notes(overrides, deltas)
        
        assert '1 variable override(s)' in notes
        assert 'Significant KPI changes' not in notes
