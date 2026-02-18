"""
Recommendation service for generating AI-powered insights and recommendations.
"""
from typing import Dict, Any, List
from uuid import UUID
from sqlalchemy.orm import Session

from app.models.recommendation import (
    Recommendation, 
    RecommendationCategory, 
    Priority,
    RecommendationStatus
)
from app.models.project import Project, VerticalType
from app.core.exceptions import ValidationError


def generate_recommendations(
    project_id: UUID,
    vertical: VerticalType,
    kpis: Dict[str, Any],
    db: Session
) -> List[Dict[str, Any]]:
    """
    Generate recommendations based on KPI analysis using rule-based engine.
    
    Args:
        project_id: Project identifier
        vertical: Industry vertical type
        kpis: Dictionary of computed KPIs
        db: Database session
        
    Returns:
        List of recommendation dictionaries
        
    Raises:
        ValidationError: If project doesn't exist
    """
    # Validate project exists
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise ValidationError(f"Project {project_id} not found")
    
    recommendations = []
    
    if vertical == VerticalType.MANUFACTURING:
        recommendations = _generate_manufacturing_recommendations(kpis)
    elif vertical == VerticalType.ENERGY:
        recommendations = _generate_energy_recommendations(kpis)
    elif vertical == VerticalType.RETAIL:
        recommendations = _generate_retail_recommendations(kpis)
    
    # Add confidence scores and prioritize
    for rec in recommendations:
        rec['confidence_score'] = calculate_confidence_score(
            data_quality=kpis.get('data_quality_score', 0.8),
            pattern_strength=rec.get('pattern_strength', 0.75)
        )
    
    # Prioritize recommendations
    prioritized = prioritize_recommendations(recommendations)
    
    return prioritized


