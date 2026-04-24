import { useOrderStore } from '@/stores/useOrderStore';
import { useAuth } from '@/context/AuthContext';
import { showToast } from '@/lib/toast';
import type { Order } from '../types';

export function useOrders() {
  const { user } = useAuth();
  const store = useOrderStore();

  const fetchOrders = async (): Promise<Order[]> => {
    store.setLoading(true);
    store.setError(null);
    try {
      const data = await window.electron.invoke('get-orders', { author: user });
      // console.log("orders:",typeof data)
      store.setOrders(data);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch orders';
      store.setError(errorMessage);
      showToast.error(errorMessage);
      throw err;
    } finally {
      store.setLoading(false);
    }
  };

  const createOrder = async (order: Omit<Order, 'id'>, ): Promise<Order> => {
    store.setLoading(true);
    store.setError(null);
    try {
      const result = await window.electron.invoke('create-order', { ...order, admin_id: user?.id, author: user });
      // Optionally, fetch orders again or add to store.orders
      await fetchOrders();
      showToast.success('Order created successfully');
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create order';
      store.setError(errorMessage);
      showToast.error(errorMessage);
      throw err;
    } finally {
      store.setLoading(false);
    }
  };

  const getOrderById = async (orderId: number): Promise<Order> => {
    store.setLoading(true);
    store.setError(null);
    try {
      const order = await window.electron.invoke('get-order-by-id', orderId, { author: user });
      return order;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch order details';
      store.setError(errorMessage);
      showToast.error(errorMessage);
      throw err;
    } finally {
      store.setLoading(false);
    }
  };

  const updateOrder = async (order: Order): Promise<Order> => {
    store.setLoading(true);
    store.setError(null);
    try {
      const result = await window.electron.invoke('update-order', { ...order, author: user });
      await fetchOrders();
      showToast.success('Order updated successfully');
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update order';
      store.setError(errorMessage);
      showToast.error(errorMessage);
      throw err;
    } finally {
      store.setLoading(false);
    }
  };

  const updateOrderItems = async (orderId: number, items: any[]): Promise<Order> => {
    store.setLoading(true);
    store.setError(null);
    try {
      const result = await window.electron.invoke('update-order-items', orderId, items, { author: user });
      await fetchOrders();
      showToast.success('Order items updated successfully');
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update order items';
      store.setError(errorMessage);
      showToast.error(errorMessage);
      throw err;
    } finally {
      store.setLoading(false);
    }
  };

  // Add more actions (updateOrder, deleteOrder) as needed

  return {
    ...store,
    fetchOrders,
    createOrder,
    getOrderById,
    updateOrder,
    updateOrderItems,
  };
} 