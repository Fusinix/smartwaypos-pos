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
      const data = await window.electron.invoke('get-expenses', filters);
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
