import React, { useState } from 'react';
import { Doughnut } from 'react-chartjs-2';
import { 
  Plus,
  ArrowUpRight,
  Receipt,
  Tag,
  Repeat
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/context/AuthContext';

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
        {isPositive ? <ArrowUpRight className="size-3" /> : <ArrowUpRight className="size-3 rotate-90" />}
        {delta}
      </div>
    )}
  </div>
);

const cn = (...classes: any) => classes.filter(Boolean).join(' ');

const ExpensesTab: React.FC<any> = ({ stats, analytics, expenses = [] }) => {
  const { user } = useAuth();
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const totalExpenses = expenses.reduce((sum: number, e: any) => sum + e.amount, 0);
  const formatCurrency = (val: number) => `GH₵ ${val?.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  const handleAddExpense = async () => {
    if (!desc || !amount || !category) return;
    try {
      setIsAdding(true);
      await window.electron.invoke('add-expense', {
        description: desc,
        amount: parseFloat(amount),
        admin_name: user?.username || 'Admin',
        admin_id: user?.id,
        category: category
      });
      setDesc('');
      setAmount('');
      setCategory('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsAdding(false);
    }
  };

  const spendingData = {
    labels: expenses.length > 0 ? Array.from(new Set(expenses.map((e: any) => e.category || 'Other'))) : ['No Expenses'],
    datasets: [
      {
        data: expenses.length > 0 ? Array.from(new Set(expenses.map((e: any) => e.category || 'Other'))).map(cat => 
          expenses.filter((e: any) => (e.category || 'Other') === cat).reduce((sum: number, e: any) => sum + e.amount, 0)
        ) : [1],
        backgroundColor: ['#10b981', '#6366f1', '#3b82f6', '#f59e0b', '#6b7280'],
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
    },
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Expense Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <StatCard title="Total expenses" value={formatCurrency(totalExpenses)} delta={`${expenses.length} items`} isPositive={true} icon={Receipt} />
          <StatCard title="Revenue impact" value={stats?.revenue > 0 ? `${((totalExpenses / stats.revenue) * 100).toFixed(1)}%` : '0%'} delta="of total revenue" isPositive={false} icon={Tag} />
          <StatCard title="Avg. Expense" value={formatCurrency(expenses.length > 0 ? totalExpenses / expenses.length : 0)} delta="per log" isPositive={true} icon={Repeat} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden flex flex-col shadow-sm">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Expense log</h3>
              <Badge variant="outline" className="bg-gray-50 border-gray-200 text-gray-700 font-normal px-3 py-1 capitalize">Real-time</Badge>
            </div>
            
            <div className="overflow-x-auto flex-1 max-h-[400px] no-scrollbar">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Description</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Date</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {expenses.map((expense: any) => (
                    <tr key={expense.id} className="hover:bg-gray-50 transition-colors group">
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-gray-900">{expense.description}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs text-gray-500">{new Date(expense.created_at).toLocaleDateString()}</span>
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-gray-900 text-right">{formatCurrency(expense.amount)}</td>
                    </tr>
                  ))}
                  {expenses.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-6 py-12 text-center text-gray-500 text-sm italic">No expenses recorded for this period.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <Input 
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="Description" 
                  className="bg-white border-gray-200 text-gray-900 h-11 shadow-sm" 
                />
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="bg-white border-gray-200 text-gray-900 h-11 shadow-sm">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200">
                    <SelectItem value="supplier">Supplier</SelectItem>
                    <SelectItem value="payroll">Payroll</SelectItem>
                    <SelectItem value="rent">Rent</SelectItem>
                    <SelectItem value="utilities">Utilities</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <Input 
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Amount" 
                  type="number" 
                  className="bg-white border-gray-200 text-gray-900 h-11 shadow-sm" 
                />
                <Button 
                  onClick={handleAddExpense}
                  disabled={isAdding}
                  className="bg-primary text-white hover:bg-primary/90 h-11 font-bold rounded-lg shadow-sm"
                >
                  <Plus className="size-4 mr-2" />
                  {isAdding ? 'Adding...' : 'Add'}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-gray-100 rounded-2xl p-8 h-full flex flex-col shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-8">Spending by category</h3>
            
            <div className="relative h-[250px] mb-8">
              <Doughnut data={spendingData} options={donutOptions} />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
                <p className="text-gray-500 text-[10px] uppercase tracking-widest font-bold">Spent</p>
                <p className="text-2xl font-bold text-gray-900">{totalExpenses > 1000 ? `${(totalExpenses/1000).toFixed(1)}k` : totalExpenses}</p>
              </div>
            </div>

            <div className="pt-6 border-t border-gray-100 space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">Total expenses</span>
                <span className="text-gray-900 font-bold text-lg">{formatCurrency(totalExpenses)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-emerald-600 font-medium">Net profit after expenses</span>
                <span className="text-emerald-600 font-bold">{formatCurrency((stats?.revenue || 0) - totalExpenses)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExpensesTab;
