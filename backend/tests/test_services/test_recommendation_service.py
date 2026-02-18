"""
Unit tests for recommendation service.
Tests AI-powered recommendation generation, confidence scoring, and prioritization.
"""
import pytest
from uuid import uuid4
from sqlalchemy.orm import Session

from app.models.project import Project, VerticalType
from app.models.recommendation import (
    RecommendationCategory,
    Priority
)
from app.services import recommendation_service
from app.core.exceptions import ValidationError


@pytest.mark.unit
class TestManufacturingRecommendations:
    """Test manufacturing recommendation generation."""
    
    def test_generate_oee_recommendation_high_priority(
        self, db: Session, manufacturing_project: Project
    ):
        """Test OEE recommendation with high priority (OEE < 75%)."""
        kpis = {
            'oee': 70.0,
            'availability': 80.0,
            'performance': 85.0,
            'quality': 92.0,
            'data_quality_score': 0.85
        }
        
        recommendations = recommendation_service.generate_recommendations(
            manufacturing_project.id, VerticalType.MANUFACTURING, kpis, db
        )
        
        oee_recs = [r for r in recommendations if 'OEE' in r['title']]
        assert len(oee_recs) > 0
        
        oee_rec = oee_recs[0]
        assert oee_rec['priority'] == Priority.HIGH
        assert oee_rec['category'] == RecommendationCategory.OPTIMIZATION
        assert 'actions' in oee_rec
        assert len(oee_rec['actions']) > 0
        assert 'impact_estimate' in oee_rec
    
    def test_generate_oee_recommendation_medium_priority(
        self, db: Session, manufacturing_project: Project
    ):
        """Test OEE recommendation with medium priority (75% <= OEE < 85%)."""
        kpis = {
            'oee': 80.0,
            'availability': 85.0,
            'performance': 90.0,
            'quality': 95.0,
            'data_quality_score': 0.85
        }
        
        recommendations = recommendation_service.generate_recommendations(
            manufacturing_project.id, VerticalType.MANUFACTURING, kpis, db
        )
        
        oee_recs = [r for r in recommendations if 'OEE' in r['title']]
        assert len(oee_recs) > 0
        assert oee_recs[0]['priority'] == Priority.MEDIUM
    
    def test_no_oee_recommendation_when_good(
        self, db: Session, manufacturing_project: Project
    ):
        """Test no OEE recommendation when OEE >= 85%."""
        kpis = {
            'oee': 90.0,
            'availability': 95.0,
            'performance': 95.0,
            'quality': 99.0,
            'data_quality_score': 0.85
        }
        
        recommendations = recommendation_service.generate_recommendations(
            manufacturing_project.id, VerticalType.MANUFACTURING, kpis, db
        )
        
        oee_recs = [r for r in recommendations if 'OEE' in r['title']]
        assert len(oee_recs) == 0
    
    def test_generate_quality_recommendation(
        self, db: Session, manufacturing_project: Project
    ):
        """Test quality improvement recommendation."""
        kpis = {
            'oee': 85.0,
            'quality': 88.0,
            'data_quality_score': 0.85
        }
        
        recommendations = recommendation_service.generate_recommendations(
            manufacturing_project.id, VerticalType.MANUFACTURING, kpis, db
        )
        
        quality_recs = [r for r in recommendations if 'Defect' in r['title']]
        assert len(quality_recs) > 0
        
        quality_rec = quality_recs[0]
        assert quality_rec['priority'] == Priority.HIGH
        assert quality_rec['category'] == RecommendationCategory.QUALITY
        assert 'Statistical Process Control' in str(quality_rec['actions'])
    
    def test_generate_mttr_recommendation(
        self, db: Session, manufacturing_project: Project
    ):
        """Test MTTR reduction recommendation."""
        kpis = {
            'oee': 85.0,
            'quality': 95.0,
            'mttr': 5.0,
            'data_quality_score': 0.85
        }
        
        recommendations = recommendation_service.generate_recommendations(
            manufacturing_project.id, VerticalType.MANUFACTURING, kpis, db
        )
        
        mttr_recs = [r for r in recommendations if 'MTTR' in r['title']]
        assert len(mttr_recs) > 0
        
        mttr_rec = mttr_recs[0]
        assert mttr_rec['priority'] == Priority.MEDIUM
        assert mttr_rec['category'] == RecommendationCategory.MAINTENANCE
        assert 'spare parts' in str(mttr_rec['actions']).lower()


