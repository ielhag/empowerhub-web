import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useCallback, useMemo } from "react";
import api from "@/lib/api/client";
import { useAuthStore } from "@/stores/auth";

// ============================================================================
// Types
// ============================================================================

export type ScheduleView = "day" | "week" | "month";

export interface ScheduleFilters {
  startDate: string;
  period: ScheduleView;
}

export interface WorkingHours {
  start_time: string;
  end_time: string;
}

export interface TimeOffRequest {
  id: number;
  type: string;
  reason: string | null;
  start_date: string;
  end_date: string;
  start_date_only: string;
  end_date_only: string;
  status: string;
}

export interface Speciality {
  id: number;
  name: string;
  short_name: string;
  color: string;
}

export interface ScheduleAppointment {
  id: number;
  title: string;
  client_id: number;
  client_name: string;
  team_id: number | null;
  start_time: string;
  end_time: string | null;
  status: string;
  speciality_id: number | null;
  speciality_name: string | null;
  speciality_short_name: string | null;
  speciality_color: string | null;
  location_type: string;
  units_required: number;
  notes: string | null;
  has_cover_request: boolean;
  nemt_occurrence_id: number | null;
  is_published: boolean;
}

export interface ScheduleActivity {
  id: number;
  title: string;
  type: string;
  team_id: number;
  start_time: string;
  end_time: string;
  notes: string | null;
  is_activity: true;
}

export interface StaffMember {
  id: number;
  name: string;
  email: string | null;
  avatar: string | null;
  initials: string;
  role: string;
  hourly_rate: number | null;
  specialities: Speciality[];
  working_hours: Record<string, WorkingHours>;
  time_off_requests: TimeOffRequest[];
  appointments: ScheduleAppointment[];
  activities: ScheduleActivity[];
}

export interface WeatherData {
  icon: string;
  temp: number;
  minTemp: number;
  description: string;
  code: number;
}

export interface Holiday {
  date: string;
  name: string;
  localName: string;
}

// ============================================================================
// Query Keys
// ============================================================================

export const scheduleBuilderKeys = {
  all: ["schedule-builder"] as const,
  staff: (filters: ScheduleFilters) =>
    [...scheduleBuilderKeys.all, "staff", filters] as const,
  openShifts: (filters: ScheduleFilters) =>
    [...scheduleBuilderKeys.all, "open-shifts", filters] as const,
  activities: (filters: ScheduleFilters) =>
    [...scheduleBuilderKeys.all, "activities", filters] as const,
  specialities: () => [...scheduleBuilderKeys.all, "specialities"] as const,
  weather: (startDate: string) =>
    [...scheduleBuilderKeys.all, "weather", startDate] as const,
  holidays: (year: number) =>
    [...scheduleBuilderKeys.all, "holidays", year] as const,
};

// ============================================================================
// API Response Types
// ============================================================================

interface StaffScheduleResponse {
  success: boolean;
  data: StaffMember[];
}

interface OpenShiftsResponse {
  success: boolean;
  data: ScheduleAppointment[];
}

interface ActivitiesResponse {
  success: boolean;
  data: ScheduleActivity[];
}

interface SpecialitiesResponse {
  success: boolean;
  data: Speciality[];
}

// ============================================================================
// API Functions
// ============================================================================

async function fetchStaffSchedule(
  filters: ScheduleFilters
): Promise<StaffMember[]> {
  const params = new URLSearchParams({
    start_date: filters.startDate,
    period: filters.period,
  });

  const response = await api.get<StaffScheduleResponse>(
    `/tenant-api/schedule/staff?${params}`
  );
  return response.data.data;
}

async function fetchOpenShifts(
  filters: ScheduleFilters
): Promise<ScheduleAppointment[]> {
  const params = new URLSearchParams({
    start_date: filters.startDate,
    period: filters.period,
  });

  const response = await api.get<OpenShiftsResponse>(
    `/tenant-api/schedule/open-shifts?${params}`
  );
  return response.data.data;
}

async function fetchActivities(
  filters: ScheduleFilters
): Promise<ScheduleActivity[]> {
  const params = new URLSearchParams({
    start_date: filters.startDate,
    period: filters.period,
  });

  const response = await api.get<ActivitiesResponse>(
    `/tenant-api/schedule/activities?${params}`
  );
  return response.data.data;
}

