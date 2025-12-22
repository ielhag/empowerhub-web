'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTeamPerformance } from '@/hooks/useReports';
import { cn } from '@/lib/utils';
import {
  ChevronLeft,
  Download,
  Loader2,
  TrendingUp,
  Calendar,
  Users,
  Clock,
  Star,
  CheckCircle,
  Award,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

export default function PerformanceReportPage() {
  const [dateRange, setDateRange] = useState({
    start_date: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end_date: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
  });

  const { data: performance, isLoading, error } = useTeamPerformance(dateRange);

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

  // Calculate averages
  const averages = performance?.length
    ? {
        completion_rate:
          performance.reduce((acc, p) => acc + p.completion_rate, 0) / performance.length,
        on_time_rate:
          performance.reduce((acc, p) => acc + p.on_time_rate, 0) / performance.length,
        satisfaction:
          performance.filter((p) => p.client_satisfaction).length > 0
            ? performance.reduce((acc, p) => acc + (p.client_satisfaction || 0), 0) /
              performance.filter((p) => p.client_satisfaction).length
            : null,
        total_hours: performance.reduce((acc, p) => acc + p.total_hours, 0),
        total_appointments: performance.reduce((acc, p) => acc + p.total_appointments, 0),
      }
    : null;

  // Chart data - completion rates
  const completionChartData = performance
    ?.sort((a, b) => b.completion_rate - a.completion_rate)
    .slice(0, 10)
    .map((item) => ({
      name: item.team_member.name.split(' ')[0],
      rate: Math.round(item.completion_rate),
      onTime: Math.round(item.on_time_rate),
    }));

  // Get performance tier
  const getPerformanceTier = (rate: number) => {
    if (rate >= 95) return { label: 'Excellent', color: 'text-green-600 dark:text-green-400' };
    if (rate >= 85) return { label: 'Good', color: 'text-blue-600 dark:text-blue-400' };
    if (rate >= 70) return { label: 'Average', color: 'text-yellow-600 dark:text-yellow-400' };
    return { label: 'Needs Improvement', color: 'text-red-600 dark:text-red-400' };
  };

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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Team Performance Report
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Staff productivity and completion metrics
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
            <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Avg Completion Rate</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {averages?.completion_rate?.toFixed(1) || '--'}%
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
              <p className="text-sm text-gray-500 dark:text-gray-400">On-Time Rate</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {averages?.on_time_rate?.toFixed(1) || '--'}%
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Star className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Client Satisfaction</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {averages?.satisfaction?.toFixed(1) || '--'}/5
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
              <Users className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Team Members</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {performance?.length || '--'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      {completionChartData && completionChartData.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Performance by Team Member
          </h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={completionChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                  }}
                  formatter={(value) => [`${value ?? 0}%`]}
                />
                <Bar
                  dataKey="rate"
                  name="Completion Rate"
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                />
                <Bar dataKey="onTime" name="On-Time Rate" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
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
                  Completed
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Completion %
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  On-Time %
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Hours
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Rating
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center">
                    <Loader2 className="w-6 h-6 animate-spin text-violet-600 mx-auto" />
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-red-500 dark:text-red-400"
                  >
                    Failed to load performance data
                  </td>
                </tr>
              ) : !performance || performance.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-gray-500 dark:text-gray-400"
                  >
                    No performance data for the selected period
                  </td>
                </tr>
              ) : (
                performance.map((item) => {
                  const tier = getPerformanceTier(item.completion_rate);
                  return (
                    <tr
                      key={item.team_member.id}
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
                          <div>
                            <Link
                              href={`/team/${item.team_member.id}`}
                              className="font-medium text-gray-900 dark:text-white hover:text-violet-600 dark:hover:text-violet-400"
                            >
                              {item.team_member.name}
                            </Link>
                            <p className={cn('text-xs', tier.color)}>{tier.label}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right text-gray-700 dark:text-gray-300">
                        {item.total_appointments}
                      </td>
                      <td className="px-4 py-4 text-right text-gray-700 dark:text-gray-300">
                        {item.completed_appointments}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span
                          className={cn(
                            'font-medium',
                            item.completion_rate >= 90
                              ? 'text-green-600 dark:text-green-400'
                              : item.completion_rate >= 70
                              ? 'text-yellow-600 dark:text-yellow-400'
                              : 'text-red-600 dark:text-red-400'
                          )}
                        >
                          {item.completion_rate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span
                          className={cn(
                            'font-medium',
                            item.on_time_rate >= 90
                              ? 'text-green-600 dark:text-green-400'
                              : item.on_time_rate >= 70
                              ? 'text-yellow-600 dark:text-yellow-400'
                              : 'text-red-600 dark:text-red-400'
                          )}
                        >
                          {item.on_time_rate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right text-gray-700 dark:text-gray-300">
                        {item.total_hours.toFixed(1)}
                      </td>
                      <td className="px-4 py-4 text-center">
                        {item.client_satisfaction ? (
                          <div className="flex items-center justify-center gap-1">
                            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                            <span className="font-medium text-gray-900 dark:text-white">
                              {item.client_satisfaction.toFixed(1)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500">--</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
