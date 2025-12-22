'use client';

import { use } from 'react';
import Link from 'next/link';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { useTeamMember } from '@/hooks/useTeam';
import TeamMemberForm from '@/components/features/team/TeamMemberForm';

interface EditTeamMemberPageProps {
  params: Promise<{ id: string }>;
}

export default function EditTeamMemberPage({ params }: EditTeamMemberPageProps) {
  const { id } = use(params);
  const memberId = parseInt(id, 10);
  const { data: member, isLoading, error } = useTeamMember(memberId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
      </div>
    );
  }

  if (error || !member) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
        <p className="text-red-600 dark:text-red-400">Failed to load team member</p>
        <Link
          href="/team"
          className="mt-4 inline-flex items-center gap-2 text-sm text-violet-600 dark:text-violet-400 hover:underline"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Team
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href={`/team/${memberId}`}
          className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Team Member</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Update {member.name}'s information
          </p>
        </div>
      </div>

      {/* Form */}
      <TeamMemberForm member={member} />
    </div>
  );
}
