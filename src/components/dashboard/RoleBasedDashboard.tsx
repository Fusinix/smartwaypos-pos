import React from 'react';
import { GeneralUserDashboard } from './GeneralUserDashboard';
import { ManagerDashboard } from './ManagerDashboard';
import { AdminDashboard } from './AdminDashboard';
import type { DashboardStats } from '../../hooks/useDashboard';
import type { 
  SalesData, 
  TopProduct, 
  CategoryPerformance, 
  PeakHoursData, 
  OrderStatusData, 
  PaymentMethodData,
  InventoryInsight
} from '../../hooks/useAnalytics';
import type { UserRole } from '../../types';

interface RoleBasedDashboardProps {
  userRole: UserRole;
  stats: DashboardStats;
  salesData: SalesData[];
  topProducts: TopProduct[];
  categoryPerformance: CategoryPerformance[];
  peakHours: PeakHoursData[];
  orderStatus: OrderStatusData[];
  paymentMethods: PaymentMethodData[];
  inventoryInsights: InventoryInsight[];
  isLoading: boolean;
  analyticsLoading: boolean;
}

export const RoleBasedDashboard: React.FC<RoleBasedDashboardProps> = ({
  userRole,
  stats,
  salesData,
  topProducts,
  categoryPerformance,
  peakHours,
  orderStatus,
  paymentMethods,
  inventoryInsights,
  isLoading,
  analyticsLoading
}) => {
  switch (userRole) {
    case 'admin':
      return (
        <AdminDashboard
          stats={stats}
          salesData={salesData}
          topProducts={topProducts}
          categoryPerformance={categoryPerformance}
          peakHours={peakHours}
          orderStatus={orderStatus}
          paymentMethods={paymentMethods}
          inventoryInsights={inventoryInsights}
          isLoading={isLoading}
          analyticsLoading={analyticsLoading}
        />
      );
    
    case 'manager':
      return (
        <ManagerDashboard
          stats={stats}
          salesData={salesData}
          topProducts={topProducts}
          categoryPerformance={categoryPerformance}
          peakHours={peakHours}
          orderStatus={orderStatus}
          paymentMethods={paymentMethods}
          isLoading={isLoading}
          analyticsLoading={analyticsLoading}
        />
      );
    
    case 'cashier':
    default:
      return (
        <GeneralUserDashboard
          stats={stats}
          salesData={salesData}
          peakHours={peakHours}
          isLoading={isLoading}
          analyticsLoading={analyticsLoading}
        />
      );
  }
}; 