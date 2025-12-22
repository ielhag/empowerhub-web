'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTeamMembers, TeamFilters } from '@/hooks/useTeam';
import { cn } from '@/lib/utils';
import {
  Plus,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  User,
  Phone,
  Mail,
  Calendar,
  MoreHorizontal,
  Eye,
  Edit,
  UserX,
  Star,
  Clock,
} from 'lucide-react';
import type { TeamMember } from '@/types';

const statusStyles = {
  active: {
    bg: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-800 dark:text-green-400',
    dot: 'bg-green-500',
  },
  inactive: {
    bg: 'bg-yellow-100 dark:bg-yellow-900/30',
    text: 'text-yellow-800 dark:text-yellow-400',
    dot: 'bg-yellow-500',
  },
  terminated: {
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-800 dark:text-red-400',
    dot: 'bg-red-500',
  },
};

export default function TeamPage() {
  const [filters, setFilters] = useState<TeamFilters>({
    page: 1,
    per_page: 20,
    status: 'active',
    search: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [actionMenuOpen, setActionMenuOpen] = useState<number | null>(null);

  const { data, isLoading, error } = useTeamMembers(filters);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters((prev) => ({ ...prev, search: searchInput, page: 1 }));
  };

  const handleStatusChange = (status: TeamFilters['status']) => {
    setFilters((prev) => ({ ...prev, status, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Team Members</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage your staff and their schedules
          </p>
        </div>
        <Link
          href="/team/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Team Member
        </Link>
      </div>

      {/* Filters Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search team members..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-colors"
              />
            </div>
          </form>

          {/* Status Tabs */}
          <div className="flex items-center gap-2">
            {(['active', 'inactive', 'terminated', 'all'] as const).map((status) => (
              <button
                key={status}
                onClick={() => handleStatusChange(status)}
                className={cn(
                  'px-4 py-2 text-sm font-medium rounded-lg transition-colors capitalize',
                  filters.status === status
                    ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                )}
              >
                {status}
              </button>
            ))}
          </div>

          {/* More Filters */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors',
              showFilters
                ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            )}
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>
        </div>

        {/* Extended Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Speciality
                </label>
                <select
                  value={filters.speciality_id || ''}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      speciality_id: e.target.value ? Number(e.target.value) : undefined,
                    }))
                  }
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 transition-colors"
                >
                  <option value="">All Specialities</option>
                  {/* Specialities will be populated from API */}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      {error ? (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-sm text-red-600 dark:text-red-400">
            Failed to load team members. Please try again.
          </p>
        </div>
      ) : isLoading ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
          </div>
        </div>
      ) : !data?.data || data.data.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
          <User className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No team members found
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            {filters.search
              ? 'Try adjusting your search or filters'
              : 'Get started by adding your first team member'}
          </p>
          <Link
            href="/team/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Team Member
          </Link>
        </div>
      ) : (
        <>
          {/* Team Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.data.map((member) => {
              const status = member.status as keyof typeof statusStyles;
              const styles = statusStyles[status] || statusStyles.active;

              return (
                <div
                  key={member.id}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {member.avatar ? (
                        <img
                          src={member.avatar}
                          alt={member.name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-violet-700 dark:text-violet-400 font-semibold">
                          {getInitials(member.name)}
                        </div>
                      )}
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {member.name}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className={cn('w-2 h-2 rounded-full', styles.dot)} />
                          <span
                            className={cn('text-xs font-medium capitalize', styles.text)}
                          >
                            {member.status}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions Menu */}
                    <div className="relative">
                      <button
                        onClick={() =>
                          setActionMenuOpen(actionMenuOpen === member.id ? null : member.id)
                        }
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                      {actionMenuOpen === member.id && (
                        <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-10">
                          <Link
                            href={`/team/${member.id}`}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            <Eye className="w-4 h-4" />
                            View Profile
                          </Link>
                          <Link
                            href={`/team/${member.id}/edit`}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            <Edit className="w-4 h-4" />
                            Edit
                          </Link>
                          <Link
                            href={`/team/${member.id}/schedule`}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            <Calendar className="w-4 h-4" />
                            View Schedule
                          </Link>
                          <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                          <button className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
                            <UserX className="w-4 h-4" />
                            Deactivate
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Member Info */}
                  <div className="space-y-2 text-sm mb-4">
                    {member.specialities && member.specialities.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {member.specialities.slice(0, 2).map((spec) => (
                          <span
                            key={spec.id}
                            className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded"
                          >
                            {spec.short_name || spec.name}
                          </span>
                        ))}
                        {member.specialities.length > 2 && (
                          <span className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded">
                            +{member.specialities.length - 2}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Stats Preview */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                      <Clock className="w-4 h-4" />
                      <span>--h this month</span>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                      <Star className="w-4 h-4" />
                      <span>-- rating</span>
                    </div>
                  </div>

                  {/* View Profile Link */}
                  <Link
                    href={`/team/${member.id}`}
                    className="mt-4 block w-full text-center py-2 text-sm font-medium text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg transition-colors"
                  >
                    View Profile
                  </Link>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {data.last_page > 1 && (
            <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 px-4 py-3">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Showing {(data.current_page - 1) * data.per_page + 1} to{' '}
                {Math.min(data.current_page * data.per_page, data.total)} of {data.total} team
                members
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(data.current_page - 1)}
                  disabled={data.current_page === 1}
                  className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Page {data.current_page} of {data.last_page}
                </span>
                <button
                  onClick={() => handlePageChange(data.current_page + 1)}
                  disabled={data.current_page === data.last_page}
                  className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
