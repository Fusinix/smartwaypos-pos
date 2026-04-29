import React from 'react';
import { Bar } from 'react-chartjs-2';
import { 
  Percent,
  FileText,
  Calendar,
  ChevronDown
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const StatCard = ({ title, value, subValue, icon: Icon }: any) => (
  <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm">
    <div className="flex justify-between items-start mb-4">
      <p className="text-gray-500 text-sm font-medium">{title}</p>
      <div className="p-2 bg-gray-50 rounded-lg">
        <Icon className="size-4 text-gray-500" />
      </div>
    </div>
    <h3 className="text-3xl font-bold text-gray-900 mb-1">{value}</h3>
    <p className="text-gray-500 text-xs">{subValue}</p>
  </div>
);

const TaxTab: React.FC<any> = ({ stats, analytics, filters }) => {
  const formatCurrency = (val: number) => `GH₵ ${val?.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  const taxHistory: any[] = [];

  const taxChartData = {
    labels: analytics?.salesData?.map((s: any) => s.date.split('-').pop()) || [],
    datasets: [
      {
        label: 'Tax Due',
        data: analytics?.salesData?.map((s: any) => s.revenue * 0.12) || [],
        backgroundColor: '#3b82f6',
        borderRadius: 6,
      }
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false }
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#6b7280' } },
      y: { 
        grid: { color: '#f3f4f6' },
        ticks: { 
          color: '#6b7280',
          callback: (value: any) => 'GH₵' + (value/1000) + 'k'
        }
      }
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Taxable sales" value={formatCurrency(stats?.revenue || 0)} subValue={filters?.timePeriod || 'Current period'} icon={FileText} />
        <StatCard title="Total tax due" value={formatCurrency((stats?.revenue || 0) * 0.18)} subValue="Estimated (18%)" icon={Percent} />
        <StatCard title="Filing status" value="Not filed" subValue="Requires manual filing" icon={Calendar} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white border border-gray-100 rounded-2xl p-8 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-8">Detailed tax breakdown</h3>
          <div className="space-y-4">
            {[
              { label: 'Gross revenue', value: formatCurrency(stats?.revenue || 0), isMain: true },
              { label: 'VAT (12%)', value: formatCurrency((stats?.revenue || 0) * 0.12) },
              { label: 'NHIL (2.5%)', value: formatCurrency((stats?.revenue || 0) * 0.025) },
              { label: 'GETFL (2.5%)', value: formatCurrency((stats?.revenue || 0) * 0.025) },
              { label: 'Tourism levy (1%)', value: formatCurrency((stats?.revenue || 0) * 0.01) },
            ].map((item, idx) => (
              <div key={idx} className={cn(
                "flex justify-between items-center py-2 border-b border-gray-50 last:border-0",
                item.isMain && "border-b-gray-200 pb-4 mb-4"
              )}>
                <span className={cn("text-sm", item.isMain ? "text-gray-900 font-bold" : "text-gray-500")}>{item.label}</span>
                <span className={cn(
                  "text-sm font-bold",
                  item.isMain ? "text-gray-900 text-lg" : "text-gray-900"
                )}>{item.value}</span>
              </div>
            ))}
            <div className="pt-6 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold text-primary">Net payable</span>
                <span className="text-2xl font-bold text-primary">{formatCurrency((stats?.revenue || 0) * 0.18)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-8 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-8">Monthly tax due</h3>
          <div className="h-[300px]">
            <Bar data={taxChartData} options={chartOptions} />
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">Tax history</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Month</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-right">Revenue</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-right">Tax Due</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {taxHistory.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500 text-sm italic">No tax history recorded.</td>
                </tr>
              ) : taxHistory.map((row, idx) => (
                <tr key={idx} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-6 py-4 text-sm text-gray-900 font-medium">{row.month}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 text-right">GH₵ {row.revenue}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 font-bold text-right">GH₵ {row.tax}</td>
                  <td className="px-6 py-4 text-center">
                    <Badge className={cn(
                      "font-bold text-[10px] uppercase tracking-wider",
                      row.status === 'Filed' ? "bg-emerald-500/10 text-emerald-600" : "bg-orange-500/10 text-orange-600"
                    )}>
                      {row.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const cn = (...classes: any) => classes.filter(Boolean).join(' ');

export default TaxTab;
