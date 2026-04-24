import { LayoutDashboard, Package, ShoppingCart, Settings, Tag } from 'lucide-react';
import { NavLink } from './nav-link';
import { useAuth } from '@/context/AuthContext';

const navigationItems = [
    {
        title: 'Dashboard',
        href: '/',
        icon: LayoutDashboard,
        roles: ['admin', 'manager'],
    },
    {
        title: 'Products',
        href: '/products',
        icon: Package,
        roles: ['admin', 'manager', 'cashier'],
    },
    {
        title: 'Categories',
        href: '/categories',
        icon: Tag,
        roles: ['admin', 'manager'],
    },
    {
        title: 'Orders',
        href: '/orders',
        icon: ShoppingCart,
        roles: ['admin', 'manager', 'cashier'],
    },
    {
        title: 'Settings',
        href: '/settings',
        icon: Settings,
        roles: ['admin', 'manager'],
    },
];

export function NavMenu() {
    const { user } = useAuth();

    return (
        <nav className="space-y-1">
            {navigationItems.map((item) => {
                if (!item.roles.includes(user?.role || '')) {
                    return null;
                }

                return (
                    <NavLink
                        key={item.href}
                        href={item.href}
                        icon={item.icon}
                    >
                        {item.title}
                    </NavLink>
                );
            })}
        </nav>
    );
} 