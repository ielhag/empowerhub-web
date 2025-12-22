'use client';

import { Calendar, Users, Clock, CheckCircle, Bell, FileText } from 'lucide-react';

export default function ClientPortalPage() {
  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-violet-600 to-violet-700 rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold">Welcome to Your Portal</h1>
        <p className="text-violet-100 mt-1">View your appointments and connect with your care team</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Upcoming Appointments', value: '0', icon: Calendar, color: 'violet' },
          { label: 'My Team Members', value: '0', icon: Users, color: 'blue' },
          { label: 'This Month', value: '0 hrs', icon: Clock, color: 'green' },
          { label: 'Completed', value: '0', icon: CheckCircle, color: 'emerald' },
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

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Appointments */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 dark:text-white">Upcoming Appointments</h3>
            <button className="text-sm text-violet-600 hover:text-violet-700 font-medium">View All</button>
          </div>
          <div className="p-8 text-center">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No upcoming appointments</h3>
            <p className="text-gray-500 dark:text-gray-400">
              Your scheduled appointments will appear here.
            </p>
          </div>
        </div>

        {/* Quick Links */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Quick Links</h3>
          <div className="space-y-3">
            <button className="w-full text-left px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-violet-600" />
                <span className="text-gray-900 dark:text-white">View Schedule</span>
              </div>
            </button>
            <button className="w-full text-left px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-blue-600" />
                <span className="text-gray-900 dark:text-white">My Care Team</span>
              </div>
            </button>
            <button className="w-full text-left px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-green-600" />
                <span className="text-gray-900 dark:text-white">Documents</span>
              </div>
            </button>
            <button className="w-full text-left px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-yellow-600" />
                <span className="text-gray-900 dark:text-white">Notifications</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* My Care Team Preview */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 dark:text-white">My Care Team</h3>
          <button className="text-sm text-violet-600 hover:text-violet-700 font-medium">View All</button>
        </div>
        <div className="p-8 text-center">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No team members assigned</h3>
          <p className="text-gray-500 dark:text-gray-400">
            Your care team members will appear here.
          </p>
        </div>
      </div>
    </div>
  );
}
