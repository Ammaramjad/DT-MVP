import axios, { type AxiosInstance, AxiosError } from 'axios';
import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  User,
  Organization,
  Project,
  Site,
  KPI,
  Forecast,
  ForecastRequest,
  ScenarioRequest,
  ScenarioResult,
  Anomaly,
  Recommendation,
  DataIngestionStatus,
  DataQualityScore,
  PaginatedResponse,
} from '../types';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

class ApiClient {
  private client: AxiosInstance;
  private refreshPromise: Promise<string> | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add token
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('access_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor to handle token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as any;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const newToken = await this.refreshToken();
            if (newToken && originalRequest) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              return this.client(originalRequest);
            }
          } catch (refreshError) {
            // Refresh failed, logout
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('user');
            window.location.href = '/login';
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  // Auth endpoints
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const formData = new URLSearchParams();
    formData.append('username', credentials.username);
    formData.append('password', credentials.password);

    const response = await this.client.post<LoginResponse>(
      '/api/v1/auth/login',
      formData,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );
    return response.data;
  }

  async register(data: RegisterRequest): Promise<User> {
    const response = await this.client.post<User>('/api/v1/auth/register', data);
    return response.data;
  }

  async refreshToken(): Promise<string> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        const response = await axios.post<LoginResponse>(
          `${BASE_URL}/api/v1/auth/refresh`,
          { refresh_token: refreshToken }
        );

        const { access_token } = response.data;
        localStorage.setItem('access_token', access_token);
        return access_token;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  async getCurrentUser(): Promise<User> {
    const response = await this.client.get<User>('/api/v1/auth/me');
    return response.data;
  }

  // Organization endpoints
  async getOrganizations(page = 1, size = 50): Promise<PaginatedResponse<Organization>> {
    const response = await this.client.get<PaginatedResponse<Organization>>(
      '/api/v1/organizations/',
      { params: { page, size } }
    );
    return response.data;
  }

  async getOrganization(id: string): Promise<Organization> {
    const response = await this.client.get<Organization>(`/api/v1/organizations/${id}`);
    return response.data;
  }

  async createOrganization(data: Partial<Organization>): Promise<Organization> {
    const response = await this.client.post<Organization>('/api/v1/organizations/', data);
    return response.data;
  }

  async updateOrganization(id: string, data: Partial<Organization>): Promise<Organization> {
    const response = await this.client.put<Organization>(`/api/v1/organizations/${id}`, data);
    return response.data;
  }

  // Project endpoints
  async getProjects(organizationId?: string, page = 1, size = 50): Promise<PaginatedResponse<Project>> {
    const params: any = { page, size };
    if (organizationId) params.organization_id = organizationId;
    
    const response = await this.client.get<PaginatedResponse<Project>>(
      '/api/v1/projects/',
      { params }
    );
    return response.data;
  }

  async getProject(id: string): Promise<Project> {
    const response = await this.client.get<Project>(`/api/v1/projects/${id}`);
    return response.data;
  }

  async createProject(data: Partial<Project>): Promise<Project> {
    const response = await this.client.post<Project>('/api/v1/projects/', data);
    return response.data;
  }

  async updateProject(id: string, data: Partial<Project>): Promise<Project> {
    const response = await this.client.put<Project>(`/api/v1/projects/${id}`, data);
    return response.data;
  }

  // Site endpoints
  async getSites(projectId?: string, page = 1, size = 50): Promise<PaginatedResponse<Site>> {
    const params: any = { page, size };
    if (projectId) params.project_id = projectId;
    
    const response = await this.client.get<PaginatedResponse<Site>>(
      '/api/v1/sites/',
      { params }
    );
    return response.data;
  }

  async getSite(id: string): Promise<Site> {
    const response = await this.client.get<Site>(`/api/v1/sites/${id}`);
    return response.data;
  }

  async createSite(data: Partial<Site>): Promise<Site> {
    const response = await this.client.post<Site>('/api/v1/sites/', data);
    return response.data;
  }

  async updateSite(id: string, data: Partial<Site>): Promise<Site> {
    const response = await this.client.put<Site>(`/api/v1/sites/${id}`, data);
    return response.data;
  }

  // KPI endpoints
  async getKPIs(siteId?: string, page = 1, size = 50): Promise<PaginatedResponse<KPI>> {
    const params: any = { page, size };
    if (siteId) params.site_id = siteId;
    
    const response = await this.client.get<PaginatedResponse<KPI>>(
      '/api/v1/kpis/',
      { params }
    );
    return response.data;
  }

  async getKPI(id: string): Promise<KPI> {
    const response = await this.client.get<KPI>(`/api/v1/kpis/${id}`);
    return response.data;
  }

  // Forecast endpoints
  async generateForecast(data: ForecastRequest): Promise<Forecast> {
    const response = await this.client.post<Forecast>('/api/v1/ml/forecast', data);
    return response.data;
  }

  async getForecast(id: string): Promise<Forecast> {
    const response = await this.client.get<Forecast>(`/api/v1/ml/forecasts/${id}`);
    return response.data;
  }

  async getForecasts(siteId?: string, kpiId?: string, page = 1, size = 20): Promise<PaginatedResponse<Forecast>> {
    const params: any = { page, size };
    if (siteId) params.site_id = siteId;
    if (kpiId) params.kpi_id = kpiId;
    
    const response = await this.client.get<PaginatedResponse<Forecast>>(
      '/api/v1/ml/forecasts',
      { params }
    );
    return response.data;
  }

  // Scenario endpoints
  async runScenario(data: ScenarioRequest): Promise<ScenarioResult> {
    const response = await this.client.post<ScenarioResult>('/api/v1/ml/scenario', data);
    return response.data;
  }

  async getScenarios(siteId?: string, page = 1, size = 20): Promise<PaginatedResponse<ScenarioResult>> {
    const params: any = { page, size };
    if (siteId) params.site_id = siteId;
    
    const response = await this.client.get<PaginatedResponse<ScenarioResult>>(
      '/api/v1/ml/scenarios',
      { params }
    );
    return response.data;
  }

  // Anomaly endpoints
  async getAnomalies(
    siteId?: string,
    severity?: string,
    status?: string,
    page = 1,
    size = 50
  ): Promise<PaginatedResponse<Anomaly>> {
    const params: any = { page, size };
    if (siteId) params.site_id = siteId;
    if (severity) params.severity = severity;
    if (status) params.status = status;
    
    const response = await this.client.get<PaginatedResponse<Anomaly>>(
      '/api/v1/anomalies/',
      { params }
    );
    return response.data;
  }

  async updateAnomaly(id: string, data: Partial<Anomaly>): Promise<Anomaly> {
    const response = await this.client.put<Anomaly>(`/api/v1/anomalies/${id}`, data);
    return response.data;
  }

  // Recommendation endpoints
  async getRecommendations(
    siteId?: string,
    priority?: string,
    status?: string,
    page = 1,
    size = 50
  ): Promise<PaginatedResponse<Recommendation>> {
    const params: any = { page, size };
    if (siteId) params.site_id = siteId;
    if (priority) params.priority = priority;
    if (status) params.status = status;
    
    const response = await this.client.get<PaginatedResponse<Recommendation>>(
      '/api/v1/recommendations/',
      { params }
    );
    return response.data;
  }

  async updateRecommendation(id: string, data: Partial<Recommendation>): Promise<Recommendation> {
    const response = await this.client.put<Recommendation>(`/api/v1/recommendations/${id}`, data);
    return response.data;
  }

  // Data Health endpoints
  async getDataIngestionStatus(siteId?: string): Promise<DataIngestionStatus[]> {
    const params: any = {};
    if (siteId) params.site_id = siteId;
    
    const response = await this.client.get<DataIngestionStatus[]>(
      '/api/v1/data-health/ingestion',
      { params }
    );
    return response.data;
  }

  async getDataQualityScores(siteId?: string): Promise<DataQualityScore[]> {
    const params: any = {};
    if (siteId) params.site_id = siteId;
    
    const response = await this.client.get<DataQualityScore[]>(
      '/api/v1/data-health/quality',
      { params }
    );
    return response.data;
  }
}

export const apiClient = new ApiClient();
