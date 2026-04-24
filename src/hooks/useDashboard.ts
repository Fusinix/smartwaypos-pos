import { useState, useCallback, useEffect, useRef } from 'react';

export type TimePeriod = 'day' | 'week' | 'month' | 'custom';

export interface DashboardFilters {
  timePeriod: TimePeriod;
  startDate?: Date;
  endDate?: Date;
}

export interface DashboardStats {
  revenue: number;
  ordersCount: number;
  activeOrders: number;
  averageOrderValue: number;
  revenueChange: number;
  ordersChange: number;
  averageOrderChange: number;
}

export const useDashboard = () => {
  const [filters, setFilters] = useState<DashboardFilters>({
    timePeriod: 'day'
  });
  const [stats, setStats] = useState<DashboardStats>({
    revenue: 0,
    ordersCount: 0,
    activeOrders: 0,
    averageOrderValue: 0,
    revenueChange: 0,
    ordersChange: 0,
    averageOrderChange: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  
  const autoRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchDashboardStats = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const data = await window.electron.invoke('get-dashboard-stats', filters);
      setStats(data);
      setLastRefresh(new Date());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch dashboard stats';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  const updateFilters = useCallback((newFilters: Partial<DashboardFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const refreshData = useCallback(() => {
    fetchDashboardStats();
  }, [fetchDashboardStats]);

  // Auto-refresh every minute
  useEffect(() => {
    fetchDashboardStats();
    
    autoRefreshIntervalRef.current = setInterval(() => {
      fetchDashboardStats();
    }, 60000); // 1 minute

    return () => {
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current);
      }
    };
  }, [fetchDashboardStats]);

  // Refresh when filters change
  useEffect(() => {
    fetchDashboardStats();
  }, [filters, fetchDashboardStats]);

  return {
    stats,
    filters,
    isLoading,
    error,
    lastRefresh,
    updateFilters,
    refreshData,
  };
}; 