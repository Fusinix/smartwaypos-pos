import { useState, useEffect, useCallback } from 'react';
import type { FoodItem, NewFoodItem, FoodCategory, NewFoodCategory } from '@/types/food';
import { useAuth } from '@/context/AuthContext';

export const useFood = () => {
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [foodCategories, setFoodCategories] = useState<FoodCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchFoodItems = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const items = await window.electron.invoke('get-food-items');
      setFoodItems(items);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch food items');
      console.error('Error fetching food items:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchFoodCategories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const categories = await window.electron.invoke('get-food-categories');
      setFoodCategories(categories);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch food categories');
      console.error('Error fetching food categories:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const addFoodItem = useCallback(async (item: NewFoodItem) => {
    try {
      setError(null);
      const author = {
        id: user?.id,
        name: user?.username,
        role: user?.role,
      };
      const newItem = await window.electron.invoke('add-food-item', item, { author });
      setFoodItems((prev) => [...prev, newItem]);
      return newItem;
    } catch (err: any) {
      setError(err.message || 'Failed to add food item');
      throw err;
    }
  }, [user]);

  const updateFoodItem = useCallback(async (id: number, item: Partial<NewFoodItem>) => {
    try {
      setError(null);
      const author = {
        id: user?.id,
        name: user?.username,
        role: user?.role,
      };
      const updatedItem = await window.electron.invoke('update-food-item', { id, ...item }, { author });
      setFoodItems((prev) => prev.map((i) => (i.id === id ? updatedItem : i)));
      return updatedItem;
    } catch (err: any) {
      setError(err.message || 'Failed to update food item');
      throw err;
    }
  }, [user]);

  const deleteFoodItem = useCallback(async (id: number) => {
    try {
      setError(null);
      const author = {
        id: user?.id,
        name: user?.username,
        role: user?.role,
      };
      await window.electron.invoke('delete-food-item', id, { author });
      setFoodItems((prev) => prev.filter((i) => i.id !== id));
    } catch (err: any) {
      setError(err.message || 'Failed to delete food item');
      throw err;
    }
  }, [user]);

  const addFoodCategory = useCallback(async (category: NewFoodCategory) => {
    try {
      setError(null);
      const author = {
        id: user?.id,
        name: user?.username,
        role: user?.role,
      };
      const newCategory = await window.electron.invoke('add-food-category', category, { author });
      setFoodCategories((prev) => [...prev, newCategory]);
      return newCategory;
    } catch (err: any) {
      setError(err.message || 'Failed to add food category');
      throw err;
    }
  }, [user]);

  const updateFoodCategory = useCallback(async (id: number, category: Partial<NewFoodCategory>) => {
    try {
      setError(null);
      const author = {
        id: user?.id,
        name: user?.username,
        role: user?.role,
      };
      const updatedCategory = await window.electron.invoke('update-food-category', { id, ...category }, { author });
      setFoodCategories((prev) => prev.map((c) => (c.id === id ? updatedCategory : c)));
      return updatedCategory;
    } catch (err: any) {
      setError(err.message || 'Failed to update food category');
      throw err;
    }
  }, [user]);

  const deleteFoodCategory = useCallback(async (id: number) => {
    try {
      setError(null);
      const author = {
        id: user?.id,
        name: user?.username,
        role: user?.role,
      };
      await window.electron.invoke('delete-food-category', id, { author });
      setFoodCategories((prev) => prev.filter((c) => c.id !== id));
    } catch (err: any) {
      setError(err.message || 'Failed to delete food category');
      throw err;
    }
  }, [user]);

  useEffect(() => {
    fetchFoodItems();
    fetchFoodCategories();
  }, [fetchFoodItems, fetchFoodCategories]);

  return {
    foodItems,
    foodCategories,
    loading,
    error,
    setError,
    fetchFoodItems,
    fetchFoodCategories,
    addFoodItem,
    updateFoodItem,
    deleteFoodItem,
    addFoodCategory,
    updateFoodCategory,
    deleteFoodCategory,
  };
};

