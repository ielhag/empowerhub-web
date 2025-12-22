'use client';

import { useState, useCallback } from 'react';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { Plus, List, Filter, X } from 'lucide-react';
import Link from 'next/link';
import { useCalendarAppointments, useAppointmentRealtime } from '@/hooks/useAppointments';
import AppointmentCalendar from '@/components/features/appointments/AppointmentCalendar';
import { cn } from '@/lib/utils';
import type { AppointmentStatus } from '@/types';

export default function AppointmentsCalendarPage() {
  const today = new Date();
  const [dateRange, setDateRange] = useState({
    start: format(startOfWeek(today, { weekStartsOn: 0 }), 'yyyy-MM-dd'),
    end: format(endOfWeek(today, { weekStartsOn: 0 }), 'yyyy-MM-dd'),
  });

  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | 'all'>('all');
  const [teamFilter, setTeamFilter] = useState<number | null>(null);

  const { data: appointments = [], isLoading, error } = useCalendarAppointments(dateRange.start, dateRange.end);

  // Enable real-time updates
  useAppointmentRealtime();

  const handleWeekChange = useCallback((start: string, end: string) => {
    setDateRange({ start, end });
  }, []);

  // Filter appointments
  const filteredAppointments = appointments.filter((apt) => {
    if (statusFilter !== 'all' && apt.status !== statusFilter) return false;
    if (teamFilter !== null && apt.team_id !== teamFilter) return false;
    return true;
  });

  const statusOptions: { value: AppointmentStatus | 'all'; label: string }[] = [
    { value: 'all', label: 'All Statuses' },
    { value: 'pending', label: 'Pending' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'no_show', label: 'No Show' },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Page Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Appointment Calendar
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              View and manage appointments in calendar view
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* View Toggle */}
            <Link
              href="/appointments"
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <List className="w-4 h-4" />
              List View
            </Link>

            {/* Filters Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                'flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                showFilters
                  ? 'text-violet-700 bg-violet-100 dark:text-violet-400 dark:bg-violet-900/30'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
              )}
            >
              <Filter className="w-4 h-4" />
              Filters
              {(statusFilter !== 'all' || teamFilter !== null) && (
                <span className="flex items-center justify-center w-5 h-5 text-xs bg-violet-600 text-white rounded-full">
                  {[statusFilter !== 'all', teamFilter !== null].filter(Boolean).length}
                </span>
              )}
            </button>

            {/* Create Appointment */}
            <Link
              href="/appointments/new"
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Appointment
            </Link>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Filter Appointments
              </h3>
              {(statusFilter !== 'all' || teamFilter !== null) && (
                <button
                  onClick={() => {
                    setStatusFilter('all');
                    setTeamFilter(null);
                  }}
                  className="text-xs text-red-600 hover:text-red-700 dark:text-red-400"
                >
                  Clear All
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-4">
              {/* Status Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as AppointmentStatus | 'all')}
                  className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="mx-6 mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">
            Failed to load appointments. Please try again.
          </p>
        </div>
      )}

      {/* Calendar */}
      <div className="flex-1 overflow-hidden bg-white dark:bg-gray-800">
        <AppointmentCalendar
          appointments={filteredAppointments}
          isLoading={isLoading}
          onWeekChange={handleWeekChange}
        />
      </div>
    </div>
  );
}
