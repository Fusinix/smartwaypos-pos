import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import type { PeakHoursData } from '../../hooks/useAnalytics';

interface PeakHoursChartProps {
  data: PeakHoursData[];
  isLoading?: boolean;
}

export const PeakHoursChart: React.FC<PeakHoursChartProps> = ({
  data,
  isLoading = false
}) => {
  const formatCurrency = (value: number) => `GHS ${value.toFixed(2)}`;

  const formatHour = (hour: number) => {
    if (hour === 0) return '12 AM';
    if (hour < 12) return `${hour} AM`;
    if (hour === 12) return '12 PM';
    return `${hour - 12} PM`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium">{formatHour(label)}</p>
          <p className="text-blue-600">
            Orders: {payload[0].value}
          </p>
          <p className="text-green-600">
            Revenue: {formatCurrency(payload[1].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Peak Hours</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-gray-200 rounded animate-pulse"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Peak Hours</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="hour" 
              tickFormatter={formatHour}
              stroke="#888888"
              fontSize={12}
            />
            <YAxis 
              yAxisId="left"
              stroke="#888888"
              fontSize={12}
            />
            <YAxis 
              yAxisId="right"
              orientation="right"
              stroke="#888888"
              fontSize={12}
              tickFormatter={formatCurrency}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar 
              yAxisId="left"
              dataKey="orders" 
              fill="#3b82f6" 
              radius={[4, 4, 0, 0]}
              name="Orders"
              isAnimationActive={true}
            />
            <Bar 
              yAxisId="right"
              dataKey="revenue" 
              fill="#10b981" 
              radius={[4, 4, 0, 0]}
              name="Revenue"
              isAnimationActive={true}
            />
          </BarChart>
        </ResponsiveContainer>
        <div className="flex justify-center space-x-6 mt-4">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span className="text-sm text-gray-600">Orders</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm text-gray-600">Revenue</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}; 