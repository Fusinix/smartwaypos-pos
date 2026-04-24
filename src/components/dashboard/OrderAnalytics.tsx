import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import type { OrderStatusData, PaymentMethodData } from '../../hooks/useAnalytics';

interface OrderAnalyticsProps {
  orderStatus: OrderStatusData[];
  paymentMethods: PaymentMethodData[];
  isLoading?: boolean;
}

export const OrderAnalytics: React.FC<OrderAnalyticsProps> = ({
  orderStatus,
  paymentMethods,
  isLoading = false
}) => {
  const formatCurrency = (value: number) => `GHS ${value.toFixed(2)}`;

  const STATUS_COLORS = ['#10b981', '#f59e0b', '#ef4444'];
  const PAYMENT_COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4'];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium">{data.status || data.method}</p>
          <p className="text-blue-600">
            Count: {data.count}
          </p>
          {data.revenue && (
            <p className="text-green-600">
              Revenue: {formatCurrency(data.revenue)}
            </p>
          )}
          <p className="text-gray-600">
            Share: {data.percentage.toFixed(1)}%
          </p>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Order Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-gray-200 rounded animate-pulse"></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Payment Methods</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-gray-200 rounded animate-pulse"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Order Status Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Order Status Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={orderStatus}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ status, percentage }) => `${status} ${percentage.toFixed(1)}%`}
                outerRadius={60}
                fill="#8884d8"
                dataKey="count"
              >
                {orderStatus.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2">
            {orderStatus.map((status, index) => (
              <div key={status.status} className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: STATUS_COLORS[index % STATUS_COLORS.length] }}
                  ></div>
                  <span className="font-medium capitalize">{status.status}</span>
                </div>
                <div className="text-right">
                  <div className="font-medium">{status.count}</div>
                  <div className="text-gray-500">{status.percentage.toFixed(1)}%</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Payment Methods */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Methods</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={paymentMethods}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ method, percentage }) => `${method} ${percentage.toFixed(1)}%`}
                outerRadius={60}
                fill="#8884d8"
                dataKey="count"
              >
                {paymentMethods.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={PAYMENT_COLORS[index % PAYMENT_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2">
            {paymentMethods.map((method, index) => (
              <div key={method.method} className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: PAYMENT_COLORS[index % PAYMENT_COLORS.length] }}
                  ></div>
                  <span className="font-medium capitalize">{method.method}</span>
                </div>
                <div className="text-right">
                  <div className="font-medium">{formatCurrency(method.revenue)}</div>
                  <div className="text-gray-500">{method.count} orders</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 