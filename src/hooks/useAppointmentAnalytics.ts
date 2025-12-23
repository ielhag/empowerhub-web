import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api/client";

// Types
export interface AppointmentHistoryFilters {
  days?: string;
  start_date?: string;
  end_date?: string;
  status?: string;
  coach?: number;
  search?: string;
  appointment_type?: "past" | "upcoming" | "all";
  page?: number;
  per_page?: number;
}

export interface HistoryAppointment {
  id: number;
  title: string;
  start_time: string;
  end_time: string | null;
  actual_start_time: string | null;
  actual_completed_time: string | null;
  status: string;
  service_type: string | null;
  service_type_id: number | null;
  client: {
    id: number;
    name: string;
  } | null;
  coach: {
    id: number;
    name: string;
  } | null;
  team_id: number | null;
  hours_worked: number;
  units_required: number;
  units_used: number;
  duration_minutes: number | null;
  client_specialities?: unknown[];
  client_with_transportation_speciality?: number | null;
  review_status?: {
    needs_review: boolean;
    highest_severity?: "high" | "medium" | "low";
    flags?: Array<{
      type: string;
      message: string;
      description: string;
      severity: "high" | "medium" | "low";
    }>;
  };
}

export interface AppointmentStats {
  total: number;
  completionRate: number;
  noShowRate: number;
  onTimeRate: number;
  avgWaitTime: number;
  avgDuration: number;
  onTimeCompletionRate: number;
  avgDurationVariance: number;
  totalHoursWorked: number;
  totalUnitsUsed: number;
  totalUnitsRequired: number;
  unitsUsedPercent: number;
}

export interface Coach {
  id: number;
  name: string;
}

export interface HistoryResponse {
  data: HistoryAppointment[];
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
}

// Query keys
export const appointmentAnalyticsKeys = {
  all: ["appointment-analytics"] as const,
  history: (filters: AppointmentHistoryFilters) =>
    [...appointmentAnalyticsKeys.all, "history", filters] as const,
  stats: (filters: AppointmentHistoryFilters) =>
    [...appointmentAnalyticsKeys.all, "stats", filters] as const,
  coaches: () => [...appointmentAnalyticsKeys.all, "coaches"] as const,
};

// API response types
interface HistoryApiResponse {
  success: boolean;
  data: HistoryAppointment[];
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
}

interface StatsApiResponse {
  success: boolean;
  data: AppointmentStats;
}

interface CoachesApiResponse {
  success: boolean;
  data: Coach[];
}

// Fetch appointment history
async function fetchAppointmentHistory(
  filters: AppointmentHistoryFilters
): Promise<HistoryResponse> {
  const params = new URLSearchParams();

  if (filters.days) params.append("days", filters.days);
  if (filters.start_date) params.append("start_date", filters.start_date);
  if (filters.end_date) params.append("end_date", filters.end_date);
  if (filters.status) params.append("status", filters.status);
  if (filters.coach) params.append("coach", String(filters.coach));
  if (filters.search) params.append("search", filters.search);
  if (filters.appointment_type)
    params.append("appointment_type", filters.appointment_type);
  if (filters.page) params.append("page", String(filters.page));
  if (filters.per_page) params.append("per_page", String(filters.per_page));

  const response = await api.get<HistoryApiResponse>(
    `/tenant-api/appointments-history?${params}`
  );

  return {
    data: response.data.data,
    current_page: response.data.current_page,
    per_page: response.data.per_page,
    total: response.data.total,
    last_page: response.data.last_page,
  };
}

// Fetch appointment stats
async function fetchAppointmentStats(
  filters: AppointmentHistoryFilters
): Promise<AppointmentStats> {
  const params = new URLSearchParams();

  if (filters.days) params.append("days", filters.days);
  if (filters.start_date) params.append("start_date", filters.start_date);
  if (filters.end_date) params.append("end_date", filters.end_date);
  if (filters.status) params.append("status", filters.status);
  if (filters.coach) params.append("coach", String(filters.coach));
  if (filters.search) params.append("search", filters.search);
  if (filters.appointment_type)
    params.append("appointment_type", filters.appointment_type);

  const response = await api.get<StatsApiResponse>(
    `/tenant-api/appointments-stats?${params}`
  );
  return response.data.data;
}

