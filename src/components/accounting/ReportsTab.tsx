import React, { useState } from 'react';
import { 
  FileText,
  Download,
  Calendar,
  Filter,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const ReportCard = ({ title, description }: any) => (
  <div className="bg-white border border-gray-100 p-6 rounded-2xl group hover:border-primary/20 transition-all shadow-sm">
    <div className="flex items-start justify-between mb-4">
      <div className="p-3 bg-gray-50 rounded-xl group-hover:bg-primary/10 transition-colors">
        <FileText className="size-6 text-gray-500 group-hover:text-primary transition-colors" />
      </div>
      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button className="p-2 bg-gray-50 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors" title="Download CSV">
          <Download className="size-4" />
        </button>
      </div>
    </div>
    <h3 className="text-gray-900 font-bold mb-2">{title}</h3>
    <p className="text-gray-500 text-xs leading-relaxed mb-6">{description}</p>
    <div className="flex gap-3">
      <Button variant="outline" className="flex-1 bg-white border-gray-200 text-gray-700 hover:bg-gray-50 h-10 text-xs font-bold rounded-lg">
        CSV
      </Button>
      <Button className="flex-1 bg-primary text-white hover:bg-primary/90 h-10 text-xs font-bold rounded-lg">
        PDF
      </Button>
    </div>
  </div>
);

const ReportsTab: React.FC<any> = ({ filters }) => {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [reportType, setReportType] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (type: string, format: string, customFilters?: any) => {
    try {
      setIsExporting(true);
      const activeFilters = customFilters || filters;
      // In a real app, map 'pl', 'expenses', etc. to actual export handlers or dashboard formats.
      // We'll use 'dashboard' to get the full suite of metrics for now.
      const res = await window.electron.invoke('export-data', {
        type: type === 'dashboard' ? 'dashboard' : 'sales', // simplified mapping for demo
        format,
        filters: activeFilters
      });
      console.log(res.message);
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleCustomGenerate = () => {
    if (!fromDate || !toDate || !reportType) return;
    handleExport(reportType, 'csv', { startDate: fromDate, endDate: toDate });
  };

  const reports = [
    { title: 'P&L Statement', description: 'Comprehensive view of revenue, COGS, and all expenses for the selected period.', type: 'dashboard' },
    { title: 'Expense Report', description: 'Detailed breakdown of all spending categorized by supplier and type.', type: 'expenses' },
    { title: 'Payroll Summary', description: 'Staff hours, rates, and total labor costs across the organization.', type: 'payroll' },
    { title: 'Tax & VAT Ledger', description: 'Detailed tax calculations, collections, and net payable summaries.', type: 'tax' },
    { title: 'Cash Flow Analysis', description: 'Expected vs. actual cash counts, mobile money splits, and variances.', type: 'cash' },
    { title: 'Full Accounting Package', description: 'Consolidated report including all of the above for external accountants.', type: 'dashboard' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm">
          <p className="text-gray-500 text-sm font-medium mb-2">Last export</p>
          <h3 className="text-3xl font-bold text-gray-900 mb-1">None</h3>
          <p className="text-gray-500 text-xs font-medium">No previous exports found</p>
        </div>
        <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm">
          <p className="text-gray-500 text-sm font-medium mb-2">Date range</p>
          <h3 className="text-3xl font-bold text-gray-900 mb-1 capitalize">{filters?.timePeriod}</h3>
          <p className="text-gray-500 text-xs font-medium">Currently selected period</p>
        </div>
        <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm">
          <p className="text-gray-500 text-sm font-medium mb-2">Export formats</p>
          <h3 className="text-3xl font-bold text-gray-900 mb-1">CSV/PDF</h3>
          <p className="text-gray-500 text-xs font-medium">Auto-formatted for accountants</p>
        </div>
      </div>

      <div>
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-6">Available Reports</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reports.map((report, idx) => (
            <div key={idx} className="bg-white border border-gray-100 p-6 rounded-2xl group hover:border-primary/20 transition-all shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-gray-50 rounded-xl group-hover:bg-primary/10 transition-colors">
                  <FileText className="size-6 text-gray-500 group-hover:text-primary transition-colors" />
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleExport(report.type, 'csv')} className="p-2 bg-gray-50 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors" title="Download CSV">
                    <Download className="size-4" />
                  </button>
                </div>
              </div>
              <h3 className="text-gray-900 font-bold mb-2">{report.title}</h3>
              <p className="text-gray-500 text-xs leading-relaxed mb-6">{report.description}</p>
              <div className="flex gap-3">
                <Button onClick={() => handleExport(report.type, 'csv')} disabled={isExporting} variant="outline" className="flex-1 bg-white border-gray-200 text-gray-700 hover:bg-gray-50 h-10 text-xs font-bold rounded-lg">
                  CSV
                </Button>
                <Button onClick={() => handleExport(report.type, 'pdf')} disabled={isExporting} className="flex-1 bg-primary text-white hover:bg-primary/90 h-10 text-xs font-bold rounded-lg">
                  PDF
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Custom Report Generator */}
      <div className="bg-white border border-gray-100 rounded-2xl p-8 shadow-sm">
        <h3 className="text-lg font-bold text-gray-900 mb-8">Generate custom report</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">From date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-500" />
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="bg-gray-50 border-gray-200 text-gray-900 pl-10 h-12 rounded-xl focus:ring-primary/20" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">To date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-500" />
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="bg-gray-50 border-gray-200 text-gray-900 pl-10 h-12 rounded-xl focus:ring-primary/20" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Report type</label>
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger className="bg-gray-50 border-gray-200 text-gray-900 h-12 rounded-xl focus:ring-primary/20">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent className="bg-white border-gray-200">
                <SelectItem value="dashboard">P&L Statement</SelectItem>
                <SelectItem value="expenses">Expenses</SelectItem>
                <SelectItem value="payroll">Payroll</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button onClick={handleCustomGenerate} disabled={isExporting || !fromDate || !toDate || !reportType} className="w-full bg-primary text-white hover:bg-primary/90 h-12 font-bold rounded-xl shadow-md">
              {isExporting ? 'Generating...' : 'Generate Report'}
              {!isExporting && <ArrowRight className="size-4 ml-2" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsTab;
