import React from 'react';
import { formatDateTime } from '../utils/format';
import type { Recommendation } from '../types';

interface RecommendationListProps {
  recommendations: Recommendation[];
  onUpdateStatus?: (id: string, status: string) => void;
  loading?: boolean;
}

export const RecommendationList: React.FC<RecommendationListProps> = ({
  recommendations,
  onUpdateStatus,
  loading = false,
}) => {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-600';
      case 'reviewed':
        return 'text-blue-600';
      case 'implemented':
        return 'text-green-600';
      case 'rejected':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!recommendations || recommendations.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-500 text-center py-8">No recommendations found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {recommendations.map((rec) => (
        <div
          key={rec.id}
          className={`bg-white rounded-lg shadow p-6 border-l-4 ${getPriorityColor(rec.priority)}`}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-lg font-semibold text-gray-900">{rec.title}</h3>
                <span
                  className={`px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(
                    rec.priority
                  )}`}
                >
                  {rec.priority}
                </span>
              </div>
              <p className="text-gray-700 mb-4">{rec.description}</p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Category:</span>{' '}
                  <span className="font-medium">{rec.category}</span>
                </div>
                <div>
                  <span className="text-gray-500">Estimated Impact:</span>{' '}
                  <span className="font-medium">{rec.estimated_impact.toFixed(1)}%</span>
                </div>
                <div>
                  <span className="text-gray-500">Confidence:</span>{' '}
                  <span className="font-medium">{(rec.confidence_score * 100).toFixed(0)}%</span>
                </div>
                <div>
                  <span className="text-gray-500">Status:</span>{' '}
                  <span className={`font-medium ${getStatusColor(rec.status)}`}>
                    {rec.status}
                  </span>
                </div>
              </div>
              <div className="mt-3 text-xs text-gray-500">
                Created: {formatDateTime(rec.created_at)}
              </div>
            </div>
            {onUpdateStatus && rec.status === 'pending' && (
              <div className="ml-4 flex flex-col gap-2">
                <button
                  onClick={() => onUpdateStatus(rec.id, 'reviewed')}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Mark Reviewed
                </button>
                <button
                  onClick={() => onUpdateStatus(rec.id, 'implemented')}
                  className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Implemented
                </button>
                <button
                  onClick={() => onUpdateStatus(rec.id, 'rejected')}
                  className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Reject
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
