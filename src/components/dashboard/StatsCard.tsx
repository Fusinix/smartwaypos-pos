import React from 'react';
import { Card, CardContent } from '../ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: number;
  isLoading?: boolean;
  icon?: React.ReactNode;
  className?: string;
}

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  change,
  isLoading = false,
  icon,
  className = ''
}) => {
  const formatValue = (val: string | number) => {
    if (typeof val === 'number') {
      if (title.toLowerCase().includes('revenue') || title.toLowerCase().includes('value')) {
        return `GHS ${val.toFixed(2)}`;
      }
      return val.toLocaleString();
    }
    return val;
  };

  const getChangeColor = (changeValue: number) => {
    if (changeValue > 0) return 'text-green-600';
    if (changeValue < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getChangeIcon = (changeValue: number) => {
    if (changeValue > 0) return <TrendingUp className="w-4 h-4" />;
    if (changeValue < 0) return <TrendingDown className="w-4 h-4" />;
    return null;
  };

  return (
    <Card className={`shadow-none hover:shadow-md${className}`}>
      <CardContent className="p-4 relative ">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <div className="mt-2 h-full">
              {isLoading ? (
                <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
              ) : (
                <p className="text-xl font-bold text-gray-900">
                  {formatValue(value)}
                </p>
              )}
            </div>
            {change !== undefined && !isLoading ? (
              <div className={`flex items-center mt-2 text-xs ${getChangeColor(change)}`}>
                {getChangeIcon(change)}
                <span className="ml-1 font-medium">
                  {change > 0 ? '+' : ''}{change.toFixed(1)}%
                </span>
                <span className="ml-1 text-gray-500">vs previous period</span>
              </div>
            ): <div />}
          </div>
          {icon && (
            <div className="flex-shrink-0 absolute top-4 right-4 z-10">
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}; 