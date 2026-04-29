import React from 'react';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend, 
  ArcElement,
  PointElement,
  LineElement,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { 
  ArrowUpRight, 
  ArrowDownRight,
  TrendingUp,
  Beer,
  Utensils,
  Music
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

const StatCard = ({ title, value, delta, isPositive, icon: Icon }: any) => (
  <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm">
    <div className="flex justify-between items-start mb-4">
      <p className="text-gray-500 text-sm font-medium">{title}</p>
      <div className="p-2 bg-gray-50 rounded-lg">
        <Icon className="size-4 text-gray-500" />
      </div>
    </div>
    <h3 className="text-3xl font-bold text-gray-900 mb-2">{value}</h3>
    {delta && (
      <div className={cn(
        "flex items-center gap-1 text-xs font-medium",
        isPositive ? "text-emerald-500" : "text-rose-500"
      )}>
        {isPositive ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
        {typeof delta === 'number' ? `${delta.toFixed(2)}%` : delta} {isPositive ? "vs last month" : ""}
      </div>
    )}
  </div>
);

const cn = (...classes: any) => classes.filter(Boolean).join(' ');

const IncomeTab: React.FC<any> = ({ stats, analytics, filters }) => {
  const { salesData, categoryPerformance, topProducts } = analytics;
  const formatCurrency = (val: number) => `GH₵ ${val?.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  // Chart Data
  const dailyRevenueData = {
    labels: salesData?.map((s: any) => s.date.split('-').pop()) || [],
    datasets: [
      {
        label: 'Revenue',
        data: salesData?.map((s: any) => s.revenue) || [],
        backgroundColor: '#10b981',
        borderRadius: 4,
      },
    ],
  };

  const revenueByCategoryData = {
    labels: categoryPerformance?.map((c: any) => `${c.category} ${c.percentage}%`) || [],
    datasets: [
      {
        data: categoryPerformance?.map((c: any) => c.percentage) || [],
        backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#6366f1', '#ef4444'],
        borderWidth: 0,
        hoverOffset: 4,
        cutout: '75%',
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: '#fff',
        titleColor: '#111827',
        bodyColor: '#4b5563',
        borderColor: '#e5e7eb',
        borderWidth: 1,
      }
    },
    scales: {
      x: {
        stacked: true,
        grid: {
          display: false,
        },
        ticks: {
          color: '#6b7280',
        }
      },
      y: {
        stacked: true,
        grid: {
          color: '#f3f4f6',
        },
        ticks: {
          color: '#6b7280',
          callback: (value: any) => 'GH₵' + value,
        }
      }
    }
  };

  const donutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      }
    },
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Summary Cards */}
      <div>
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Revenue Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="Total revenue" value={formatCurrency(stats?.revenue || 0)} delta={`${Math.abs(stats?.revenueChange || 0).toFixed(1)}%`} isPositive={(stats?.revenueChange || 0) >= 0} icon={TrendingUp} />
          {categoryPerformance?.slice(0, 3).map((cat: any, idx: number) => (
            <StatCard 
              key={cat.category} 
              title={`${cat.category} sales`} 
              value={formatCurrency(cat.revenue)} 
              delta={`${cat.percentage}%`} 
              isPositive={true} 
              icon={idx === 0 ? Beer : idx === 1 ? Utensils : Music} 
            />
          ))}
          {(!categoryPerformance || categoryPerformance.length < 3) && (
            <StatCard title="Events & other" value="GH₵ 0" delta="0%" isPositive={true} icon={Music} />
          )}
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Revenue trend — {filters.timePeriod}</h3>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-2">
                  <div className="size-2 rounded-full bg-emerald-500" />
                  <span className="text-xs text-gray-500">Revenue</span>
                </div>
              </div>
            </div>
            <Badge variant="outline" className="bg-gray-50 border-gray-200 text-gray-700 font-normal px-3 py-1">Bar chart</Badge>
          </div>
          <div className="h-[300px]">
            <Bar data={dailyRevenueData} options={chartOptions} />
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-8">Revenue by category</h3>
          <div className="relative h-[300px] flex items-center justify-center">
            <div className="w-[200px] h-[200px]">
              <Doughnut data={revenueByCategoryData} options={donutOptions} />
            </div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
              <p className="text-gray-500 text-[10px] uppercase tracking-widest font-bold">Total</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{((stats?.revenue || 0) / 1000).toFixed(1)}k</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-6">
            {categoryPerformance?.slice(0, 3).map((item: any, idx: number) => (
              <div key={item.category} className="text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <div className={cn("size-2 rounded-full", idx === 0 ? 'bg-emerald-500' : idx === 1 ? 'bg-blue-500' : 'bg-orange-500')} />
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">{item.category}</span>
                </div>
                <p className="text-sm font-bold text-gray-900">{item.percentage}%</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Revenue Items Table */}
      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">Top revenue items</h3>
          <Badge variant="outline" className="bg-gray-50 border-gray-200 text-gray-700 font-normal px-3 py-1 capitalize">{filters.timePeriod}</Badge>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Item</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Category</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-right">Units Sold</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-right">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {topProducts?.map((item: any) => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.name}</td>
                  <td className="px-6 py-4">
                    <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider", item.category === 'Bar' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-blue-500/10 text-blue-600')}>
                      {item.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 text-right">{item.sold.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm font-bold text-gray-900 text-right">{formatCurrency(item.revenue)}</td>
                </tr>
              ))}
              {(!topProducts || topProducts.length === 0) && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500 text-sm">No data available for this period</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default IncomeTab;
