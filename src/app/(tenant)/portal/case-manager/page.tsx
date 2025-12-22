'use client';

import { Users, Calendar, FileText, TrendingUp, Clock, CheckCircle } from 'lucide-react';

export default function CaseManagerPortalPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Case Manager Dashboard</h1>
        <p className="text-gray-500 dark:text-gray-400">Overview of your assigned clients and their services</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'My Clients', value: '0', icon: Users, color: 'violet' },
          { label: 'Active Appointments', value: '0', icon: Calendar, color: 'blue' },
          { label: 'Pending Reports', value: '0', icon: FileText, color: 'yellow' },
          { label: 'Completed This Month', value: '0', icon: CheckCircle, color: 'green' },
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

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button className="w-full text-left px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-violet-600" />
                <span className="text-gray-900 dark:text-white">View My Clients</span>
              </div>
            </button>
            <button className="w-full text-left px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-blue-600" />
                <span className="text-gray-900 dark:text-white">Generate Report</span>
              </div>
            </button>
            <button className="w-full text-left px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-green-600" />
                <span className="text-gray-900 dark:text-white">View Schedule</span>
              </div>
            </button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="md:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Recent Client Activity</h3>
          <div className="text-center py-8">
            <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No recent activity</p>
          </div>
        </div>
      </div>

      {/* Client List Preview */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 dark:text-white">My Clients</h3>
          <button className="text-sm text-violet-600 hover:text-violet-700 font-medium">View All</button>
        </div>
        <div className="p-12 text-center">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No clients assigned</h3>
          <p className="text-gray-500 dark:text-gray-400">
            Clients assigned to you will appear here.
          </p>
        </div>
      </div>
    </div>
  );
}
