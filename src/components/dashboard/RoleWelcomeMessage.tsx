import { BarChart3, ShieldCheck, User } from 'lucide-react';
import React from 'react';
import type { UserRole } from '../../types';

interface RoleWelcomeMessageProps {
  userRole: UserRole;
  username: string;
}

export const RoleWelcomeMessage: React.FC<RoleWelcomeMessageProps> = ({
  userRole,
  username
}) => {
  const getRoleInfo = () => {
    switch (userRole) {
      case 'admin':
        return {
          title: 'Administrator Dashboard',
          subtitle: 'Full system access and business intelligence',
          icon: <ShieldCheck className="w-6 h-6 text-teal-600" />,
          color: 'text-teal-600',
          bgColor: 'bg-teal-50',
          borderColor: 'border-teal-200'
        };
      case 'manager':
        return {
          title: 'Manager Dashboard',
          subtitle: 'Operational insights and team management',
          icon: <BarChart3 className="w-6 h-6 text-purple-600" />,
          color: 'text-purple-600',
          bgColor: 'bg-purple-50',
          borderColor: 'border-purple-200'
        };
      case 'cashier':
      default:
        return {
          title: 'Cashier Dashboard',
          subtitle: 'Daily operations and customer service',
          icon: <User className="w-6 h-6 text-blue-600" />,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200'
        };
    }
  };

  const roleInfo = getRoleInfo();

  return (
    <div className={`${roleInfo.bgColor} border ${roleInfo.borderColor} rounded-lg p-4`}>
      <div className="flex items-center space-x-3">
        {roleInfo.icon}
        <div>
          <h1 className={`text-xl font-semibold ${roleInfo.color}`}>
            {roleInfo.title}
          </h1>
          <p className="text-gray-600 text-sm">
            Welcome back, {username}! {roleInfo.subtitle}
          </p>
        </div>
      </div>
    </div>
  );
}; 