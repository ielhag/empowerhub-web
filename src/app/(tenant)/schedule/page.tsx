'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useScheduleWeek, useScheduleDrafts, usePublishDrafts, useAutoAssign } from '@/hooks/useSchedule';
import { cn } from '@/lib/utils';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar,
  Clock,
  User,
  MapPin,
  Loader2,
  Send,
  Wand2,
  Filter,
  MoreVertical,
} from 'lucide-react';
import {
  format,
  startOfWeek,
  addWeeks,
  subWeeks,
  parseISO,
  isSameDay,
} from 'date-fns';

const statusColors: Record<string, { bg: string; text: string; border: string }> = {
  scheduled: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    text: 'text-blue-700 dark:text-blue-400',
    border: 'border-blue-200 dark:border-blue-800',
  },
  unassigned: {
    bg: 'bg-yellow-50 dark:bg-yellow-900/20',
    text: 'text-yellow-700 dark:text-yellow-400',
    border: 'border-yellow-200 dark:border-yellow-800',
  },
  in_progress: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    text: 'text-green-700 dark:text-green-400',
    border: 'border-green-200 dark:border-green-800',
  },
  completed: {
    bg: 'bg-gray-50 dark:bg-gray-900/20',
    text: 'text-gray-600 dark:text-gray-400',
    border: 'border-gray-200 dark:border-gray-700',
  },
  cancelled: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    text: 'text-red-700 dark:text-red-400',
    border: 'border-red-200 dark:border-red-800',
  },
  draft: {
    bg: 'bg-violet-50 dark:bg-violet-900/20',
    text: 'text-violet-700 dark:text-violet-400',
    border: 'border-violet-200 dark:border-violet-800 border-dashed',
  },
};

const timeSlots = [
  '6:00 AM', '7:00 AM', '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM',
  '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM',
  '6:00 PM', '7:00 PM', '8:00 PM',
];

