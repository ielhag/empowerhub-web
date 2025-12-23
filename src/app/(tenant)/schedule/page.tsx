'use client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  useScheduleBuilder,
  useWeather,
  useHolidays,
  getWeekDates,
  getMonthDates,
  formatTime,
  formatTimeFromDatetime,
  getDateFromDatetime,
  getAppointmentColorClasses,
  getStatusColorClasses,
  getActivityColorClasses,
  hasTimeOffOnDate,
  isAvailableOnDate,
  getAppointmentsForDate,
  getActivitiesForDate,
  calculateScheduledHours,
  calculateEstimatedWages,
  countScheduledPeople,
  formatStaffName,
  getInitials,
  getWeekRangeDisplay,
  getMonthDisplay,
  isToday,
  isPastDate,
  formatDate,
  type ScheduleView,
  type ScheduleFilters,
  type StaffMember,
  type ScheduleAppointment,
  type ScheduleActivity,
} from '@/hooks/useScheduleBuilder';
import { AppointmentQuickView } from '@/components/features/appointments/AppointmentQuickView';
import { BackdatedAppointmentModal } from '@/components/features/appointments/BackdatedAppointmentModal';
import { EditWorkingHoursModal } from '@/components/features/schedule/EditWorkingHoursModal';
import { ActivityModal } from '@/components/features/schedule/ActivityModal';
import { cn } from '@/lib/utils';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar,
  Clock,
  Filter,
  Settings,
  Printer,
  Download,
  RefreshCw,
  User,
  AlertTriangle,
  Sun,
  Moon,
  Loader2,
  MoreVertical,
  CalendarDays,
  Users,
  DollarSign,
} from 'lucide-react';

// Time slots for the schedule (7 AM to 7 PM)
const TIME_SLOTS = Array.from({ length: 12 }, (_, i) => i + 7);

// Filter defaults
const DEFAULT_FILTERS = {
  showEvents: true,
  scheduledOnly: false,
  hoursForcast: true,
  wageForcast: true,
  peopleForcast: true,
  availabilities: true,
  timeOffs: true,
  shortNames: true,
  showWeather: true,
  showHolidays: true,
};

