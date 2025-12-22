'use client';

import Link from 'next/link';
import { useReportsDashboard } from '@/hooks/useReports';
import { cn } from '@/lib/utils';
import {
  BarChart3,
  DollarSign,
  Users,
  Clock,
  TrendingUp,
  FileText,
  Loader2,
  ArrowRight,
  PieChart,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
} from 'recharts';

const CHART_COLORS = {
  primary: '#8b5cf6',
  secondary: '#a78bfa',
  tertiary: '#c4b5fd',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
};

export default function ReportsPage() {
  const { data: dashboard, isLoading, error } = useReportsDashboard();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
        <p className="text-red-600 dark:text-red-400">Failed to load reports dashboard</p>
      </div>
    );
  }

  // Sample data for demonstration when API data isn't available
  const sampleTrends = dashboard?.trends || [
    { label: 'Week 1', hours: 320, units: 1200, amount: 15000 },
    { label: 'Week 2', hours: 380, units: 1400, amount: 17500 },
    { label: 'Week 3', hours: 350, units: 1300, amount: 16250 },
    { label: 'Week 4', hours: 420, units: 1580, amount: 19750 },
  ];

  const utilizationData = dashboard?.unit_utilization
    ? [
        { name: 'Used', value: dashboard.unit_utilization.used, color: CHART_COLORS.primary },
        {
          name: 'Remaining',
          value: dashboard.unit_utilization.allocated - dashboard.unit_utilization.used,
          color: CHART_COLORS.tertiary,
        },
      ]
    : [
        { name: 'Used', value: 75, color: CHART_COLORS.primary },
        { name: 'Remaining', value: 25, color: CHART_COLORS.tertiary },
      ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reports</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Financial summaries and performance analytics
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
              <Clock className="w-6 h-6 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Hours</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {dashboard?.payroll_summary?.total_hours?.toLocaleString() || '--'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Payroll Amount</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                ${dashboard?.payroll_summary?.total_amount?.toLocaleString() || '--'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Units Billed</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {dashboard?.billing_summary?.total_units?.toLocaleString() || '--'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Users className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Active Staff</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {dashboard?.payroll_summary?.staff_count || '--'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trends Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Hours & Units Trend
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Weekly performance overview</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-violet-500" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Hours</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Units</span>
              </div>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sampleTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                <XAxis
                  dataKey="label"
                  stroke="#6b7280"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#6b7280"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  yAxisId="left"
                />
                <YAxis
                  stroke="#6b7280"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  yAxisId="right"
                  orientation="right"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="hours"
                  stroke={CHART_COLORS.primary}
                  fill={CHART_COLORS.primary}
                  fillOpacity={0.2}
                  yAxisId="left"
                />
                <Area
                  type="monotone"
                  dataKey="units"
                  stroke={CHART_COLORS.success}
                  fill={CHART_COLORS.success}
                  fillOpacity={0.2}
                  yAxisId="right"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Utilization Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Unit Utilization</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Monthly allocation usage</p>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={utilizationData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {utilizationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                  }}
                />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {dashboard?.unit_utilization?.percentage || 75}%
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Utilization Rate</p>
          </div>
        </div>
      </div>

      {/* Report Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link
          href="/reports/payroll"
          className="group bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md hover:border-violet-300 dark:hover:border-violet-700 transition-all"
        >
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-violet-600 dark:text-violet-400" />
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">Payroll Report</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Staff hours, wages, and overtime analysis
          </p>
        </Link>

        <Link
          href="/reports/billing"
          className="group bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md hover:border-violet-300 dark:hover:border-violet-700 transition-all"
        >
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <FileText className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
            Client Billing
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Service units and billing by client
          </p>
        </Link>

        <Link
          href="/reports/performance"
          className="group bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md hover:border-violet-300 dark:hover:border-violet-700 transition-all"
        >
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
            Team Performance
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Staff productivity and completion rates
          </p>
        </Link>
      </div>
    </div>
  );
}
