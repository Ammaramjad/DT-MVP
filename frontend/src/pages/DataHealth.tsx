import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { AlertTable } from '../components/AlertTable';
import { apiClient } from '../api/client';
import { toast } from '../utils/toast';
import { formatDateTime } from '../utils/format';
import type { Site, DataIngestionStatus, DataQualityScore, Anomaly } from '../types';

export const DataHealth: React.FC = () => {
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');
  const [ingestionStatus, setIngestionStatus] = useState<DataIngestionStatus[]>([]);
  const [qualityScores, setQualityScores] = useState<DataQualityScore[]>([]);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSites();
  }, []);

  useEffect(() => {
    if (selectedSiteId) {
      loadDataHealth();
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

  const loadDataHealth = async () => {
    setLoading(true);
    try {
      const [ingestion, quality, anomaliesData] = await Promise.all([
        apiClient.getDataIngestionStatus(selectedSiteId),
        apiClient.getDataQualityScores(selectedSiteId),
        apiClient.getAnomalies(selectedSiteId, undefined, undefined, 1, 10),
      ]);

      setIngestionStatus(ingestion);
      setQualityScores(quality);
      setAnomalies(anomaliesData.items);
    } catch (error) {
      console.error('Failed to load data health:', error);
      toast.error('Failed to load data health information');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-100';
      case 'warning':
        return 'text-yellow-600 bg-yellow-100';
      case 'error':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Data Health</h1>

        {/* Site Selector */}
        <div className="bg-white rounded-lg shadow p-6">
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

        {/* Data Ingestion Status */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold">Data Ingestion Status</h2>
          </div>
          {loading ? (
            <div className="p-6 animate-pulse">
              <div className="h-20 bg-gray-200 rounded"></div>
            </div>
          ) : (
            <div className="p-6">
              {ingestionStatus.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No ingestion data available</p>
              ) : (
                <div className="space-y-4">
                  {ingestionStatus.map((status) => (
                    <div key={status.site_id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium">{status.site_name}</h3>
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                            status.status
                          )}`}
                        >
                          {status.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Last Ingestion:</span>{' '}
                          <span className="font-medium">
                            {formatDateTime(status.last_ingestion)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Total Records:</span>{' '}
                          <span className="font-medium">{status.total_records.toLocaleString()}</span>
                        </div>
                      </div>
                      {status.data_sources.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs text-gray-600 mb-2">Data Sources:</p>
                          <div className="space-y-1">
                            {status.data_sources.map((source, idx) => (
                              <div key={idx} className="flex items-center justify-between text-xs">
                                <span>{source.name}</span>
                                <span className="text-gray-500">
                                  {formatDateTime(source.last_sync)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Data Quality Scores */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold">Data Quality Scores</h2>
          </div>
          {loading ? (
            <div className="p-6 animate-pulse">
              <div className="h-40 bg-gray-200 rounded"></div>
            </div>
          ) : (
            <div className="p-6">
              {qualityScores.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No quality data available</p>
              ) : (
                <div className="space-y-6">
                  {qualityScores.map((score) => (
                    <div key={score.site_id}>
                      <h3 className="font-medium mb-4">{score.site_name}</h3>
                      <div className="grid grid-cols-4 gap-4 mb-4">
                        <div className="text-center">
                          <p className="text-sm text-gray-600 mb-1">Completeness</p>
                          <p className={`text-2xl font-semibold ${getScoreColor(score.completeness)}`}>
                            {score.completeness.toFixed(1)}%
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-gray-600 mb-1">Accuracy</p>
                          <p className={`text-2xl font-semibold ${getScoreColor(score.accuracy)}`}>
                            {score.accuracy.toFixed(1)}%
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-gray-600 mb-1">Timeliness</p>
                          <p className={`text-2xl font-semibold ${getScoreColor(score.timeliness)}`}>
                            {score.timeliness.toFixed(1)}%
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-gray-600 mb-1">Overall</p>
                          <p className={`text-2xl font-semibold ${getScoreColor(score.overall_score)}`}>
                            {score.overall_score.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                      {score.issues.length > 0 && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                          <p className="text-sm font-medium text-yellow-800 mb-2">Issues:</p>
                          <ul className="text-sm text-yellow-700 list-disc list-inside space-y-1">
                            {score.issues.map((issue, idx) => (
                              <li key={idx}>{issue}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Recent Anomalies */}
        <AlertTable alerts={anomalies} loading={loading} />
      </div>
    </Layout>
  );
};
