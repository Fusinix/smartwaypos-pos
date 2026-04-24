import React from 'react';
import { DollarSign, ShoppingCart, Clock, TrendingUp } from 'lucide-react';
import { StatsCard } from './StatsCard';
import { StockAlerts } from '../StockAlerts';
import { SalesPerformanceChart } from './SalesPerformanceChart';
import { PeakHoursChart } from './PeakHoursChart';
import type { DashboardStats } from '../../hooks/useDashboard';
import type { SalesData, PeakHoursData } from '../../hooks/useAnalytics';

interface GeneralUserDashboardProps {
  stats: DashboardStats;
  salesData: SalesData[];
  peakHours: PeakHoursData[];
  isLoading: boolean;
  analyticsLoading: boolean;
}

export const GeneralUserDashboard: React.FC<GeneralUserDashboardProps> = ({
  stats,
  salesData,
  peakHours,
  isLoading,
  analyticsLoading
}) => {
  return (
    <div className="space-y-6">
      {/* Quick Stats - Essential for daily operations */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Today's Revenue"
          value={stats.revenue}
          change={stats.revenueChange}
          isLoading={isLoading}
          icon={<DollarSign className="size-6 text-primary" />}
        />
        <StatsCard
          title="Orders Today"
          value={stats.ordersCount}
          change={stats.ordersChange}
          isLoading={isLoading}
          icon={<ShoppingCart className="size-6 text-primary" />}
        />
        <StatsCard
          title="Active Orders"
          value={stats.activeOrders}
          isLoading={isLoading}
          icon={<Clock className="size-6 text-primary" />}
        />
        <StatsCard
          title="Average Order Value"
          value={stats.averageOrderValue}
          change={stats.averageOrderChange}
          isLoading={isLoading}
          icon={<TrendingUp className="size-6 text-primary" />}
        />
      </div>

      {/* Stock Alerts - Critical for operations */}
      <div className="space-y-4">
        <h2 className="text-lg font-medium text-gray-900">Stock Alerts</h2>
        <StockAlerts />
      </div>

      {/* Sales Performance - Basic trend visibility */}
      <SalesPerformanceChart 
        data={salesData} 
        isLoading={analyticsLoading} 
      />

      {/* Peak Hours - Help with customer service timing */}
      <PeakHoursChart 
        data={peakHours} 
        isLoading={analyticsLoading} 
      />

      {/* Quick Tips Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-blue-900 mb-4">Quick Tips</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
          <div className="flex items-start space-x-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
            <p>Check stock levels before taking large orders</p>
          </div>
          <div className="flex items-start space-x-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
            <p>Peak hours are shown above - plan staffing accordingly</p>
          </div>
          <div className="flex items-start space-x-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
            <p>Monitor active orders to ensure timely service</p>
          </div>
          <div className="flex items-start space-x-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
            <p>Track daily revenue to meet targets</p>
          </div>
        </div>
      </div>
    </div>
  );
}; 