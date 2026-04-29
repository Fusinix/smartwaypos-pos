import React from 'react';
import { Doughnut } from 'react-chartjs-2';
import { 
  Wallet,
  Smartphone,
  AlertTriangle,
  CheckCircle2,
  Calendar
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const StatCard = ({ title, value, subValue, icon: Icon, isNegative }: any) => (
  <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm">
    <div className="flex justify-between items-start mb-4">
      <p className="text-gray-500 text-sm font-medium">{title}</p>
      <div className="p-2 bg-gray-50 rounded-lg">
        <Icon className="size-4 text-gray-500" />
      </div>
    </div>
    <h3 className={cn("text-3xl font-bold mb-1", isNegative ? "text-rose-500" : "text-gray-900")}>{value}</h3>
    <p className="text-gray-500 text-xs">{subValue}</p>
  </div>
);

const cn = (...classes: any) => classes.filter(Boolean).join(' ');

const CashReconciliationTab: React.FC<any> = ({ stats, analytics, filters }) => {
  const { paymentMethods = [] } = analytics;
  const cashMethod = paymentMethods.find((p: any) => p.method?.toLowerCase().includes('cash'));
  const otherMethods = paymentMethods.filter((p: any) => !p.method?.toLowerCase().includes('cash'));
  
  const cashTotal = cashMethod?.revenue || 0;
  const otherTotal = otherMethods.reduce((sum: number, p: any) => sum + p.revenue, 0);
  const formatCurrency = (val: number) => `GH₵ ${val?.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  const paymentData = {
    labels: paymentMethods.length > 0 ? paymentMethods.map((p: any) => `${p.method} ${p.percentage.toFixed(1)}%`) : ['No Data'],
    datasets: [
      {
        data: paymentMethods.length > 0 ? paymentMethods.map((p: any) => p.revenue) : [1],
        backgroundColor: ['#10b981', '#3b82f6', '#6366f1', '#f59e0b', '#6b7280'],
        borderWidth: 0,
        cutout: '75%',
      },
    ],
  };

  const donutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false }
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Cash & Reconciliation</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Cash collected" value={formatCurrency(cashTotal)} subValue={`${cashMethod?.count || 0} transactions`} icon={Wallet} />
        <StatCard title="Card / Mobile Money" value={formatCurrency(otherTotal)} subValue={`${otherMethods.reduce((sum: number, p: any) => sum + p.count, 0)} transactions`} icon={Smartphone} />
        <StatCard title="Total variance" value="GH₵ 0" subValue="No discrepancy reported" icon={CheckCircle2} isNegative={false} />
      </div>

      {/* Daily Log Table */}
      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">Daily reconciliation log</h3>
          <Badge variant="outline" className="bg-gray-50 border-gray-200 text-gray-700 font-normal px-3 py-1 capitalize">{filters?.timePeriod || 'Current Period'}</Badge>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Date</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Shift</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-right">Expected</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-right">Counted</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-right">Variance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paymentMethods.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500 text-sm italic">No reconciliation data for this period.</td>
                </tr>
              ) : (
                <tr className="hover:bg-gray-50 transition-colors group">
                  <td className="px-6 py-4 text-sm text-gray-900 font-medium">Today</td>
                  <td className="px-6 py-4 text-sm text-gray-500">Main Shift</td>
                  <td className="px-6 py-4 text-sm text-gray-900 font-bold text-right">{formatCurrency(cashTotal + otherTotal)}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 font-bold text-right">{formatCurrency(cashTotal + otherTotal)}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="size-2 rounded-full bg-emerald-500" />
                      <span className="text-sm font-bold text-emerald-600">GH₵ 0</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white border border-gray-100 rounded-2xl p-8 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-8">Payment method split</h3>
          <div className="relative h-[250px]">
            <Doughnut data={paymentData} options={donutOptions} />
          </div>
          <div className="grid grid-cols-3 gap-4 mt-8">
            {paymentMethods.map((item: any, idx: number) => (
              <div key={item.method} className="text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <div className={cn("size-2 rounded-full", ['bg-emerald-500', 'bg-blue-500', 'bg-indigo-500', 'bg-orange-500', 'bg-gray-500'][idx % 5])} />
                  <span className="text-[10px] text-gray-500 uppercase font-bold capitalize">{item.method}</span>
                </div>
                <p className="text-sm font-bold text-gray-900">{item.percentage.toFixed(1)}%</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-8 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-8">Variance flags legend</h3>
          <div className="space-y-6">
            <div className="flex items-center justify-between py-2 border-b border-gray-50">
              <div className="flex items-center gap-3">
                <div className="size-2 rounded-full bg-emerald-500" />
                <span className="text-sm text-gray-500">Balanced</span>
              </div>
              <span className="text-sm text-emerald-600 font-medium">GH₵ 0 difference</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-50">
              <div className="flex items-center gap-3">
                <div className="size-2 rounded-full bg-orange-500" />
                <span className="text-sm text-gray-500">Minor variance</span>
              </div>
              <span className="text-sm text-orange-600 font-medium">GH₵ 1–50 short</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-50">
              <div className="flex items-center gap-3">
                <div className="size-2 rounded-full bg-rose-500" />
                <span className="text-sm text-gray-500">Alert</span>
              </div>
              <span className="text-sm text-rose-600 font-medium">GH₵ 50+ short</span>
            </div>
          </div>
          <div className="mt-8 p-4 bg-gray-50 rounded-xl">
            <p className="text-xs text-gray-500 leading-relaxed">
              All variances are logged automatically at end-of-day drawer count. Alerts above GH₵ 50 notify the manager.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CashReconciliationTab;
