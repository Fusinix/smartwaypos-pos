export interface Category {
    id: number;
    name: string;
    description?: string;
    status: 'active' | 'inactive';
    created_at: string;
    updated_at: string;
}

export interface NewCategory {
    name: string;
    description?: string;
    status: 'active' | 'inactive';
} 