import { useState, useCallback } from 'react';
import type { Product } from '../types';

export const useStock = () => {
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [outOfStockProducts, setOutOfStockProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getLowStockProducts = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const products = await window.electron.invoke('get-low-stock-products');
      setLowStockProducts(products);
      return products;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get low stock products';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getOutOfStockProducts = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const products = await window.electron.invoke('get-out-of-stock-products');
      setOutOfStockProducts(products);
      return products;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get out of stock products';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateProductStock = useCallback(async (productId: number, newStock: number, author: any) => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await window.electron.invoke('update-product-stock', productId, newStock, { author });
      
      // Refresh stock lists after update
      await Promise.all([
        getLowStockProducts(),
        getOutOfStockProducts()
      ]);
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update product stock';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [getLowStockProducts, getOutOfStockProducts]);

  const getStockStatus = useCallback((product: Product) => {
    if (product.stock === 0) {
      return { status: 'out-of-stock', label: 'Out of Stock', color: 'text-red-600' };
    } else if (product.stock <= product.low_stock_threshold) {
      return { status: 'low-stock', label: 'Low Stock', color: 'text-yellow-600' };
    } else {
      return { status: 'in-stock', label: 'In Stock', color: 'text-green-600' };
    }
  }, []);

  return {
    lowStockProducts,
    outOfStockProducts,
    isLoading,
    error,
    getLowStockProducts,
    getOutOfStockProducts,
    updateProductStock,
    getStockStatus,
  };
}; 