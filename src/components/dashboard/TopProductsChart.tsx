import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import type { TopProduct } from '../../hooks/useAnalytics';

interface TopProductsChartProps {
  data: TopProduct[];
  isLoading?: boolean;
}

export const TopProductsChart: React.FC<TopProductsChartProps> = ({
  data,
  isLoading = false
}) => {
  const formatCurrency = (value: number) => `GHS ${value.toFixed(2)}`;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length > 0) {
      const revenuePayload = payload.find((p: any) => p.dataKey === 'revenue') || payload[0];
      const productData = revenuePayload?.payload;
      
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium">{label}</p>
          {productData?.sold !== undefined && (
            <p className="text-blue-600">
              Sold: {Number(productData.sold) || 0}
            </p>
          )}
          <p className="text-green-600">
            Revenue: {formatCurrency(Number(revenuePayload?.value) || 0)}
          </p>
        </div>
      );
    }
    return null;
  };

  // Truncate long product names for display
  const truncateName = (name: string, maxLength: number = 15) => {
    return name.length > maxLength ? name.substring(0, maxLength) + '...' : name;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Selling Products</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-gray-200 rounded animate-pulse"></div>
        </CardContent>
      </Card>
    );
  }

  // Ensure data is properly formatted and not empty
  const chartData = Array.isArray(data) && data.length > 0 
    ? data.map((item: any) => ({
        ...item,
        revenue: Number(item.revenue) || 0,
        sold: Number(item.sold) || 0
      }))
    : [];

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Selling Products</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-gray-400">
            <p>No product data available for the selected period</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Selling Products</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} layout="horizontal">
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              type="number"
              stroke="#888888"
              fontSize={12}
              tickFormatter={formatCurrency}
            />
            <YAxis 
              type="category"
              dataKey="name"
              stroke="#888888"
              fontSize={12}
              tickFormatter={truncateName}
              width={80}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar 
              dataKey="revenue" 
              fill="#3b82f6" 
              radius={[0, 4, 4, 0]}
              isAnimationActive={true}
            />
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-4 space-y-2">
          {chartData.slice(0, 5).map((product, index) => (
            <div key={product.id} className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-2">
                <span className="font-medium text-gray-500">#{index + 1}</span>
                <span className="font-medium">{product.name}</span>
                <span className="text-gray-500">({product.category})</span>
              </div>
              <div className="text-right">
                <div className="font-medium">{formatCurrency(Number(product.revenue) || 0)}</div>
                <div className="text-gray-500">{Number(product.sold) || 0} sold</div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}; 