import { useState, useEffect, useCallback } from 'react';
import type { FoodExtra, NewFoodExtra } from '@/types/food';
import { useAuth } from '@/context/AuthContext';

export const useFoodExtras = () => {
  const [extras, setExtras] = useState<FoodExtra[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchExtras = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await window.electron.invoke('get-food-extras');
      setExtras(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch food extras');
      console.error('Error fetching food extras:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const addExtra = useCallback(async (extra: NewFoodExtra) => {
    try {
      setError(null);
      const author = {
        id: user?.id,
        name: user?.username,
        role: user?.role,
      };
      const newExtra = await window.electron.invoke('add-food-extra', extra, { author });
      setExtras((prev) => [...prev, newExtra]);
      return newExtra;
    } catch (err: any) {
      setError(err.message || 'Failed to add food extra');
      throw err;
    }
  }, [user]);

  const updateExtra = useCallback(async (id: number, extra: Partial<NewFoodExtra>) => {
    try {
      setError(null);
      const author = {
        id: user?.id,
        name: user?.username,
        role: user?.role,
      };
      const updatedExtra = await window.electron.invoke('update-food-extra', { id, ...extra }, { author });
      setExtras((prev) => prev.map((e) => (e.id === id ? updatedExtra : e)));
      return updatedExtra;
    } catch (err: any) {
      setError(err.message || 'Failed to update food extra');
      throw err;
    }
  }, [user]);

  const deleteExtra = useCallback(async (id: number) => {
    try {
      setError(null);
      const author = {
        id: user?.id,
        name: user?.username,
        role: user?.role,
      };
      await window.electron.invoke('delete-food-extra', id, { author });
      setExtras((prev) => prev.filter((e) => e.id !== id));
    } catch (err: any) {
      setError(err.message || 'Failed to delete food extra');
      throw err;
    }
  }, [user]);

  useEffect(() => {
    fetchExtras();
  }, [fetchExtras]);

  return {
    extras,
    loading,
    error,
    setError,
    fetchExtras,
    addExtra,
    updateExtra,
    deleteExtra,
  };
};

