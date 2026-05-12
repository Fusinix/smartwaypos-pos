import React from 'react';
import { DollarSign, ShoppingCart, Clock, TrendingUp, Users, BarChart3, Target } from 'lucide-react';
import { StatsCard } from './StatsCard';
import { StockAlerts } from '../StockAlerts';
import { SalesPerformanceChart } from './SalesPerformanceChart';
import { TopProductsChart } from './TopProductsChart';
import { CategoryPerformanceChart } from './CategoryPerformanceChart';
import { PeakHoursChart } from './PeakHoursChart';
import { OrderAnalytics } from './OrderAnalytics';
import type { DashboardStats } from '../../hooks/useDashboard';
import type { 
  SalesData, 
  TopProduct, 
  CategoryPerformance, 
  PeakHoursData, 
  OrderStatusData, 
  PaymentMethodData 
} from '../../hooks/useAnalytics';

interface ManagerDashboardProps {
  stats: DashboardStats;
  salesData: SalesData[];
  topProducts: TopProduct[];
  categoryPerformance: CategoryPerformance[];
  peakHours: PeakHoursData[];
  orderStatus: OrderStatusData[];
  paymentMethods: PaymentMethodData[];
  isLoading: boolean;
  analyticsLoading: boolean;
}

export const ManagerDashboard: React.FC<ManagerDashboardProps> = ({
  stats,
  salesData,
  topProducts,
  categoryPerformance,
  peakHours,
  orderStatus,
  paymentMethods,
  isLoading,
  analyticsLoading
}) => {
  return (
    <div className="space-y-6">
      {/* Enhanced Stats - Manager-level insights */}
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

      {/* Stock Alerts - Critical for inventory management */}
      <div className="space-y-4">
        <h2 className="text-lg font-medium text-gray-900">Stock Alerts</h2>
        <StockAlerts />
      </div>

      {/* Sales Performance - Key trend analysis */}
      <div className="space-y-4">
				<h2 className="text-xl font-medium text-gray-900">
			Sales Performance
				</h2>
      <SalesPerformanceChart 
        data={salesData} 
        isLoading={analyticsLoading} 
      />
      </div>

      {/* Product & Category Performance - Inventory insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopProductsChart 
          data={topProducts} 
          isLoading={analyticsLoading} 
        />
        <CategoryPerformanceChart 
          data={categoryPerformance} 
          isLoading={analyticsLoading} 
        />
      </div>

      {/* Peak Hours - Staffing optimization */}
      <PeakHoursChart 
        data={peakHours} 
        isLoading={analyticsLoading} 
      />

      {/* Order Analytics - Operational insights */}
      <OrderAnalytics 
        orderStatus={orderStatus}
        paymentMethods={paymentMethods}
        isLoading={analyticsLoading}
      />

      {/* Manager Insights Section */}
      <div className=" bg-background rounded-lg p-6 py-8">
				<h3 className="text-lg font-semibold mb-4 flex items-center">
          Manager Insights
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <div className="flex items-start space-x-2">
            <Target className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold">Performance Targets</p>
              <p className="text-muted-foreground/80">Monitor daily goals and adjust strategies</p>
            </div>
          </div>
          <div className="flex items-start space-x-2">
            <Users className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold">Staff Optimization</p>
              <p className="text-muted-foreground/80">Use peak hours data for scheduling</p>
            </div>
          </div>
          <div className="flex items-start space-x-2">
            <ShoppingCart className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold">Inventory Management</p>
              <p className="text-muted-foreground/80">Track top products and stock levels</p>
            </div>
          </div>
          <div className="flex items-start space-x-2">
            <TrendingUp className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold">Revenue Optimization</p>
              <p className="text-muted-foreground/80">Focus on high-margin categories</p>
            </div>
          </div>
          <div className="flex items-start space-x-2">
            <Clock className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold">Order Management</p>
              <p className="text-muted-foreground/80">Monitor order status and efficiency</p>
            </div>
          </div>
          <div className="flex items-start space-x-2">
            <DollarSign className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold">Payment Analysis</p>
              <p className="text-muted-foreground/80">Understand customer payment preferences</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 