@pytest.mark.unit
class TestEnergyRecommendations:
    """Test energy recommendation generation."""
    
    def test_generate_peak_demand_recommendation(
        self, db: Session, energy_project: Project
    ):
        """Test peak demand cost reduction recommendation."""
        kpis = {
            'peak_demand_cost': 3000.0,
            'total_cost': 10000.0,
            'solar_contribution_pct': 15.0,
            'load_factor': 0.7,
            'data_quality_score': 0.85
        }
        
        recommendations = recommendation_service.generate_recommendations(
            energy_project.id, VerticalType.ENERGY, kpis, db
        )
        
        peak_recs = [r for r in recommendations if 'Peak Demand' in r['title']]
        assert len(peak_recs) > 0
        
        peak_rec = peak_recs[0]
        assert peak_rec['priority'] == Priority.HIGH
        assert peak_rec['category'] == RecommendationCategory.COST_REDUCTION
        assert 'load shifting' in peak_rec['description'].lower()
        assert 'impact_estimate' in peak_rec
        assert 'cost_savings_monthly' in peak_rec['impact_estimate']
    
    def test_no_peak_demand_recommendation_when_low(
        self, db: Session, energy_project: Project
    ):
        """Test no peak demand recommendation when cost is low."""
        kpis = {
            'peak_demand_cost': 1000.0,
            'total_cost': 10000.0,  # Only 10%
            'solar_contribution_pct': 15.0,
            'load_factor': 0.7,
            'data_quality_score': 0.85
        }
        
        recommendations = recommendation_service.generate_recommendations(
            energy_project.id, VerticalType.ENERGY, kpis, db
        )
        
        peak_recs = [r for r in recommendations if 'Peak Demand' in r['title']]
        assert len(peak_recs) == 0
    
    def test_generate_solar_recommendation(
        self, db: Session, energy_project: Project
    ):
        """Test solar/renewable energy recommendation."""
        kpis = {
            'peak_demand_cost': 1000.0,
            'total_cost': 10000.0,
            'solar_contribution_pct': 10.0,
            'load_factor': 0.7,
            'data_quality_score': 0.85
        }
        
        recommendations = recommendation_service.generate_recommendations(
            energy_project.id, VerticalType.ENERGY, kpis, db
        )
        
        solar_recs = [r for r in recommendations if 'Renewable' in r['title']]
        assert len(solar_recs) > 0
        
        solar_rec = solar_recs[0]
        assert solar_rec['priority'] == Priority.MEDIUM
        assert solar_rec['category'] == RecommendationCategory.EFFICIENCY
        assert 'solar' in solar_rec['description'].lower()
    
    def test_generate_load_factor_recommendation(
        self, db: Session, energy_project: Project
    ):
        """Test load factor improvement recommendation."""
        kpis = {
            'peak_demand_cost': 1000.0,
            'total_cost': 10000.0,
            'solar_contribution_pct': 25.0,
            'load_factor': 0.5,  # Low load factor
            'data_quality_score': 0.85
        }
        
        recommendations = recommendation_service.generate_recommendations(
            energy_project.id, VerticalType.ENERGY, kpis, db
        )
        
        load_recs = [r for r in recommendations if 'Load Factor' in r['title']]
        assert len(load_recs) > 0
        
        load_rec = load_recs[0]
        assert load_rec['priority'] == Priority.MEDIUM
        assert 'load curve' in load_rec['description'].lower()


