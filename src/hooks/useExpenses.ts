import { useState, useCallback, useEffect } from 'react';
import type { DashboardFilters } from './useDashboard';

export interface Expense {
  id: number;
  description: string;
  amount: number;
  admin_name: string;
  admin_id: number;
  created_at: string;
}

export const useExpenses = (filters: DashboardFilters) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchExpenses = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      // For now, get-expenses only takes a single date.
      // We'll pass the current date if timePeriod is 'day', otherwise we might need a range.
      // Let's use the startDate if available.
      const dateStr = filters.startDate ? filters.startDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
      const data = await window.electron.invoke('get-expenses', dateStr);
      setExpenses(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch expenses');
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  return { expenses, isLoading, error, refreshExpenses: fetchExpenses };
};