export default function ScheduleBuilderPage() {
  // State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<ScheduleView>('week');
  const [showFilters, setShowFilters] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<number | null>(null);
  const [showBackdatedModal, setShowBackdatedModal] = useState(false);
  const [backdatedDefaults, setBackdatedDefaults] = useState<{ teamId?: number; date?: string }>({});

  // Staff menu modals state
  const [selectedStaffForHours, setSelectedStaffForHours] = useState<StaffMember | null>(null);
  const [selectedStaffForActivity, setSelectedStaffForActivity] = useState<StaffMember | null>(null);

  // Helper to format date in local timezone
  const formatLocalDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Calculate start date based on view
  const startDate = useMemo(() => {
    if (view === 'month') {
      const d = new Date(currentDate);
      d.setDate(1);
      return formatLocalDate(d);
    }
    // Week view - get Monday
    const d = new Date(currentDate);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    return formatLocalDate(d);
  }, [currentDate, view]);

  // Query filters
  const queryFilters: ScheduleFilters = useMemo(() => ({
    startDate,
    period: view,
  }), [startDate, view]);

  // Data fetching
  const { staffMembers, openShifts, specialities, isLoading, refreshSchedule } = useScheduleBuilder(queryFilters);
  const { data: weatherData } = useWeather(startDate);
  const { data: holidays } = useHolidays(currentDate.getFullYear());

  // Calculate dates for current view
  const viewDates = useMemo(() => {
    if (view === 'month') {
      return getMonthDates(currentDate);
    }
    return getWeekDates(currentDate);
  }, [currentDate, view]);

  // Week dates for week view
  const weekDates = useMemo(() => getWeekDates(currentDate), [currentDate]);

  // Filter staff members
  const filteredStaffMembers = useMemo(() => {
    let members = [...staffMembers];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      members = members.filter(m => m.name.toLowerCase().includes(query));
    }

    // Scheduled only filter
    if (filters.scheduledOnly) {
      members = members.filter(m => {
        return weekDates.some(date => getAppointmentsForDate(m, date).length > 0);
      });
    }

    return members;
  }, [staffMembers, searchQuery, filters.scheduledOnly, weekDates]);

  // Navigation handlers
  const navigatePrevious = useCallback(() => {
    const d = new Date(currentDate);
    if (view === 'week') d.setDate(d.getDate() - 7);
    else if (view === 'month') d.setMonth(d.getMonth() - 1);
    else d.setDate(d.getDate() - 1);
    setCurrentDate(d);
  }, [currentDate, view]);

  const navigateNext = useCallback(() => {
    const d = new Date(currentDate);
    if (view === 'week') d.setDate(d.getDate() + 7);
    else if (view === 'month') d.setMonth(d.getMonth() + 1);
    else d.setDate(d.getDate() + 1);
    setCurrentDate(d);
  }, [currentDate, view]);

  const goToToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  const router = useRouter();

  // Handle add appointment click from day cell
  const handleAddClick = useCallback((memberId: number, date: string, isPast: boolean) => {
    if (isPast) {
      // Open backdated modal with pre-filled data
      setBackdatedDefaults({ teamId: memberId, date });
      setShowBackdatedModal(true);
    } else {
      // Navigate to new appointment page with pre-filled data
      router.push(`/appointments/new?team_id=${memberId}&date=${date}`);
    }
  }, [router]);

  // Get holiday for a date
  const getHolidayForDate = useCallback((dateStr: string) => {
    return holidays?.find(h => h.date === dateStr);
  }, [holidays]);

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Left: Title & Navigation */}
          <div className="flex items-center space-x-4">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
              Schedule Builder
            </h1>

            {/* View Selector */}
            <div className="relative inline-flex rounded-lg bg-gray-100 dark:bg-gray-700 p-1">
              {(['day', 'week', 'month'] as ScheduleView[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={cn(
                    'px-3 py-1 text-sm font-medium rounded-md transition-colors capitalize',
                    view === v
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                  )}
                >
                  {v}
                </button>
              ))}
            </div>

            {/* Date Navigation */}
            <div className="flex items-center space-x-2">
              <button
                onClick={navigatePrevious}
                className="p-1.5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={goToToday}
                className="px-3 py-1 text-sm font-medium text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-md transition-colors"
              >
                Today
              </button>
              <button
                onClick={navigateNext}
                className="p-1.5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[200px]">
                {view === 'month' ? getMonthDisplay(currentDate) : getWeekRangeDisplay(currentDate)}
              </span>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center space-x-2">
            {/* Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search staff..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-48 pl-8 pr-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 border-0 rounded-md focus:ring-2 focus:ring-violet-500 dark:text-white"
              />
              <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>

            {/* Filters */}
            <div className="relative">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors flex items-center space-x-1"
              >
                <Filter className="w-4 h-4" />
                <span>Filters</span>
              </button>

              {showFilters && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowFilters(false)} />
                  <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 p-4 space-y-4">
                    <h3 className="font-medium text-gray-900 dark:text-white">Display Options</h3>

                    <div className="space-y-3">
                      {[
                        { key: 'showEvents', label: 'Events' },
                        { key: 'scheduledOnly', label: 'Scheduled team members only' },
                        { key: 'shortNames', label: 'Short names' },
                        { key: 'availabilities', label: 'Availabilities' },
                        { key: 'timeOffs', label: 'Time-offs' },
                      ].map(({ key, label }) => (
                        <label key={key} className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={filters[key as keyof typeof filters] as boolean}
                            onChange={(e) => setFilters(prev => ({ ...prev, [key]: e.target.checked }))}
                            className="h-4 w-4 text-violet-600 rounded border-gray-300 dark:border-gray-600"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
                        </label>
                      ))}
                    </div>

                    <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Forecasts</h4>
                      <div className="space-y-3">
                        {[
                          { key: 'hoursForcast', label: 'Hours' },
                          { key: 'wageForcast', label: 'Wages' },
                          { key: 'peopleForcast', label: 'People' },
                        ].map(({ key, label }) => (
                          <label key={key} className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              checked={filters[key as keyof typeof filters] as boolean}
                              onChange={(e) => setFilters(prev => ({ ...prev, [key]: e.target.checked }))}
                              className="h-4 w-4 text-violet-600 rounded border-gray-300 dark:border-gray-600"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Calendar Features</h4>
                      <div className="space-y-3">
                        <label className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={filters.showWeather}
                            onChange={(e) => setFilters(prev => ({ ...prev, showWeather: e.target.checked }))}
                            className="h-4 w-4 text-violet-600 rounded border-gray-300 dark:border-gray-600"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300 flex items-center space-x-2">
                            <span>Weather</span>
                            <span className="text-xs">🌤️</span>
                          </span>
                        </label>
                        <label className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={filters.showHolidays}
                            onChange={(e) => setFilters(prev => ({ ...prev, showHolidays: e.target.checked }))}
                            className="h-4 w-4 text-violet-600 rounded border-gray-300 dark:border-gray-600"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300 flex items-center space-x-2">
                            <span>Holidays</span>
                            <span className="text-xs">🎉</span>
                          </span>
                        </label>
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        onClick={() => setShowFilters(false)}
                        className="px-3 py-1.5 text-sm font-medium text-white bg-violet-600 rounded-md hover:bg-violet-700"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Tools */}
            <div className="relative">
              <button
                onClick={() => setShowTools(!showTools)}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors flex items-center space-x-1"
              >
                <Settings className="w-4 h-4" />
                <span>Tools</span>
              </button>

              {showTools && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowTools(false)} />
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 py-1">
                    <button className="w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-3">
                      <Printer className="w-4 h-4" />
                      <span>Print</span>
                    </button>
                    <button className="w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-3">
                      <Download className="w-4 h-4" />
                      <span>Export</span>
                    </button>
                    <Link
                      href="/appointments/new"
                      className="w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-3"
                    >
                      <Plus className="w-4 h-4" />
                      <span>New Appointment</span>
                    </Link>
                    <button
                      onClick={() => {
                        setShowBackdatedModal(true);
                        setShowTools(false);
                      }}
                      className="w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-3"
                    >
                      <Clock className="w-4 h-4" />
                      <span>Backdated Appointment</span>
                    </button>
                    <button
                      onClick={refreshSchedule}
                      className="w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-3"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>Refresh</span>
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* New Appointment */}
            <Link
              href="/appointments/new"
              className="px-3 py-1.5 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-md transition-colors flex items-center space-x-1"
            >
              <Plus className="w-4 h-4" />
              <span>New</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Schedule Content */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
          </div>
        ) : view === 'week' ? (
          <WeekView
            weekDates={weekDates}
            staffMembers={filteredStaffMembers}
            openShifts={openShifts}
            filters={filters}
            weatherData={weatherData}
            getHolidayForDate={getHolidayForDate}
            onAppointmentClick={setSelectedAppointmentId}
            onAddClick={handleAddClick}
            onEditWorkingHours={setSelectedStaffForHours}
            onAddActivity={setSelectedStaffForActivity}
          />
        ) : view === 'month' ? (
          <MonthView
            monthDates={viewDates}
            currentDate={currentDate}
            staffMembers={filteredStaffMembers}
            openShifts={openShifts}
            filters={filters}
            onAppointmentClick={setSelectedAppointmentId}
          />
        ) : (
          <DayView
            date={currentDate.toISOString().split('T')[0]}
            staffMembers={filteredStaffMembers}
            openShifts={openShifts}
            filters={filters}
            onAppointmentClick={setSelectedAppointmentId}
          />
        )}
      </div>

      {/* Footer Stats */}
      {view === 'week' && (
        <div className="flex-shrink-0 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6 text-sm">
              {filters.hoursForcast && (
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-600 dark:text-gray-400">
                    Total Hours: {weekDates.reduce((sum, date) => sum + calculateScheduledHours(filteredStaffMembers, date), 0).toFixed(1)}h
                  </span>
                </div>
              )}
              {filters.wageForcast && (
                <div className="flex items-center space-x-2">
                  <DollarSign className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-600 dark:text-gray-400">
                    Est. Wages: ${weekDates.reduce((sum, date) => sum + calculateEstimatedWages(filteredStaffMembers, date), 0).toFixed(0)}
                  </span>
                </div>
              )}
              {filters.peopleForcast && (
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-600 dark:text-gray-400">
                    Avg People/Day: {(weekDates.reduce((sum, date) => sum + countScheduledPeople(filteredStaffMembers, date), 0) / 7).toFixed(1)}
                  </span>
                </div>
              )}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {filteredStaffMembers.length} team members
            </div>
          </div>
        </div>
      )}

      {/* Appointment Quick View Modal */}
      {selectedAppointmentId && (
        <AppointmentQuickView
          appointmentId={selectedAppointmentId}
          isOpen={!!selectedAppointmentId}
          onClose={() => setSelectedAppointmentId(null)}
        />
      )}

      {/* Backdated Appointment Modal */}
      <BackdatedAppointmentModal
        isOpen={showBackdatedModal}
        onClose={() => {
          setShowBackdatedModal(false);
          setBackdatedDefaults({});
        }}
        onSuccess={() => refreshSchedule()}
        preselectedTeamId={backdatedDefaults.teamId}
        preselectedDate={backdatedDefaults.date}
      />

      {/* Edit Working Hours Modal */}
      {selectedStaffForHours && (
        <EditWorkingHoursModal
          isOpen={!!selectedStaffForHours}
          onClose={() => setSelectedStaffForHours(null)}
          teamId={selectedStaffForHours.id}
          teamName={selectedStaffForHours.name}
          onSuccess={() => refreshSchedule()}
        />
      )}

      {/* Activity Modal */}
      {selectedStaffForActivity && (
        <ActivityModal
          isOpen={!!selectedStaffForActivity}
          onClose={() => setSelectedStaffForActivity(null)}
          teamId={selectedStaffForActivity.id}
          teamName={selectedStaffForActivity.name}
          onSuccess={() => refreshSchedule()}
        />
      )}
    </div>
  );
}