@pytest.mark.unit
class TestRetailRecommendations:
    """Test retail recommendation generation."""
    
    def test_generate_inventory_turnover_recommendation(
        self, db: Session, retail_project: Project
    ):
        """Test inventory management recommendation."""
        kpis = {
            'inventory_turnover': 4.0,
            'stockout_rate': 2.0,
            'conversion_rate': 12.0,
            'data_quality_score': 0.85
        }
        
        recommendations = recommendation_service.generate_recommendations(
            retail_project.id, VerticalType.RETAIL, kpis, db
        )
        
        inventory_recs = [r for r in recommendations if 'Inventory' in r['title']]
        assert len(inventory_recs) > 0
        
        inventory_rec = inventory_recs[0]
        assert inventory_rec['priority'] == Priority.HIGH
        assert inventory_rec['category'] == RecommendationCategory.EFFICIENCY
        assert 'JIT' in str(inventory_rec['actions']) or 'just-in-time' in str(inventory_rec['actions']).lower()
    
    def test_no_inventory_recommendation_when_good(
        self, db: Session, retail_project: Project
    ):
        """Test no inventory recommendation when turnover >= 6."""
        kpis = {
            'inventory_turnover': 8.0,
            'stockout_rate': 2.0,
            'conversion_rate': 12.0,
            'data_quality_score': 0.85
        }
        
        recommendations = recommendation_service.generate_recommendations(
            retail_project.id, VerticalType.RETAIL, kpis, db
        )
        
        inventory_recs = [r for r in recommendations if 'Inventory' in r['title']]
        assert len(inventory_recs) == 0
    
    def test_generate_stockout_recommendation(
        self, db: Session, retail_project: Project
    ):
        """Test stockout reduction recommendation."""
        kpis = {
            'inventory_turnover': 7.0,
            'stockout_rate': 5.0,  # High stockout rate
            'conversion_rate': 12.0,
            'data_quality_score': 0.85
        }
        
        recommendations = recommendation_service.generate_recommendations(
            retail_project.id, VerticalType.RETAIL, kpis, db
        )
        
        stockout_recs = [r for r in recommendations if 'Stockout' in r['title']]
        assert len(stockout_recs) > 0
        
        stockout_rec = stockout_recs[0]
        assert stockout_rec['priority'] == Priority.HIGH
        assert 'safety stock' in str(stockout_rec['actions']).lower()
    
    def test_generate_conversion_rate_recommendation(
        self, db: Session, retail_project: Project
    ):
        """Test conversion rate improvement recommendation."""
        kpis = {
            'inventory_turnover': 7.0,
            'stockout_rate': 2.0,
            'conversion_rate': 8.0,  # Low conversion
            'data_quality_score': 0.85
        }
        
        recommendations = recommendation_service.generate_recommendations(
            retail_project.id, VerticalType.RETAIL, kpis, db
        )
        
        conversion_recs = [r for r in recommendations if 'Conversion' in r['title']]
        assert len(conversion_recs) > 0
        
        conversion_rec = conversion_recs[0]
        assert conversion_rec['priority'] == Priority.MEDIUM
        assert 'customer experience' in conversion_rec['description'].lower()


