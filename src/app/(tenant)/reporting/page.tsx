'use client';

import { BarChart3, Download, FileText, Users, DollarSign, Calendar, TrendingUp } from 'lucide-react';

export default function ReportingPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reporting Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400">Super Admin reporting and analytics</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors">
          <Download className="w-4 h-4" />
          Export All
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Revenue', value: '$0', icon: DollarSign, color: 'green' },
          { label: 'Active Clients', value: '0', icon: Users, color: 'blue' },
          { label: 'Appointments', value: '0', icon: Calendar, color: 'violet' },
          { label: 'Growth', value: '0%', icon: TrendingUp, color: 'orange' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4"
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-${stat.color}-100 dark:bg-${stat.color}-900/30`}>
                <stat.icon className={`w-5 h-5 text-${stat.color}-600 dark:text-${stat.color}-400`} />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Report Types */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          {
            title: 'Payroll Report',
            description: 'Team member hours, rates, and compensation',
            icon: DollarSign,
            href: '/reports/payroll',
          },
          {
            title: 'Client Billing',
            description: 'Client service usage and billing summaries',
            icon: FileText,
            href: '/reports/billing',
          },
          {
            title: 'Unit Utilization',
            description: 'Service unit allocation and consumption',
            icon: BarChart3,
            href: '/reports/units',
          },
          {
            title: 'Team Performance',
            description: 'Staff metrics and performance analytics',
            icon: Users,
            href: '/reports/team',
          },
          {
            title: 'Appointment Summary',
            description: 'Appointment completion and status breakdown',
            icon: Calendar,
            href: '/reports/appointments',
          },
          {
            title: 'DSHS Export',
            description: 'Export data for DSHS compliance reporting',
            icon: Download,
            href: '/reports/dshs',
          },
        ].map((report) => (
          <div
            key={report.title}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-violet-100 dark:bg-violet-900/30">
                <report.icon className="w-6 h-6 text-violet-600 dark:text-violet-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{report.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{report.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Reports */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white">Recent Reports</h3>
        </div>
        <div className="p-12 text-center">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">No recent reports generated</p>
        </div>
      </div>
    </div>
  );
}
