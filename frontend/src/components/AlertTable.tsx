import React from 'react';
import { formatDateTime } from '../utils/format';
import type { Anomaly } from '../types';

interface AlertTableProps {
  alerts: Anomaly[];
  onUpdateStatus?: (id: string, status: string) => void;
  loading?: boolean;
}

export const AlertTable: React.FC<AlertTableProps> = ({
  alerts,
  onUpdateStatus,
  loading = false,
}) => {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-red-100 text-red-800';
      case 'acknowledged':
        return 'bg-yellow-100 text-yellow-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="animate-pulse p-6">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!alerts || alerts.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Alerts</h3>
        <p className="text-gray-500 text-center py-8">No alerts found</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold">Alerts & Anomalies</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Severity
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Values
              </th>
              {onUpdateStatus && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {alerts.map((alert) => (
              <tr key={alert.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatDateTime(alert.timestamp)}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {alert.description}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getSeverityColor(
                      alert.severity
                    )}`}
                  >
                    {alert.severity}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                      alert.status
                    )}`}
                  >
                    {alert.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div>
                    <div>Detected: {alert.detected_value.toFixed(2)}</div>
                    <div className="text-gray-500">
                      Expected: {alert.expected_value.toFixed(2)}
                    </div>
                  </div>
                </td>
                {onUpdateStatus && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {alert.status === 'open' && (
                      <button
                        onClick={() => onUpdateStatus(alert.id, 'acknowledged')}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Acknowledge
                      </button>
                    )}
                    {alert.status === 'acknowledged' && (
                      <button
                        onClick={() => onUpdateStatus(alert.id, 'resolved')}
                        className="text-green-600 hover:text-green-900"
                      >
                        Resolve
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