async function fetchSpecialities(): Promise<Speciality[]> {
  const response = await api.get<SpecialitiesResponse>(
    `/tenant-api/schedule/specialities`
  );
  return response.data.data;
}

async function fetchWeatherData(
  lat: number,
  lon: number
): Promise<Record<string, WeatherData>> {
  try {
    // Use local API route to avoid CORS issues
    const url = `/api/weather?lat=${lat}&lon=${lon}`;

    const response = await fetch(url);

    if (!response.ok) {
      console.error('Weather API error:', response.status, response.statusText);
      return {};
    }

    const data = await response.json();

    if (!data.daily?.time) {
      console.error('Weather API returned unexpected data structure:', data);
      return {};
    }

  const weatherIcons: Record<number, string> = {
    0: "☀️",
    1: "🌤️",
    2: "⛅",
    3: "☁️",
    45: "🌫️",
    48: "🌫️",
    51: "🌦️",
    53: "🌧️",
    55: "🌧️",
    61: "🌧️",
    63: "🌧️",
    65: "🌧️",
    71: "🌨️",
    73: "🌨️",
    75: "🌨️",
    77: "🌨️",
    80: "🌦️",
    81: "🌧️",
    82: "⛈️",
    85: "🌨️",
    86: "🌨️",
    95: "⛈️",
    96: "⛈️",
    99: "⛈️",
  };

  const weatherDescriptions: Record<number, string> = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Foggy",
    48: "Foggy",
    51: "Light drizzle",
    53: "Drizzle",
    55: "Heavy drizzle",
    61: "Light rain",
    63: "Rain",
    65: "Heavy rain",
    71: "Light snow",
    73: "Snow",
    75: "Heavy snow",
    77: "Snow grains",
    80: "Light showers",
    81: "Rain showers",
    82: "Heavy showers",
    85: "Light snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm with hail",
    99: "Severe thunderstorm",
  };

  const weatherData: Record<string, WeatherData> = {};
  data.daily.time.forEach((date: string, index: number) => {
    const weatherCode = data.daily.weathercode[index];
    weatherData[date] = {
      icon: weatherIcons[weatherCode] || "🌡️",
      temp: Math.round(data.daily.temperature_2m_max[index]),
      minTemp: Math.round(data.daily.temperature_2m_min[index]),
      description: weatherDescriptions[weatherCode] || "Unknown",
      code: weatherCode,
    };
  });

  return weatherData;
  } catch (error) {
    console.error('Error fetching weather data:', error);
    return {};
  }
}

async function fetchHolidays(year: number): Promise<Holiday[]> {
  try {
    // Use local API route to avoid CORS issues
    const url = `/api/holidays?year=${year}`;
    const response = await fetch(url);

    if (!response.ok) {
      console.error('Holidays API error:', response.status, response.statusText);
      return [];
    }

    const data = await response.json();

    if (data.error) {
      console.error('Holidays API returned error:', data.error);
      return [];
    }

    return data.map((holiday: { date: string; name: string; localName: string }) => ({
      date: holiday.date,
      name: holiday.name,
      localName: holiday.localName,
    }));
  } catch (error) {
    console.error('Error fetching holidays:', error);
    return [];
  }
}

// ============================================================================
// Hooks
// ============================================================================

export function useStaffSchedule(filters: ScheduleFilters) {
  return useQuery({
    queryKey: scheduleBuilderKeys.staff(filters),
    queryFn: () => fetchStaffSchedule(filters),
    staleTime: 30 * 1000,
  });
}

export function useOpenShifts(filters: ScheduleFilters) {
  return useQuery({
    queryKey: scheduleBuilderKeys.openShifts(filters),
    queryFn: () => fetchOpenShifts(filters),
    staleTime: 30 * 1000,
  });
}

export function useActivities(filters: ScheduleFilters) {
  return useQuery({
    queryKey: scheduleBuilderKeys.activities(filters),
    queryFn: () => fetchActivities(filters),
    staleTime: 30 * 1000,
  });
}

