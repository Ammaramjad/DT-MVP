// Authentication types
export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'operator' | 'viewer';
  organization_id: string;
  is_active: boolean;
  created_at: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
  organization_id: string;
}

// Organization types
export interface Organization {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  organization_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Site {
  id: string;
  name: string;
  description: string | null;
  project_id: string;
  location: string | null;
  metadata: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// KPI types
export interface KPI {
  id: string;
  name: string;
  description: string | null;
  unit: string;
  site_id: string;
  kpi_type: 'metric' | 'dimension';
  aggregation_method: 'sum' | 'avg' | 'min' | 'max' | 'count';
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface KPIValue {
  value: number;
  timestamp: string;
  trend?: 'up' | 'down' | 'stable';
  change_percent?: number;
}

// Forecast types
export interface ForecastPoint {
  timestamp: string;
  predicted_value: number;
  lower_bound: number;
  upper_bound: number;
  confidence: number;
}

export interface Forecast {
  id: string;
  site_id: string;
  kpi_id: string;
  model_type: string;
  forecast_horizon_days: number;
  forecast_data: ForecastPoint[];
  accuracy_metrics: {
    mape?: number;
    rmse?: number;
    mae?: number;
  };
  created_at: string;
  metadata: Record<string, any>;
}

export interface ForecastRequest {
  site_id: string;
  kpi_id: string;
  horizon_days: number;
  model_type?: string;
}

// Scenario types
export interface ScenarioVariable {
  name: string;
  current_value: number;
  override_value: number;
  unit: string;
}

export interface ScenarioRequest {
  site_id: string;
  kpi_id: string;
  scenario_name: string;
  variable_overrides: Record<string, number>;
  horizon_days: number;
}

export interface ScenarioResult {
  scenario_id: string;
  scenario_name: string;
  baseline_forecast: ForecastPoint[];
  simulated_forecast: ForecastPoint[];
  impact_summary: {
    avg_change: number;
    max_change: number;
    total_impact: number;
  };
  created_at: string;
}

// Anomaly/Alert types
export interface Anomaly {
  id: string;
  site_id: string;
  kpi_id: string;
  timestamp: string;
  detected_value: number;
  expected_value: number;
  anomaly_score: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  status: 'open' | 'acknowledged' | 'resolved';
  metadata: Record<string, any>;
  created_at: string;
}

// Recommendation types
export interface Recommendation {
  id: string;
  site_id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  estimated_impact: number;
  confidence_score: number;
  status: 'pending' | 'reviewed' | 'implemented' | 'rejected';
  created_at: string;
  metadata: Record<string, any>;
}

// Data Health types
export interface DataIngestionStatus {
  site_id: string;
  site_name: string;
  last_ingestion: string;
  total_records: number;
  status: 'healthy' | 'warning' | 'error';
  data_sources: {
    name: string;
    last_sync: string;
    status: string;
  }[];
}

export interface DataQualityScore {
  site_id: string;
  site_name: string;
  completeness: number;
  accuracy: number;
  timeliness: number;
  overall_score: number;
  issues: string[];
}

// API Response wrapper
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

// Chart data types
export interface TimeSeriesDataPoint {
  timestamp: string;
  actual?: number;
  predicted?: number;
  lower_bound?: number;
  upper_bound?: number;
}

export interface ComparisonDataPoint {
  timestamp: string;
  baseline: number;
  simulated: number;
}
