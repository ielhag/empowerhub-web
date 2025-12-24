"use client";

import React, { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  formatTimeNoMinutesIfZero,
} from "@/hooks/useScheduleBuilder";
import { AppointmentQuickView } from "@/components/features/appointments/AppointmentQuickView";
import { BackdatedAppointmentModal } from "@/components/features/appointments/BackdatedAppointmentModal";
import { EditWorkingHoursModal } from "@/components/features/schedule/EditWorkingHoursModal";
import { ActivityModal } from "@/components/features/schedule/ActivityModal";
import { CopyWeekModal } from "@/components/features/schedule/CopyWeekModal";
import { DraftAppointmentsPanel } from "@/components/features/schedule/DraftAppointmentsPanel";
import { CopyManagementModal } from "@/components/features/schedule/CopyManagementModal";
import { useDraftAppointments } from "@/hooks/useDraftAppointments";
import { cn } from "@/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
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
  Bus,
  Zap,
  Briefcase,
  Copy,
  FileEdit,
  History,
  Send,
  Search,
} from "lucide-react";
import { startOfWeek } from "date-fns";
import { useMutation } from "@tanstack/react-query";
import api from "@/lib/api/client";

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

// Helper to format date in local timezone
const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function ScheduleBuilderPage() {
  // State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<ScheduleView>("week");
  const [showFilters, setShowFilters] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<
    number | null
  >(null);
  const [showBackdatedModal, setShowBackdatedModal] = useState(false);
  const [backdatedDefaults, setBackdatedDefaults] = useState<{
    teamId?: number;
    date?: string;
  }>({});

  // Staff menu modals state
  const [selectedStaffForHours, setSelectedStaffForHours] =
    useState<StaffMember | null>(null);
  const [selectedStaffForActivity, setSelectedStaffForActivity] =
    useState<StaffMember | null>(null);
  const [showNewActivityModal, setShowNewActivityModal] = useState(false);
  const [showCopyWeekModal, setShowCopyWeekModal] = useState(false);
  const [showDraftsPanel, setShowDraftsPanel] = useState(false);
  const [showCopyManagement, setShowCopyManagement] = useState(false);

  // Sort options for staff
  type SortOption = "firstName" | "lastName" | "speciality" | "role";
  const [sortBy, setSortBy] = useState<SortOption>("firstName");

  // Match NEMT state
  const [matchResult, setMatchResult] = useState<{
    type: "success" | "info" | "error";
    message: string;
  } | null>(null);

  // Match NEMT mutation - matches appointments with transportation requests
  // Rules:
  // - Matches appointments with NEMT occurrences for the same client on the same date
  // - Appointment must be within 120 minutes (2 hours) before or after the pickup window
  // - Only matches scheduled, unassigned, in_progress, or late appointments
  const matchNemtMutation = useMutation({
    mutationFn: async ({
      startDate,
      endDate,
    }: {
      startDate: string;
      endDate: string;
    }) => {
      const response = await api.post<{
        success: boolean;
        message: string;
        matched_count: number;
        date_range: { start: string; end: string };
      }>("/tenant-api/appointments/match-nemt", {
        start_date: startDate,
        end_date: endDate,
      });
      return response.data;
    },
    onSuccess: (data) => {
      if (data.matched_count > 0) {
        setMatchResult({
          type: "success",
          message: `Matched ${data.matched_count} appointment${
            data.matched_count !== 1 ? "s" : ""
          } with transportation requests`,
        });
        refreshSchedule();
      } else {
        setMatchResult({
          type: "info",
          message:
            "No appointments found to match with transportation requests",
        });
      }
      // Auto-hide after 5 seconds
      setTimeout(() => setMatchResult(null), 5000);
    },
    onError: (error: Error) => {
      setMatchResult({
        type: "error",
        message: error.message || "Failed to match NEMT requests",
      });
      setTimeout(() => setMatchResult(null), 5000);
    },
  });

  // Calculate start date based on view
  const startDate = useMemo(() => {
    if (view === "month") {
      const d = new Date(currentDate);
      d.setDate(1);
      return formatLocalDate(d);
    }
    if (view === "day") {
      // Day view - use current day
      return formatLocalDate(currentDate);
    }
    // Week view - get Monday
    const d = new Date(currentDate);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    return formatLocalDate(d);
  }, [currentDate, view]);

  // Query filters
  const queryFilters: ScheduleFilters = useMemo(
    () => ({
      startDate,
      period: view,
    }),
    [startDate, view]
  );

  // Data fetching
  const { staffMembers, openShifts, specialities, isLoading, refreshSchedule } =
    useScheduleBuilder(queryFilters);
  const { data: weatherData } = useWeather(startDate);
  const { data: holidays } = useHolidays(currentDate.getFullYear());

  // Draft appointments - for showing draft count in header
  const weekStart = useMemo(
    () => startOfWeek(currentDate, { weekStartsOn: 0 }),
    [currentDate]
  );
  const { data: draftsData } = useDraftAppointments(weekStart);
  // The hook's select function transforms data to include drafts at top level
  const draftCount = Array.isArray(draftsData?.drafts)
    ? draftsData.drafts.length
    : 0;

  // Calculate dates for current view
  const viewDates = useMemo(() => {
    if (view === "month") {
      return getMonthDates(currentDate);
    }
    return getWeekDates(currentDate);
  }, [currentDate, view]);

  // Week dates for week view
  const weekDates = useMemo(() => getWeekDates(currentDate), [currentDate]);

  // Filter and sort staff members
  const filteredStaffMembers = useMemo(() => {
    let members = [...staffMembers];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      members = members.filter((m) => m.name.toLowerCase().includes(query));
    }

    // Scheduled only filter
    if (filters.scheduledOnly) {
      members = members.filter((m) => {
        return weekDates.some(
          (date) => getAppointmentsForDate(m, date).length > 0
        );
      });
    }

    // Sort members
    members.sort((a, b) => {
      switch (sortBy) {
        case "firstName": {
          const aFirst = a.name.split(" ")[0] || "";
          const bFirst = b.name.split(" ")[0] || "";
          return aFirst.localeCompare(bFirst);
        }
        case "lastName": {
          const aParts = a.name.split(" ");
          const bParts = b.name.split(" ");
          const aLast = aParts[aParts.length - 1] || "";
          const bLast = bParts[bParts.length - 1] || "";
          return aLast.localeCompare(bLast);
        }
        case "speciality": {
          const aSpec = a.specialities?.[0]?.short_name || "ZZZ";
          const bSpec = b.specialities?.[0]?.short_name || "ZZZ";
          return aSpec.localeCompare(bSpec);
        }
        case "role": {
          return (a.role || "").localeCompare(b.role || "");
        }
        default:
          return 0;
      }
    });

    return members;
  }, [staffMembers, searchQuery, filters.scheduledOnly, weekDates, sortBy]);

  // Navigation handlers
  const navigatePrevious = useCallback(() => {
    const d = new Date(currentDate);
    if (view === "week") d.setDate(d.getDate() - 7);
    else if (view === "month") d.setMonth(d.getMonth() - 1);
    else d.setDate(d.getDate() - 1);
    setCurrentDate(d);
  }, [currentDate, view]);

  const navigateNext = useCallback(() => {
    const d = new Date(currentDate);
    if (view === "week") d.setDate(d.getDate() + 7);
    else if (view === "month") d.setMonth(d.getMonth() + 1);
    else d.setDate(d.getDate() + 1);
    setCurrentDate(d);
  }, [currentDate, view]);

  const goToToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  const router = useRouter();

  // Handle add appointment click from day cell
  const handleAddClick = useCallback(
    (memberId: number, date: string, isPast: boolean) => {
      if (isPast) {
        // Open backdated modal with pre-filled data
        setBackdatedDefaults({ teamId: memberId, date });
        setShowBackdatedModal(true);
      } else {
        // Navigate to new appointment page with pre-filled data
        router.push(`/appointments/new?team_id=${memberId}&date=${date}`);
      }
    },
    [router]
  );

  // Get holiday for a date
  const getHolidayForDate = useCallback(
    (dateStr: string) => {
      return holidays?.find((h) => h.date === dateStr);
    },
    [holidays]
  );

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
              {(["day", "week", "month"] as ScheduleView[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={cn(
                    "px-3 py-1 text-sm font-medium rounded-md transition-colors capitalize",
                    view === v
                      ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm"
                      : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
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

              {/* Quick Navigation Shortcuts */}
              <div className="hidden md:flex items-center space-x-1 border-l border-gray-200 dark:border-gray-700 pl-2 ml-1">
                <button
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() + 7);
                    setCurrentDate(d);
                  }}
                  className="px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                >
                  Next Week
                </button>
                <button
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() + 14);
                    setCurrentDate(d);
                  }}
                  className="px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                >
                  +2 Weeks
                </button>
                <button
                  onClick={() => {
                    const d = new Date();
                    d.setMonth(d.getMonth() + 1);
                    setCurrentDate(d);
                  }}
                  className="px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                >
                  Next Month
                </button>
              </div>

              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[200px]">
                {view === "month"
                  ? getMonthDisplay(currentDate)
                  : getWeekRangeDisplay(currentDate)}
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

            {/* Sort By */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 border-0 rounded-md text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-violet-500"
            >
              <option value="firstName">Sort: First Name</option>
              <option value="lastName">Sort: Last Name</option>
              <option value="speciality">Sort: Speciality</option>
              <option value="role">Sort: Role</option>
            </select>

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
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowFilters(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 p-4 space-y-4">
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      Display Options
                    </h3>

                    <div className="space-y-3">
                      {[
                        { key: "showEvents", label: "Events" },
                        {
                          key: "scheduledOnly",
                          label: "Scheduled team members only",
                        },
                        { key: "shortNames", label: "Short names" },
                        { key: "availabilities", label: "Availabilities" },
                        { key: "timeOffs", label: "Time-offs" },
                      ].map(({ key, label }) => (
                        <label
                          key={key}
                          className="flex items-center space-x-3"
                        >
                          <input
                            type="checkbox"
                            checked={
                              filters[key as keyof typeof filters] as boolean
                            }
                            onChange={(e) =>
                              setFilters((prev) => ({
                                ...prev,
                                [key]: e.target.checked,
                              }))
                            }
                            className="h-4 w-4 text-violet-600 rounded border-gray-300 dark:border-gray-600"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {label}
                          </span>
                        </label>
                      ))}
                    </div>

                    <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                        Forecasts
                      </h4>
                      <div className="space-y-3">
                        {[
                          { key: "hoursForcast", label: "Hours" },
                          { key: "wageForcast", label: "Wages" },
                          { key: "peopleForcast", label: "People" },
                        ].map(({ key, label }) => (
                          <label
                            key={key}
                            className="flex items-center space-x-3"
                          >
                            <input
                              type="checkbox"
                              checked={
                                filters[key as keyof typeof filters] as boolean
                              }
                              onChange={(e) =>
                                setFilters((prev) => ({
                                  ...prev,
                                  [key]: e.target.checked,
                                }))
                              }
                              className="h-4 w-4 text-violet-600 rounded border-gray-300 dark:border-gray-600"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              {label}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                        Calendar Features
                      </h4>
                      <div className="space-y-3">
                        <label className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={filters.showWeather}
                            onChange={(e) =>
                              setFilters((prev) => ({
                                ...prev,
                                showWeather: e.target.checked,
                              }))
                            }
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
                            onChange={(e) =>
                              setFilters((prev) => ({
                                ...prev,
                                showHolidays: e.target.checked,
                              }))
                            }
                            className="h-4 w-4 text-violet-600 rounded border-gray-300 dark:border-gray-600"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300 flex items-center space-x-2">
                            <span>Holidays</span>
                            <span className="text-xs">🎉</span>
                          </span>
                        </label>
                      </div>
                    </div>

                    {/* Color Legend */}
                    {specialities.length > 0 && (
                      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                          Color Legend
                        </h4>
                        <div className="space-y-2">
                          {specialities.map((spec) => (
                            <div
                              key={spec.id}
                              className="flex items-center space-x-2"
                            >
                              <div
                                className="w-3 h-3 rounded-full flex-shrink-0"
                                style={{
                                  backgroundColor: spec.color || "#8b5cf6",
                                }}
                              />
                              <span className="text-xs text-gray-600 dark:text-gray-400">
                                {spec.short_name} - {spec.name}
                              </span>
                            </div>
                          ))}
                          <div className="flex items-center space-x-2 pt-1 border-t border-gray-100 dark:border-gray-700 mt-2">
                            <div className="w-3 h-3 rounded-full flex-shrink-0 bg-amber-500" />
                            <span className="text-xs text-gray-600 dark:text-gray-400">
                              Activities
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

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
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowTools(false)}
                  />
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
                        setShowNewActivityModal(true);
                        setShowTools(false);
                      }}
                      className="w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-3"
                    >
                      <Briefcase className="w-4 h-4" />
                      <span>New Activity</span>
                    </button>
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
                    <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                    <button
                      onClick={() => {
                        setShowCopyWeekModal(true);
                        setShowTools(false);
                      }}
                      className="w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-3"
                    >
                      <Copy className="w-4 h-4" />
                      <span>Copy Week</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowCopyManagement(true);
                        setShowTools(false);
                      }}
                      className="w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-3"
                    >
                      <History className="w-4 h-4" />
                      <span>Copy History</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowDraftsPanel(true);
                        setShowTools(false);
                      }}
                      className="w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-3"
                    >
                      <FileEdit className="w-4 h-4" />
                      <span>Draft Appointments</span>
                      {draftCount > 0 && (
                        <span className="ml-auto px-1.5 py-0.5 text-xs font-medium bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300 rounded-full">
                          {draftCount}
                        </span>
                      )}
                    </button>
                    <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                    <button
                      onClick={() => {
                        // Calculate date range based on current view
                        const endDate = new Date(currentDate);
                        if (view === "week") {
                          endDate.setDate(endDate.getDate() + 7);
                        } else if (view === "month") {
                          endDate.setMonth(endDate.getMonth() + 1);
                        } else {
                          endDate.setDate(endDate.getDate() + 1);
                        }
                        matchNemtMutation.mutate({
                          startDate: formatLocalDate(currentDate),
                          endDate: formatLocalDate(endDate),
                        });
                        setShowTools(false);
                      }}
                      disabled={matchNemtMutation.isPending}
                      className="w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-3 disabled:opacity-50"
                    >
                      {matchNemtMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Zap className="w-4 h-4" />
                      )}
                      <span>Match NEMT Requests</span>
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Drafts Button - shows when there are draft appointments */}
            {draftCount > 0 && (
              <button
                onClick={() => setShowDraftsPanel(true)}
                className="px-3 py-1.5 text-sm font-medium text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/30 hover:bg-amber-200 dark:hover:bg-amber-900/50 rounded-md transition-colors flex items-center space-x-1.5 border border-amber-200 dark:border-amber-800"
              >
                <FileEdit className="w-4 h-4" />
                <span>{draftCount} Drafts</span>
              </button>
            )}

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

      {/* Match NEMT Result Notification */}
      {matchResult && (
        <div
          className={cn(
            "mx-4 mt-2 p-3 rounded-lg flex items-center justify-between",
            matchResult.type === "success" &&
              "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800",
            matchResult.type === "info" &&
              "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800",
            matchResult.type === "error" &&
              "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800"
          )}
        >
          <div className="flex items-center gap-2">
            {matchResult.type === "success" && <Bus className="w-4 h-4" />}
            {matchResult.type === "info" && (
              <AlertTriangle className="w-4 h-4" />
            )}
            {matchResult.type === "error" && (
              <AlertTriangle className="w-4 h-4" />
            )}
            <span className="text-sm font-medium">{matchResult.message}</span>
          </div>
          <button
            onClick={() => setMatchResult(null)}
            className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded"
          >
            <span className="sr-only">Dismiss</span>×
          </button>
        </div>
      )}

      {/* Schedule Content */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
          </div>
        ) : view === "week" ? (
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
        ) : view === "month" ? (
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
            date={startDate}
            staffMembers={filteredStaffMembers}
            openShifts={openShifts}
            filters={filters}
            onAppointmentClick={setSelectedAppointmentId}
            onAddClick={handleAddClick}
            onEditWorkingHours={setSelectedStaffForHours}
            onAddActivity={setSelectedStaffForActivity}
          />
        )}
      </div>

      {/* Footer Stats */}
      {view === "week" && (
        <div className="flex-shrink-0 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6 text-sm">
              {filters.hoursForcast && (
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-600 dark:text-gray-400">
                    Total Hours:{" "}
                    {weekDates
                      .reduce(
                        (sum, date) =>
                          sum +
                          calculateScheduledHours(filteredStaffMembers, date),
                        0
                      )
                      .toFixed(1)}
                    h
                  </span>
                </div>
              )}
              {filters.wageForcast && (
                <div className="flex items-center space-x-2">
                  <DollarSign className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-600 dark:text-gray-400">
                    Est. Wages: $
                    {weekDates
                      .reduce(
                        (sum, date) =>
                          sum +
                          calculateEstimatedWages(filteredStaffMembers, date),
                        0
                      )
                      .toFixed(0)}
                  </span>
                </div>
              )}
              {filters.peopleForcast && (
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-600 dark:text-gray-400">
                    Avg People/Day:{" "}
                    {(
                      weekDates.reduce(
                        (sum, date) =>
                          sum +
                          countScheduledPeople(filteredStaffMembers, date),
                        0
                      ) / 7
                    ).toFixed(1)}
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

      {/* Activity Modal (from staff menu) */}
      {selectedStaffForActivity && (
        <ActivityModal
          isOpen={!!selectedStaffForActivity}
          onClose={() => setSelectedStaffForActivity(null)}
          teamId={selectedStaffForActivity.id}
          teamName={selectedStaffForActivity.name}
          onSuccess={() => refreshSchedule()}
        />
      )}

      {/* Activity Modal (from Tools menu - no preselected staff) */}
      <ActivityModal
        isOpen={showNewActivityModal}
        onClose={() => setShowNewActivityModal(false)}
        onSuccess={() => refreshSchedule()}
      />

      {/* Copy Week Modal */}
      <CopyWeekModal
        isOpen={showCopyWeekModal}
        onClose={() => setShowCopyWeekModal(false)}
        currentDate={currentDate}
        onSuccess={(batchId) => {
          refreshSchedule();
          // Auto-open drafts panel after copying
          setShowDraftsPanel(true);
        }}
      />

      {/* Draft Appointments Panel */}
      <DraftAppointmentsPanel
        isOpen={showDraftsPanel}
        onClose={() => setShowDraftsPanel(false)}
        currentDate={currentDate}
        onPublishSuccess={() => refreshSchedule()}
      />

      {/* Copy Management Modal */}
      <CopyManagementModal
        isOpen={showCopyManagement}
        onClose={() => setShowCopyManagement(false)}
        onRevertSuccess={() => refreshSchedule()}
      />
    </div>
  );
}

// ============================================================================
// Open Shifts Row Component (Expandable)
// ============================================================================
function OpenShiftsRow({
  openShifts,
  weekDates,
  onAppointmentClick,
}: {
  openShifts: ScheduleAppointment[];
  weekDates: string[];
  onAppointmentClick: (id: number) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const VISIBLE_COUNT = 2; // Show 2 shifts per day by default

  if (openShifts.length === 0) return null;

  // Check if any day has more shifts than visible count
  const hasMoreShifts = weekDates.some((date) => {
    const dateShifts = openShifts.filter(
      (s) => getDateFromDatetime(s.start_time) === date
    );
    return dateShifts.length > VISIBLE_COUNT;
  });

  return (
    <div className="border-b border-gray-200 dark:border-gray-700 bg-orange-50 dark:bg-orange-900/10">
      <div
        className="grid"
        style={{ gridTemplateColumns: "200px repeat(7, 1fr)" }}
      >
        <div className="p-3 bg-orange-100 dark:bg-orange-900/30 border-r border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-orange-200 dark:bg-orange-800 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-gray-900 dark:text-white text-sm">
                Open Shifts
              </div>
              <div className="text-xs text-orange-600 dark:text-orange-400">
                {openShifts.length} unassigned
              </div>
            </div>
          </div>
          {hasMoreShifts && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="mt-2 text-xs font-medium text-orange-700 dark:text-orange-300 hover:text-orange-800 dark:hover:text-orange-200 flex items-center gap-1"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="w-3 h-3" />
                  Show less
                </>
              ) : (
                <>
                  <ChevronDown className="w-3 h-3" />
                  Show all
                </>
              )}
            </button>
          )}
        </div>

        {weekDates.map((date) => {
          const dateShifts = openShifts.filter(
            (s) => getDateFromDatetime(s.start_time) === date
          );
          const visibleShifts = isExpanded
            ? dateShifts
            : dateShifts.slice(0, VISIBLE_COUNT);
          const hiddenCount = dateShifts.length - VISIBLE_COUNT;

          return (
            <div
              key={date}
              className="p-1 border-r border-gray-200 dark:border-gray-700 last:border-r-0 min-h-[80px]"
            >
              <div className="space-y-1">
                {visibleShifts.map((shift) => (
                  <AppointmentCard
                    key={shift.id}
                    appointment={shift}
                    compact
                    onClick={onAppointmentClick}
                  />
                ))}
                {!isExpanded && hiddenCount > 0 && (
                  <button
                    onClick={() => setIsExpanded(true)}
                    className="w-full text-xs text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 text-center py-1 rounded hover:bg-orange-100 dark:hover:bg-orange-900/30"
                  >
                    +{hiddenCount} more
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
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
  weatherData?: Record<
    string,
    { icon: string; temp: number; description: string }
  >;
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
        <div
          className="grid"
          style={{ gridTemplateColumns: "200px repeat(7, 1fr)" }}
        >
          {/* Empty corner cell */}
          <div className="p-2 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700" />

          {/* Day headers */}
          {weekDates.map((date) => {
            const dayDate = new Date(date + "T00:00:00");
            const holiday = getHolidayForDate(date);
            const weather = weatherData?.[date];
            const today = isToday(date);
            const past = isPastDate(date);

            return (
              <div
                key={date}
                className={cn(
                  "p-2 text-center border-r border-gray-200 dark:border-gray-700 last:border-r-0",
                  today && "bg-violet-50 dark:bg-violet-900/20",
                  past && "opacity-75"
                )}
              >
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  {dayDate.toLocaleDateString("en-US", { weekday: "short" })}
                </div>
                <div
                  className={cn(
                    "text-lg font-semibold",
                    today
                      ? "text-violet-600 dark:text-violet-400"
                      : "text-gray-900 dark:text-white"
                  )}
                >
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
                  <div
                    className="text-xs text-red-600 dark:text-red-400 truncate px-1"
                    title={holiday.name}
                  >
                    🎉 {holiday.name}
                  </div>
                )}

                {/* Daily Totals */}
                <div className="flex items-center justify-center space-x-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {filters.hoursForcast && (
                    <span>
                      {calculateScheduledHours(staffMembers, date).toFixed(1)}h
                    </span>
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
      <OpenShiftsRow
        openShifts={openShifts}
        weekDates={weekDates}
        onAppointmentClick={onAppointmentClick}
      />

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
  const hasConflicts = weekDates.some((date) => {
    const timeOff = hasTimeOffOnDate(member, date);
    const appointments = getAppointmentsForDate(member, date);
    return timeOff && appointments.length > 0;
  });

  // Calculate weekly hours and pay
  const weeklyHours = weekDates.reduce((total, date) => {
    return total + calculateScheduledHours([member], date);
  }, 0);
  const hourlyRate = member.hourly_rate || 20;
  const weeklyPay = weeklyHours * hourlyRate;

  return (
    <div className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
      <div
        className="grid"
        style={{ gridTemplateColumns: "200px repeat(7, 1fr)" }}
      >
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
                {filters.shortNames
                  ? formatStaffName(member.name)
                  : member.name}
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
                  •{" "}
                  {member.specialities
                    .map((s) => s.short_name || s.name)
                    .join(", ")}
                </span>
              )}
            </div>
            {/* Weekly hours and pay */}
            {filters.wageForcast && (
              <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                {weeklyHours.toFixed(1)} hrs • ${weeklyPay.toFixed(0)} ($
                {hourlyRate}/hr)
              </div>
            )}
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
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowMenu(false)}
                />
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
    ...appointments.map((a) => ({ ...a, type: "appointment" as const })),
    ...activities.map((a) => ({ ...a, type: "activity" as const })),
  ].sort((a, b) => a.start_time.localeCompare(b.start_time));

  const hasEvents = allEvents.length > 0;
  const canAddAppointment =
    !timeOff && (workingHours || !filters.availabilities);

  return (
    <div
      className={cn(
        "p-1 border-r border-gray-200 dark:border-gray-700 last:border-r-0 min-h-[100px] relative group",
        today && "bg-violet-50/50 dark:bg-violet-900/10",
        past && "opacity-75"
      )}
    >
      {/* Time Off Overlay */}
      {filters.timeOffs && timeOff && (
        <div className="absolute inset-0 bg-red-100 dark:bg-red-900/30 opacity-50 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-xs text-red-600 dark:text-red-400 font-medium">
            {timeOff.type}
          </div>
        </div>
      )}

      {/* Working Hours Background */}
      {filters.availabilities && workingHours && !timeOff && (
        <>
          <div className="absolute inset-0 bg-green-50 dark:bg-green-900/10 pointer-events-none opacity-30" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-xs font-medium text-green-500 dark:text-green-300/80 opacity-80 dark:opacity-80">
            {formatTimeNoMinutesIfZero(workingHours.start_time)} -{" "}
            {formatTimeNoMinutesIfZero(workingHours.end_time)}
          </div>
        </>
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
        {allEvents
          .slice(0, 4)
          .map((event) =>
            event.type === "appointment" ? (
              <AppointmentCard
                key={`apt-${event.id}`}
                appointment={event as ScheduleAppointment}
                compact
                onClick={onAppointmentClick}
              />
            ) : (
              <ActivityCard
                key={`act-${event.id}`}
                activity={event as ScheduleActivity}
              />
            )
          )}
        {allEvents.length > 4 && (
          <button className="w-full text-xs text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 text-center py-0.5">
            +{allEvents.length - 4} more
          </button>
        )}
      </div>

      {/* Add appointment hover layer - pointer-events-none so appointments remain clickable */}
      {canAddAppointment && (
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150 group-hover:border-2 group-hover:border-violet-300 dark:group-hover:border-violet-600 pointer-events-none z-20">
          {/* Add Button - positioned to not overlap with appointments */}
          <button
            onClick={() => onAddClick?.(member.id, date, past)}
            className={cn(
              "absolute left-1/2 -translate-x-1/2 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 pointer-events-auto cursor-pointer hover:scale-110 shadow-md",
              hasEvents
                ? "bottom-1" // At bottom when has events
                : "top-1/2 -translate-y-1/2", // Centered when empty
              past
                ? hasEvents
                  ? "bg-amber-600 dark:bg-amber-100 hover:bg-amber-500"
                  : "bg-amber-100 dark:bg-amber-200 hover:bg-amber-200"
                : hasEvents
                ? "bg-violet-600 dark:bg-violet-100 hover:bg-violet-500"
                : "bg-violet-100 dark:bg-violet-200 hover:bg-violet-200"
            )}
          >
            <Plus
              className={cn(
                "w-4 h-4",
                past
                  ? hasEvents
                    ? "text-amber-100 dark:text-amber-900"
                    : "text-amber-600 dark:text-amber-900"
                  : hasEvents
                  ? "text-violet-100 dark:text-violet-900"
                  : "text-violet-600 dark:text-violet-900"
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
  const animationClass =
    appointment.status === "in_progress"
      ? "animate-in-progress"
      : appointment.status === "no_show"
      ? "animate-no-show"
      : "";

  // Check if appointment has NEMT/transportation linked
  const hasNemt = !!appointment.nemt_occurrence_id;

  return (
    <button
      onClick={() => onClick?.(appointment.id)}
      className={cn(
        "block w-full text-left rounded-md border p-1.5 text-xs transition-all hover:shadow-md cursor-pointer",
        colors.bg,
        colors.border,
        animationClass
      )}
    >
      <div className="flex items-center justify-between mb-0.5">
        <div className="flex items-center gap-1">
          <span className={cn("font-medium", colors.text)}>
            {formatTimeFromDatetime(appointment.start_time)}
          </span>
          {hasNemt && (
            <span title="NEMT transportation linked">
              <Bus className="w-3 h-3 text-violet-600 dark:text-violet-400" />
            </span>
          )}
        </div>
        {appointment.speciality_short_name && (
          <span
            className={cn(
              "px-1 py-0.5 rounded text-[10px] font-medium",
              colors.bg,
              colors.text
            )}
          >
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
        "block rounded-md border p-1.5 text-xs",
        colors.bg,
        colors.border
      )}
    >
      <div className="flex items-center justify-between mb-0.5">
        <span className={cn("font-medium", colors.text)}>
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
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
          <div
            key={day}
            className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="space-y-1">
        {weeks.map((week, weekIdx) => (
          <div key={weekIdx} className="grid grid-cols-7 gap-1">
            {week.map((date) => {
              const dayDate = new Date(date + "T00:00:00");
              const isCurrentMonth = dayDate.getMonth() === currentMonth;
              const today = isToday(date);

              // Count appointments for this day
              const dayAppointmentCount = staffMembers.reduce(
                (sum, m) => sum + getAppointmentsForDate(m, date).length,
                0
              );
              const dayOpenShifts = openShifts.filter(
                (s) => getDateFromDatetime(s.start_time) === date
              ).length;

              return (
                <div
                  key={date}
                  className={cn(
                    "min-h-[100px] p-2 rounded-lg border",
                    isCurrentMonth
                      ? "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                      : "bg-gray-50 dark:bg-gray-900 border-gray-100 dark:border-gray-800 opacity-50",
                    today && "ring-2 ring-violet-500"
                  )}
                >
                  <div
                    className={cn(
                      "text-sm font-medium mb-1",
                      today
                        ? "text-violet-600 dark:text-violet-400"
                        : "text-gray-900 dark:text-white"
                    )}
                  >
                    {dayDate.getDate()}
                  </div>

                  {dayAppointmentCount > 0 && (
                    <div className="text-xs text-violet-600 dark:text-violet-400">
                      {dayAppointmentCount} apt
                      {dayAppointmentCount !== 1 ? "s" : ""}
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
// Day View Component (Horizontal time grid like Blade UI)
// ============================================================================
const DAY_TIME_SLOTS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]; // 8 AM to 8 PM

function DayView({
  date,
  staffMembers,
  openShifts,
  filters,
  onAppointmentClick,
  onAddClick,
  onEditWorkingHours,
  onAddActivity,
}: {
  date: string;
  staffMembers: StaffMember[];
  openShifts: ScheduleAppointment[];
  filters: typeof DEFAULT_FILTERS;
  onAppointmentClick: (id: number) => void;
  onAddClick?: (memberId: number, date: string, isPast: boolean) => void;
  onEditWorkingHours?: (member: StaffMember) => void;
  onAddActivity?: (member: StaffMember) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [staffMenuOpen, setStaffMenuOpen] = useState<number | null>(null);

  const dayOpenShifts = openShifts.filter(
    (s) => getDateFromDatetime(s.start_time) === date
  );

  const past = isPastDate(date);

  // Filter staff by search query
  const filteredStaff = staffMembers.filter((member) =>
    member.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Helper to get hour from datetime (parse directly to avoid timezone issues)
  const getHour = (datetime: string): number => {
    if (!datetime) return 0;
    // Handle both "YYYY-MM-DD HH:MM:SS" and "YYYY-MM-DDTHH:MM:SS" formats
    const timePart = datetime.includes("T")
      ? datetime.split("T")[1]
      : datetime.split(" ")[1];
    if (!timePart) return 0;
    return parseInt(timePart.split(":")[0], 10);
  };

  // Helper to get minutes from datetime (parse directly to avoid timezone issues)
  const getMinutes = (datetime: string): number => {
    if (!datetime) return 0;
    const timePart = datetime.includes("T")
      ? datetime.split("T")[1]
      : datetime.split(" ")[1];
    if (!timePart) return 0;
    return parseInt(timePart.split(":")[1], 10);
  };

  // Calculate horizontal position for an appointment (percentage from left)
  const getAppointmentPosition = (
    startTime: string,
    endTime: string | null
  ) => {
    const startHour = getHour(startTime);
    const startMin = getMinutes(startTime);
    const endHour = endTime ? getHour(endTime) : startHour + 1;
    const endMin = endTime ? getMinutes(endTime) : 0;

    const firstHour = DAY_TIME_SLOTS[0];
    const lastHour = DAY_TIME_SLOTS[DAY_TIME_SLOTS.length - 1] + 1; // +1 for end of last slot
    const totalHours = lastHour - firstHour;

    // Calculate start position (percentage)
    // If appointment starts before visible range, clamp to 0
    const startOffset = startHour - firstHour + startMin / 60;
    const leftPercent = Math.max(
      0,
      Math.min(100, (startOffset / totalHours) * 100)
    );

    // Calculate end position
    const endOffset = endHour - firstHour + endMin / 60;
    const endPercent = Math.max(
      0,
      Math.min(100, (endOffset / totalHours) * 100)
    );

    // Calculate width (percentage)
    // Width is the difference between end and start, clamped to visible range
    const widthPercent = Math.max(
      5,
      Math.min(endPercent - leftPercent, 100 - leftPercent)
    );

    return {
      left: `${leftPercent}%`,
      width: `${widthPercent}%`,
    };
  };

  // Get appointments and activities for a member on this day
  const getMemberEvents = (member: StaffMember) => {
    const appointments = getAppointmentsForDate(member, date);
    const activities = getActivitiesForDate(member, date);
    return { appointments, activities };
  };

  // Calculate hours for a member
  const calculateMemberHours = (member: StaffMember): number => {
    const { appointments, activities } = getMemberEvents(member);
    let totalMinutes = 0;

    appointments.forEach((apt) => {
      if (apt.start_time && apt.end_time) {
        const start = new Date(apt.start_time);
        const end = new Date(apt.end_time);
        totalMinutes += (end.getTime() - start.getTime()) / (1000 * 60);
      }
    });

    activities.forEach((act) => {
      if (act.start_time && act.end_time) {
        const start = new Date(act.start_time);
        const end = new Date(act.end_time);
        totalMinutes += (end.getTime() - start.getTime()) / (1000 * 60);
      }
    });

    return totalMinutes / 60;
  };

  // Format time for display (e.g., "9:00 AM-1:00 PM")
  // Handles full datetime strings like "2025-12-23 09:00:00"
  const formatTimeRange = (
    startTime: string,
    endTime: string | null
  ): string => {
    const extractTime = (datetime: string): string => {
      if (!datetime) return "";
      // Handle both "YYYY-MM-DD HH:MM:SS" and "YYYY-MM-DDTHH:MM:SS" formats
      const timePart = datetime.includes("T")
        ? datetime.split("T")[1]?.split(".")[0] // Remove milliseconds if present
        : datetime.split(" ")[1];
      if (!timePart) return formatTime(datetime); // Fallback if it's already just time
      return formatTime(timePart);
    };
    const start = extractTime(startTime);
    const end = endTime ? extractTime(endTime) : "TBD";
    return `${start}-${end}`;
  };

  return (
    <div className="flex flex-col h-full min-w-[1200px]">
      {/* Search header */}
      <div className="sticky top-0 z-30 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-end p-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="type name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 w-48"
            />
          </div>
        </div>
      </div>

      {/* Time Header Row */}
      <div className="sticky top-[52px] z-20 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex">
          {/* Staff column header */}
          <div className="w-56 flex-shrink-0 p-2 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
              Team members ({filteredStaff.length})
            </span>
          </div>

          {/* Time slot headers */}
          <div className="flex-1 flex">
            {DAY_TIME_SLOTS.map((hour) => (
              <div
                key={hour}
                className="flex-1 p-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 border-r border-gray-200 dark:border-gray-700 last:border-r-0"
              >
                {hour % 12 || 12}:00 {hour < 12 ? "AM" : "PM"}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-auto">
        {/* Open Shifts Row */}
        {dayOpenShifts.length > 0 && (
          <div className="flex border-b border-gray-200 dark:border-gray-700 bg-orange-50/50 dark:bg-orange-900/10">
            {/* Open shifts info */}
            <div className="w-56 flex-shrink-0 p-3 border-r border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                </div>
                <div>
                  <div className="font-medium text-gray-900 dark:text-white text-sm">
                    Open Shifts
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {dayOpenShifts.length} open
                  </div>
                </div>
              </div>
            </div>

            {/* Open shifts timeline */}
            <div className="flex-1 relative h-20">
              {/* Time slot grid lines */}
              <div className="absolute inset-0 flex">
                {DAY_TIME_SLOTS.map((hour) => (
                  <div
                    key={hour}
                    className="flex-1 border-r border-gray-200 dark:border-gray-700 last:border-r-0"
                  />
                ))}
              </div>

              {/* Open shift appointments */}
              {dayOpenShifts.map((shift, idx) => {
                const position = getAppointmentPosition(
                  shift.start_time,
                  shift.end_time
                );
                return (
                  <button
                    key={shift.id}
                    onClick={() => onAppointmentClick(shift.id)}
                    className="absolute h-7 px-2 rounded text-xs font-medium bg-violet-100 dark:bg-violet-900/60 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-700 hover:bg-violet-200 dark:hover:bg-violet-800 transition-colors overflow-hidden whitespace-nowrap z-10"
                    style={{
                      left: position.left,
                      width: position.width,
                      top: `${8 + idx * 28}px`,
                    }}
                    title={`${shift.client_name} - ${formatTimeRange(
                      shift.start_time,
                      shift.end_time
                    )}`}
                  >
                    {formatTimeRange(shift.start_time, shift.end_time)} (
                    {shift.speciality_short_name || "CE"})
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Staff Rows */}
        {filteredStaff.map((member) => {
          const { appointments, activities } = getMemberEvents(member);
          const workingHours = member.working_hours?.[date];
          const timeOff = hasTimeOffOnDate(member, date);
          const hours = calculateMemberHours(member);
          const hourlyRate = member.hourly_rate || 20;
          const pay = hours * hourlyRate;
          const hasNoWorkingHours = !workingHours && !timeOff;

          return (
            <div
              key={member.id}
              className={cn(
                "flex border-b border-gray-200 dark:border-gray-700",
                timeOff && "bg-red-50/30 dark:bg-red-900/10"
              )}
            >
              {/* Staff info column */}
              <div className="w-56 flex-shrink-0 p-3 border-r border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  {/* Avatar */}
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0"
                    style={{
                      backgroundColor: member.specialities?.[0]?.color
                        ? `${member.specialities[0].color}20`
                        : "#8b5cf620",
                      color: member.specialities?.[0]?.color || "#8b5cf6",
                    }}
                  >
                    {member.initials}
                  </div>

                  {/* Name and info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 dark:text-white text-sm truncate">
                      {filters.shortNames
                        ? `${member.name.split(" ")[0]} ${
                            member.name.split(" ").slice(-1)[0]?.charAt(0) || ""
                          }.`
                        : member.name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {hours.toFixed(2)} hrs
                    </div>
                    <div className="text-xs text-gray-400 dark:text-gray-500">
                      ${pay.toFixed(2)} (${hourlyRate}/hr)
                    </div>
                  </div>

                  {/* Menu button */}
                  <div className="relative">
                    <button
                      onClick={() =>
                        setStaffMenuOpen(
                          staffMenuOpen === member.id ? null : member.id
                        )
                      }
                      className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {staffMenuOpen === member.id && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setStaffMenuOpen(null)}
                        />
                        <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 py-1">
                          <button
                            onClick={() => {
                              onEditWorkingHours?.(member);
                              setStaffMenuOpen(null);
                            }}
                            className="w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            Edit Working Hours
                          </button>
                          <button
                            onClick={() => {
                              onAddActivity?.(member);
                              setStaffMenuOpen(null);
                            }}
                            className="w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            Add Activity
                          </button>
                          {!past && (
                            <button
                              onClick={() => {
                                onAddClick?.(member.id, date, past);
                                setStaffMenuOpen(null);
                              }}
                              className="w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                              Add Backdated Appointment
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Timeline area */}
              <div className="flex-1 relative h-20 overflow-visible">
                {/* Time slot grid lines */}
                <div className="absolute inset-0 flex">
                  {DAY_TIME_SLOTS.map((hour) => (
                    <div
                      key={hour}
                      className="flex-1 border-r border-gray-200 dark:border-gray-700 last:border-r-0"
                    />
                  ))}
                </div>

                {/* Unavailable overlay - only show if no appointments/activities */}
                {hasNoWorkingHours &&
                  appointments.length === 0 &&
                  activities.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                      {DAY_TIME_SLOTS.map((hour) => (
                        <div
                          key={hour}
                          className="flex-1 h-full flex items-center justify-center border-r border-gray-200 dark:border-gray-700 last:border-r-0"
                        >
                          <span className="text-xs text-gray-400 dark:text-gray-500">
                            Unavailable
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                {/* Time off indicator */}
                {timeOff && (
                  <div className="absolute inset-0 flex items-center justify-center bg-red-100/50 dark:bg-red-900/20 pointer-events-none z-0">
                    <span className="text-xs font-medium text-red-600 dark:text-red-400">
                      {timeOff.type}
                    </span>
                  </div>
                )}

                {/* Working hours background */}
                {workingHours && !timeOff && (
                  <div
                    className="absolute inset-y-0 bg-green-50/50 dark:bg-green-900/10 pointer-events-none z-0"
                    style={{
                      ...(() => {
                        const startHour = parseInt(
                          workingHours.start_time.split(":")[0]
                        );
                        const endHour = parseInt(
                          workingHours.end_time.split(":")[0]
                        );
                        const firstHour = DAY_TIME_SLOTS[0];
                        const totalHours = DAY_TIME_SLOTS.length;
                        const left = Math.max(
                          0,
                          ((startHour - firstHour) / totalHours) * 100
                        );
                        const width = Math.min(
                          ((endHour - startHour) / totalHours) * 100,
                          100 - left
                        );
                        return { left: `${left}%`, width: `${width}%` };
                      })(),
                    }}
                  />
                )}

                {/* Appointments */}
                {appointments.map((apt, idx) => {
                  const position = getAppointmentPosition(
                    apt.start_time,
                    apt.end_time
                  );

                  // Use color classes when available (has speciality_id)
                  const colorClasses = getAppointmentColorClasses(apt);
                  const hasColorClasses = !!apt.speciality_id;

                  // For custom hex colors, use inline styles with better dark mode visibility
                  const customBgColor =
                    !hasColorClasses &&
                    (apt.speciality_color ||
                      member.specialities?.[0]?.color ||
                      "#8b5cf6");

                  return (
                    <button
                      key={apt.id}
                      onClick={() => onAppointmentClick(apt.id)}
                      className={cn(
                        "absolute h-10 px-2 rounded text-xs font-medium border overflow-hidden whitespace-nowrap z-20 hover:opacity-90 transition-opacity flex items-center",
                        hasColorClasses && colorClasses.bg,
                        hasColorClasses && colorClasses.border,
                        hasColorClasses && colorClasses.text
                      )}
                      data-appt-custom-color={
                        !hasColorClasses && customBgColor ? "" : undefined
                      }
                      style={
                        {
                          left: position.left,
                          width: position.width,
                          top: `${4 + (idx % 2) * 28}px`,
                          ...(!hasColorClasses &&
                            customBgColor && {
                              // CSS custom property for dark mode
                              "--appt-color": customBgColor,
                              // Light mode: lighter background
                              backgroundColor: `${customBgColor}33`,
                              borderColor: customBgColor,
                              color: customBgColor,
                            }),
                        } as React.CSSProperties & { "--appt-color"?: string }
                      }
                      title={`${apt.client_name} - ${formatTimeRange(
                        apt.start_time,
                        apt.end_time
                      )}`}
                    >
                      <span
                        className={cn(
                          "truncate",
                          !hasColorClasses && "dark:text-white/95"
                        )}
                      >
                        {formatTimeRange(apt.start_time, apt.end_time)}{" "}
                        {apt.speciality_short_name || "CE"} for{" "}
                        {apt.client_name?.split(" ")[0] || "Client"}...
                      </span>
                    </button>
                  );
                })}

                {/* Activities */}
                {activities.map((act, idx) => {
                  const position = getAppointmentPosition(
                    act.start_time,
                    act.end_time
                  );

                  return (
                    <div
                      key={act.id}
                      className="absolute h-10 px-2 rounded text-xs font-medium bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700 overflow-hidden whitespace-nowrap z-20 flex items-center"
                      style={{
                        left: position.left,
                        width: position.width,
                        top: `${4 + ((appointments.length + idx) % 2) * 28}px`,
                      }}
                      title={`${act.title} - ${formatTimeRange(
                        act.start_time,
                        act.end_time
                      )}`}
                    >
                      <span className="truncate">{act.title}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Empty state */}
        {filteredStaff.length === 0 && (
          <div className="flex items-center justify-center py-12 text-gray-500 dark:text-gray-400">
            {searchQuery
              ? `No team members found matching "${searchQuery}"`
              : "No team members available"}
          </div>
        )}
      </div>
    </div>
  );
}
