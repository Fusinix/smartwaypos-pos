import type { LucideIcon } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface NavLinkProps {
    href: string;
    icon: LucideIcon;
    children: React.ReactNode;
}

export function NavLink({ href, icon: Icon, children }: NavLinkProps) {
    const location = useLocation();
    const isActive = location.pathname === href;

    return (
        <Link
            to={href}
            className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:bg-accent',
                isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'
            )}
        >
            <Icon className="h-4 w-4" />
            {children}
        </Link>
    );
} 