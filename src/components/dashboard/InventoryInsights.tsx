import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import type { InventoryInsight } from '../../hooks/useAnalytics';

interface InventoryInsightsProps {
  data: InventoryInsight[];
  isLoading?: boolean;
}

export const InventoryInsights: React.FC<InventoryInsightsProps> = ({
  data,
  isLoading = false
}) => {
  const formatCurrency = (value: number) => `GHS ${value.toFixed(2)}`;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium">{data.productName}</p>
          <p className="text-blue-600">
            Stock: {data.stock}
          </p>
          <p className="text-green-600">
            Sold: {data.sold}
          </p>
          <p className="text-purple-600">
            Turnover Rate: {data.turnoverRate.toFixed(2)}
          </p>
          <p className="text-orange-600">
            Profit Margin: {data.profitMargin.toFixed(1)}%
          </p>
        </div>
      );
    }
    return null;
  };

  // Calculate summary stats
  const totalStockValue = data.reduce((sum, item) => sum + item.stockValue, 0);
  const avgTurnoverRate = data.length > 0 ? data.reduce((sum, item) => sum + item.turnoverRate, 0) / data.length : 0;
  const avgProfitMargin = data.length > 0 ? data.reduce((sum, item) => sum + item.profitMargin, 0) / data.length : 0;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Inventory Insights</CardTitle>
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
        <CardTitle>Inventory Insights</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-sm font-medium text-blue-600">Total Stock Value</div>
            <div className="text-2xl font-bold text-blue-900">{formatCurrency(totalStockValue)}</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-sm font-medium text-green-600">Avg Turnover Rate</div>
            <div className="text-2xl font-bold text-green-900">{avgTurnoverRate.toFixed(2)}</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="text-sm font-medium text-purple-600">Avg Profit Margin</div>
            <div className="text-2xl font-bold text-purple-900">{avgProfitMargin.toFixed(1)}%</div>
          </div>
        </div>

        {/* Stock Turnover Chart */}
        <div className="mb-6">
          <h4 className="text-lg font-medium mb-4">Stock Turnover Rate</h4>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.slice(0, 10)} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                type="number"
                stroke="#888888"
                fontSize={12}
              />
              <YAxis 
                type="category"
                dataKey="productName"
                stroke="#888888"
                fontSize={12}
                width={100}
                tickFormatter={(value) => value.length > 15 ? value.substring(0, 15) + '...' : value}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="turnoverRate" 
                fill="#8b5cf6" 
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Products by Stock Value */}
        <div>
          <h4 className="text-lg font-medium mb-4">Top Products by Stock Value</h4>
          <div className="space-y-2">
            {data
              .sort((a, b) => b.stockValue - a.stockValue)
              .slice(0, 5)
              .map((item, index) => (
                <div key={item.productId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <span className="font-medium text-gray-500">#{index + 1}</span>
                    <div>
                      <div className="font-medium">{item.productName}</div>
                      <div className="text-sm text-gray-500">{item.category}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{formatCurrency(item.stockValue)}</div>
                    <div className="text-sm text-gray-500">Stock: {item.stock}</div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}; 