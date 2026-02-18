import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { KPICard } from '../components/KPICard';
import { TimeSeriesChart } from '../components/TimeSeriesChart';
import { AlertTable } from '../components/AlertTable';
import { apiClient } from '../api/client';
import { toast } from '../utils/toast';
import type { Site, Anomaly, TimeSeriesDataPoint } from '../types';

export const Dashboard: React.FC = () => {
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');
  const [alerts, setAlerts] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<TimeSeriesDataPoint[]>([]);

  useEffect(() => {
    loadSites();
  }, []);

  useEffect(() => {
    if (selectedSiteId) {
      loadDashboardData();
    }
  }, [selectedSiteId]);

  const loadSites = async () => {
    try {
      const response = await apiClient.getSites();
      setSites(response.items);
      if (response.items.length > 0) {
        setSelectedSiteId(response.items[0].id);
      }
    } catch (error) {
      console.error('Failed to load sites:', error);
      toast.error('Failed to load sites');
    }
  };

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Load recent alerts
      const alertsResponse = await apiClient.getAnomalies(selectedSiteId, undefined, 'open', 1, 5);
      setAlerts(alertsResponse.items);

      // Load recent forecasts for chart
      const forecastsResponse = await apiClient.getForecasts(selectedSiteId, undefined, 1, 1);
      if (forecastsResponse.items.length > 0) {
        const forecast = forecastsResponse.items[0];
        const data: TimeSeriesDataPoint[] = forecast.forecast_data.map((point) => ({
          timestamp: point.timestamp,
          predicted: point.predicted_value,
          lower_bound: point.lower_bound,
          upper_bound: point.upper_bound,
        }));
        setChartData(data);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAlertStatus = async (id: string, status: string) => {
    try {
      await apiClient.updateAnomaly(id, { status: status as any });
      toast.success('Alert status updated');
      loadDashboardData();
    } catch (error) {
      console.error('Failed to update alert:', error);
      toast.error('Failed to update alert status');
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">Site:</label>
            <select
              value={selectedSiteId}
              onChange={(e) => setSelectedSiteId(e.target.value)}
              className="block w-64 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard
            label="Active Alerts"
            value={alerts.length}
            trend={alerts.length > 5 ? 'up' : alerts.length > 2 ? 'stable' : 'down'}
            loading={loading}
          />
          <KPICard
            label="Data Quality"
            value={95.5}
            unit="%"
            trend="up"
            changePercent={0.025}
            loading={loading}
          />
          <KPICard
            label="Forecast Accuracy"
            value={87.3}
            unit="%"
            trend="stable"
            loading={loading}
          />
          <KPICard
            label="Recommendations"
            value={12}
            trend="up"
            changePercent={0.15}
            loading={loading}
          />
        </div>

        {/* Forecast Chart */}
        <TimeSeriesChart
          data={chartData}
          title="Latest Forecast"
          showConfidenceInterval={true}
          loading={loading}
        />

        {/* Recent Alerts */}
        <AlertTable
          alerts={alerts}
          onUpdateStatus={handleUpdateAlertStatus}
          loading={loading}
        />
      </div>
    </Layout>
  );
};