@pytest.mark.unit
class TestConfidenceScoring:
    """Test recommendation confidence scoring."""
    
    @pytest.mark.parametrize("data_quality,pattern_strength,expected", [
        (1.0, 1.0, 1.0),
        (0.8, 0.9, 0.86),  # 0.8*0.4 + 0.9*0.6
        (0.5, 0.8, 0.68),  # 0.5*0.4 + 0.8*0.6
        (0.0, 0.0, 0.0),
    ])
    def test_calculate_confidence_score(
        self, data_quality, pattern_strength, expected
    ):
        """Test confidence score calculation."""
        result = recommendation_service.calculate_confidence_score(
            data_quality, pattern_strength
        )
        
        assert result == pytest.approx(expected, rel=0.01)
    
    def test_confidence_score_weights_pattern_more(self):
        """Test that pattern strength is weighted more than data quality."""
        # Pattern strength weighted at 0.6, data quality at 0.4
        result1 = recommendation_service.calculate_confidence_score(
            data_quality=1.0, pattern_strength=0.5
        )
        result2 = recommendation_service.calculate_confidence_score(
            data_quality=0.5, pattern_strength=1.0
        )
        
        # Result2 should be higher because pattern is weighted more
        assert result2 > result1
    
    def test_confidence_score_in_range(self):
        """Test confidence score is always between 0 and 1."""
        for data_quality in [0.0, 0.5, 1.0]:
            for pattern_strength in [0.0, 0.5, 1.0]:
                result = recommendation_service.calculate_confidence_score(
                    data_quality, pattern_strength
                )
                assert 0.0 <= result <= 1.0


@pytest.mark.unit
class TestRecommendationPrioritization:
    """Test recommendation prioritization logic."""
    
    def test_prioritize_by_priority_level(self):
        """Test recommendations are sorted by priority level."""
        recommendations = [
            {
                'title': 'Low priority task',
                'priority': Priority.LOW,
                'confidence_score': 0.8
            },
            {
                'title': 'High priority task',
                'priority': Priority.HIGH,
                'confidence_score': 0.7
            },
            {
                'title': 'Medium priority task',
                'priority': Priority.MEDIUM,
                'confidence_score': 0.9
            }
        ]
        
        result = recommendation_service.prioritize_recommendations(recommendations)
        
        assert result[0]['priority'] == Priority.HIGH
        assert result[1]['priority'] == Priority.MEDIUM
        assert result[2]['priority'] == Priority.LOW
    
    def test_prioritize_by_confidence_within_priority(self):
        """Test recommendations with same priority are sorted by confidence."""
        recommendations = [
            {
                'title': 'Task A',
                'priority': Priority.HIGH,
                'confidence_score': 0.7
            },
            {
                'title': 'Task B',
                'priority': Priority.HIGH,
                'confidence_score': 0.9
            },
            {
                'title': 'Task C',
                'priority': Priority.HIGH,
                'confidence_score': 0.8
            }
        ]
        
        result = recommendation_service.prioritize_recommendations(recommendations)
        
        assert result[0]['confidence_score'] == 0.9
        assert result[1]['confidence_score'] == 0.8
        assert result[2]['confidence_score'] == 0.7
    
    def test_prioritize_mixed_priorities_and_confidence(self):
        """Test prioritization with mixed priorities and confidence scores."""
        recommendations = [
            {
                'title': 'Low with high confidence',
                'priority': Priority.LOW,
                'confidence_score': 0.95
            },
            {
                'title': 'High with low confidence',
                'priority': Priority.HIGH,
                'confidence_score': 0.6
            },
            {
                'title': 'High with high confidence',
                'priority': Priority.HIGH,
                'confidence_score': 0.9
            },
            {
                'title': 'Medium task',
                'priority': Priority.MEDIUM,
                'confidence_score': 0.8
            }
        ]
        
        result = recommendation_service.prioritize_recommendations(recommendations)
        
        # Order should be: HIGH priorities first (sorted by confidence), then MEDIUM, then LOW
        assert result[0]['title'] == 'High with high confidence'
        assert result[1]['title'] == 'High with low confidence'
        assert result[2]['title'] == 'Medium task'
        assert result[3]['title'] == 'Low with high confidence'
    
    def test_prioritize_handles_empty_list(self):
        """Test prioritization with empty list."""
        result = recommendation_service.prioritize_recommendations([])
        assert result == []


