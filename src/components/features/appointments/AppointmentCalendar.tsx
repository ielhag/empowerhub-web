'use client';

import { useMemo, useState } from 'react';
import { format, startOfWeek, endOfWeek, addDays, addWeeks, subWeeks, isSameDay, parseISO, isWithinInterval } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, MapPin, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Appointment, AppointmentStatus } from '@/types';
import Link from 'next/link';

interface AppointmentCalendarProps {
  appointments: Appointment[];
  isLoading?: boolean;
  onWeekChange?: (start: string, end: string) => void;
}

const statusColors: Record<AppointmentStatus, { bg: string; border: string; text: string }> = {
  pending: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', border: 'border-l-yellow-500', text: 'text-yellow-800 dark:text-yellow-200' },
  confirmed: { bg: 'bg-blue-100 dark:bg-blue-900/30', border: 'border-l-blue-500', text: 'text-blue-800 dark:text-blue-200' },
  scheduled: { bg: 'bg-blue-100 dark:bg-blue-900/30', border: 'border-l-blue-500', text: 'text-blue-800 dark:text-blue-200' },
  unassigned: { bg: 'bg-orange-100 dark:bg-orange-900/30', border: 'border-l-orange-500', text: 'text-orange-800 dark:text-orange-200' },
  in_progress: { bg: 'bg-purple-100 dark:bg-purple-900/30', border: 'border-l-purple-500', text: 'text-purple-800 dark:text-purple-200' },
  completed: { bg: 'bg-green-100 dark:bg-green-900/30', border: 'border-l-green-500', text: 'text-green-800 dark:text-green-200' },
  cancelled: { bg: 'bg-red-100 dark:bg-red-900/30', border: 'border-l-red-500', text: 'text-red-800 dark:text-red-200' },
  no_show: { bg: 'bg-gray-100 dark:bg-gray-800/50', border: 'border-l-gray-500', text: 'text-gray-800 dark:text-gray-200' },
  late: { bg: 'bg-amber-100 dark:bg-amber-900/30', border: 'border-l-amber-500', text: 'text-amber-800 dark:text-amber-200' },
  rejected: { bg: 'bg-red-100 dark:bg-red-900/30', border: 'border-l-red-500', text: 'text-red-800 dark:text-red-200' },
  terminated_by_client: { bg: 'bg-orange-100 dark:bg-orange-900/30', border: 'border-l-orange-500', text: 'text-orange-800 dark:text-orange-200' },
  terminated_by_staff: { bg: 'bg-orange-100 dark:bg-orange-900/30', border: 'border-l-orange-500', text: 'text-orange-800 dark:text-orange-200' },
  deleted: { bg: 'bg-gray-100 dark:bg-gray-800/50', border: 'border-l-gray-500', text: 'text-gray-800 dark:text-gray-200' },
};

const hours = Array.from({ length: 14 }, (_, i) => i + 6); // 6 AM to 8 PM