export default function SchedulePage() {
  const [currentWeekStart, setCurrentWeekStart] = useState(() =>
    format(startOfWeek(new Date(), { weekStartsOn: 0 }), 'yyyy-MM-dd')
  );
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [showDraftsOnly, setShowDraftsOnly] = useState(false);

  const { data: schedule, isLoading, error } = useScheduleWeek(currentWeekStart);
  const { data: drafts } = useScheduleDrafts();
  const publishMutation = usePublishDrafts();
  const autoAssignMutation = useAutoAssign();

  const navigateWeek = (direction: 'prev' | 'next') => {
    const currentDate = parseISO(currentWeekStart);
    const newDate = direction === 'prev' ? subWeeks(currentDate, 1) : addWeeks(currentDate, 1);
    setCurrentWeekStart(format(newDate, 'yyyy-MM-dd'));
  };

  const goToToday = () => {
    setCurrentWeekStart(format(startOfWeek(new Date(), { weekStartsOn: 0 }), 'yyyy-MM-dd'));
  };

  const handlePublishDrafts = () => {
    if (drafts && drafts.length > 0) {
      const draftIds = drafts.filter((d) => d.id).map((d) => d.id as number);
      publishMutation.mutate(draftIds);
    }
  };

  const handleAutoAssign = () => {
    autoAssignMutation.mutate(currentWeekStart);
  };

  // Count drafts and unassigned
  const draftCount = drafts?.length || 0;
  const unassignedCount =
    schedule?.days.reduce(
      (acc, day) => acc + day.appointments.filter((a) => !a.team_id && !a.is_draft).length,
      0
    ) || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Schedule Builder</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Plan and manage appointments for your team
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Stats Badges */}
          {draftCount > 0 && (
            <span className="px-3 py-1 text-sm font-medium bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 rounded-full">
              {draftCount} Draft{draftCount !== 1 ? 's' : ''}
            </span>
          )}
          {unassignedCount > 0 && (
            <span className="px-3 py-1 text-sm font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-full">
              {unassignedCount} Unassigned
            </span>
          )}

          {/* Actions */}
          <button
            onClick={handleAutoAssign}
            disabled={autoAssignMutation.isPending || unassignedCount === 0}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            {autoAssignMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Wand2 className="w-4 h-4" />
            )}
            Auto-Assign
          </button>

          <button
            onClick={handlePublishDrafts}
            disabled={publishMutation.isPending || draftCount === 0}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-lg disabled:opacity-50 transition-colors"
          >
            {publishMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Publish Drafts
          </button>

          <Link
            href="/appointments/new"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Appointment
          </Link>
        </div>
      </div>

      {/* Week Navigation */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigateWeek('prev')}
              className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="px-4 py-2 min-w-[280px] text-center">
              <span className="text-lg font-semibold text-gray-900 dark:text-white">
                {schedule
                  ? `${format(parseISO(schedule.start_date), 'MMM d')} - ${format(
                      parseISO(schedule.end_date),
                      'MMM d, yyyy'
                    )}`
                  : 'Loading...'}
              </span>
            </div>
            <button
              onClick={() => navigateWeek('next')}
              className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <button
              onClick={goToToday}
              className="ml-2 px-3 py-2 text-sm font-medium text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg transition-colors"
            >
              Today
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDraftsOnly(!showDraftsOnly)}
              className={cn(
                'flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                showDraftsOnly
                  ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              )}
            >
              <Filter className="w-4 h-4" />
              Drafts Only
            </button>
          </div>
        </div>
      </div>

      {/* Schedule Grid */}
      {isLoading ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
          <div className="flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
          </div>
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
          <p className="text-red-600 dark:text-red-400">Failed to load schedule</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-[900px]">
              {/* Days Header */}
              <div className="grid grid-cols-8 border-b border-gray-200 dark:border-gray-700">
                <div className="p-3 bg-gray-50 dark:bg-gray-900/50 border-r border-gray-200 dark:border-gray-700">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Time
                  </span>
                </div>
                {schedule?.days.map((day) => (
                  <div
                    key={day.date}
                    className={cn(
                      'p-3 text-center border-r border-gray-200 dark:border-gray-700 last:border-r-0',
                      day.is_today
                        ? 'bg-violet-50 dark:bg-violet-900/20'
                        : 'bg-gray-50 dark:bg-gray-900/50'
                    )}
                  >
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      {day.day_name}
                    </p>
                    <p
                      className={cn(
                        'text-lg font-semibold',
                        day.is_today
                          ? 'text-violet-600 dark:text-violet-400'
                          : 'text-gray-900 dark:text-white'
                      )}
                    >
                      {format(parseISO(day.date), 'd')}
                    </p>
                  </div>
                ))}
              </div>

              {/* Time Slots */}
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {timeSlots.map((timeSlot, idx) => (
                  <div key={timeSlot} className="grid grid-cols-8 min-h-[80px]">
                    <div className="p-2 text-xs text-gray-500 dark:text-gray-400 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                      {timeSlot}
                    </div>
                    {schedule?.days.map((day) => {
                      // Filter appointments for this time slot
                      const slotHour = idx + 6; // Starting at 6 AM
                      const dayAppointments = day.appointments.filter((apt) => {
                        const aptHour = parseInt(apt.start_time.split(':')[0], 10);
                        return aptHour === slotHour;
                      });

                      const filteredAppointments = showDraftsOnly
                        ? dayAppointments.filter((a) => a.is_draft)
                        : dayAppointments;

                      return (
                        <div
                          key={`${day.date}-${timeSlot}`}
                          className={cn(
                            'p-1 border-r border-gray-200 dark:border-gray-700 last:border-r-0',
                            day.is_today && 'bg-violet-50/30 dark:bg-violet-900/10'
                          )}
                        >
                          {filteredAppointments.map((apt) => {
                            const status = apt.is_draft ? 'draft' : apt.status;
                            const colors = statusColors[status] || statusColors.scheduled;

                            return (
                              <Link
                                key={apt.id}
                                href={apt.is_draft ? '#' : `/appointments/${apt.id}`}
                                className={cn(
                                  'block p-2 rounded-lg border mb-1 text-xs',
                                  colors.bg,
                                  colors.border,
                                  'hover:shadow-sm transition-shadow'
                                )}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className={cn('font-medium', colors.text)}>
                                    {apt.start_time} - {apt.end_time}
                                  </span>
                                  {apt.is_draft && (
                                    <span className="px-1.5 py-0.5 text-[10px] font-medium bg-violet-200 dark:bg-violet-800 text-violet-700 dark:text-violet-300 rounded">
                                      Draft
                                    </span>
                                  )}
                                </div>
                                <p className="font-medium text-gray-900 dark:text-white truncate">
                                  {apt.client_name}
                                </p>
                                {apt.team_name ? (
                                  <p className="text-gray-500 dark:text-gray-400 truncate">
                                    {apt.team_name}
                                  </p>
                                ) : (
                                  <p className="text-yellow-600 dark:text-yellow-400 truncate">
                                    Unassigned
                                  </p>
                                )}
                              </Link>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Legend</h3>
        <div className="flex flex-wrap gap-4">
          {Object.entries(statusColors).map(([status, colors]) => (
            <div key={status} className="flex items-center gap-2">
              <span
                className={cn('w-4 h-4 rounded border', colors.bg, colors.border)}
              />
              <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                {status.replace('_', ' ')}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