export function useSpecialities() {
  return useQuery({
    queryKey: scheduleBuilderKeys.specialities(),
    queryFn: fetchSpecialities,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useWeather(startDate: string, lat = 47.6062, lon = -122.3321) {
  return useQuery({
    queryKey: scheduleBuilderKeys.weather(startDate),
    queryFn: () => fetchWeatherData(lat, lon),
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}

export function useHolidays(year: number) {
  return useQuery({
    queryKey: scheduleBuilderKeys.holidays(year),
    queryFn: () => fetchHolidays(year),
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
  });
}

/**
 * Service delivery speciality short names that indicate a staff member
 * should appear in the schedule builder (not purely administrative staff)
 */
const SERVICE_DELIVERY_SPECIALITIES = ['CE', 'SH', 'RC', 'SFC'];

/**
 * Speciality hierarchy - higher skilled staff can see lower level specialities
 * SH (Specialized Habilitation) staff can also see SFC, CE appointments
 * CE (Community Engagement) staff can only see CE appointments
 */
const SPECIALITY_HIERARCHY: Record<string, string[]> = {
  'SH': ['SH', 'SFC', 'CE', 'RC'], // SH staff can see all
  'RC': ['RC', 'SFC', 'CE'],       // RC staff can see RC, SFC, CE
  'SFC': ['SFC', 'CE'],            // SFC staff can see SFC and CE
  'CE': ['CE'],                     // CE staff can only see CE
};

/**
 * Get all specialities a user can see based on their highest speciality
 */
function getVisibleSpecialities(userSpecialities: { short_name?: string }[]): string[] {
  if (!userSpecialities || userSpecialities.length === 0) return [];

  // Get the highest level speciality the user has
  const userShortNames = userSpecialities.map(s => s.short_name?.toUpperCase()).filter(Boolean) as string[];

  // Check from highest to lowest
  const hierarchyOrder = ['SH', 'RC', 'SFC', 'CE'];
  for (const spec of hierarchyOrder) {
    if (userShortNames.includes(spec)) {
      return SPECIALITY_HIERARCHY[spec] || [spec];
    }
  }

  // If no recognized speciality, return what they have
  return userShortNames;
}

/**
 * Check if a staff member has service delivery specialities
 * Staff with only administrative roles should not appear in schedule builder
 */
function hasServiceDeliverySpecialities(member: StaffMember): boolean {
  if (!member.specialities || member.specialities.length === 0) {
    // If no specialities, still show them (legacy data or not yet assigned)
    return true;
  }

  // Check if they have any service delivery specialities
  return member.specialities.some((spec) =>
    SERVICE_DELIVERY_SPECIALITIES.includes(spec.short_name?.toUpperCase())
  );
}

/**
 * Combined hook for schedule builder with real-time updates
 */
export function useScheduleBuilder(filters: ScheduleFilters) {
  const queryClient = useQueryClient();

  // Get user info to check role and specialities
  const { user, isStaff } = useAuthStore();
  const isStaffUser = isStaff();
  const userTeamId = user?.team?.id;
  const userSpecialities = user?.team?.specialities || [];

  const staffQuery = useStaffSchedule(filters);
  const openShiftsQuery = useOpenShifts(filters);
  const specialitiesQuery = useSpecialities();

  // Filter out administrative staff who don't have service delivery specialities
  // For staff users, only show themselves
  const filteredStaffMembers = useMemo(() => {
    if (!staffQuery.data) return [];

    let members = staffQuery.data.filter(hasServiceDeliverySpecialities);

    // If user is staff, only show their own row
    if (isStaffUser && userTeamId) {
      members = members.filter(m => m.id === userTeamId);
    }

    return members;
  }, [staffQuery.data, isStaffUser, userTeamId]);

  // Filter open shifts based on user's specialities
  const filteredOpenShifts = useMemo(() => {
    if (!openShiftsQuery.data) return [];

    // Admins see all open shifts
    if (!isStaffUser) return openShiftsQuery.data;

    // Staff only see open shifts matching their visible specialities
    const visibleSpecs = getVisibleSpecialities(userSpecialities);
    if (visibleSpecs.length === 0) return [];

    return openShiftsQuery.data.filter(shift => {
      const shiftSpec = shift.speciality_short_name?.toUpperCase();
      return shiftSpec && visibleSpecs.includes(shiftSpec);
    });
  }, [openShiftsQuery.data, isStaffUser, userSpecialities]);

  // Invalidate all schedule data
  const refreshSchedule = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: scheduleBuilderKeys.all });
  }, [queryClient]);

  // Real-time updates via Pusher (if available)
  useEffect(() => {
    // Check if Pusher is available
    if (typeof window !== "undefined" && (window as unknown as { Echo?: unknown }).Echo) {
      const Echo = (window as unknown as { Echo: {
        private: (channel: string) => {
          listen: (event: string, callback: () => void) => void;
        };
        leave: (channel: string) => void;
      } }).Echo;

      const channel = Echo.private("appointments");

      channel.listen("AppointmentCreated", () => refreshSchedule());
      channel.listen("AppointmentUpdated", () => refreshSchedule());
      channel.listen("AppointmentDeleted", () => refreshSchedule());
      channel.listen("AppointmentStatusChanged", () => refreshSchedule());

      return () => {
        Echo.leave("appointments");
      };
    }
  }, [refreshSchedule]);

  return {
    staffMembers: filteredStaffMembers,
    openShifts: filteredOpenShifts,
    specialities: specialitiesQuery.data ?? [],
    isLoading:
      staffQuery.isLoading ||
      openShiftsQuery.isLoading ||
      specialitiesQuery.isLoading,
    isError:
      staffQuery.isError || openShiftsQuery.isError || specialitiesQuery.isError,
    error: staffQuery.error || openShiftsQuery.error || specialitiesQuery.error,
    refreshSchedule,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format date to YYYY-MM-DD in local timezone
 */
function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Get week dates from a start date (Monday-based)
 */
export function getWeekDates(startDate: Date): string[] {
  const dates: string[] = [];
  const start = new Date(startDate);

  // Get Monday of the week
  const day = start.getDay();
  const diff = start.getDate() - day + (day === 0 ? -6 : 1);
  start.setDate(diff);

  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    // Use local timezone format instead of UTC
    dates.push(formatLocalDate(d));
  }

  return dates;
}

/**
 * Get month dates including padding days (Monday-based weeks)
 */
export function getMonthDates(date: Date): string[] {
  const dates: string[] = [];
  const year = date.getFullYear();
  const month = date.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // Start from Monday of the week containing first of month
  const startDate = new Date(firstDay);
  const startDay = startDate.getDay();
  // Adjust to Monday: if Sunday (0), go back 6 days; otherwise go back (day - 1) days
  const daysToMonday = startDay === 0 ? 6 : startDay - 1;
  startDate.setDate(startDate.getDate() - daysToMonday);

  // End on Sunday of the week containing last of month
  const endDate = new Date(lastDay);
  const endDay = endDate.getDay();
  // Adjust to Sunday: if not Sunday, add days to reach Sunday
  const daysToSunday = endDay === 0 ? 0 : 7 - endDay;
  endDate.setDate(endDate.getDate() + daysToSunday);

  const current = new Date(startDate);
  while (current <= endDate) {
    dates.push(formatLocalDate(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

/**
 * Format time from "HH:mm" to "h:mm A"
 */
export function formatTime(time: string): string {
  if (!time) return "";
  const [hours, minutes] = time.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;
  return `${hour12}:${minutes.toString().padStart(2, "0")} ${period}`;
}

/**
 * Format datetime from "YYYY-MM-DD HH:mm" to "h:mm A"
 */
export function formatTimeFromDatetime(datetime: string): string {
  if (!datetime) return "";
  const timePart = datetime.split(" ")[1];
  return formatTime(timePart);
}

/**
 * Get date from datetime string
 */
export function getDateFromDatetime(datetime: string): string {
  if (!datetime) return "";
  return datetime.split(" ")[0];
}

/**
 * Get appointment color classes based on speciality or status
 */
export function getAppointmentColorClasses(
  appointment: ScheduleAppointment
): { bg: string; border: string; text: string } {
  // Color by speciality
  const colorMap: Record<number, { bg: string; border: string; text: string }> = {
    1: {
      // Community Engagement
      bg: "bg-violet-100 dark:bg-violet-900/50",
      border: "border-violet-300 dark:border-violet-700",
      text: "text-violet-800 dark:text-violet-200",
    },
    3: {
      // Specialized Habilitation
      bg: "bg-green-100 dark:bg-green-900/50",
      border: "border-green-300 dark:border-green-700",
      text: "text-green-800 dark:text-green-200",
    },
    4: {
      // Staff & Family Consulting
      bg: "bg-red-100 dark:bg-red-900/50",
      border: "border-red-300 dark:border-red-700",
      text: "text-red-800 dark:text-red-200",
    },
    6: {
      // Respite Care
      bg: "bg-blue-100 dark:bg-blue-900/50",
      border: "border-blue-300 dark:border-blue-700",
      text: "text-blue-800 dark:text-blue-200",
    },
  };

  if (appointment.speciality_id && colorMap[appointment.speciality_id]) {
    return colorMap[appointment.speciality_id];
  }

  // Default indigo
  return {
    bg: "bg-indigo-100 dark:bg-indigo-900/50",
    border: "border-indigo-300 dark:border-indigo-700",
    text: "text-indigo-800 dark:text-indigo-200",
  };
}

/**
 * Get status color classes
 */
export function getStatusColorClasses(status: string): {
  bg: string;
  text: string;
  border: string;
  pulse?: boolean;
} {
  const statusMap: Record<
    string,
    { bg: string; text: string; border: string; pulse?: boolean }
  > = {
    scheduled: {
      bg: "bg-blue-100 dark:bg-blue-900/50",
      text: "text-blue-800 dark:text-blue-200",
      border: "border-blue-300 dark:border-blue-700",
    },
    in_progress: {
      bg: "bg-cyan-100 dark:bg-cyan-900/50",
      text: "text-cyan-800 dark:text-cyan-200",
      border: "border-cyan-300 dark:border-cyan-700",
      pulse: true,
    },
    completed: {
      bg: "bg-green-100 dark:bg-green-900/50",
      text: "text-green-800 dark:text-green-200",
      border: "border-green-300 dark:border-green-700",
    },
    cancelled: {
      bg: "bg-gray-100 dark:bg-gray-700",
      text: "text-gray-600 dark:text-gray-300",
      border: "border-gray-300 dark:border-gray-600",
    },
    unassigned: {
      bg: "bg-orange-100 dark:bg-orange-900/50",
      text: "text-orange-800 dark:text-orange-200",
      border: "border-orange-300 dark:border-orange-700",
    },
    no_show: {
      bg: "bg-red-100 dark:bg-red-900/50",
      text: "text-red-800 dark:text-red-200",
      border: "border-red-300 dark:border-red-700",
    },
  };

  return (
    statusMap[status] || {
      bg: "bg-gray-100 dark:bg-gray-700",
      text: "text-gray-600 dark:text-gray-300",
      border: "border-gray-300 dark:border-gray-600",
    }
  );
}

/**
 * Get activity color classes
 */
export function getActivityColorClasses(): {
  bg: string;
  border: string;
  text: string;
} {
  return {
    bg: "bg-amber-100 dark:bg-amber-900/50",
    border: "border-amber-300 dark:border-amber-700",
    text: "text-amber-800 dark:text-amber-200",
  };
}

/**
 * Check if staff member has time off on a specific date
 */
export function hasTimeOffOnDate(
  member: StaffMember,
  dateStr: string
): TimeOffRequest | null {
  if (!member.time_off_requests) return null;

  return (
    member.time_off_requests.find((request) => {
      const reqStart = new Date(request.start_date_only);
      const reqEnd = new Date(request.end_date_only);
      const checkDate = new Date(dateStr);

      return checkDate >= reqStart && checkDate <= reqEnd;
    }) || null
  );
}

/**
 * Check if staff member is available on a specific date
 */
export function isAvailableOnDate(member: StaffMember, dateStr: string): boolean {
  // Check working hours
  const hasWorkingHours = member.working_hours && member.working_hours[dateStr];

  // Check time off
  const hasTimeOff = hasTimeOffOnDate(member, dateStr);

  return !!hasWorkingHours && !hasTimeOff;
}

/**
 * Get appointments for a specific date from staff member
 */
export function getAppointmentsForDate(
  member: StaffMember,
  dateStr: string
): ScheduleAppointment[] {
  if (!member.appointments) return [];

  return member.appointments.filter((apt) => {
    const aptDate = getDateFromDatetime(apt.start_time);
    return aptDate === dateStr;
  });
}

/**
 * Get activities for a specific date from staff member
 */
export function getActivitiesForDate(
  member: StaffMember,
  dateStr: string
): ScheduleActivity[] {
  if (!member.activities) return [];

  return member.activities.filter((act) => {
    const actDate = getDateFromDatetime(act.start_time);
    return actDate === dateStr;
  });
}

/**
 * Calculate scheduled hours for a date
 */
export function calculateScheduledHours(
  staffMembers: StaffMember[],
  dateStr: string
): number {
  let totalMinutes = 0;

  staffMembers.forEach((member) => {
    const appointments = getAppointmentsForDate(member, dateStr);
    appointments.forEach((apt) => {
      if (apt.units_required) {
        totalMinutes += apt.units_required * 15;
      }
    });
  });

  return totalMinutes / 60;
}

/**
 * Calculate estimated wages for a date
 */
export function calculateEstimatedWages(
  staffMembers: StaffMember[],
  dateStr: string
): number {
  let totalWages = 0;

  staffMembers.forEach((member) => {
    const appointments = getAppointmentsForDate(member, dateStr);
    let memberMinutes = 0;

    appointments.forEach((apt) => {
      if (apt.units_required) {
        memberMinutes += apt.units_required * 15;
      }
    });

    if (memberMinutes > 0 && member.hourly_rate) {
      totalWages += (memberMinutes / 60) * member.hourly_rate;
    }
  });

  return totalWages;
}

/**
 * Count scheduled people for a date
 */
export function countScheduledPeople(
  staffMembers: StaffMember[],
  dateStr: string
): number {
  return staffMembers.filter((member) => {
    const appointments = getAppointmentsForDate(member, dateStr);
    return appointments.length > 0;
  }).length;
}

/**
 * Format staff name (first name + last initial)
 */
export function formatStaffName(name: string, shortNames = true): string {
  if (!name) return "Unknown";
  if (!shortNames) return name;

  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return name;

  const firstName = parts[0];
  const lastInitial = parts[parts.length - 1][0]?.toUpperCase() || "";

  return `${firstName} ${lastInitial}.`;
}

/**
 * Get initials from name
 */
export function getInitials(name: string): string {
  if (!name) return "??";
  return name
    .split(/\s+/)
    .map((n) => n[0] || "")
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Parse time string to minutes since midnight
 */
export function timeToMinutes(time: string): number {
  if (!time) return 0;

  // Handle datetime format "YYYY-MM-DD HH:mm"
  if (time.includes(" ")) {
    time = time.split(" ")[1];
  }

  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + (minutes || 0);
}

/**
 * Calculate appointment position style for week view
 */
export function getAppointmentPositionStyle(
  startTime: string,
  endTime: string | null,
  dayStartHour = 7,
  pixelsPerHour = 60
): { left: string; width: string } {
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = endTime ? timeToMinutes(endTime) : startMinutes + 60;

  const dayStartMinutes = dayStartHour * 60;

  const leftMinutes = Math.max(0, startMinutes - dayStartMinutes);
  const durationMinutes = endMinutes - startMinutes;

  const left = (leftMinutes / 60) * pixelsPerHour;
  const width = (durationMinutes / 60) * pixelsPerHour;

  return {
    left: `${left}px`,
    width: `${Math.max(width, 30)}px`, // Minimum 30px width
  };
}

/**
 * Format date for display
 */
export function formatDate(dateStr: string, format: "short" | "long" = "short"): string {
  const date = new Date(dateStr + "T00:00:00");

  if (format === "short") {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }

  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Check if date is today
 */
export function isToday(dateStr: string): boolean {
  const today = new Date();
  const todayStr = formatLocalDate(today);
  return dateStr === todayStr;
}

/**
 * Check if date is in the past
 */
export function isPastDate(dateStr: string): boolean {
  const today = new Date();
  const todayStr = formatLocalDate(today);
  return dateStr < todayStr;
}

/**
 * Get week range display text
 */
export function getWeekRangeDisplay(startDate: Date): string {
  const weekDates = getWeekDates(startDate);
  const start = new Date(weekDates[0] + "T00:00:00");
  const end = new Date(weekDates[6] + "T00:00:00");

  const startMonth = start.toLocaleDateString("en-US", { month: "short" });
  const endMonth = end.toLocaleDateString("en-US", { month: "short" });

  if (startMonth === endMonth) {
    return `${startMonth} ${start.getDate()} - ${end.getDate()}, ${end.getFullYear()}`;
  }

  return `${startMonth} ${start.getDate()} - ${endMonth} ${end.getDate()}, ${end.getFullYear()}`;
}

/**
 * Get month display text
 */
export function getMonthDisplay(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}
