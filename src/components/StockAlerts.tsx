import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// import { useAuth } from '../context/AuthContext';
import { useStock } from '../hooks/useStock';
// import { showToast } from '../lib/toast';
import type { Product } from '../types';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Beer } from 'lucide-react';

export const StockAlerts: React.FC = () => {
  const { lowStockProducts, outOfStockProducts, isLoading, getLowStockProducts, getOutOfStockProducts,  getStockStatus } = useStock();
  const navigate = useNavigate();

  useEffect(() => {
    getLowStockProducts();
    getOutOfStockProducts();
  }, [getLowStockProducts, getOutOfStockProducts]);

  const renderProductCard = (product: Product, isOutOfStock: boolean = false) => {
    const stockStatus = getStockStatus(product);
    
    return (
      <Card key={product.id} className="mb-4">
        <CardContent className="p-4 pl-2 py-2">
          <div className="flex items-center justify-between gap-3">
            <div className='size-10 rounded-md bg-muted/80 flex items-center justify-center '>
              {
                !product?.image ? <img src={product.image} className='w-full h-full object-cover' />
                : <Beer className='size-6 text-muted-foreground' />
              }

            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-base">{product.name} <span className={`px-2 py-0.5 rounded-full text-xs font-medium ml-1 ${
                  isOutOfStock ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {stockStatus.label}
                </span></h3>
              <p className="text-xs text-gray-600">{product.category_name} | <span className="text-xs">
                  Current Stock: <span className="font-semibold">{product.stock} </span>
                
                {!isOutOfStock && (
                  <span className="text-xs text-gray-500">
                    - Threshold: <span className="font-semibold">{product.low_stock_threshold}</span>
                  </span>
                )}</span></p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => navigate("/products")}
              >
                Edit
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading stock alerts...</div>;
  }

  const hasAlerts = lowStockProducts.length > 0 || outOfStockProducts.length > 0;

  if (!hasAlerts) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-gray-500">No stock alerts at the moment.</p>
          <p className="text-sm text-gray-400 mt-2">All products have sufficient stock levels.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {outOfStockProducts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-red-600">Out of Stock</span>
              <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">
                {outOfStockProducts.length}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {outOfStockProducts.map(product => renderProductCard(product, true))}
          </CardContent>
        </Card>
      )}

      {lowStockProducts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-yellow-600">Low Stock</span>
              <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium">
                {lowStockProducts.length}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lowStockProducts.map(product => renderProductCard(product))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}; 