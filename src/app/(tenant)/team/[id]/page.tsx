"use client";

import { useParams } from "next/navigation";
import { useTeamMember } from "@/hooks/useTeam";
import { Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function TeamMemberProfilePage() {
  const params = useParams();
  const memberId = Number(params.id);
  const { data: member, isLoading, error } = useTeamMember(memberId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
      </div>
    );
  }

  if (error || !member) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
          <div>
            <h3 className="font-medium text-red-800 dark:text-red-200">
              Team member not found
            </h3>
            <p className="text-sm text-red-600 dark:text-red-400 mt-1">
              The team member you're looking for doesn't exist or you don't have
              access to view it.
            </p>
          </div>
        </div>
        <Link
          href="/team"
          className="mt-4 inline-flex items-center gap-2 text-sm text-red-600 dark:text-red-400 hover:underline"
        >
          Back to team
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center space-x-4">
          <div className="flex-shrink-0 h-24 w-24 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-3xl font-semibold text-violet-700 dark:text-violet-400">
            {member.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2)}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {member.name}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {member.email}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {member.phone}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
