"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Download,
  Loader2,
  User,
  MapPin,
  Truck,
  Building,
} from "lucide-react";
import { useFacilitySchedule } from "@/hooks/useFacilities";
import { cn } from "@/lib/utils";
import { apiDownload } from "@/lib/api/client";
import {
  format,
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  eachDayOfInterval,
  isSameDay,
  parseISO,
} from "date-fns";

// Types
interface ScheduleAppointment {
  id: number;
  client_id: number;
  client_name: string;
  team_id?: number;
  team_name?: string;
  speciality_name: string;
  start_time: string;
  end_time: string;
  status: string;
  location_type: string;
  units_required?: number;
  nemt_occurrence_id?: number | null; // Transportation indicator
  title?: string;
}

interface DaySchedule {
  date: string;
  appointments: ScheduleAppointment[];
}

const statusColors: Record<
  string,
  { bg: string; text: string; border: string }
> = {
  scheduled: {
    bg: "bg-blue-50 dark:bg-blue-900/30",
    text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-200 dark:border-blue-700",
  },
  confirmed: {
    bg: "bg-green-50 dark:bg-green-900/30",
    text: "text-green-700 dark:text-green-300",
    border: "border-green-200 dark:border-green-700",
  },
  in_progress: {
    bg: "bg-yellow-50 dark:bg-yellow-900/30",
    text: "text-yellow-700 dark:text-yellow-300",
    border: "border-yellow-200 dark:border-yellow-700",
  },
  completed: {
    bg: "bg-violet-50 dark:bg-violet-900/30",
    text: "text-violet-700 dark:text-violet-300",
    border: "border-violet-200 dark:border-violet-700",
  },
  cancelled: {
    bg: "bg-red-50 dark:bg-red-900/30",
    text: "text-red-700 dark:text-red-300",
    border: "border-red-200 dark:border-red-700",
  },
  unassigned: {
    bg: "bg-orange-50 dark:bg-orange-900/30",
    text: "text-orange-700 dark:text-orange-300",
    border: "border-orange-200 dark:border-orange-700",
  },
};

// Appointment Card Component
function AppointmentCard({
  appointment,
}: {
  appointment: ScheduleAppointment;
}) {
  const colors = statusColors[appointment.status] || statusColors.scheduled;
  const hasTransportation = !!appointment.nemt_occurrence_id;

  return (
    <Link
      href={`/appointments/${appointment.id}`}
      className={cn(
        "block p-3 rounded-lg border mb-2 hover:shadow-md transition-all relative",
        colors.bg,
        colors.border,
        hasTransportation && "ring-2 ring-indigo-400 dark:ring-indigo-600"
      )}
    >
      {/* Transportation Badge */}
      {hasTransportation && (
        <div className="absolute -top-2 -right-2">
          <div className="flex items-center gap-1 px-2 py-1 bg-indigo-600 text-white rounded-full text-xs font-semibold shadow-lg">
            <Truck className="w-3 h-3" />
            <span>Transport</span>
          </div>
        </div>
      )}

      <div className="flex items-start justify-between gap-2 mb-1">
        <span className={cn("text-xs font-semibold", colors.text)}>
          {format(parseISO(appointment.start_time), "h:mm a")} -{" "}
          {format(parseISO(appointment.end_time), "h:mm a")}
        </span>
        <span
          className={cn(
            "text-xs px-2 py-0.5 rounded-full font-medium",
            colors.text,
            colors.bg
          )}
        >
          {appointment.status}
        </span>
      </div>
      <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
        {appointment.title || appointment.client_name}
      </p>
      <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
        <User className="w-3 h-3" />
        <span>{appointment.team_name || "Unassigned"}</span>
      </div>
      <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
        <span className="font-medium">{appointment.speciality_name}</span>
        {appointment.units_required && (
          <span>• {appointment.units_required} units</span>
        )}
      </div>
      {appointment.location_type && (
        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mt-1">
          <MapPin className="w-3 h-3" />
          <span className="capitalize">
            {appointment.location_type.replace("_", " ")}
          </span>
        </div>
      )}
    </Link>
  );
}