// Fetch coaches list
async function fetchCoaches(): Promise<Coach[]> {
  const response = await api.get<CoachesApiResponse>("/tenant-api/team?per_page=200");
  return response.data.data.map((team: { id: number; name?: string; user?: { name?: string } }) => ({
    id: team.id,
    name: team.name || team.user?.name || "Unknown",
  }));
}

// Hook: Fetch appointment history
export function useAppointmentHistory(filters: AppointmentHistoryFilters = {}) {
  return useQuery({
    queryKey: appointmentAnalyticsKeys.history(filters),
    queryFn: () => fetchAppointmentHistory(filters),
    staleTime: 30 * 1000,
  });
}

// Hook: Fetch appointment stats
export function useAppointmentStats(filters: AppointmentHistoryFilters = {}) {
  return useQuery({
    queryKey: appointmentAnalyticsKeys.stats(filters),
    queryFn: () => fetchAppointmentStats(filters),
    staleTime: 30 * 1000,
  });
}

// Hook: Fetch coaches for filter
export function useCoaches() {
  return useQuery({
    queryKey: appointmentAnalyticsKeys.coaches(),
    queryFn: fetchCoaches,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Helper: Format date time
export function formatDateTime(datetime: string): string {
  const date = new Date(datetime);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

// Helper: Calculate duration between two times
export function calculateDuration(start: string, end: string | null): string {
  if (!end) return "N/A";
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diffMinutes = Math.round(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60)
  );
  return `${diffMinutes} min`;
}

// Helper: Get initials from name
export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// Helper: Shorten name to first name + last initial
export function shortenName(name: string): string {
  if (!name) return "";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return name;
  const firstName = parts[0];
  const lastInitial = parts[parts.length - 1].charAt(0).toUpperCase();
  return `${firstName} ${lastInitial}.`;
}

// Helper: Get service type abbreviation
export function getServiceAbbreviation(serviceName: string | null): string {
  if (!serviceName) return "";

  const abbreviations: Record<string, string> = {
    "Community Engagement": "CE",
    "Specialized Habilitation": "SH",
    "Staff & Family Consulting": "SFC",
    "Supported Employment": "SE",
    "Respite Care": "RC",
  };

  if (abbreviations[serviceName]) {
    return abbreviations[serviceName];
  }

  // Generate abbreviation from initials
  return serviceName
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

// Helper: Get service type badge classes
export function getServiceTypeBadgeClasses(serviceTypeId: number | null): string {
  const colorMap: Record<number, string> = {
    1: "bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-100",
    3: "bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-100",
    4: "bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-100",
    6: "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-100",
  };

  return (
    colorMap[serviceTypeId ?? 0] ||
    "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-100"
  );
}

// Helper: Get status badge classes
export function getStatusBadgeClasses(status: string): {
  bg: string;
  text: string;
} {
  const statusMap: Record<string, { bg: string; text: string }> = {
    scheduled: {
      bg: "bg-blue-100 dark:bg-blue-900/30",
      text: "text-blue-800 dark:text-blue-200",
    },
    in_progress: {
      bg: "bg-yellow-100 dark:bg-yellow-900/30",
      text: "text-yellow-800 dark:text-yellow-200",
    },
    completed: {
      bg: "bg-green-100 dark:bg-green-900/30",
      text: "text-green-800 dark:text-green-200",
    },
    cancelled: {
      bg: "bg-gray-100 dark:bg-gray-700",
      text: "text-gray-800 dark:text-gray-200",
    },
    unassigned: {
      bg: "bg-orange-100 dark:bg-orange-900/30",
      text: "text-orange-800 dark:text-orange-200",
    },
    no_show: {
      bg: "bg-red-100 dark:bg-red-900/30",
      text: "text-red-800 dark:text-red-200",
    },
  };

  return (
    statusMap[status] || {
      bg: "bg-gray-100 dark:bg-gray-700",
      text: "text-gray-800 dark:text-gray-200",
    }
  );
}

// Helper: Format status label
export function formatStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    scheduled: "Scheduled",
    in_progress: "In Progress",
    completed: "Completed",
    cancelled: "Cancelled",
    unassigned: "Unassigned",
    no_show: "No Show",
  };
  return labels[status] || status;
}

// Helper: Format number with commas
export function formatNumber(num: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(num);
}
