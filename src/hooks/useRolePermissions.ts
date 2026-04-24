import { useMemo } from 'react';
import type { UserRole } from '../types';

export interface RolePermissions {
  // Dashboard permissions
  canViewAnalytics: boolean;
  canViewInventoryInsights: boolean;
  canViewOrderAnalytics: boolean;
  canViewPeakHours: boolean;
  canViewTopProducts: boolean;
  canViewCategoryPerformance: boolean;
  
  // User management permissions
  canManageUsers: boolean;
  canViewUserLogs: boolean;
  
  // Product management permissions
  canManageProducts: boolean;
  canManageCategories: boolean;
  canViewStockAlerts: boolean;
  
  // Order management permissions
  canManageOrders: boolean;
  canViewOrderHistory: boolean;
  canProcessRefunds: boolean;
  
  // System permissions
  canAccessSettings: boolean;
  canViewSystemLogs: boolean;
  canExportData: boolean;
  canConfigureSystem: boolean;
  
  // Financial permissions
  canViewFinancialReports: boolean;
  canProcessPayments: boolean;
  canViewRevenueAnalytics: boolean;
}

export const useRolePermissions = (userRole: UserRole): RolePermissions => {
  return useMemo(() => {
    switch (userRole) {
      case 'admin':
        return {
          // Dashboard - Full access
          canViewAnalytics: true,
          canViewInventoryInsights: true,
          canViewOrderAnalytics: true,
          canViewPeakHours: true,
          canViewTopProducts: true,
          canViewCategoryPerformance: true,
          
          // User management - Full access
          canManageUsers: true,
          canViewUserLogs: true,
          
          // Product management - Full access
          canManageProducts: true,
          canManageCategories: true,
          canViewStockAlerts: true,
          
          // Order management - Full access
          canManageOrders: true,
          canViewOrderHistory: true,
          canProcessRefunds: true,
          
          // System - Full access
          canAccessSettings: true,
          canViewSystemLogs: true,
          canExportData: true,
          canConfigureSystem: true,
          
          // Financial - Full access
          canViewFinancialReports: true,
          canProcessPayments: true,
          canViewRevenueAnalytics: true,
        };
      
      case 'manager':
        return {
          // Dashboard - Enhanced access
          canViewAnalytics: true,
          canViewInventoryInsights: false, // Limited inventory insights
          canViewOrderAnalytics: true,
          canViewPeakHours: true,
          canViewTopProducts: true,
          canViewCategoryPerformance: true,
          
          // User management - Limited access
          canManageUsers: false,
          canViewUserLogs: false,
          
          // Product management - Full access
          canManageProducts: true,
          canManageCategories: true,
          canViewStockAlerts: true,
          
          // Order management - Full access
          canManageOrders: true,
          canViewOrderHistory: true,
          canProcessRefunds: true,
          
          // System - Limited access
          canAccessSettings: true,
          canViewSystemLogs: false,
          canExportData: true,
          canConfigureSystem: false,
          
          // Financial - Enhanced access
          canViewFinancialReports: true,
          canProcessPayments: true,
          canViewRevenueAnalytics: true,
        };
      
      case 'cashier':
      default:
        return {
          // Dashboard - Basic access
          canViewAnalytics: true,
          canViewInventoryInsights: false,
          canViewOrderAnalytics: false,
          canViewPeakHours: true,
          canViewTopProducts: false,
          canViewCategoryPerformance: false,
          
          // User management - No access
          canManageUsers: false,
          canViewUserLogs: false,
          
          // Product management - Limited access
          canManageProducts: false,
          canManageCategories: false,
          canViewStockAlerts: true,
          
          // Order management - Basic access
          canManageOrders: true,
          canViewOrderHistory: false,
          canProcessRefunds: false,
          
          // System - No access
          canAccessSettings: false,
          canViewSystemLogs: false,
          canExportData: false,
          canConfigureSystem: false,
          
          // Financial - Basic access
          canViewFinancialReports: false,
          canProcessPayments: true,
          canViewRevenueAnalytics: false,
        };
    }
  }, [userRole]);
};

// Helper functions for common permission checks
export const usePermissionChecks = (userRole: UserRole) => {
  const permissions = useRolePermissions(userRole);
  
  return {
    // Dashboard checks
    canViewFullAnalytics: permissions.canViewAnalytics && 
                          permissions.canViewOrderAnalytics && 
                          permissions.canViewTopProducts && 
                          permissions.canViewCategoryPerformance,
    
    canViewInventoryManagement: permissions.canViewInventoryInsights && 
                                permissions.canManageProducts,
    
    canViewFinancialData: permissions.canViewFinancialReports && 
                          permissions.canViewRevenueAnalytics,
    
    canManageSystem: permissions.canAccessSettings && 
                     permissions.canConfigureSystem,
    
    canViewUserManagement: permissions.canManageUsers && 
                           permissions.canViewUserLogs,
    
    // Quick access checks
    isAdmin: userRole === 'admin',
    isManager: userRole === 'manager',
    isCashier: userRole === 'cashier',
    
    // Permission object for direct access
    permissions
  };
}; 