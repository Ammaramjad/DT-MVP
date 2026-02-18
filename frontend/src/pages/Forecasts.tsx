import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { TimeSeriesChart } from '../components/TimeSeriesChart';
import { apiClient } from '../api/client';
import { toast } from '../utils/toast';
import type { Site, KPI, TimeSeriesDataPoint } from '../types';

export const Forecasts: React.FC = () => {
  const [sites, setSites] = useState<Site[]>([]);
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');
  const [selectedKpiId, setSelectedKpiId] = useState<string>('');
  const [horizonDays, setHorizonDays] = useState(30);
  const [chartData, setChartData] = useState<TimeSeriesDataPoint[]>([]);
  const [generating, setGenerating] = useState(false);
  const [accuracy, setAccuracy] = useState<{ mape?: number; rmse?: number; mae?: number }>({});

  useEffect(() => {
    loadSites();
  }, []);

  useEffect(() => {
    if (selectedSiteId) {
      loadKPIs();
    }
  }, [selectedSiteId]);
    // eslint-disable-next-line react-hooks/exhaustive-deps

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

  const loadKPIs = async () => {
    try {
      const response = await apiClient.getKPIs(selectedSiteId);
      setKpis(response.items);
      if (response.items.length > 0) {
        setSelectedKpiId(response.items[0].id);
      }
    } catch (error) {
      console.error('Failed to load KPIs:', error);
      toast.error('Failed to load KPIs');
    }
  };

  const handleGenerateForecast = async () => {
    if (!selectedSiteId || !selectedKpiId) {
      toast.error('Please select a site and KPI');
      return;
    }

    setGenerating(true);
    try {
      const forecast = await apiClient.generateForecast({
        site_id: selectedSiteId,
        kpi_id: selectedKpiId,
        horizon_days: horizonDays,
      });

      const data: TimeSeriesDataPoint[] = forecast.forecast_data.map((point) => ({
        timestamp: point.timestamp,
        predicted: point.predicted_value,
        lower_bound: point.lower_bound,
        upper_bound: point.upper_bound,
      }));

      setChartData(data);
      setAccuracy(forecast.accuracy_metrics);
      toast.success('Forecast generated successfully');
    } catch (error) {
      console.error('Failed to generate forecast:', error);
      toast.error('Failed to generate forecast');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Forecasts</h1>

        {/* Configuration Panel */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Generate Forecast</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Site
              </label>
              <select
                value={selectedSiteId}
                onChange={(e) => setSelectedSiteId(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                KPI
              </label>
              <select
                value={selectedKpiId}
                onChange={(e) => setSelectedKpiId(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                {kpis.map((kpi) => (
                  <option key={kpi.id} value={kpi.id}>
                    {kpi.name} ({kpi.unit})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Forecast Horizon (Days)
              </label>
              <input
                type="number"
                value={horizonDays}
                onChange={(e) => setHorizonDays(parseInt(e.target.value))}
                min={7}
                max={365}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="mt-4">
            <button
              onClick={handleGenerateForecast}
              disabled={generating || !selectedSiteId || !selectedKpiId}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? 'Generating...' : 'Generate Forecast'}
            </button>
          </div>
        </div>

        {/* Accuracy Metrics */}
        {Object.keys(accuracy).length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {accuracy.mape !== undefined && (
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-sm text-gray-600">MAPE</p>
                <p className="text-2xl font-semibold">{accuracy.mape.toFixed(2)}%</p>
              </div>
            )}
            {accuracy.rmse !== undefined && (
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-sm text-gray-600">RMSE</p>
                <p className="text-2xl font-semibold">{accuracy.rmse.toFixed(2)}</p>
              </div>
            )}
            {accuracy.mae !== undefined && (
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-sm text-gray-600">MAE</p>
                <p className="text-2xl font-semibold">{accuracy.mae.toFixed(2)}</p>
              </div>
            )}
          </div>
        )}

        {/* Forecast Chart */}
        <TimeSeriesChart
          data={chartData}
          title="Forecast Results"
          showConfidenceInterval={true}
          height={500}
          loading={generating}
        />
      </div>
    </Layout>
  );
};
