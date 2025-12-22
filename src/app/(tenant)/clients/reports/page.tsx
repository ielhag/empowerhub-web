'use client';

import { FileText, Download, Calendar, Users, Search, Filter } from 'lucide-react';

export default function ClientReportsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Client Reports</h1>
          <p className="text-gray-500 dark:text-gray-400">Generate and view reports for all clients</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors">
          <Download className="w-4 h-4" />
          Export All
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search clients..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        </div>
        <select className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
          <option>This Month</option>
          <option>Last Month</option>
          <option>Last 3 Months</option>
          <option>This Year</option>
        </select>
        <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
          <Filter className="w-4 h-4" />
          More Filters
        </button>
      </div>

      {/* Report Types */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { title: 'Unit Balance Report', description: 'View unit allocations and usage', icon: FileText },
          { title: 'Appointment History', description: 'Complete appointment records', icon: Calendar },
          { title: 'Service Summary', description: 'Services provided breakdown', icon: Users },
        ].map((report) => (
          <div
            key={report.title}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/30">
                <report.icon className="w-5 h-5 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">{report.title}</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">{report.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Client List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white">All Clients</h3>
        </div>
        <div className="p-12 text-center">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No clients found</h3>
          <p className="text-gray-500 dark:text-gray-400">
            Client data will appear here once clients are added.
          </p>
        </div>
      </div>
    </div>
  );
}
