import React, { useState } from 'react';
import { 
  Download, 
  Calendar,
  ChevronDown,
  FileText,
  TrendingUp,
  DollarSign,
  Users,
  CreditCard,
  Percent,
  BarChart2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import OverviewTab from '@/components/accounting/OverviewTab';
import IncomeTab from '@/components/accounting/IncomeTab';
import ExpensesTab from '@/components/accounting/ExpensesTab';
import PayrollTab from '@/components/accounting/PayrollTab';
import CashReconciliationTab from '@/components/accounting/CashReconciliationTab';
import TaxTab from '@/components/accounting/TaxTab';
import ReportsTab from '@/components/accounting/ReportsTab';

import { useDashboard, TimePeriod } from '@/hooks/useDashboard';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useExpenses } from '@/hooks/useExpenses';
import { useUsers } from '@/hooks/useUsers';

const tabs = [
  { id: 'overview', label: 'Overview', icon: BarChart2 },
  { id: 'income', label: 'Income', icon: DollarSign },
  { id: 'expenses', label: 'Expenses', icon: TrendingUp },
  { id: 'payroll', label: 'Payroll', icon: Users },
  { id: 'cash', label: 'Cash & Reconciliation', icon: CreditCard },
  { id: 'tax', label: 'Tax', icon: Percent },
  { id: 'reports', label: 'Reports', icon: FileText },
];

const periodOptions: { label: string; value: TimePeriod }[] = [
  { label: 'Day', value: 'day' },
  { label: 'Week', value: 'week' },
  { label: 'Month', value: 'month' },
];

const Accounting: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const { filters, stats, updateFilters, isLoading: dashboardLoading } = useDashboard();
  const analytics = useAnalytics(filters);
  const { expenses, isLoading: expensesLoading } = useExpenses(filters);
  const { users, isLoading: usersLoading } = useUsers();

  const renderTabContent = () => {
    const props = { filters, stats, analytics, expenses, users };
    switch (activeTab) {
      case 'overview': return <OverviewTab {...props} />;
      case 'income': return <IncomeTab {...props} />;
      case 'expenses': return <ExpensesTab {...props} />;
      case 'payroll': return <PayrollTab {...props} />;
      case 'cash': return <CashReconciliationTab {...props} />;
      case 'tax': return <TaxTab {...props} />;
      case 'reports': return <ReportsTab {...props} />;
      default: return <OverviewTab {...props} />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-white text-gray-900 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Accounting</h1>
          <p className="text-gray-500 text-sm mt-1 capitalize">{filters.timePeriod} 2026</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="bg-gray-100 p-1 rounded-lg flex gap-1">
            {periodOptions.map((opt) => (
              <button
                key={opt.label}
                onClick={() => updateFilters({ timePeriod: opt.value })}
                className={cn(
                  "px-4 py-1.5 rounded-md text-sm font-medium transition-all",
                  filters.timePeriod === opt.value 
                    ? "bg-white text-gray-900 shadow-sm" 
                    : "text-gray-500 hover:text-gray-900"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
          
          <Button 
            variant="outline" 
            onClick={() => window.electron.invoke('export-data', { type: 'dashboard', format: 'csv', filters })}
            className="bg-white border-gray-200 text-gray-700 hover:bg-gray-50 h-10 px-4 rounded-lg flex items-center gap-2"
          >
            <Download className="size-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Sub-navigation */}
      <div className="px-8 border-b border-gray-100 bg-white">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-5 py-3 text-sm font-medium transition-all border-b-2 whitespace-nowrap",
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-200"
              )}
            >
              <tab.icon className="size-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-8 no-scrollbar bg-gray-50">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default Accounting;
