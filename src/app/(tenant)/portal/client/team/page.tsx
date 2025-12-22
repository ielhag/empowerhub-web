'use client';

import { Users, Phone, Mail, Star, MessageSquare } from 'lucide-react';

export default function ClientTeamPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Care Team</h1>
        <p className="text-gray-500 dark:text-gray-400">Meet the team members assigned to support you</p>
      </div>

      {/* Team Grid */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-12 text-center">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No team members assigned</h3>
          <p className="text-gray-500 dark:text-gray-400">
            Your care team members will appear here once they are assigned.
          </p>
        </div>
      </div>

      {/* Contact Support */}
      <div className="bg-violet-50 dark:bg-violet-900/20 rounded-xl p-6">
        <h3 className="font-semibold text-violet-900 dark:text-violet-100 mb-2">Need Help?</h3>
        <p className="text-violet-700 dark:text-violet-300 text-sm mb-4">
          If you have questions about your care team or services, we&apos;re here to help.
        </p>
        <button className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors">
          <MessageSquare className="w-4 h-4" />
          Contact Support
        </button>
      </div>
    </div>
  );
}
