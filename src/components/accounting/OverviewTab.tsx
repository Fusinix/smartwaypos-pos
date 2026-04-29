import React, { useState } from 'react';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  Plus,
  FileText,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const StatCard = ({ title, value, delta, isPositive, secondaryLabel }: any) => (
  <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm">
    <p className="text-gray-500 text-sm font-medium mb-2">{title}</p>
    <h3 className="text-3xl font-bold text-gray-900 mb-2">{value}</h3>
    {delta && (
      <div className={cn(
        "flex items-center gap-1 text-xs font-medium",
        isPositive ? "text-emerald-500" : "text-rose-500"
      )}>
        {isPositive ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
        {typeof delta === 'number' ? `${delta.toFixed(2)}%` : delta} vs last month
      </div>
    )}
    {secondaryLabel && (
      <p className="text-gray-500 text-xs mt-2">{secondaryLabel}</p>
    )}
  </div>
);

const cn = (...classes: any) => classes.filter(Boolean).join(' ');

const OverviewTab: React.FC<any> = ({ stats, analytics, expenses = [], filters }) => {
  const { categoryPerformance } = analytics;
  const totalExpenses = expenses.reduce((sum: number, e: any) => sum + e.amount, 0);
  const formatCurrency = (val: number) => `GH₵ ${val?.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (format: string) => {
    try {
      setIsExporting(true);
      const res = await window.electron.invoke('export-data', {
        type: 'dashboard',
        format,
        filters: { timePeriod: 'month' } 
      });
      console.log(res.message);
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Summary Cards */}
      <div>
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            title="Total revenue" 
            value={formatCurrency(stats?.revenue || 0)} 
            delta={`${Math.abs(stats?.revenueChange || 0).toFixed(1)}%`} 
            isPositive={(stats?.revenueChange || 0) >= 0} 
          />
          <StatCard 
            title="Net profit" 
            value={formatCurrency((stats?.revenue || 0) - totalExpenses)} 
            delta={`${Math.abs(stats?.revenueChange || 0).toFixed(1)}%`} 
            isPositive={(stats?.revenueChange || 0) >= 0} 
            secondaryLabel="Estimated"
          />
          <StatCard 
            title="Total expenses" 
            value={formatCurrency(totalExpenses)} 
            delta="0%" 
            isPositive={true} 
            secondaryLabel={expenses.length > 0 ? `${expenses.length} logs found` : "No expenses logged"}
          />
          <StatCard 
            title="Tax collected" 
            value={formatCurrency((stats?.revenue || 0) * 0.12)} 
            secondaryLabel="Estimated (12%)"
          />
        </div>
      </div>

      {/* P&L and Cost Analysis */}
      <div>
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">P&L & Cost Analysis</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Profit & Loss Statement */}
          <div className="bg-white border border-gray-100 rounded-2xl p-8 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg font-bold text-gray-900">Profit & loss</h3>
              <span className={cn(
                "text-xs px-3 py-1 rounded-full font-bold",
                (stats?.revenue || 0) > 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-gray-100 text-gray-500"
              )}>
                {(stats?.revenue || 0) > 0 ? "Profitable" : "No Activity"}
              </span>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-3">
                {categoryPerformance?.length > 0 ? categoryPerformance.map((cat: any) => (
                  <div key={cat.category} className="flex justify-between text-sm">
                    <span className="text-gray-500">{cat.category} sales</span>
                    <span className="text-gray-900 font-medium">{formatCurrency(cat.revenue)}</span>
                  </div>
                )) : (
                  <p className="text-gray-500 text-sm text-center py-4">No sales data available</p>
                )}
              </div>

              <div className="pt-4 border-t border-gray-100">
                <div className="flex justify-between text-lg font-bold">
                  <span className="text-gray-900">Gross revenue</span>
                  <span className="text-gray-900">{formatCurrency(stats?.revenue || 0)}</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Total Expenses</span>
                  <span className="text-rose-500">- {formatCurrency(totalExpenses)}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <div className="flex justify-between text-lg font-bold">
                  <span className="text-emerald-500">Net profit</span>
                  <span className="text-emerald-500">{formatCurrency((stats?.revenue || 0) - totalExpenses)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Key Cost Ratios */}
          <div className="bg-white border border-gray-100 rounded-2xl p-8 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg font-bold text-gray-900">Key cost ratios</h3>
              <span className="bg-primary/10 text-primary text-xs px-3 py-1 rounded-full font-bold">
                Prime cost {stats?.revenue > 0 ? ((totalExpenses / stats.revenue) * 100).toFixed(1) : 0}%
              </span>
            </div>
            
            <div className="space-y-8">
              <div className="space-y-4">
                {[
                  { label: 'Total Expense Ratio', value: stats?.revenue > 0 ? ((totalExpenses / stats.revenue) * 100).toFixed(1) : 0, color: 'bg-rose-500' },
                  { label: 'Estimated Margin', value: stats?.revenue > 0 ? (((stats.revenue - totalExpenses) / stats.revenue) * 100).toFixed(1) : 0, color: 'bg-emerald-500' },
                ].map((item) => (
                  <div key={item.label} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">{item.label}</span>
                      <span className="text-gray-900 font-medium">{item.value}%</span>
                    </div>
                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div className={cn("h-full rounded-full transition-all duration-1000", item.color)} style={{ width: `${item.value}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-6 border-t border-gray-100">
                <p className="text-gray-500 text-xs mb-2">Note</p>
                <p className="text-gray-500 text-xs text-balance">Ratios are based on current period expenses and revenue.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Expenses, Reconciliation & Tax */}
      <div>
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Expenses, Reconciliation & Tax</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Expense Breakdown */}
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-bold text-gray-900">Recent expenses</h3>
              <button className="text-primary text-xs font-bold hover:underline">View all</button>
            </div>
            <div className="space-y-4">
              {expenses.length > 0 ? expenses.slice(0, 5).map((e: any) => (
                <div key={e.id} className="flex justify-between items-center text-xs py-1 border-b border-gray-50 last:border-0">
                  <span className="text-gray-500 truncate max-w-[150px]">{e.description}</span>
                  <span className="text-gray-900 font-bold">{formatCurrency(e.amount)}</span>
                </div>
              )) : (
                <p className="text-gray-500 text-xs text-center py-8">No expenses logged yet.</p>
              )}
            </div>
          </div>

          {/* Cash Reconciliation */}
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-bold text-gray-900">Payment methods</h3>
              <span className="bg-primary/10 text-primary text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Live</span>
            </div>
            <div className="space-y-4">
              {analytics.paymentMethods?.map((pm: any) => (
                <div key={pm.method} className="flex justify-between text-xs py-2 border-b border-gray-50 last:border-0">
                  <span className="text-gray-500 capitalize">{pm.method}</span>
                  <span className="text-gray-900 font-medium">{formatCurrency(pm.revenue)}</span>
                </div>
              ))}
              {(!analytics.paymentMethods || analytics.paymentMethods.length === 0) && (
                <p className="text-gray-500 text-xs text-center py-8">No payment data for this period.</p>
              )}
            </div>
          </div>

          {/* Tax & VAT Ledger */}
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-bold text-gray-900">Tax & VAT ledger</h3>
              <span className="bg-blue-500/10 text-blue-500 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Estimated</span>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between text-xs py-2 border-b border-gray-50">
                <span className="text-gray-500">Taxable sales</span>
                <span className="text-gray-900 font-medium">{formatCurrency(stats?.revenue || 0)}</span>
              </div>
              <div className="flex justify-between text-xs py-2 border-b border-gray-50">
                <div className="flex flex-col">
                  <span className="text-gray-500">VAT collected (12%)</span>
                </div>
                <span className="text-gray-900 font-medium">{formatCurrency((stats?.revenue || 0) * 0.12)}</span>
              </div>
              <div className="flex justify-between text-xs py-2 border-b border-gray-50">
                <div className="flex flex-col">
                  <span className="text-gray-500">NHIL (2.5%)</span>
                </div>
                <span className="text-gray-900 font-medium">{formatCurrency((stats?.revenue || 0) * 0.025)}</span>
              </div>
              <div className="flex justify-between text-xs py-2">
                <span className="text-gray-900 font-bold">Total due</span>
                <span className="text-primary font-bold">{formatCurrency((stats?.revenue || 0) * 0.145)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Export Bar */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gray-50 rounded-xl">
            <FileText className="size-6 text-gray-500" />
          </div>
          <div>
            <h4 className="text-gray-900 font-bold text-sm">Accountant export</h4>
            <p className="text-gray-500 text-xs">P&L, expenses & tax</p>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Button 
            variant="outline" 
            onClick={() => handleExport('csv')}
            disabled={isExporting}
            className="flex-1 md:flex-none bg-white border-gray-200 text-gray-700 hover:bg-gray-50 h-12 px-8 rounded-xl font-bold"
          >
            {isExporting ? 'Exporting...' : 'Download CSV'}
          </Button>
          <Button 
            onClick={() => handleExport('pdf')}
            disabled={isExporting}
            className="flex-1 md:flex-none bg-primary text-white hover:bg-primary/90 h-12 px-8 rounded-xl font-bold"
          >
            Download PDF
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OverviewTab;
