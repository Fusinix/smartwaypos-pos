import { create } from 'zustand';
import type { Product, ProductFilters } from '@/types/product';

interface ProductState {
    products: Product[];
    loading: boolean;
    error: string | null;
    filters: ProductFilters;
    setProducts: (products: Product[]) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    setFilters: (filters: Partial<ProductFilters>) => void;
}

export const useProductStore = create<ProductState>((set) => ({
    products: [],
    loading: false,
    error: null,
    filters: {
        search: '',
        category: 'all',
        status: 'all',
        stockLevel: 'all',
        sortBy: null,
        sortOrder: 'asc',
    },
    setProducts: (products) => set({ products }),
    setLoading: (loading) => set({ loading }),
    setError: (error) => set({ error }),
    setFilters: (newFilters) => {
        set((state) => ({
            filters: { ...state.filters, ...newFilters },
        }));
    },
})); 