import React from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { formatDate, formatNumber } from '../utils/format';
import type { ComparisonDataPoint } from '../types';

interface ScenarioCompareChartProps {
  data: ComparisonDataPoint[];
  title?: string;
  height?: number;
  loading?: boolean;
}

export const ScenarioCompareChart: React.FC<ScenarioCompareChartProps> = ({
  data,
  title,
  height = 400,
  loading = false,
}) => {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        {title && <h3 className="text-lg font-semibold mb-4">{title}</h3>}
        <div className="animate-pulse">
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        {title && <h3 className="text-lg font-semibold mb-4">{title}</h3>}
        <div className="flex items-center justify-center h-64 text-gray-500">
          No comparison data available
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {title && <h3 className="text-lg font-semibold mb-4">{title}</h3>}
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="timestamp"
            tickFormatter={(value) => formatDate(value)}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis tickFormatter={(value) => formatNumber(value, 0)} />
          <Tooltip
            labelFormatter={(value) => formatDate(value as string)}
            formatter={(value) => formatNumber(value as number, 2)}
          />
          <Legend />
          <Bar dataKey="baseline" fill="#3b82f6" name="Baseline" />
          <Line
            type="monotone"
            dataKey="simulated"
            stroke="#ef4444"
            strokeWidth={3}
            dot={{ r: 4 }}
            name="Simulated"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};
