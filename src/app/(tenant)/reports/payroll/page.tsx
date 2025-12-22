'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePayrollReport } from '@/hooks/useReports';
import { cn } from '@/lib/utils';
import {
  ChevronLeft,
  Download,
  Loader2,
  Clock,
  DollarSign,
  Calendar,
  Filter,
  User,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

export default function PayrollReportPage() {
  const [dateRange, setDateRange] = useState({
    start_date: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end_date: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
  });
  const [selectedTeamId, setSelectedTeamId] = useState<number | undefined>();

  const { data: payroll, isLoading, error } = usePayrollReport({
    ...dateRange,
    team_id: selectedTeamId,
  });

  const handlePeriodChange = (period: string) => {
    const now = new Date();
    let start: Date;
    let end: Date;

    switch (period) {
      case 'this-month':
        start = startOfMonth(now);
        end = endOfMonth(now);
        break;
      case 'last-month':
        start = startOfMonth(subMonths(now, 1));
        end = endOfMonth(subMonths(now, 1));
        break;
      case 'last-3-months':
        start = startOfMonth(subMonths(now, 2));
        end = endOfMonth(now);
        break;
      default:
        return;
    }

    setDateRange({
      start_date: format(start, 'yyyy-MM-dd'),
      end_date: format(end, 'yyyy-MM-dd'),
    });
  };

  // Calculate totals
  const totals = payroll?.reduce(
    (acc, item) => ({
      total_hours: acc.total_hours + item.total_hours,
      regular_hours: acc.regular_hours + item.regular_hours,
      overtime_hours: acc.overtime_hours + item.overtime_hours,
      total_amount: acc.total_amount + item.total_amount,
      appointments: acc.appointments + item.appointments_count,
    }),
    { total_hours: 0, regular_hours: 0, overtime_hours: 0, total_amount: 0, appointments: 0 }
  );

  // Chart data
  const chartData = payroll?.slice(0, 10).map((item) => ({
    name: item.team_member.name.split(' ')[0],
    regular: item.regular_hours,
    overtime: item.overtime_hours,
    amount: item.total_amount,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/reports"
            className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Payroll Report</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Staff hours and compensation details
            </p>
          </div>
        </div>

        <button className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium transition-colors">
          <Download className="w-4 h-4" />
          Export Report
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-400" />
            <select
              onChange={(e) => handlePeriodChange(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 transition-colors"
            >
              <option value="this-month">This Month</option>
              <option value="last-month">Last Month</option>
              <option value="last-3-months">Last 3 Months</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateRange.start_date}
              onChange={(e) => setDateRange((prev) => ({ ...prev, start_date: e.target.value }))}
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 transition-colors"
            />
            <span className="text-gray-500 dark:text-gray-400">to</span>
            <input
              type="date"
              value={dateRange.end_date}
              onChange={(e) => setDateRange((prev) => ({ ...prev, end_date: e.target.value }))}
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
              <Clock className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Hours</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {totals?.total_hours?.toFixed(1) || '--'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Regular Hours</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {totals?.regular_hours?.toFixed(1) || '--'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Overtime Hours</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {totals?.overtime_hours?.toFixed(1) || '--'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Amount</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                ${totals?.total_amount?.toLocaleString() || '--'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      {chartData && chartData.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Hours by Team Member
          </h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                  }}
                />
                <Legend />
                <Bar dataKey="regular" name="Regular" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="overtime" name="Overtime" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Data Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Team Member
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Appointments
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Regular Hours
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Overtime
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Total Hours
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center">
                    <Loader2 className="w-6 h-6 animate-spin text-violet-600 mx-auto" />
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-red-500 dark:text-red-400"
                  >
                    Failed to load payroll data
                  </td>
                </tr>
              ) : !payroll || payroll.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-gray-500 dark:text-gray-400"
                  >
                    No payroll data for the selected period
                  </td>
                </tr>
              ) : (
                payroll.map((item) => (
                  <tr
                    key={item.team_member_id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-violet-700 dark:text-violet-400 font-medium text-sm">
                          {item.team_member.name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .slice(0, 2)}
                        </div>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {item.team_member.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right text-gray-700 dark:text-gray-300">
                      {item.appointments_count}
                    </td>
                    <td className="px-4 py-4 text-right text-gray-700 dark:text-gray-300">
                      {item.regular_hours.toFixed(1)}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span
                        className={cn(
                          'font-medium',
                          item.overtime_hours > 0
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-gray-700 dark:text-gray-300'
                        )}
                      >
                        {item.overtime_hours.toFixed(1)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right font-medium text-gray-900 dark:text-white">
                      {item.total_hours.toFixed(1)}
                    </td>
                    <td className="px-4 py-4 text-right font-medium text-green-600 dark:text-green-400">
                      ${item.total_amount.toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {payroll && payroll.length > 0 && (
              <tfoot>
                <tr className="bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700 font-medium">
                  <td className="px-4 py-3 text-gray-900 dark:text-white">Total</td>
                  <td className="px-4 py-3 text-right text-gray-900 dark:text-white">
                    {totals?.appointments}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-900 dark:text-white">
                    {totals?.regular_hours.toFixed(1)}
                  </td>
                  <td className="px-4 py-3 text-right text-amber-600 dark:text-amber-400">
                    {totals?.overtime_hours.toFixed(1)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-900 dark:text-white">
                    {totals?.total_hours.toFixed(1)}
                  </td>
                  <td className="px-4 py-3 text-right text-green-600 dark:text-green-400">
                    ${totals?.total_amount.toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
