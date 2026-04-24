import { useState, useCallback, useEffect, useRef } from 'react';
import type { DashboardFilters } from './useDashboard';

export interface SalesData {
  date: string;
  revenue: number;
  orders: number;
}

export interface TopProduct {
  id: number;
  name: string;
  category: string;
  sold: number;
  revenue: number;
}

export interface CategoryPerformance {
  category: string;
  revenue: number;
  orders: number;
  percentage: number;
}

export interface PeakHoursData {
  hour: number;
  orders: number;
  revenue: number;
}

export interface OrderStatusData {
  status: string;
  count: number;
  percentage: number;
}

export interface PaymentMethodData {
  method: string;
  count: number;
  revenue: number;
  percentage: number;
}

export interface InventoryInsight {
  productId: number;
  productName: string;
  category: string;
  stock: number;
  sold: number;
  turnoverRate: number;
  profitMargin: number;
  stockValue: number;
}

export const useAnalytics = (filters: DashboardFilters) => {
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [categoryPerformance, setCategoryPerformance] = useState<CategoryPerformance[]>([]);
  const [peakHours, setPeakHours] = useState<PeakHoursData[]>([]);
  const [orderStatus, setOrderStatus] = useState<OrderStatusData[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodData[]>([]);
  const [inventoryInsights, setInventoryInsights] = useState<InventoryInsight[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const autoRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchAnalytics = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch all analytics data
      const [
        salesDataResult,
        topProductsResult,
        categoryPerformanceResult,
        peakHoursResult,
        orderStatusResult,
        paymentMethodsResult,
        inventoryInsightsResult
      ] = await Promise.all([
        window.electron.invoke('get-sales-analytics', filters),
        window.electron.invoke('get-top-products', filters),
        window.electron.invoke('get-category-performance', filters),
        window.electron.invoke('get-peak-hours', filters),
        window.electron.invoke('get-order-status', filters),
        window.electron.invoke('get-payment-methods', filters),
        window.electron.invoke('get-inventory-insights', filters)
      ]);

      setSalesData(salesDataResult);
      setTopProducts(topProductsResult);
      setCategoryPerformance(categoryPerformanceResult);
      setPeakHours(peakHoursResult);
      setOrderStatus(orderStatusResult);
      setPaymentMethods(paymentMethodsResult);
      setInventoryInsights(inventoryInsightsResult);
      setLastRefresh(new Date());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch analytics';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  // Auto-refresh every minute
  useEffect(() => {
    fetchAnalytics();
    autoRefreshIntervalRef.current = setInterval(() => {
      fetchAnalytics();
    }, 60000);
    return () => {
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current);
      }
    };
  }, [fetchAnalytics]);

  // Refresh when filters change
  useEffect(() => {
    fetchAnalytics();
  }, [filters, fetchAnalytics]);

  return {
    salesData,
    topProducts,
    categoryPerformance,
    peakHours,
    orderStatus,
    paymentMethods,
    inventoryInsights,
    isLoading,
    error,
    lastRefresh,
    refreshAnalytics: fetchAnalytics
  };
}; 