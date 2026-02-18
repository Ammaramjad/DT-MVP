import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  ComposedChart,
} from 'recharts';
import { formatDate, formatNumber } from '../utils/format';
import type { TimeSeriesDataPoint } from '../types';

interface TimeSeriesChartProps {
  data: TimeSeriesDataPoint[];
  title?: string;
  showConfidenceInterval?: boolean;
  height?: number;
  loading?: boolean;
}

export const TimeSeriesChart: React.FC<TimeSeriesChartProps> = ({
  data,
  title,
  showConfidenceInterval = false,
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
          No data available
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {title && <h3 className="text-lg font-semibold mb-4">{title}</h3>}
      <ResponsiveContainer width="100%" height={height}>
        {showConfidenceInterval ? (
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
            
            {/* Confidence interval area */}
            <Area
              type="monotone"
              dataKey="upper_bound"
              stroke="none"
              fill="#93c5fd"
              fillOpacity={0.3}
              name="Upper Bound"
            />
            <Area
              type="monotone"
              dataKey="lower_bound"
              stroke="none"
              fill="#93c5fd"
              fillOpacity={0.3}
              name="Lower Bound"
            />
            
            {/* Actual values */}
            {data.some((d) => d.actual !== undefined) && (
              <Line
                type="monotone"
                dataKey="actual"
                stroke="#2563eb"
                strokeWidth={2}
                dot={{ r: 3 }}
                name="Actual"
              />
            )}
            
            {/* Predicted values */}
            {data.some((d) => d.predicted !== undefined) && (
              <Line
                type="monotone"
                dataKey="predicted"
                stroke="#dc2626"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ r: 3 }}
                name="Predicted"
              />
            )}
          </ComposedChart>
        ) : (
          <LineChart data={data}>
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
            
            {data.some((d) => d.actual !== undefined) && (
              <Line
                type="monotone"
                dataKey="actual"
                stroke="#2563eb"
                strokeWidth={2}
                dot={{ r: 3 }}
                name="Actual"
              />
            )}
            
            {data.some((d) => d.predicted !== undefined) && (
              <Line
                type="monotone"
                dataKey="predicted"
                stroke="#dc2626"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ r: 3 }}
                name="Predicted"
              />
            )}
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
};
