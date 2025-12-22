'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAppointments, useAppointmentRealtime, type AppointmentFilters } from '@/hooks/useAppointments';
import { useAuthStore } from '@/stores/auth';
import { cn, formatDate, formatTime, getStatusColor, getStatusLabel } from '@/lib/utils';
import {
  Calendar,
  List,
  Plus,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Clock,
  User,
  MapPin,
  MoreHorizontal,
  Eye,
  Edit,
  X as XIcon,
  AlertCircle,
} from 'lucide-react';
import type { AppointmentStatus } from '@/types';

const statusOptions: { value: AppointmentStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'unassigned', label: 'Unassigned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'no_show', label: 'No Show' },
];

export default function AppointmentsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAdmin } = useAuthStore();

  // View state
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  // Filter state
  const [filters, setFilters] = useState<AppointmentFilters>({
    page: 1,
    per_page: 15,
    status: (searchParams.get('status') as AppointmentStatus) || 'all',
    date: searchParams.get('date') || '',
    search: searchParams.get('search') || '',
  });

  const [searchInput, setSearchInput] = useState(filters.search || '');
  const [showFilters, setShowFilters] = useState(false);

  // Fetch appointments
  const { data, isLoading, error, refetch } = useAppointments(filters);

  // Enable real-time updates
  useAppointmentRealtime();

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.status && filters.status !== 'all') params.set('status', filters.status);
    if (filters.date) params.set('date', filters.date);
    if (filters.search) params.set('search', filters.search);
    if (filters.page && filters.page > 1) params.set('page', String(filters.page));

    const newUrl = params.toString() ? `?${params.toString()}` : '/appointments';
    router.replace(newUrl, { scroll: false });
  }, [filters, router]);

  // Handle search submit
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters((prev) => ({ ...prev, search: searchInput, page: 1 }));
  };

  // Handle filter changes
  const handleFilterChange = (key: keyof AppointmentFilters, value: string | number) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    setFilters((prev) => ({ ...prev, page: newPage }));
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({ page: 1, per_page: 15, status: 'all' });
    setSearchInput('');
  };

  const hasActiveFilters = filters.status !== 'all' || filters.date || filters.search;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Appointments</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage and track all appointments
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'p-2 rounded-md transition-colors',
                viewMode === 'list'
                  ? 'bg-white dark:bg-gray-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
              )}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={cn(
                'p-2 rounded-md transition-colors',
                viewMode === 'calendar'
                  ? 'bg-white dark:bg-gray-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
              )}
            >
              <Calendar className="w-4 h-4" />
            </button>
          </div>

          {/* Create Button */}
          {isAdmin() && (
            <Link
              href="/appointments/create"
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Appointment</span>
            </Link>
          )}
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by client or coach name..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className={cn(
                  'w-full pl-10 pr-4 py-2 rounded-lg border',
                  'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600',
                  'text-gray-900 dark:text-white placeholder-gray-400',
                  'focus:ring-2 focus:ring-violet-500 focus:border-violet-500'
                )}
              />
            </div>
          </form>

          {/* Status Filter */}
          <select
            value={filters.status || 'all'}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className={cn(
              'px-4 py-2 rounded-lg border',
              'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600',
              'text-gray-900 dark:text-white',
              'focus:ring-2 focus:ring-violet-500 focus:border-violet-500'
            )}
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {/* Date Filter */}
          <input
            type="date"
            value={filters.date || ''}
            onChange={(e) => handleFilterChange('date', e.target.value)}
            className={cn(
              'px-4 py-2 rounded-lg border',
              'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600',
              'text-gray-900 dark:text-white',
              'focus:ring-2 focus:ring-violet-500 focus:border-violet-500'
            )}
          />

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            >
              <XIcon className="w-4 h-4" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {viewMode === 'list' ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Failed to load appointments
              </p>
              <button
                onClick={() => refetch()}
                className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && data?.data?.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Calendar className="w-12 h-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No appointments found
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                {hasActiveFilters
                  ? 'Try adjusting your filters'
                  : 'Create your first appointment to get started'}
              </p>
              {isAdmin() && !hasActiveFilters && (
                <Link
                  href="/appointments/create"
                  className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700"
                >
                  <Plus className="w-4 h-4" />
                  New Appointment
                </Link>
              )}
            </div>
          )}

          {/* Appointments Table */}
          {!isLoading && !error && data?.data && data.data.length > 0 && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Client
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Coach
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Date & Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Service
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {data.data.map((appointment) => (
                      <tr
                        key={appointment.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                              <User className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">
                                {appointment.client?.user?.name || 'Unknown Client'}
                              </p>
                              <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {appointment.location_type === 'facility'
                                  ? appointment.client?.facility?.name
                                  : 'In-home'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-gray-900 dark:text-white">
                            {appointment.team?.name || (
                              <span className="text-yellow-600 dark:text-yellow-400 italic">
                                Unassigned
                              </span>
                            )}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <div>
                              <p className="text-gray-900 dark:text-white">
                                {formatDate(appointment.date, 'EEE, MMM d')}
                              </p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {formatTime(appointment.start_time)} -{' '}
                                {appointment.end_time ? formatTime(appointment.end_time) : `${appointment.duration}min`}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-gray-900 dark:text-white">
                            {appointment.speciality?.name || 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={cn(
                              'inline-flex px-2.5 py-1 text-xs font-medium rounded-full',
                              getStatusColor(appointment.status)
                            )}
                          >
                            {getStatusLabel(appointment.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/appointments/${appointment.id}`}
                              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>
                            {isAdmin() && (
                              <Link
                                href={`/appointments/${appointment.id}/edit`}
                                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                              >
                                <Edit className="w-4 h-4" />
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {data.last_page > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Showing {data.from} to {data.to} of {data.total} results
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePageChange(data.current_page - 1)}
                      disabled={data.current_page === 1}
                      className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">
                      Page {data.current_page} of {data.last_page}
                    </span>
                    <button
                      onClick={() => handlePageChange(data.current_page + 1)}
                      disabled={data.current_page === data.last_page}
                      className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        // Calendar View Placeholder
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
          <Calendar className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Calendar View
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Calendar view will be implemented in the next phase
          </p>
        </div>
      )}
    </div>
  );
}
