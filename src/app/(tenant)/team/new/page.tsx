'use client';

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import TeamMemberForm from '@/components/features/team/TeamMemberForm';

export default function NewTeamMemberPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/team"
          className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Add Team Member</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Enter details to add a new team member
          </p>
        </div>
      </div>

      {/* Form */}
      <TeamMemberForm />
    </div>
  );
}