export default function FacilitySchedulePage() {
  const params = useParams();
  const facilityId = params?.id as string;

  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [isExporting, setIsExporting] = useState(false);
  const [exportType, setExportType] = useState<"schedule" | "transport" | null>(
    null
  );

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 }); // Sunday

  // Format dates ensuring we send local dates (not UTC)
  const startDateStr = format(weekStart, "yyyy-MM-dd");
  const endDateStr = format(weekEnd, "yyyy-MM-dd");

  const {
    data: scheduleData,
    isLoading,
    error,
  } = useFacilitySchedule(facilityId, startDateStr, endDateStr);

  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Get schedule for a specific day
  const getScheduleForDay = (day: Date): DaySchedule => {
    if (!scheduleData?.schedule) {
      return {
        date: format(day, "yyyy-MM-dd"),
        appointments: [],
      };
    }

    const dateKey = format(day, "yyyy-MM-dd");
    return (
      scheduleData.schedule[dateKey] || {
        date: dateKey,
        appointments: [],
      }
    );
  };

  // Calculate totals
  const weekTotals = useMemo(() => {
    if (!scheduleData?.schedule)
      return { appointments: 0, withTransportation: 0 };

    const totals = Object.values(scheduleData.schedule).reduce(
      (acc, day: DaySchedule) => {
        const withTransport = day.appointments.filter(
          (apt) => apt.nemt_occurrence_id
        ).length;
        return {
          appointments: acc.appointments + day.appointments.length,
          withTransportation: acc.withTransportation + withTransport,
        };
      },
      { appointments: 0, withTransportation: 0 }
    );

    return totals;
  }, [scheduleData]);

  // Export functions using API client with authentication
  const handleExportSchedule = async () => {
    try {
      setIsExporting(true);
      setExportType("schedule");

      // Use API client to download with proper auth headers
      await apiDownload(
        `/tenant-api/facilities/${facilityId}/schedule/export`,
        {
          start_date: startDateStr,
        }
      );
    } catch (error) {
      console.error("Export failed:", error);
      alert("Failed to export schedule. Please try again.");
    } finally {
      setIsExporting(false);
      setExportType(null);
    }
  };

  const handleExportTransportation = async () => {
    try {
      setIsExporting(true);
      setExportType("transport");

      // Use API client to download with proper auth headers
      await apiDownload(
        `/tenant-api/facilities/${facilityId}/schedule/export-transportation`,
        {
          start_date: startDateStr,
        }
      );
    } catch (error) {
      console.error("Export failed:", error);
      alert("Failed to export transportation schedule. Please try again.");
    } finally {
      setIsExporting(false);
      setExportType(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-red-500">
        Error loading schedule
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              href={`/facilities/${facilityId}`}
              className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <Building className="w-6 h-6 text-violet-600 dark:text-violet-400" />
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {scheduleData?.facility?.name || "Facility"} - Weekly Schedule
                </h1>
              </div>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {format(weekStart, "MMMM d")} -{" "}
                {format(weekEnd, "MMMM d, yyyy")}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {/* Export Buttons */}
            <button
              onClick={handleExportSchedule}
              disabled={isExporting}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg font-medium transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting && exportType === "schedule" ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Export Schedule
                </>
              )}
            </button>
            <button
              onClick={handleExportTransportation}
              disabled={isExporting}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting && exportType === "transport" ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Truck className="w-4 h-4" />
                  Export Transportation
                </>
              )}
            </button>
          </div>
        </div>

        {/* Week Navigation */}
        <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
            className="inline-flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous Week
          </button>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setCurrentWeek(new Date())}
              className="px-4 py-2 text-sm font-medium text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg transition-colors"
            >
              This Week
            </button>
            <input
              type="date"
              value={format(weekStart, "yyyy-MM-dd")}
              onChange={(e) => {
                // Parse the date in local timezone and set to the selected week
                const selectedDate = new Date(e.target.value + "T12:00:00");
                setCurrentWeek(selectedDate);
              }}
              className="px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-violet-500/20"
            />
          </div>

          <button
            onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
            className="inline-flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Next Week
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Week Summary */}
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="bg-violet-50 dark:bg-violet-900/20 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-violet-600 dark:text-violet-400" />
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Total Appointments
                </p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {weekTotals.appointments}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  With Transportation
                </p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {weekTotals.withTransportation}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Schedule Grid */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="grid grid-cols-7 divide-x divide-gray-200 dark:divide-gray-700">
          {days.map((day) => {
            const daySchedule = getScheduleForDay(day);
            const isToday = isSameDay(day, new Date());
            const totalItems = daySchedule.appointments.length;

            return (
              <div
                key={day.toISOString()}
                className="min-h-[600px] flex flex-col"
              >
                {/* Day Header */}
                <div
                  className={cn(
                    "p-4 text-center border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10",
                    isToday
                      ? "bg-violet-50 dark:bg-violet-900/20"
                      : "bg-gray-50 dark:bg-gray-900/50"
                  )}
                >
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {format(day, "EEE")}
                  </p>
                  <p
                    className={cn(
                      "text-2xl font-bold mt-1",
                      isToday
                        ? "text-violet-600 dark:text-violet-400"
                        : "text-gray-900 dark:text-white"
                    )}
                  >
                    {format(day, "d")}
                  </p>
                  {totalItems > 0 && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {totalItems} item{totalItems !== 1 ? "s" : ""}
                    </p>
                  )}
                </div>

                {/* Day Content */}
                <div className="p-3 overflow-y-auto flex-1">
                  {daySchedule.appointments.length === 0 ? (
                    <p className="text-xs text-center text-gray-400 dark:text-gray-500 py-8">
                      No appointments
                    </p>
                  ) : (
                    daySchedule.appointments.map((apt) => (
                      <AppointmentCard key={apt.id} appointment={apt} />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
          Legend
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(statusColors).map(([status, colors]) => (
            <div key={status} className="flex items-center gap-2">
              <div
                className={cn(
                  "w-4 h-4 rounded border",
                  colors.bg,
                  colors.border
                )}
              />
              <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                {status.replace("_", " ")}
              </span>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 px-2 py-1 bg-indigo-600 text-white rounded-full">
              <Truck className="w-3 h-3" />
            </div>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Has Transportation
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