@pytest.mark.unit
class TestRecommendationService:
    """Test end-to-end recommendation service."""
    
    def test_generate_recommendations_invalid_project(self, db: Session):
        """Test recommendation generation with invalid project."""
        fake_project_id = uuid4()
        kpis = {'oee': 85.0}
        
        with pytest.raises(ValidationError, match="Project .* not found"):
            recommendation_service.generate_recommendations(
                fake_project_id, VerticalType.MANUFACTURING, kpis, db
            )
    
    def test_generate_recommendations_adds_confidence_scores(
        self, db: Session, manufacturing_project: Project
    ):
        """Test that all recommendations get confidence scores."""
        kpis = {
            'oee': 70.0,
            'quality': 88.0,
            'mttr': 5.0,
            'data_quality_score': 0.85
        }
        
        recommendations = recommendation_service.generate_recommendations(
            manufacturing_project.id, VerticalType.MANUFACTURING, kpis, db
        )
        
        assert len(recommendations) > 0
        for rec in recommendations:
            assert 'confidence_score' in rec
            assert 0.0 <= rec['confidence_score'] <= 1.0
    
    def test_generate_recommendations_returns_prioritized_list(
        self, db: Session, manufacturing_project: Project
    ):
        """Test that recommendations are returned prioritized."""
        kpis = {
            'oee': 70.0,
            'quality': 88.0,
            'mttr': 5.0,
            'data_quality_score': 0.85
        }
        
        recommendations = recommendation_service.generate_recommendations(
            manufacturing_project.id, VerticalType.MANUFACTURING, kpis, db
        )
        
        # Check that list is sorted by priority (HIGH before MEDIUM)
        priority_order = {Priority.CRITICAL: 4, Priority.HIGH: 3, Priority.MEDIUM: 2, Priority.LOW: 1}
        
        for i in range(len(recommendations) - 1):
            current_priority = priority_order.get(recommendations[i]['priority'], 0)
            next_priority = priority_order.get(recommendations[i + 1]['priority'], 0)
            assert current_priority >= next_priority
    
    def test_generate_recommendations_all_verticals(
        self, db: Session, manufacturing_project: Project, 
        energy_project: Project, retail_project: Project
    ):
        """Test recommendation generation for all verticals."""
        # Manufacturing
        mfg_recs = recommendation_service.generate_recommendations(
            manufacturing_project.id,
            VerticalType.MANUFACTURING,
            {'oee': 70.0, 'data_quality_score': 0.85},
            db
        )
        assert len(mfg_recs) > 0
        
        # Energy
        energy_recs = recommendation_service.generate_recommendations(
            energy_project.id,
            VerticalType.ENERGY,
            {
                'peak_demand_cost': 3000.0,
                'total_cost': 10000.0,
                'solar_contribution_pct': 10.0,
                'load_factor': 0.5,
                'data_quality_score': 0.85
            },
            db
        )
        assert len(energy_recs) > 0
        
        # Retail
        retail_recs = recommendation_service.generate_recommendations(
            retail_project.id,
            VerticalType.RETAIL,
            {
                'inventory_turnover': 4.0,
                'stockout_rate': 5.0,
                'conversion_rate': 8.0,
                'data_quality_score': 0.85
            },
            db
        )
        assert len(retail_recs) > 0
    
    def test_recommendations_include_required_fields(
        self, db: Session, manufacturing_project: Project
    ):
        """Test that all recommendations include required fields."""
        kpis = {
            'oee': 70.0,
            'quality': 88.0,
            'data_quality_score': 0.85
        }
        
        recommendations = recommendation_service.generate_recommendations(
            manufacturing_project.id, VerticalType.MANUFACTURING, kpis, db
        )
        
        required_fields = [
            'title', 'description', 'category', 'priority',
            'actions', 'impact_estimate', 'confidence_score'
        ]
        
        for rec in recommendations:
            for field in required_fields:
                assert field in rec, f"Missing field: {field}"
            
            # Verify actions is a list
            assert isinstance(rec['actions'], list)
            assert len(rec['actions']) > 0
            
            # Verify impact_estimate is a dict
            assert isinstance(rec['impact_estimate'], dict)
