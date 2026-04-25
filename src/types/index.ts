export type UserRole = 'admin' | 'manager' | 'cashier';

export interface User {
  id: number;
  username: string;
  role: UserRole;
}

export interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  cost_price?: number;
  quantity?: number;
  stock: number;
  low_stock_threshold: number;
  status: 'active' | 'inactive';
  description?: string;
  image?: string;
  category_name?: string;
}

export interface Order {
  id?: number;
  order_number?: number;
  sale_id?: number;
  order_type: 'customer' | 'table' | 'takeout';
  table_number?: string;
  customer_name?: string;
  payment_mode: 'cash' | 'momo' | 'bank';
  tax: number;
  amount?: number;
  amount_bt?: number;
  status: 'open' | 'closed' | 'available' | string;
  admin_id?: number;
  amount_tendered?: number;
  created_at?: string;
  notes?: string;
  items?: OrderItemDetail[] | CreateOrderItem[];
}

export interface CreateOrderItem {
  productId?: number;
  foodItemId?: number;
  itemType: 'drink' | 'food';
  quantity: number;
  extraIds?: number[];
  notes?: string;
}

export interface OrderItemDetail {
  id: number;
  order_id: number;
  product_id?: number;
  food_item_id?: number;
  item_type: 'drink' | 'food';
  quantity: number;
  product_name?: string;
  food_item_name?: string;
  price: number;
  image?: string;
  category_name?: string;
  notes?: string;
  extras?: Array<{
    id: number;
    name: string;
    price: number;
    quantity?: number;
  }>;
}

export interface Sale {
  id: number;
  product_id: number;
  quantity: number;
  total_price: number;
  payment_mode: 'cash' | 'mobile money' | 'card';
  sale_date: string;
  cashier_id: number;
}

export interface OrderItem {
  product: Product;
  quantity: number;
  price: number;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface DashboardStats {
  totalOrders: number;
  totalRevenue: number;
  activeProducts: number;
  topSellingItems: Array<{
    product: Product;
    quantity: number;
  }>;
}
