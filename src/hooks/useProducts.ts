import { useAuth } from '@/context/AuthContext';
import { showToast } from '@/lib/toast';
import { useProductStore } from '@/stores/useProductStore';
import type { NewProduct, Product } from '../types/product';
import { useCallback } from 'react';

export function useProducts() {
  const { user } = useAuth();
  const store = useProductStore();

  const fetchProducts = useCallback(async (): Promise<Product[]> => {
    store.setLoading(true);
    store.setError(null);
    try {
      const data = await window.electron.invoke('get-products', { author: user });
      store.setProducts(data);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch products';
      store.setError(errorMessage);
      showToast.error(errorMessage);
      throw err;
    } finally {
      store.setLoading(false);
    }
  }, [user, store]);

  const addProduct = async (product: NewProduct): Promise<Product> => {
    store.setLoading(true);
    store.setError(null);
    try {
      const result = await window.electron.invoke('add-product', { ...product, author: user });
      store.setProducts([...store.products, result]);
      showToast.success('Product added successfully');
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add product';
      store.setError(errorMessage);
      showToast.error(errorMessage);
      throw err;
    } finally {
      store.setLoading(false);
    }
  };

  const updateProduct = async (id: number, product: Partial<NewProduct>): Promise<Product> => {
    store.setLoading(true);
    store.setError(null);
    try {
      const updatedProduct = await window.electron.invoke('update-product', { ...product, id, author: user });
      store.setProducts(store.products.map((p) => (p.id === id ? updatedProduct : p)));
      showToast.success('Product updated successfully');
      return updatedProduct;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update product';
      store.setError(errorMessage);
      showToast.error(errorMessage);
      throw err;
    } finally {
      store.setLoading(false);
    }
  };

  const deleteProduct = async (id: number): Promise<void> => {
    store.setLoading(true);
    store.setError(null);
    try {
      await window.electron.invoke('delete-product', id, { author: user });
      store.setProducts(store.products.filter((p) => p.id !== id));
      showToast.success('Product deleted successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete product';
      store.setError(errorMessage);
      showToast.error(errorMessage);
      throw err;
    } finally {
      store.setLoading(false);
    }
  };

  return {
    ...store,
    fetchProducts,
    addProduct,
    updateProduct,
    deleteProduct,
  };
} 