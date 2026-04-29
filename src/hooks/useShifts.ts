import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export interface Shift {
  id: number;
  user_id: number;
  clock_in: string;
  clock_out: string | null;
  total_hours: number | null;
  status: 'active' | 'completed';
  username?: string;
}

export const useShifts = () => {
  const { user } = useAuth();
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchActiveShift = useCallback(async () => {
    if (!user?.id) return;
    try {
      setIsLoading(true);
      const shift = await window.electron.invoke('get-active-shift', user.id);
      setActiveShift(shift);
    } catch (err) {
      console.error('Failed to fetch active shift:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  const clockIn = async () => {
    if (!user?.id) return;
    try {
      const shift = await window.electron.invoke('clock-in', user.id);
      setActiveShift(shift);
      return shift;
    } catch (err) {
      console.error('Clock in failed:', err);
      throw err;
    }
  };

  const clockOut = async () => {
    if (!user?.id) return;
    try {
      const shift = await window.electron.invoke('clock-out', user.id);
      setActiveShift(null);
      return shift;
    } catch (err) {
      console.error('Clock out failed:', err);
      throw err;
    }
  };

  const fetchAllShifts = useCallback(async (filters?: any) => {
    try {
      return await window.electron.invoke('get-all-shifts', filters);
    } catch (err) {
      console.error('Failed to fetch all shifts:', err);
      return [];
    }
  }, []);

  useEffect(() => {
    fetchActiveShift();
  }, [fetchActiveShift]);

  return {
    activeShift,
    isLoading,
    clockIn,
    clockOut,
    fetchAllShifts,
    refreshActiveShift: fetchActiveShift
  };
};