export default function AppointmentCalendar({ appointments, isLoading, onWeekChange }: AppointmentCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = direction === 'next' ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1);
    setCurrentDate(newDate);
    const newStart = startOfWeek(newDate, { weekStartsOn: 0 });
    const newEnd = endOfWeek(newDate, { weekStartsOn: 0 });
    onWeekChange?.(format(newStart, 'yyyy-MM-dd'), format(newEnd, 'yyyy-MM-dd'));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    const todayStart = startOfWeek(new Date(), { weekStartsOn: 0 });
    const todayEnd = endOfWeek(new Date(), { weekStartsOn: 0 });
    onWeekChange?.(format(todayStart, 'yyyy-MM-dd'), format(todayEnd, 'yyyy-MM-dd'));
  };

  const getAppointmentsForDayAndHour = (day: Date, hour: number): Appointment[] => {
    return appointments.filter((apt) => {
      if (!apt.scheduled_start) return false;
      const aptDate = parseISO(apt.scheduled_start);
      return isSameDay(aptDate, day) && aptDate.getHours() === hour;
    });
  };

  const getAppointmentPosition = (appointment: Appointment) => {
    if (!appointment.scheduled_start) return { top: 0, height: 60 };
    const startDate = parseISO(appointment.scheduled_start);
    const minutes = startDate.getMinutes();
    const durationMinutes = appointment.duration_minutes || 60;
    return {
      top: (minutes / 60) * 60,
      height: Math.max((durationMinutes / 60) * 60, 30),
    };
  };

  return (
    <div className="flex flex-col h-full">
      {/* Calendar Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {format(weekStart, 'MMMM d')} - {format(weekEnd, 'MMMM d, yyyy')}
          </h2>
          <button
            onClick={goToToday}
            className="px-3 py-1 text-sm font-medium text-violet-600 hover:text-violet-700 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg transition-colors"
          >
            Today
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigateWeek('prev')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Previous week"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <button
            onClick={() => navigateWeek('next')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Next week"
          >
            <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 overflow-auto">
        <div className="min-w-[800px]">
          {/* Day Headers */}
          <div className="grid grid-cols-8 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
            <div className="p-2 text-center text-sm font-medium text-gray-500 dark:text-gray-400 border-r border-gray-200 dark:border-gray-700">
              {/* Time column header */}
            </div>
            {weekDays.map((day) => (
              <div
                key={day.toISOString()}
                className={cn(
                  'p-2 text-center border-r border-gray-200 dark:border-gray-700 last:border-r-0',
                  isSameDay(day, new Date()) && 'bg-violet-50 dark:bg-violet-900/20'
                )}
              >
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  {format(day, 'EEE')}
                </div>
                <div
                  className={cn(
                    'text-lg font-semibold mt-1',
                    isSameDay(day, new Date())
                      ? 'text-violet-600 dark:text-violet-400'
                      : 'text-gray-900 dark:text-white'
                  )}
                >
                  {format(day, 'd')}
                </div>
              </div>
            ))}
          </div>

          {/* Time Slots */}
          {isLoading ? (
            <div className="flex items-center justify-center h-96">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
            </div>
          ) : (
            <div className="relative">
              {hours.map((hour) => (
                <div
                  key={hour}
                  className="grid grid-cols-8 border-b border-gray-100 dark:border-gray-700/50"
                  style={{ height: '60px' }}
                >
                  {/* Time Label */}
                  <div className="p-1 text-right text-xs text-gray-500 dark:text-gray-400 border-r border-gray-200 dark:border-gray-700 pr-2">
                    {format(new Date().setHours(hour, 0, 0, 0), 'h a')}
                  </div>

                  {/* Day Columns */}
                  {weekDays.map((day) => {
                    const dayAppointments = getAppointmentsForDayAndHour(day, hour);
                    return (
                      <div
                        key={`${day.toISOString()}-${hour}`}
                        className={cn(
                          'relative border-r border-gray-100 dark:border-gray-700/50 last:border-r-0',
                          isSameDay(day, new Date()) && 'bg-violet-50/30 dark:bg-violet-900/10'
                        )}
                      >
                        {dayAppointments.map((apt) => {
                          const { top, height } = getAppointmentPosition(apt);
                          const colors = statusColors[apt.status];
                          return (
                            <Link
                              key={apt.id}
                              href={`/appointments/${apt.id}`}
                              className={cn(
                                'absolute left-0.5 right-0.5 rounded-md p-1 border-l-2 overflow-hidden cursor-pointer hover:opacity-90 transition-opacity',
                                colors.bg,
                                colors.border
                              )}
                              style={{ top: `${top}px`, height: `${height}px`, minHeight: '24px' }}
                            >
                              <div className={cn('text-xs font-medium truncate', colors.text)}>
                                {apt.client?.full_name || 'Client'}
                              </div>
                              {height >= 40 && (
                                <div className="text-xs text-gray-500 dark:text-gray-400 truncate flex items-center gap-1 mt-0.5">
                                  <Clock className="w-3 h-3" />
                                  {format(parseISO(apt.scheduled_start!), 'h:mm a')}
                                </div>
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
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <div className="flex flex-wrap gap-4 text-xs">
          {Object.entries(statusColors).map(([status, colors]) => (
            <div key={status} className="flex items-center gap-1.5">
              <div className={cn('w-3 h-3 rounded border-l-2', colors.bg, colors.border)} />
              <span className="text-gray-600 dark:text-gray-400 capitalize">
                {status.replace('_', ' ')}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