// ============================================================================
// Week View Component
// ============================================================================
function WeekView({
  weekDates,
  staffMembers,
  openShifts,
  filters,
  weatherData,
  getHolidayForDate,
  onAppointmentClick,
  onAddClick,
  onEditWorkingHours,
  onAddActivity,
}: {
  weekDates: string[];
  staffMembers: StaffMember[];
  openShifts: ScheduleAppointment[];
  filters: typeof DEFAULT_FILTERS;
  weatherData?: Record<string, { icon: string; temp: number; description: string }>;
  getHolidayForDate: (date: string) => { name: string } | undefined;
  onAppointmentClick: (id: number) => void;
  onAddClick?: (memberId: number, date: string, isPast: boolean) => void;
  onEditWorkingHours?: (member: StaffMember) => void;
  onAddActivity?: (member: StaffMember) => void;
}) {
  return (
    <div className="min-w-[1200px]">
      {/* Header Row */}
      <div className="sticky top-0 z-20 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="grid" style={{ gridTemplateColumns: '200px repeat(7, 1fr)' }}>
          {/* Empty corner cell */}
          <div className="p-2 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700" />

          {/* Day headers */}
          {weekDates.map((date) => {
            const dayDate = new Date(date + 'T00:00:00');
            const holiday = getHolidayForDate(date);
            const weather = weatherData?.[date];
            const today = isToday(date);
            const past = isPastDate(date);

            return (
              <div
                key={date}
                className={cn(
                  'p-2 text-center border-r border-gray-200 dark:border-gray-700 last:border-r-0',
                  today && 'bg-violet-50 dark:bg-violet-900/20',
                  past && 'opacity-75'
                )}
              >
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  {dayDate.toLocaleDateString('en-US', { weekday: 'short' })}
                </div>
                <div className={cn(
                  'text-lg font-semibold',
                  today ? 'text-violet-600 dark:text-violet-400' : 'text-gray-900 dark:text-white'
                )}>
                  {dayDate.getDate()}
                </div>

                {/* Weather */}
                {filters.showWeather && weather && (
                  <div className="flex items-center justify-center space-x-1 text-xs text-gray-500 dark:text-gray-400">
                    <span>{weather.icon}</span>
                    <span>{weather.temp}°</span>
                  </div>
                )}

                {/* Holiday */}
                {filters.showHolidays && holiday && (
                  <div className="text-xs text-red-600 dark:text-red-400 truncate px-1" title={holiday.name}>
                    🎉 {holiday.name}
                  </div>
                )}

                {/* Daily Totals */}
                <div className="flex items-center justify-center space-x-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {filters.hoursForcast && (
                    <span>{calculateScheduledHours(staffMembers, date).toFixed(1)}h</span>
                  )}
                  {filters.peopleForcast && (
                    <span>{countScheduledPeople(staffMembers, date)}p</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Open Shifts Row */}
      {openShifts.length > 0 && (
        <div className="border-b border-gray-200 dark:border-gray-700 bg-orange-50 dark:bg-orange-900/10">
          <div className="grid" style={{ gridTemplateColumns: '200px repeat(7, 1fr)' }}>
            <div className="p-3 bg-orange-100 dark:bg-orange-900/30 border-r border-gray-200 dark:border-gray-700 flex items-center">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-orange-200 dark:bg-orange-800 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <div className="font-medium text-gray-900 dark:text-white text-sm">Open Shifts</div>
                  <div className="text-xs text-orange-600 dark:text-orange-400">{openShifts.length} unassigned</div>
                </div>
              </div>
            </div>

            {weekDates.map((date) => {
              const dateShifts = openShifts.filter(s => getDateFromDatetime(s.start_time) === date);

              return (
                <div
                  key={date}
                  className="p-1 border-r border-gray-200 dark:border-gray-700 last:border-r-0 min-h-[80px]"
                >
                  <div className="space-y-1">
                    {dateShifts.slice(0, 3).map((shift) => (
                      <AppointmentCard key={shift.id} appointment={shift} compact onClick={onAppointmentClick} />
                    ))}
                    {dateShifts.length > 3 && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                        +{dateShifts.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Staff Rows */}
      {staffMembers.map((member) => (
        <StaffRow
          key={member.id}
          member={member}
          weekDates={weekDates}
          filters={filters}
          onAppointmentClick={onAppointmentClick}
          onAddClick={onAddClick}
          onEditWorkingHours={onEditWorkingHours}
          onAddActivity={onAddActivity}
        />
      ))}

      {/* Empty State */}
      {staffMembers.length === 0 && (
        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
          No team members found. Try adjusting your filters.
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Staff Row Component
// ============================================================================
function StaffRow({
  member,
  weekDates,
  filters,
  onAppointmentClick,
  onAddClick,
  onEditWorkingHours,
  onAddActivity,
}: {
  member: StaffMember;
  weekDates: string[];
  filters: typeof DEFAULT_FILTERS;
  onAppointmentClick: (id: number) => void;
  onAddClick?: (memberId: number, date: string, isPast: boolean) => void;
  onEditWorkingHours?: (member: StaffMember) => void;
  onAddActivity?: (member: StaffMember) => void;
}) {
  const [showMenu, setShowMenu] = useState(false);

  // Check if member has any scheduling conflicts
  const hasConflicts = weekDates.some(date => {
    const timeOff = hasTimeOffOnDate(member, date);
    const appointments = getAppointmentsForDate(member, date);
    return timeOff && appointments.length > 0;
  });

  return (
    <div className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
      <div className="grid" style={{ gridTemplateColumns: '200px repeat(7, 1fr)' }}>
        {/* Staff Info */}
        <div className="p-3 bg-gray-50 dark:bg-gray-900/50 border-r border-gray-200 dark:border-gray-700 flex items-center space-x-3">
          <Link
            href={`/team/${member.id}`}
            className="flex-shrink-0 w-10 h-10 rounded-full bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center text-violet-700 dark:text-violet-300 font-medium hover:bg-violet-200 dark:hover:bg-violet-800 transition-colors"
          >
            {member.initials}
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <Link
                href={`/team/${member.id}`}
                className="font-medium text-gray-900 dark:text-white text-sm truncate hover:text-violet-600 dark:hover:text-violet-400"
              >
                {filters.shortNames ? formatStaffName(member.name) : member.name}
              </Link>
              {hasConflicts && (
                <span title="Scheduling conflict">
                  <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                </span>
              )}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {member.role}
              {member.specialities.length > 0 && (
                <span className="ml-1">
                  • {member.specialities.map(s => s.short_name || s.name).join(', ')}
                </span>
              )}
            </div>
          </div>

          {/* Staff Menu */}
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
              aria-expanded={showMenu}
              aria-haspopup="true"
            >
              <MoreVertical className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            </button>

            {showMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-gray-900 ring-1 ring-black ring-opacity-5 dark:ring-gray-700 z-50">
                  <div className="py-1">
                    {/* Edit Working Hours */}
                    <button
                      onClick={() => {
                        onEditWorkingHours?.(member);
                        setShowMenu(false);
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      <Clock className="w-4 h-4 mr-3" />
                      Edit Working Hours
                    </button>

                    {/* View Profile */}
                    <Link
                      href={`/team/${member.id}`}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                      onClick={() => setShowMenu(false)}
                    >
                      <User className="w-4 h-4 mr-3" />
                      View Profile
                    </Link>

                    {/* Add Activity */}
                    <button
                      onClick={() => {
                        onAddActivity?.(member);
                        setShowMenu(false);
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      <Plus className="w-4 h-4 mr-3" />
                      Add Activity
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Day Cells */}
        {weekDates.map((date) => (
          <DayCell
            key={date}
            member={member}
            date={date}
            filters={filters}
            onAppointmentClick={onAppointmentClick}
            onAddClick={onAddClick}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Day Cell Component
// ============================================================================
function DayCell({
  member,
  date,
  filters,
  onAppointmentClick,
  onAddClick,
}: {
  member: StaffMember;
  date: string;
  filters: typeof DEFAULT_FILTERS;
  onAppointmentClick: (id: number) => void;
  onAddClick?: (memberId: number, date: string, isPast: boolean) => void;
}) {
  const timeOff = hasTimeOffOnDate(member, date);
  const workingHours = member.working_hours?.[date];
  const appointments = getAppointmentsForDate(member, date);
  const activities = getActivitiesForDate(member, date);
  const today = isToday(date);
  const past = isPastDate(date);

  // Combine and sort events by time
  const allEvents = [
    ...appointments.map(a => ({ ...a, type: 'appointment' as const })),
    ...activities.map(a => ({ ...a, type: 'activity' as const })),
  ].sort((a, b) => a.start_time.localeCompare(b.start_time));

  const hasEvents = allEvents.length > 0;
  const canAddAppointment = !timeOff && (workingHours || !filters.availabilities);

  return (
    <div
      className={cn(
        'p-1 border-r border-gray-200 dark:border-gray-700 last:border-r-0 min-h-[100px] relative group',
        today && 'bg-violet-50/50 dark:bg-violet-900/10',
        past && 'opacity-75'
      )}
    >
      {/* Time Off Overlay */}
      {filters.timeOffs && timeOff && (
        <div className="absolute inset-0 bg-red-100 dark:bg-red-900/30 opacity-50 pointer-events-none">
          <div className="absolute top-1 left-1 text-xs text-red-600 dark:text-red-400 font-medium">
            {timeOff.type}
          </div>
        </div>
      )}

      {/* Working Hours Background */}
      {filters.availabilities && workingHours && !timeOff && (
        <div className="absolute inset-0 bg-green-50 dark:bg-green-900/10 pointer-events-none opacity-30" />
      )}

      {/* No Working Hours / Unavailable */}
      {filters.availabilities && !workingHours && !timeOff && (
        <div className="absolute inset-0 bg-gray-100 dark:bg-gray-800 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-xs text-gray-400 dark:text-gray-500">
            N/A
          </div>
        </div>
      )}

      {/* Events */}
      <div className="relative z-10 space-y-1">
        {allEvents.slice(0, 4).map((event) => (
          event.type === 'appointment' ? (
            <AppointmentCard key={`apt-${event.id}`} appointment={event as ScheduleAppointment} compact onClick={onAppointmentClick} />
          ) : (
            <ActivityCard key={`act-${event.id}`} activity={event as ScheduleActivity} />
          )
        ))}
        {allEvents.length > 4 && (
          <button className="w-full text-xs text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 text-center py-0.5">
            +{allEvents.length - 4} more
          </button>
        )}
      </div>

      {/* Add appointment hover layer - pointer-events-none so appointments remain clickable */}
      {canAddAppointment && (
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150 group-hover:border-2 group-hover:border-violet-300 dark:group-hover:border-violet-600 pointer-events-none z-20"
        >
          {/* Add Button - positioned to not overlap with appointments */}
          <button
            onClick={() => onAddClick?.(member.id, date, past)}
            className={cn(
              'absolute left-1/2 -translate-x-1/2 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 pointer-events-auto cursor-pointer hover:scale-110 shadow-md',
              hasEvents
                ? 'bottom-1' // At bottom when has events
                : 'top-1/2 -translate-y-1/2', // Centered when empty
              past
                ? hasEvents
                  ? 'bg-amber-600 dark:bg-amber-100 hover:bg-amber-500'
                  : 'bg-amber-100 dark:bg-amber-200 hover:bg-amber-200'
                : hasEvents
                  ? 'bg-violet-600 dark:bg-violet-100 hover:bg-violet-500'
                  : 'bg-violet-100 dark:bg-violet-200 hover:bg-violet-200'
            )}
          >
            <Plus
              className={cn(
                'w-4 h-4',
                past
                  ? hasEvents
                    ? 'text-amber-100 dark:text-amber-900'
                    : 'text-amber-600 dark:text-amber-900'
                  : hasEvents
                    ? 'text-violet-100 dark:text-violet-900'
                    : 'text-violet-600 dark:text-violet-900'
              )}
            />
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Appointment Card Component
// ============================================================================
function AppointmentCard({
  appointment,
  compact = false,
  onClick,
}: {
  appointment: ScheduleAppointment;
  compact?: boolean;
  onClick?: (id: number) => void;
}) {
  const colors = getAppointmentColorClasses(appointment);
  const statusColors = getStatusColorClasses(appointment.status);

  // CSS animation classes for different statuses
  const animationClass = appointment.status === 'in_progress'
    ? 'animate-in-progress'
    : appointment.status === 'no_show'
    ? 'animate-no-show'
    : '';

  return (
    <button
      onClick={() => onClick?.(appointment.id)}
      className={cn(
        'block w-full text-left rounded-md border p-1.5 text-xs transition-all hover:shadow-md cursor-pointer',
        colors.bg,
        colors.border,
        animationClass
      )}
    >
      <div className="flex items-center justify-between mb-0.5">
        <span className={cn('font-medium', colors.text)}>
          {formatTimeFromDatetime(appointment.start_time)}
        </span>
        {appointment.speciality_short_name && (
          <span className={cn('px-1 py-0.5 rounded text-[10px] font-medium', colors.bg, colors.text)}>
            {appointment.speciality_short_name}
          </span>
        )}
      </div>
      {!compact && (
        <div className="truncate text-gray-700 dark:text-gray-300 font-medium">
          {appointment.client_name}
        </div>
      )}
      {compact && (
        <div className="truncate text-gray-600 dark:text-gray-400">
          {appointment.client_name}
        </div>
      )}
    </button>
  );
}

// ============================================================================
// Activity Card Component
// ============================================================================
function ActivityCard({ activity }: { activity: ScheduleActivity }) {
  const colors = getActivityColorClasses();

  return (
    <div
      className={cn(
        'block rounded-md border p-1.5 text-xs',
        colors.bg,
        colors.border
      )}
    >
      <div className="flex items-center justify-between mb-0.5">
        <span className={cn('font-medium', colors.text)}>
          {formatTimeFromDatetime(activity.start_time)}
        </span>
        <span className="text-[10px] text-amber-600 dark:text-amber-400 uppercase">
          {activity.type}
        </span>
      </div>
      <div className="truncate text-gray-700 dark:text-gray-300">
        {activity.title}
      </div>
    </div>
  );
}

// ============================================================================
// Month View Component (Simplified)
// ============================================================================
function MonthView({
  monthDates,
  currentDate,
  staffMembers,
  openShifts,
  filters,
  onAppointmentClick,
}: {
  monthDates: string[];
  currentDate: Date;
  staffMembers: StaffMember[];
  openShifts: ScheduleAppointment[];
  filters: typeof DEFAULT_FILTERS;
  onAppointmentClick: (id: number) => void;
}) {
  const currentMonth = currentDate.getMonth();

  // Group dates by week
  const weeks: string[][] = [];
  for (let i = 0; i < monthDates.length; i += 7) {
    weeks.push(monthDates.slice(i, i + 7));
  }

  return (
    <div className="p-4">
      {/* Day Headers - Monday first */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
          <div key={day} className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="space-y-1">
        {weeks.map((week, weekIdx) => (
          <div key={weekIdx} className="grid grid-cols-7 gap-1">
            {week.map((date) => {
              const dayDate = new Date(date + 'T00:00:00');
              const isCurrentMonth = dayDate.getMonth() === currentMonth;
              const today = isToday(date);

              // Count appointments for this day
              const dayAppointmentCount = staffMembers.reduce((sum, m) =>
                sum + getAppointmentsForDate(m, date).length, 0
              );
              const dayOpenShifts = openShifts.filter(s => getDateFromDatetime(s.start_time) === date).length;

              return (
                <div
                  key={date}
                  className={cn(
                    'min-h-[100px] p-2 rounded-lg border',
                    isCurrentMonth
                      ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                      : 'bg-gray-50 dark:bg-gray-900 border-gray-100 dark:border-gray-800 opacity-50',
                    today && 'ring-2 ring-violet-500'
                  )}
                >
                  <div className={cn(
                    'text-sm font-medium mb-1',
                    today ? 'text-violet-600 dark:text-violet-400' : 'text-gray-900 dark:text-white'
                  )}>
                    {dayDate.getDate()}
                  </div>

                  {dayAppointmentCount > 0 && (
                    <div className="text-xs text-violet-600 dark:text-violet-400">
                      {dayAppointmentCount} apt{dayAppointmentCount !== 1 ? 's' : ''}
                    </div>
                  )}
                  {dayOpenShifts > 0 && (
                    <div className="text-xs text-orange-600 dark:text-orange-400">
                      {dayOpenShifts} open
                    </div>
                  )}

                  {/* Stats */}
                  <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {calculateScheduledHours(staffMembers, date).toFixed(1)}h
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Day View Component (Simplified)
// ============================================================================
function DayView({
  date,
  staffMembers,
  openShifts,
  filters,
  onAppointmentClick,
}: {
  date: string;
  staffMembers: StaffMember[];
  openShifts: ScheduleAppointment[];
  filters: typeof DEFAULT_FILTERS;
  onAppointmentClick: (id: number) => void;
}) {
  const dayOpenShifts = openShifts.filter(s => getDateFromDatetime(s.start_time) === date);

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
        {formatDate(date, 'long')}
      </h2>

      {/* Open Shifts */}
      {dayOpenShifts.length > 0 && (
        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center">
            <AlertTriangle className="w-4 h-4 mr-2 text-orange-500" />
            Open Shifts ({dayOpenShifts.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {dayOpenShifts.map((shift) => (
              <AppointmentCard key={shift.id} appointment={shift} onClick={onAppointmentClick} />
            ))}
          </div>
        </div>
      )}

      {/* Staff Schedule */}
      <div className="space-y-4">
        {staffMembers.map((member) => {
          const appointments = getAppointmentsForDate(member, date);
          const activities = getActivitiesForDate(member, date);
          const timeOff = hasTimeOffOnDate(member, date);
          const workingHours = member.working_hours?.[date];

          if (!workingHours && !timeOff && appointments.length === 0) {
            return null;
          }

          return (
            <div
              key={member.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
            >
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center text-violet-700 dark:text-violet-300 font-medium">
                  {member.initials}
                </div>
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">{member.name}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {workingHours ? `${formatTime(workingHours.start_time)} - ${formatTime(workingHours.end_time)}` : 'Not available'}
                  </div>
                </div>
                {timeOff && (
                  <span className="px-2 py-1 text-xs font-medium bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded">
                    {timeOff.type}
                  </span>
                )}
              </div>

              {appointments.length > 0 || activities.length > 0 ? (
                <div className="space-y-2">
                  {appointments.map((apt) => (
                    <AppointmentCard key={apt.id} appointment={apt} onClick={onAppointmentClick} />
                  ))}
                  {activities.map((act) => (
                    <ActivityCard key={act.id} activity={act} />
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  No scheduled appointments
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