def _generate_manufacturing_recommendations(kpis: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Generate manufacturing-specific recommendations."""
    recommendations = []
    
    # OEE improvement recommendation
    oee = kpis.get('oee', 0)
    if oee < 85:
        recommendations.append({
            'title': 'Improve Overall Equipment Effectiveness (OEE)',
            'description': f'Current OEE is {oee:.1f}%, below industry benchmark of 85%. '
                          'Focus on reducing downtime and improving quality.',
            'category': RecommendationCategory.OPTIMIZATION,
            'priority': Priority.HIGH if oee < 75 else Priority.MEDIUM,
            'actions': [
                'Analyze downtime patterns to identify recurring issues',
                'Implement preventive maintenance schedule',
                'Train operators on best practices'
            ],
            'impact_estimate': {
                'oee_improvement': 85 - oee,
                'cost_savings_monthly': (85 - oee) * 500  # Rough estimate
            },
            'pattern_strength': 0.85
        })
    
    # Quality improvement
    quality = kpis.get('quality', 0)
    if quality < 95:
        recommendations.append({
            'title': 'Reduce Defect Rate',
            'description': f'Quality score is {quality:.1f}%. Implementing quality controls '
                          'could reduce waste and rework costs.',
            'category': RecommendationCategory.QUALITY,
            'priority': Priority.HIGH if quality < 90 else Priority.MEDIUM,
            'actions': [
                'Implement Statistical Process Control (SPC)',
                'Review and update quality checkpoints',
                'Conduct root cause analysis on defects'
            ],
            'impact_estimate': {
                'quality_improvement': 95 - quality,
                'waste_reduction_pct': (95 - quality) / 2
            },
            'pattern_strength': 0.8
        })
    
    # MTTR reduction
    mttr = kpis.get('mttr', 0)
    if mttr > 3:
        recommendations.append({
            'title': 'Reduce Mean Time To Repair (MTTR)',
            'description': f'Current MTTR is {mttr:.1f} hours. Reducing repair time '
                          'will improve availability.',
            'category': RecommendationCategory.MAINTENANCE,
            'priority': Priority.MEDIUM,
            'actions': [
                'Stock critical spare parts on-site',
                'Provide advanced troubleshooting training',
                'Implement predictive maintenance'
            ],
            'impact_estimate': {
                'mttr_reduction_hours': mttr - 2,
                'availability_improvement': (mttr - 2) * 0.5
            },
            'pattern_strength': 0.75
        })
    
    return recommendations


def _generate_energy_recommendations(kpis: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Generate energy-specific recommendations."""
    recommendations = []
    
    # Peak demand cost reduction
    peak_cost = kpis.get('peak_demand_cost', 0)
    total_cost = kpis.get('total_cost', 1)
    if peak_cost / total_cost > 0.25:
        recommendations.append({
            'title': 'Reduce Peak Demand Charges',
            'description': f'Peak demand costs represent {(peak_cost/total_cost)*100:.1f}% '
                          'of total energy costs. Load shifting could reduce this.',
            'category': RecommendationCategory.COST_REDUCTION,
            'priority': Priority.HIGH,
            'actions': [
                'Analyze load profiles to identify peak usage patterns',
                'Shift non-critical loads to off-peak hours',
                'Consider battery storage for peak shaving'
            ],
            'impact_estimate': {
                'cost_savings_monthly': peak_cost * 0.3,
                'payback_period_months': 18
            },
            'pattern_strength': 0.9
        })
    
    # Solar contribution
    solar_pct = kpis.get('solar_contribution_pct', 0)
    if solar_pct < 20:
        recommendations.append({
            'title': 'Increase Renewable Energy Usage',
            'description': f'Solar contribution is only {solar_pct:.1f}%. Expanding '
                          'solar capacity could reduce costs and emissions.',
            'category': RecommendationCategory.EFFICIENCY,
            'priority': Priority.MEDIUM,
            'actions': [
                'Conduct solar feasibility assessment',
                'Evaluate rooftop and ground-mount options',
                'Investigate power purchase agreements (PPAs)'
            ],
            'impact_estimate': {
                'cost_savings_monthly': total_cost * 0.15,
                'carbon_reduction_kg': kpis.get('carbon_emissions', 0) * 0.2
            },
            'pattern_strength': 0.7
        })
    
    # Load factor improvement
    load_factor = kpis.get('load_factor', 1)
    if load_factor < 0.6:
        recommendations.append({
            'title': 'Improve Load Factor',
            'description': f'Load factor is {load_factor:.2f}. Flattening the load curve '
                          'improves efficiency and reduces demand charges.',
            'category': RecommendationCategory.EFFICIENCY,
            'priority': Priority.MEDIUM,
            'actions': [
                'Schedule energy-intensive processes more evenly',
                'Implement demand response programs',
                'Use thermal or battery storage for load balancing'
            ],
            'impact_estimate': {
                'load_factor_improvement': 0.7 - load_factor,
                'efficiency_gain_pct': (0.7 - load_factor) * 10
            },
            'pattern_strength': 0.75
        })
    
    return recommendations


def _generate_retail_recommendations(kpis: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Generate retail-specific recommendations."""
    recommendations = []
    
    # Inventory turnover
    turnover = kpis.get('inventory_turnover', 0)
    if turnover < 6:
        recommendations.append({
            'title': 'Optimize Inventory Management',
            'description': f'Inventory turnover is {turnover:.1f}x, below optimal range. '
                          'Excess inventory ties up capital.',
            'category': RecommendationCategory.EFFICIENCY,
            'priority': Priority.HIGH,
            'actions': [
                'Implement just-in-time (JIT) inventory practices',
                'Review slow-moving SKUs for clearance',
                'Improve demand forecasting accuracy'
            ],
            'impact_estimate': {
                'turnover_improvement': 8 - turnover,
                'working_capital_released': 50000
            },
            'pattern_strength': 0.85
        })
    
    # Stockout rate
    stockout_rate = kpis.get('stockout_rate', 0)
    if stockout_rate > 3:
        recommendations.append({
            'title': 'Reduce Stockout Rate',
            'description': f'Stockout rate is {stockout_rate:.1f}%, leading to lost sales. '
                          'Better inventory planning needed.',
            'category': RecommendationCategory.EFFICIENCY,
            'priority': Priority.HIGH,
            'actions': [
                'Set safety stock levels for high-demand items',
                'Improve supplier lead time management',
                'Implement automated reorder points'
            ],
            'impact_estimate': {
                'stockout_reduction': stockout_rate - 1,
                'revenue_recovery_monthly': 10000
            },
            'pattern_strength': 0.8
        })
    
    # Conversion rate
    conversion_rate = kpis.get('conversion_rate', 0)
    if conversion_rate < 10:
        recommendations.append({
            'title': 'Improve Store Conversion Rate',
            'description': f'Conversion rate is {conversion_rate:.1f}%. Enhancing '
                          'customer experience could boost sales.',
            'category': RecommendationCategory.EFFICIENCY,
            'priority': Priority.MEDIUM,
            'actions': [
                'Train staff on customer engagement techniques',
                'Optimize store layout and product placement',
                'Implement targeted promotions'
            ],
            'impact_estimate': {
                'conversion_improvement': 12 - conversion_rate,
                'revenue_uplift_monthly': 15000
            },
            'pattern_strength': 0.7
        })
    
    return recommendations


def calculate_confidence_score(data_quality: float, pattern_strength: float) -> float:
    """
    Calculate confidence score for recommendations.
    
    Args:
        data_quality: Data quality score (0-1)
        pattern_strength: Strength of detected pattern (0-1)
        
    Returns:
        Confidence score between 0 and 1
    """
    # Weighted average favoring pattern strength
    confidence = (data_quality * 0.4 + pattern_strength * 0.6)
    return round(min(max(confidence, 0.0), 1.0), 4)


def prioritize_recommendations(recommendations: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Sort recommendations by priority and impact.
    
    Args:
        recommendations: List of recommendation dictionaries
        
    Returns:
        Sorted list of recommendations
    """
    # Priority order
    priority_order = {
        Priority.CRITICAL: 4,
        Priority.HIGH: 3,
        Priority.MEDIUM: 2,
        Priority.LOW: 1
    }
    
    def sort_key(rec):
        priority_score = priority_order.get(rec.get('priority', Priority.LOW), 0)
        confidence = rec.get('confidence_score', 0.5)
        return (priority_score, confidence)
    
    return sorted(recommendations, key=sort_key, reverse=True)
