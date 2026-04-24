import { useAuth } from '@/context/AuthContext';
import { showToast } from '@/lib/toast';
import { useCategoryStore } from '@/stores/useCategoryStore';
import type { Category, NewCategory } from '@/types/category';

export function useCategory() {
  const { user } = useAuth();
  const store = useCategoryStore();

  const fetchCategories = async (): Promise<Category[]> => {
    store.setLoading(true);
    store.setError(null);
    try {
      const response = await window.electron.invoke('get-categories', { author:user });
      store.setCategories(response);
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch categories';
      store.setError(errorMessage);
      showToast.error(errorMessage);
      throw error;
    } finally {
      store.setLoading(false);
    }
  };

  const addCategory = async (category: NewCategory ): Promise<Category> => {
    store.setLoading(true);
    store.setError(null);
    try {
      const response = await window.electron.invoke('add-category', { ...category, author:user });
      store.setCategories([...store.categories, response]);
      showToast.success('Category added successfully');
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add category';
      store.setError(errorMessage);
      showToast.error(errorMessage);
      throw error;
    } finally {
      store.setLoading(false);
    }
  };

  const updateCategory = async (id: number, category: NewCategory, ): Promise<Category> => {
    store.setLoading(true);
    store.setError(null);
    try {
      const response = await window.electron.invoke('update-category', { id, ...category, author:user });
      store.setCategories(store.categories.map(cat => cat.id === id ? response : cat));
      showToast.success('Category updated successfully');
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update category';
      store.setError(errorMessage);
      showToast.error(errorMessage);
      throw error;
    } finally {
      store.setLoading(false);
    }
  };

  const deleteCategory = async (id: number, ): Promise<void> => {
    store.setLoading(true);
    store.setError(null);
    try {
      await window.electron.invoke('delete-category', id, { author:user });
      store.setCategories(store.categories.filter(cat => cat.id !== id));
      showToast.success('Category deleted successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete category';
      store.setError(errorMessage);
      showToast.error(errorMessage);
      throw error;
    } finally {
      store.setLoading(false);
    }
  };

  return {
    ...store,
    fetchCategories,
    addCategory,
    updateCategory,
    deleteCategory,
  };
} 