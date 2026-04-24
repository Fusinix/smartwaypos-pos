import { create } from 'zustand';
import type { Category } from '@/types/category';

interface CategoryState {
    categories: Category[];
    isLoading: boolean;
    error: string | null;
    setCategories: (categories: Category[]) => void;
    setLoading: (isLoading: boolean) => void;
    setError: (error: string | null) => void;
}

export const useCategoryStore = create<CategoryState>((set) => ({
    categories: [],
    isLoading: false,
    error: null,
    setCategories: (categories) => set({ categories }),
    setLoading: (isLoading) => set({ isLoading }),
    setError: (error) => set({ error }),
})); 