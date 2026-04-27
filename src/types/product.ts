export interface Product {
    id: number;
    name: string;
    description?: string;
    category: string;
    price: number;
    cost_price?: number;
    stock: number;
    low_stock_threshold: number;
    status: 'active' | 'inactive';
    created_at: string;
    updated_at: string;
    image?: string;
    category_name?: string;
}

export interface NewProduct {
    name: string;
    description?: string;
    category: number;
    price: number;
    cost_price?: number;
    stock: number;
    low_stock_threshold?: number;
    status: 'active' | 'inactive';
    image?: string;
}

export interface ProductFilters {
    search: string;
    category: string | null;
    status: 'all' | 'active' | 'inactive';
    stockLevel: 'all' | 'out-of-stock' | 'low-stock' | 'in-stock';
    sortBy: 'name' | 'price' | 'stock' | null;
    sortOrder: 'asc' | 'desc';
} 