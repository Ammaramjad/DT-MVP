import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { ScenarioCompareChart } from '../components/ScenarioCompareChart';
import { apiClient } from '../api/client';
import { toast } from '../utils/toast';
import type { Site, KPI, ComparisonDataPoint } from '../types';

export const Scenarios: React.FC = () => {
  const [sites, setSites] = useState<Site[]>([]);
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');
  const [selectedKpiId, setSelectedKpiId] = useState<string>('');
  const [scenarioName, setScenarioName] = useState('');
  const [horizonDays, setHorizonDays] = useState(30);
  const [variables, setVariables] = useState<Record<string, number>>({
    temperature: 0,
    efficiency: 0,
    demand: 0,
  });
  const [chartData, setChartData] = useState<ComparisonDataPoint[]>([]);
  const [running, setRunning] = useState(false);
  const [impactSummary, setImpactSummary] = useState<{
    avg_change: number;
    max_change: number;
    total_impact: number;
  } | null>(null);

  useEffect(() => {
    loadSites();
  }, []);

  useEffect(() => {
    if (selectedSiteId) {
      loadKPIs();
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

  const handleRunScenario = async () => {
    if (!selectedSiteId || !selectedKpiId || !scenarioName) {
      toast.error('Please fill in all required fields');
      return;
    }

    setRunning(true);
    try {
      const result = await apiClient.runScenario({
        site_id: selectedSiteId,
        kpi_id: selectedKpiId,
        scenario_name: scenarioName,
        variable_overrides: variables,
        horizon_days: horizonDays,
      });

      // Combine baseline and simulated data for comparison chart
      const data: ComparisonDataPoint[] = result.baseline_forecast.map((point, idx) => ({
        timestamp: point.timestamp,
        baseline: point.predicted_value,
        simulated: result.simulated_forecast[idx]?.predicted_value || point.predicted_value,
      }));

      setChartData(data);
      setImpactSummary(result.impact_summary);
      toast.success('Scenario simulation completed');
    } catch (error) {
      console.error('Failed to run scenario:', error);
      toast.error('Failed to run scenario simulation');
    } finally {
      setRunning(false);
    }
  };

  const handleVariableChange = (name: string, value: number) => {
    setVariables((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">What-If Scenarios</h1>

        {/* Configuration Panel */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Scenario Configuration</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
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
                Scenario Name
              </label>
              <input
                type="text"
                value={scenarioName}
                onChange={(e) => setScenarioName(e.target.value)}
                placeholder="e.g., Increased Efficiency"
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
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

          {/* Variable Overrides */}
          <div className="mb-6">
            <h3 className="text-md font-semibold mb-3">Variable Adjustments</h3>
            <div className="space-y-4">
              {Object.entries(variables).map(([name, value]) => (
                <div key={name}>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700 capitalize">
                      {name}
                    </label>
                    <span className="text-sm text-gray-600">
                      {value > 0 ? '+' : ''}{value}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={-50}
                    max={50}
                    step={5}
                    value={value}
                    onChange={(e) => handleVariableChange(name, parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>-50%</span>
                    <span>0%</span>
                    <span>+50%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleRunScenario}
            disabled={running || !selectedSiteId || !selectedKpiId || !scenarioName}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {running ? 'Running Simulation...' : 'Run Scenario'}
          </button>
        </div>

        {/* Impact Summary */}
        {impactSummary && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-600">Average Change</p>
              <p className="text-2xl font-semibold">
                {impactSummary.avg_change > 0 ? '+' : ''}
                {impactSummary.avg_change.toFixed(2)}%
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-600">Maximum Change</p>
              <p className="text-2xl font-semibold">
                {impactSummary.max_change > 0 ? '+' : ''}
                {impactSummary.max_change.toFixed(2)}%
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-600">Total Impact</p>
              <p className="text-2xl font-semibold">
                {impactSummary.total_impact > 0 ? '+' : ''}
                {impactSummary.total_impact.toFixed(2)}
              </p>
            </div>
          </div>
        )}

        {/* Comparison Chart */}
        <ScenarioCompareChart
          data={chartData}
          title="Baseline vs Simulated Scenario"
          height={500}
          loading={running}
        />
      </div>
    </Layout>
  );
};
