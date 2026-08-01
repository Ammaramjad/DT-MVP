import React from 'react';
import { ArrowUpIcon, ArrowDownIcon, MinusIcon } from '@heroicons/react/24/solid';
import { formatNumber, formatChange } from '../utils/format';

interface KPICardProps {
  label: string;
  value: number;
  unit?: string;
  trend?: 'up' | 'down' | 'stable';
  changePercent?: number;
  loading?: boolean;
}

export const KPICard: React.FC<KPICardProps> = ({
  label,
  value,
  unit = '',
  trend = 'stable',
  changePercent,
  loading = false,
}) => {
  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <ArrowUpIcon className="h-5 w-5 text-green-500" />;
      case 'down':
        return <ArrowDownIcon className="h-5 w-5 text-red-500" />;
      default:
        return <MinusIcon className="h-5 w-5 text-gray-400" />;
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
        <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/3"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-600">{label}</h3>
        {getTrendIcon()}
      </div>
      <div className="mt-4">
        <p className="text-3xl font-semibold text-gray-900">
          {formatNumber(value)} {unit}
        </p>
        {changePercent !== undefined && (
          <p className={`text-sm mt-2 flex items-center ${getTrendColor()}`}>
            <span>{formatChange(changePercent)} from previous period</span>
          </p>
        )}
      </div>
    </div>
  );
};
