import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { RecommendationList } from '../components/RecommendationList';
import { apiClient } from '../api/client';
import { toast } from '../utils/toast';
import type { Site, Recommendation } from '../types';

export const Recommendations: React.FC = () => {
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  useEffect(() => {
    loadSites();
  }, []);

  useEffect(() => {
    if (selectedSiteId) {
      loadRecommendations();
    }
  }, [selectedSiteId, priorityFilter, statusFilter]);

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

  const loadRecommendations = async () => {
    setLoading(true);
    try {
      const response = await apiClient.getRecommendations(
        selectedSiteId,
        priorityFilter || undefined,
        statusFilter || undefined
      );
      setRecommendations(response.items);
    } catch (error) {
      console.error('Failed to load recommendations:', error);
      toast.error('Failed to load recommendations');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await apiClient.updateRecommendation(id, { status: status as any });
      toast.success('Recommendation status updated');
      loadRecommendations();
    } catch (error) {
      console.error('Failed to update recommendation:', error);
      toast.error('Failed to update recommendation status');
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">AI Recommendations</h1>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6">
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
                Priority
              </label>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Priorities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="reviewed">Reviewed</option>
                <option value="implemented">Implemented</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        </div>

        {/* Recommendations List */}
        <RecommendationList
          recommendations={recommendations}
          onUpdateStatus={handleUpdateStatus}
          loading={loading}
        />
      </div>
    </Layout>
  );
};
