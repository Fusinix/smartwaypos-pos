export interface FoodCategory {
    id: number;
    name: string;
    description?: string;
    status: 'active' | 'inactive';
    created_at: string;
    updated_at: string;
}

export interface NewFoodCategory {
    name: string;
    description?: string;
    status: 'active' | 'inactive';
}

export interface FoodItem {
    id: number;
    name: string;
    description?: string;
    category_id: number;
    price: number;
    status: 'active' | 'inactive';
    image?: string;
    created_at: string;
    updated_at: string;
    category_name?: string;
    extras?: FoodExtra[];
}

export interface NewFoodItem {
    name: string;
    description?: string;
    category_id: number;
    price: number;
    status: 'active' | 'inactive';
    image?: string;
    extra_ids?: number[];
}

export interface FoodExtra {
    id: number;
    name: string;
    price: number;
    status: 'active' | 'inactive';
    created_at: string;
    updated_at: string;
}

export interface NewFoodExtra {
    name: string;
    price: number;
    status: 'active' | 'inactive';
}

export interface FoodItemExtra {
    id: number;
    food_item_id: number;
    extra_id: number;
    created_at: string;
}

