'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  Users,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  MapPin,
  AlertTriangle,
  Check,
  ArrowRight,
} from 'lucide-react';
import {
  useAppointmentHistory,
  useAppointmentStats,
  useCoaches,
  formatDateTime,
  calculateDuration,
  getInitials,
  shortenName,
  getServiceAbbreviation,
  getServiceTypeBadgeClasses,
  getStatusBadgeClasses,
  formatStatusLabel,
  formatNumber,
  type AppointmentHistoryFilters,
  type HistoryAppointment,
} from '@/hooks/useAppointmentAnalytics';

// Time period options
const TIME_PERIODS = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: '3', label: 'Last 3 days' },
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: '180', label: 'Last 6 months' },
  { value: '365', label: 'Last year' },
  { value: 'custom', label: 'Custom Range' },
];

// Status options
const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'unassigned', label: 'Unassigned' },
  { value: 'no_show', label: 'No Show' },
];

// Appointment type options
const APPOINTMENT_TYPE_OPTIONS = [
  { value: 'past', label: 'Past Appointments' },
  { value: 'upcoming', label: 'Upcoming Appointments' },
  { value: 'all', label: 'All Appointments' },
];

// Per page options
const PER_PAGE_OPTIONS = [10, 25, 50, 100];

export default function AppointmentAnalyticsPage() {
  // Filter state
  const [filters, setFilters] = useState<AppointmentHistoryFilters>({
    days: '30',
    appointment_type: 'past',
    page: 1,
    per_page: 25,
  });

  const [customDateRange, setCustomDateRange] = useState({
    start: '',
    end: '',
  });

  const [searchInput, setSearchInput] = useState('');

  // Build query filters
  const queryFilters = useMemo(() => {
    const f: AppointmentHistoryFilters = {
      ...filters,
      search: searchInput || undefined,
    };

    if (filters.days === 'custom' && customDateRange.start && customDateRange.end) {
      f.start_date = customDateRange.start;
      f.end_date = customDateRange.end;
    }

    return f;
  }, [filters, searchInput, customDateRange]);

  // Fetch data
  const { data: historyData, isLoading: isLoadingHistory } = useAppointmentHistory(queryFilters);
  const { data: statsData, isLoading: isLoadingStats } = useAppointmentStats(queryFilters);
  const { data: coaches = [] } = useCoaches();

  // Handlers
  const handleFilterChange = (key: keyof AppointmentHistoryFilters, value: string | number) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: key !== 'page' && key !== 'per_page' ? 1 : prev.page, // Reset page on filter change
    }));
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
    // Debounced search could be added here
  };

  const handleResetFilters = () => {
    setFilters({
      days: '30',
      appointment_type: 'past',
      page: 1,
      per_page: 25,
    });
    setSearchInput('');
    setCustomDateRange({ start: '', end: '' });
  };

  const handleCustomDateChange = (field: 'start' | 'end', value: string) => {
    setCustomDateRange((prev) => ({ ...prev, [field]: value }));
    if (filters.days === 'custom') {
      setFilters((prev) => ({ ...prev, page: 1 }));
    }
  };

  const appointments = historyData?.data ?? [];
  const totalPages = historyData?.last_page ?? 1;
  const currentPage = historyData?.current_page ?? 1;
  const isLoading = isLoadingHistory || isLoadingStats;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 rounded-lg">
        <div className="px-4 py-5 sm:p-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              Appointment Analytics
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              View and analyze past and upcoming appointments.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Link
              href="/appointments"
              className="inline-flex items-center px-3 sm:px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 text-xs sm:text-sm font-medium rounded-lg transition-colors"
            >
              <Search className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              Search
            </Link>
            <Link
              href="/reports/location-verification"
              className="inline-flex items-center px-3 sm:px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 text-xs sm:text-sm font-medium rounded-lg transition-colors"
            >
              <MapPin className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              Locations
            </Link>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-md font-medium text-gray-900 dark:text-gray-100">Filter Appointments</h3>
          <button
            onClick={handleResetFilters}
            className="text-sm text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 flex items-center"
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            Reset Filters
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {/* Time Period */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
              <Calendar className="w-4 h-4 mr-1 text-gray-500 dark:text-gray-400" />
              Time Period
            </label>
            <select
              value={filters.days}
              onChange={(e) => handleFilterChange('days', e.target.value)}
              className="block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:border-violet-500 focus:ring-violet-500 text-sm"
            >
              {TIME_PERIODS.map((period) => (
                <option key={period.value} value={period.value}>
                  {period.label}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
              <Check className="w-4 h-4 mr-1 text-gray-500 dark:text-gray-400" />
              Status
            </label>
            <select
              value={filters.status || ''}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:border-violet-500 focus:ring-violet-500 text-sm"
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>

          {/* Appointment Type */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
              <Clock className="w-4 h-4 mr-1 text-gray-500 dark:text-gray-400" />
              Appointment Type
            </label>
            <select
              value={filters.appointment_type}
              onChange={(e) =>
                handleFilterChange('appointment_type', e.target.value as 'past' | 'upcoming' | 'all')
              }
              className="block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:border-violet-500 focus:ring-violet-500 text-sm"
            >
              {APPOINTMENT_TYPE_OPTIONS.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Coach */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
              <Users className="w-4 h-4 mr-1 text-gray-500 dark:text-gray-400" />
              Coach
            </label>
            <select
              value={filters.coach || ''}
              onChange={(e) =>
                handleFilterChange('coach', e.target.value ? Number(e.target.value) : '')
              }
              className="block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:border-violet-500 focus:ring-violet-500 text-sm"
            >
              <option value="">All Coaches</option>
              {coaches.map((coach) => (
                <option key={coach.id} value={coach.id}>
                  {coach.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Custom Date Range */}
        {filters.days === 'custom' && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">From</label>
              <input
                type="date"
                value={customDateRange.start}
                onChange={(e) => handleCustomDateChange('start', e.target.value)}
                className="block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:border-violet-500 focus:ring-violet-500 text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">To</label>
              <input
                type="date"
                value={customDateRange.end}
                onChange={(e) => handleCustomDateChange('end', e.target.value)}
                className="block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:border-violet-500 focus:ring-violet-500 text-sm"
              />
            </div>
          </div>
        )}

        {/* Search Box */}
        <div className="mt-4">
          <div className="relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchInput}
              onChange={handleSearch}
              placeholder="Search clients..."
              className="block w-full pl-10 rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:border-violet-500 focus:ring-violet-500 placeholder-gray-500 dark:placeholder-gray-400 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        <StatCard
          title="Total Appointments"
          value={formatNumber(statsData?.total ?? 0)}
          description="Total appointments in selected period"
          isLoading={isLoadingStats}
        />
        <StatCard
          title="Completion Rate"
          value={`${statsData?.completionRate ?? 0}%`}
          description="Percentage of appointments marked as completed"
          isLoading={isLoadingStats}
        />
        <StatCard
          title="On-Time Start Rate"
          value={`${statsData?.onTimeRate ?? 0}%`}
          description="Started within 5 min of scheduled time"
          isLoading={isLoadingStats}
        />
        <StatCard
          title="Average Wait Time"
          value={`${statsData?.avgWaitTime ?? 0} min`}
          description="Average time between scheduled and actual start"
          isLoading={isLoadingStats}
        />
        <StatCard
          title="No Show Rate"
          value={`${statsData?.noShowRate ?? 0}%`}
          description="Percentage of appointments marked as no-show"
          isLoading={isLoadingStats}
        />
        <StatCard
          title="Average Duration"
          value={`${statsData?.avgDuration ?? 0} min`}
          description="Average length of completed appointments"
          isLoading={isLoadingStats}
        />
        <StatCard
          title="On-Time Completion Rate"
          value={`${statsData?.onTimeCompletionRate ?? 0}%`}
          description="Completed within 5 min of scheduled end"
          isLoading={isLoadingStats}
        />
        <StatCard
          title="Avg Duration Variance"
          value={`${statsData?.avgDurationVariance ?? 0} min`}
          description="Difference from scheduled duration"
          isLoading={isLoadingStats}
        />
        <StatCard
          title="Total Hours Worked"
          value={`${formatNumber(statsData?.totalHoursWorked ?? 0)} hrs`}
          description="Actual hours logged by team members"
          isLoading={isLoadingStats}
        />
        <StatCard
          title="Units Used"
          value={`${formatNumber(statsData?.totalUnitsUsed ?? 0)} / ${formatNumber(statsData?.totalUnitsRequired ?? 0)}`}
          description={`${statsData?.unitsUsedPercent ?? 0}% utilization`}
          isLoading={isLoadingStats}
        />
      </div>

      {/* Appointments Table */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        {/* Loading State */}
        {isLoading && (
          <div className="p-4 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600 mx-auto" />
            <p className="mt-2 text-sm text-gray-500">Loading appointments...</p>
          </div>
        )}

        {/* Table Content */}
        {!isLoading && (
          <>
            <div className="overflow-x-auto relative max-h-[calc(100vh-15rem)] overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th className="hidden lg:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Date & Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Client
                    </th>
                    <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Coach
                    </th>
                    <th className="hidden sm:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Service
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="hidden xl:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Duration
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      &nbsp;
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {appointments.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                        No appointments found for the selected filters.
                      </td>
                    </tr>
                  ) : (
                    appointments.map((appointment) => (
                      <AppointmentRow key={appointment.id} appointment={appointment} />
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 sm:px-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <label className="mr-2 text-sm text-gray-600 dark:text-gray-400">Per page:</label>
                  <select
                    value={filters.per_page}
                    onChange={(e) => handleFilterChange('per_page', Number(e.target.value))}
                    className="rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:border-violet-500 focus:ring-violet-500"
                  >
                    {PER_PAGE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleFilterChange('page', currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1 rounded-md bg-violet-100 dark:bg-violet-900 text-violet-700 dark:text-violet-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4 inline" />
                    Previous
                  </button>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => handleFilterChange('page', currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 rounded-md bg-violet-100 dark:bg-violet-900 text-violet-700 dark:text-violet-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                    <ChevronRight className="w-4 h-4 inline" />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({
  title,
  value,
  description,
  isLoading,
}: {
  title: string;
  value: string;
  description: string;
  isLoading?: boolean;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</h3>
      {isLoading ? (
        <div className="mt-1 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      ) : (
        <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">{value}</p>
      )}
      <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{description}</p>
    </div>
  );
}

// Appointment Row Component
function AppointmentRow({ appointment }: { appointment: HistoryAppointment }) {
  const statusClasses = getStatusBadgeClasses(appointment.status);
  const serviceBadgeClasses = getServiceTypeBadgeClasses(appointment.service_type_id);

  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-gray-700">
      {/* ID */}
      <td className="hidden lg:table-cell px-6 py-4 whitespace-nowrap text-xs text-gray-400 dark:text-gray-500">
        <Link
          href={`/appointments/${appointment.id}`}
          className="hover:text-violet-600 dark:hover:text-violet-400"
          target="_blank"
        >
          #{appointment.id}
        </Link>
      </td>

      {/* Date & Time */}
      <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 dark:text-gray-100">
        <Link
          href={`/appointments/${appointment.id}`}
          className="hover:text-violet-600 dark:hover:text-violet-400"
          target="_blank"
        >
          {formatDateTime(appointment.start_time)}
        </Link>
      </td>

      {/* Client */}
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          {appointment.client ? (
            <>
              <Link
                href={`/clients/${appointment.client.id}`}
                target="_blank"
                className="h-8 w-8 rounded-full bg-violet-100 dark:bg-violet-900 flex items-center justify-center hover:bg-violet-200 dark:hover:bg-violet-800 transition-colors"
              >
                <span className="text-sm font-medium text-violet-700 dark:text-violet-200">
                  {getInitials(appointment.client.name)}
                </span>
              </Link>
              <div className="ml-3">
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  <Link
                    href={`/clients/${appointment.client.id}`}
                    target="_blank"
                    className="hover:text-violet-600 dark:hover:text-violet-400 cursor-pointer"
                    title={appointment.client.name}
                  >
                    {shortenName(appointment.client.name)}
                  </Link>
                  {appointment.client_with_transportation_speciality && (
                    <span
                      className="ml-1 inline-flex items-center text-green-500 dark:text-green-400 cursor-help"
                      title={`Transportation Eligible: ${appointment.client_with_transportation_speciality} miles available`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 7h12m0 0l-4-4m4 4l-4 4m-4 6H4m0 0l4 4m-4-4l4-4"
                        />
                      </svg>
                    </span>
                  )}
                </div>
              </div>
            </>
          ) : (
            <span className="text-sm text-gray-400">Unknown Client</span>
          )}
        </div>
      </td>

      {/* Coach */}
      <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
        {appointment.coach ? (
          <Link
            href={`/team/${appointment.coach.id}`}
            target="_blank"
            className="hover:text-violet-600 dark:hover:text-violet-400 cursor-pointer"
            title={appointment.coach.name}
          >
            {shortenName(appointment.coach.name)}
          </Link>
        ) : (
          <span>Unassigned</span>
        )}
      </td>

      {/* Service */}
      <td className="hidden sm:table-cell px-6 py-4 whitespace-nowrap text-sm">
        {appointment.service_type_id ? (
          <Link
            href={`/services/specialities`}
            target="_blank"
            className="hover:text-violet-600 dark:hover:text-violet-400"
          >
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${serviceBadgeClasses}`}
            >
              {getServiceAbbreviation(appointment.service_type)}
            </span>
          </Link>
        ) : (
          <span className="text-gray-400">N/A</span>
        )}
      </td>

      {/* Status */}
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center justify-center gap-2">
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClasses.bg} ${statusClasses.text}`}
          >
            {formatStatusLabel(appointment.status)}
          </span>

          {/* Review Flags Badge */}
          {appointment.review_status?.needs_review && (
            <ReviewFlagsBadge reviewStatus={appointment.review_status} />
          )}

          {/* Checkmark for tracked appointments with no issues */}
          {appointment.review_status &&
            !appointment.review_status.needs_review &&
            (appointment.status === 'in_progress' || appointment.status === 'completed') && (
              <div
                className="inline-flex items-center justify-center w-5 h-5 rounded-full text-green-500 bg-green-50 border border-green-200"
                title="Location tracking active"
              >
                <Check className="w-3 h-3" />
              </div>
            )}
        </div>
      </td>

      {/* Duration */}
      <td className="hidden xl:table-cell px-6 py-4 whitespace-nowrap text-sm">
        <div className="flex items-center space-x-1">
          <span className="text-gray-500 dark:text-gray-400">
            {calculateDuration(appointment.start_time, appointment.end_time)}
          </span>
          {appointment.status === 'completed' && appointment.duration_minutes && (
            <div className="flex items-center">
              <span className="text-gray-300 dark:text-gray-600 mx-1">•</span>
              <span className="text-gray-400 dark:text-gray-500 text-xs italic">
                {appointment.duration_minutes}m actual
              </span>
            </div>
          )}
        </div>
      </td>

      {/* Link */}
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
        <Link
          href={`/appointments/${appointment.id}`}
          className="text-violet-600 dark:text-violet-400 hover:text-violet-900 dark:hover:text-violet-300"
        >
          <ArrowRight className="w-4 h-4" />
        </Link>
      </td>
    </tr>
  );
}

// Review Flags Badge Component
function ReviewFlagsBadge({
  reviewStatus,
}: {
  reviewStatus: HistoryAppointment['review_status'];
}) {
  const [showFlags, setShowFlags] = useState(false);

  if (!reviewStatus?.needs_review) return null;

  const severityClasses = {
    high: {
      badge: 'hover:text-red-600 hover:bg-red-50 hover:border-red-300',
      tag: 'text-red-700 bg-red-100',
      icon: 'text-red-600',
    },
    medium: {
      badge: 'hover:text-amber-600 hover:bg-amber-50 hover:border-amber-300',
      tag: 'text-amber-700 bg-amber-100',
      icon: 'text-amber-600',
    },
    low: {
      badge: 'hover:text-yellow-600 hover:bg-yellow-50 hover:border-yellow-300',
      tag: 'text-yellow-700 bg-yellow-100',
      icon: 'text-yellow-600',
    },
  };

  const severity = reviewStatus.highest_severity || 'low';
  const classes = severityClasses[severity];

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setShowFlags(true)}
      onMouseLeave={() => setShowFlags(false)}
    >
      <div
        className={`inline-flex items-center justify-center w-5 h-5 rounded-full border cursor-help text-gray-400 bg-gray-50 border-gray-200 ${classes.badge}`}
      >
        <AlertTriangle className="w-3 h-3" />
      </div>

      {/* Dropdown popup */}
      {showFlags && reviewStatus.flags && (
        <div className="absolute right-0 top-full mt-2 w-80 max-w-[90vw] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-4 z-50">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Review Required</h4>
              <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${classes.tag}`}>
                {severity} Priority
              </span>
            </div>

            {reviewStatus.flags.map((flag, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-2 rounded-md bg-gray-50 dark:bg-gray-700/50"
              >
                <div className="flex-shrink-0 mt-0.5">
                  <AlertTriangle className={`h-4 w-4 ${severityClasses[flag.severity].icon}`} />
                </div>
                <div className="flex-1 min-w-0 overflow-hidden">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 break-words whitespace-normal">
                    {flag.message}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 break-words whitespace-normal">
                    {flag.description}
                  </p>
                </div>
              </div>
            ))}

            <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
              <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                Click appointment for full details or contact admin if assistance is needed.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
