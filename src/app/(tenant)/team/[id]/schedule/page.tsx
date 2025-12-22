'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  User,
  Loader2,
  MapPin,
} from 'lucide-react';
import { useTeamMember, useTeamSchedule } from '@/hooks/useTeam';
import { cn } from '@/lib/utils';
import {
  format,
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  eachDayOfInterval,
  isSameDay,
  parseISO,
} from 'date-fns';

interface TeamSchedulePageProps {
  params: Promise<{ id: string }>;
}

const statusColors: Record<string, { bg: string; text: string; dot: string }> = {
  scheduled: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-800 dark:text-blue-400',
    dot: 'bg-blue-500',
  },
  in_progress: {
    bg: 'bg-yellow-100 dark:bg-yellow-900/30',
    text: 'text-yellow-800 dark:text-yellow-400',
    dot: 'bg-yellow-500',
  },
  completed: {
    bg: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-800 dark:text-green-400',
    dot: 'bg-green-500',
  },
  cancelled: {
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-800 dark:text-red-400',
    dot: 'bg-red-500',
  },
};

export default function TeamSchedulePage({ params }: TeamSchedulePageProps) {
  const { id } = use(params);
  const memberId = parseInt(id, 10);
  const [currentWeek, setCurrentWeek] = useState(new Date());

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 0 });

  const { data: member, isLoading: memberLoading } = useTeamMember(memberId);
  const { data: schedule, isLoading: scheduleLoading } = useTeamSchedule(
    memberId,
    format(weekStart, 'yyyy-MM-dd'),
    format(weekEnd, 'yyyy-MM-dd')
  );

  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const isLoading = memberLoading || scheduleLoading;

  const getAppointmentsForDay = (day: Date) => {
    if (!schedule) return [];
    const daySchedule = schedule.find((s) =>
      isSameDay(parseISO(s.date), day)
    );
    return daySchedule?.appointments || [];
  };

  if (memberLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href={`/team/${memberId}`}
            className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {member?.name}'s Schedule
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              View and manage appointments
            </p>
          </div>
        </div>

        {/* Week Navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
            className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="px-4 py-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 min-w-[200px] text-center">
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
            </span>
          </div>
          <button
            onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
            className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <button
            onClick={() => setCurrentWeek(new Date())}
            className="px-3 py-2 text-sm font-medium text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg transition-colors"
          >
            Today
          </button>
        </div>
      </div>

      {/* Schedule Grid */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {scheduleLoading ? (
          <div className="flex items-center justify-center h-96">
            <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
          </div>
        ) : (
          <div className="grid grid-cols-7 divide-x divide-gray-200 dark:divide-gray-700">
            {days.map((day) => {
              const appointments = getAppointmentsForDay(day);
              const isToday = isSameDay(day, new Date());

              return (
                <div key={day.toISOString()} className="min-h-[500px]">
                  {/* Day Header */}
                  <div
                    className={cn(
                      'p-3 text-center border-b border-gray-200 dark:border-gray-700',
                      isToday
                        ? 'bg-violet-50 dark:bg-violet-900/20'
                        : 'bg-gray-50 dark:bg-gray-900/50'
                    )}
                  >
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      {format(day, 'EEE')}
                    </p>
                    <p
                      className={cn(
                        'text-lg font-semibold',
                        isToday
                          ? 'text-violet-600 dark:text-violet-400'
                          : 'text-gray-900 dark:text-white'
                      )}
                    >
                      {format(day, 'd')}
                    </p>
                  </div>

                  {/* Appointments */}
                  <div className="p-2 space-y-2">
                    {appointments.length === 0 ? (
                      <p className="text-xs text-center text-gray-400 dark:text-gray-500 py-4">
                        No appointments
                      </p>
                    ) : (
                      appointments.map((apt) => {
                        const colors = statusColors[apt.status] || statusColors.scheduled;

                        return (
                          <Link
                            key={apt.id}
                            href={`/appointments/${apt.id}`}
                            className={cn(
                              'block p-2 rounded-lg text-xs',
                              colors.bg,
                              'hover:opacity-80 transition-opacity'
                            )}
                          >
                            <div className="flex items-center gap-1 mb-1">
                              <span className={cn('w-1.5 h-1.5 rounded-full', colors.dot)} />
                              <span className={cn('font-medium', colors.text)}>
                                {apt.start_time}
                              </span>
                            </div>
                            <p className="font-medium text-gray-900 dark:text-white truncate">
                              {apt.client_name}
                            </p>
                            <p className="text-gray-500 dark:text-gray-400 truncate">
                              {apt.start_time} - {apt.end_time}
                            </p>
                          </Link>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Legend</h3>
        <div className="flex flex-wrap gap-4">
          {Object.entries(statusColors).map(([status, colors]) => (
            <div key={status} className="flex items-center gap-2">
              <span className={cn('w-3 h-3 rounded-full', colors.dot)} />
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
