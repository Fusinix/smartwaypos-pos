import React from 'react';
import { Line } from 'react-chartjs-2';
import { 
  Users,
  Clock,
  Briefcase,
  TrendingDown
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { useShifts, Shift } from '@/hooks/useShifts';

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

const cn = (...classes: any) => classes.filter(Boolean).join(' ');

const PayrollTab: React.FC<any> = ({ stats, analytics, users = [], expenses = [], filters }) => {
  const [shifts, setShifts] = React.useState<Shift[]>([]);
  const { fetchAllShifts } = useShifts();

  React.useEffect(() => {
    const loadShifts = async () => {
      const data = await fetchAllShifts();
      setShifts(data);
    };
    loadShifts();
  }, [fetchAllShifts]);

  const formatCurrency = (val: number) => `GH₵ ${val?.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  // Filter expenses for payroll-related items (case-insensitive keywords)
  const payrollKeywords = ['salary', 'wage', 'payroll', 'staff', 'allowance', 'labor', 'labour', 'stipend'];
  const payrollExpenses = expenses.filter((e: any) => 
    payrollKeywords.some(kw => e.description?.toLowerCase().includes(kw))
  );

  const totalLaborCost = payrollExpenses.reduce((sum: number, e: any) => sum + e.amount, 0);
  const staffCount = users.length;
  const totalRevenue = stats?.revenue || 0;
  const laborCostPercentage = totalRevenue > 0 ? (totalLaborCost / totalRevenue) * 100 : 0;

  // Calculate actual total hours from shifts
  const totalHours = shifts.reduce((sum: number, s: any) => sum + (s.total_hours || 0), 0);
  const avgHoursPerStaff = staffCount > 0 ? totalHours / staffCount : 0;

  const staff = users.map((u: any) => {
    // Aggregate shifts for this user
    const userShifts = shifts.filter((s: any) => s.user_id === u.id);
    const userTotalHours = userShifts.reduce((sum: number, s: any) => sum + (s.total_hours || 0), 0);

    // Try to find expenses specifically for this user if their name is in the description
    const userExpenses = payrollExpenses.filter((e: any) => 
      e.description?.toLowerCase().includes(u.username.toLowerCase())
    );
    const userTotalPay = userExpenses.length > 0 
      ? userExpenses.reduce((sum: number, e: any) => sum + e.amount, 0)
      : (totalLaborCost / (staffCount || 1)); // fallback to average if no specific expense found

    return {
      name: u.username,
      role: u.role,
      initials: u.username.substring(0, 2).toUpperCase(),
      color: u.role === 'admin' ? 'text-primary' : 'text-gray-400',
      hours: userTotalHours.toFixed(1),
      pay: userTotalPay,
      rate: userTotalHours > 0 ? userTotalPay / userTotalHours : 0
    };
  });

  const laborCostChartData = {
    labels: ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr'],
    datasets: [
      {
        label: 'Labor Cost %',
        data: [28, 30, 29, 31, 28, Math.round(laborCostPercentage)],
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#6366f1',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
      },
      {
        label: 'Target',
        data: [35, 35, 35, 35, 35, 35],
        borderColor: '#ef4444',
        borderDash: [5, 5],
        borderWidth: 2,
        pointRadius: 0,
        fill: false,
      }
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#6b7280' }
      },
      y: {
        min: 20,
        max: 40,
        grid: { color: '#f3f4f6' },
        ticks: { 
          color: '#6b7280',
          callback: (value: any) => value + '%',
        }
      }
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Payroll — {filters?.timePeriod || 'Current Period'}</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          title="Total labor cost" 
          value={formatCurrency(totalLaborCost)} 
          subValue={`${staffCount} staff members`} 
          icon={Briefcase} 
        />
        <StatCard 
          title="Labor cost %" 
          value={`${laborCostPercentage.toFixed(1)}%`} 
          subValue={laborCostPercentage <= 35 ? "Within target (<35%)" : "Above target (>35%)"} 
          icon={TrendingDown} 
        />
        <StatCard 
          title="Total hours worked" 
          value={`${totalHours.toFixed(1)} hrs`} 
          subValue={`Avg ${avgHoursPerStaff.toFixed(1)} hrs/staff`} 
          icon={Clock} 
        />
      </div>

      {/* Staff Breakdown Table */}
      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">Staff payroll breakdown</h3>
          <Badge variant="outline" className="bg-gray-50 border-gray-200 text-gray-700 font-normal px-3 py-1">April 2026</Badge>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Staff Member</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-right">Hours</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-right">Rate/Hr</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-right">Total Pay</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-right">Labor %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {staff.map((member: any) => (
                <tr key={member.name} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="size-8 border border-gray-100">
                        <AvatarFallback className={cn("text-[10px] font-bold", member.color)}>
                          {member.initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900">{member.name}</span>
                        <span className="text-[10px] text-gray-500 capitalize">{member.role}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 text-right font-medium">{member.hours}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 text-right">GH₵ {member.rate.toFixed(1)}</td>
                  <td className="px-6 py-4 text-sm font-bold text-gray-900 text-right">{formatCurrency(member.pay)}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 text-right">
                    {totalLaborCost > 0 ? ((member.pay / totalLaborCost) * 100).toFixed(1) : 0}%
                  </td>
                </tr>
              ))}
              {staff.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500 text-sm italic">No staff members found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Labor Cost Chart */}
      <div className="bg-white border border-gray-100 rounded-2xl p-8 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-lg font-bold text-gray-900">Labor cost % over time</h3>
          <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-0 font-bold">Target &lt;35%</Badge>
        </div>
        <div className="h-[300px]">
          <Line data={laborCostChartData} options={chartOptions} />
        </div>
      </div>
    </div>
  );
};

export default PayrollTab;
