import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api/client";
import type {
  TeamMember,
  PaginatedResponse,
  Speciality,
  Certification,
} from "@/types";

// Query keys
export const teamKeys = {
  all: ["team"] as const,
  lists: () => [...teamKeys.all, "list"] as const,
  list: (filters: TeamFilters) => [...teamKeys.lists(), filters] as const,
  details: () => [...teamKeys.all, "detail"] as const,
  detail: (id: number) => [...teamKeys.details(), id] as const,
  schedule: (id: number) => [...teamKeys.all, "schedule", id] as const,
  performance: (id: number) => [...teamKeys.all, "performance", id] as const,
};

// Filter types
export interface TeamFilters {
  page?: number;
  per_page?: number;
  status?: "active" | "inactive" | "terminated" | "all";
  speciality_id?: number;
  search?: string;
}

// Working hour schedule for a single day (object format from API)
export interface WorkingHourEntry {
  enabled: boolean;
  start_time?: string | null;
  end_time?: string | null;
}

// Working hours as object with day names as keys
export type WorkingHoursMap = {
  [key: string]: WorkingHourEntry;
};

// Preferences for team member
export interface TeamPreferences {
  max_weekly_hours?: number;
  max_travel_distance?: number;
  service_areas?: string[];
  languages?: string[];
  client_preferences?: {
    age_groups?: string[];
    gender_preference?: string;
  };
}

// Extended TeamMember with additional detail fields
// Note: We use Omit to override working_hours type since API returns object format
export interface TeamMemberDetail extends Omit<TeamMember, "working_hours"> {
  hire_date?: string;
  date_of_birth?: string;
  employee_id?: string;
  username?: string;
  position?: string;
  vaccinated?: boolean;
  emergency_contact?: EmergencyContact;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
  performance?: TeamPerformance;
  working_hours?: WorkingHoursMap;
  preferences?: TeamPreferences;
  total_hours?: number;
  total_wages?: number;
  app_version?: string;
  device_type?: "ios" | "android" | "web";
  job_application?: {
    id: number;
    created_at: string;
  };
}

// Certification type re-exported from @/types

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
}

export interface TeamPerformance {
  total_appointments: number;
  completed_appointments: number;
  cancelled_appointments: number;
  no_show_rate: number;
  on_time_rate: number;
  client_satisfaction?: number;
  hours_worked_this_month: number;
}

export interface TeamSchedule {
  date: string;
  appointments: {
    id: number;
    client_name: string;
    start_time: string;
    end_time: string;
    status: string;
  }[];
}

// API response types - pagination fields at top level, not nested in data
interface TeamListResponse {
  success: boolean;
  data: TeamMember[];
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
}

interface TeamDetailResponse {
  success: boolean;
  data: TeamMemberDetail;
}

interface TeamScheduleResponse {
  success: boolean;
  data: TeamSchedule[];
}

// Fetch team members list
async function fetchTeamMembers(
  filters: TeamFilters
): Promise<PaginatedResponse<TeamMember>> {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== "" && value !== "all") {
      params.append(key, String(value));
    }
  });

  const response = await api.get<TeamListResponse>(
    `/tenant-api/team?${params}`
  );
  // API returns pagination fields at top level, restructure for PaginatedResponse
  return {
    data: response.data.data,
    current_page: response.data.current_page,
    per_page: response.data.per_page,
    total: response.data.total,
    last_page: response.data.last_page,
  };
}

// Fetch single team member
async function fetchTeamMember(id: number): Promise<TeamMemberDetail> {
  const response = await api.get<TeamDetailResponse>(`/tenant-api/team/${id}`);
  return response.data.data;
}

// Fetch team member schedule
async function fetchTeamSchedule(
  id: number,
  startDate: string,
  endDate: string
): Promise<TeamSchedule[]> {
  const response = await api.get<TeamScheduleResponse>(
    `/tenant-api/team/${id}/schedule?start=${startDate}&end=${endDate}`
  );
  return response.data.data;
}

// Hook: Fetch team members list
export function useTeamMembers(filters: TeamFilters = {}) {
  return useQuery({
    queryKey: teamKeys.list(filters),
    queryFn: () => fetchTeamMembers(filters),
    staleTime: 30 * 1000,
  });
}

// Hook: Fetch single team member
export function useTeamMember(id: number) {
  return useQuery({
    queryKey: teamKeys.detail(id),
    queryFn: () => fetchTeamMember(id),
    enabled: id > 0,
  });
}

// Hook: Fetch team member schedule
export function useTeamSchedule(
  id: number,
  startDate: string,
  endDate: string
) {
  return useQuery({
    queryKey: [...teamKeys.schedule(id), startDate, endDate],
    queryFn: () => fetchTeamSchedule(id, startDate, endDate),
    enabled: id > 0 && !!startDate && !!endDate,
  });
}

// Hook: Create team member
export function useCreateTeamMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<TeamMemberDetail>) => {
      const response = await api.post<TeamDetailResponse>(
        "/tenant-api/team",
        data
      );
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.all });
    },
  });
}

// Hook: Update team member
export function useUpdateTeamMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: Partial<TeamMemberDetail>;
    }) => {
      const response = await api.put<TeamDetailResponse>(
        `/tenant-api/team/${id}`,
        data
      );
      return response.data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: teamKeys.all });
      queryClient.setQueryData(teamKeys.detail(data.id), data);
    },
  });
}

// Hook: Deactivate team member
export function useDeactivateTeamMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await api.post<TeamDetailResponse>(
        `/tenant-api/team/${id}/deactivate`
      );
      return response.data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: teamKeys.all });
      queryClient.setQueryData(teamKeys.detail(data.id), data);
    },
  });
}

// Hook: Reactivate team member
export function useReactivateTeamMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await api.post<TeamDetailResponse>(
        `/tenant-api/team/${id}/reactivate`
      );
      return response.data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: teamKeys.all });
      queryClient.setQueryData(teamKeys.detail(data.id), data);
    },
  });
}

// Hook: Search team members (for autocomplete)
export function useTeamSearch(query: string) {
  return useQuery({
    queryKey: [...teamKeys.all, "search", query],
    queryFn: async () => {
      if (!query || query.length < 2) return [];
      const response = await api.get<{ success: boolean; data: TeamMember[] }>(
        `/tenant-api/team/search?q=${encodeURIComponent(query)}`
      );
      return response.data.data;
    },
    enabled: query.length >= 2,
    staleTime: 60 * 1000,
  });
}

// ============ Documents ============
export interface TeamDocument {
  id: number;
  name: string;
  type: string;
  expiry_date?: string;
  file_count: number;
  created_at: string;
}

export function useTeamDocuments(teamId: number) {
  return useQuery({
    queryKey: [...teamKeys.all, "documents", teamId],
    queryFn: async () => {
      const response = await api.get<{
        success: boolean;
        data: TeamDocument[];
      }>(`/tenant-api/team/${teamId}/documents`);
      return response.data.data;
    },
    enabled: teamId > 0,
  });
}

export function useUploadDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      teamId,
      formData,
    }: {
      teamId: number;
      formData: FormData;
    }) => {
      const response = await api.post<{ success: boolean; data: TeamDocument }>(
        `/tenant-api/team/${teamId}/documents`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      return response.data.data;
    },
    onSuccess: (_, { teamId }) => {
      queryClient.invalidateQueries({
        queryKey: [...teamKeys.all, "documents", teamId],
      });
    },
  });
}

// ============ Notes ============
export interface TeamNote {
  id: number;
  title?: string;
  content: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export function useTeamNotes(teamId: number) {
  return useQuery({
    queryKey: [...teamKeys.all, "notes", teamId],
    queryFn: async () => {
      const response = await api.get<{ success: boolean; data: TeamNote[] }>(
        `/tenant-api/team/${teamId}/notes`
      );
      return response.data.data;
    },
    enabled: teamId > 0,
  });
}

export function useAddNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      teamId,
      data,
    }: {
      teamId: number;
      data: { title?: string; content: string };
    }) => {
      const response = await api.post<{ success: boolean; data: TeamNote }>(
        `/tenant-api/team/${teamId}/notes`,
        data
      );
      return response.data.data;
    },
    onSuccess: (_, { teamId }) => {
      queryClient.invalidateQueries({
        queryKey: [...teamKeys.all, "notes", teamId],
      });
    },
  });
}

export function useDeleteNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      teamId,
      noteId,
    }: {
      teamId: number;
      noteId: number;
    }) => {
      await api.delete(`/tenant-api/team/${teamId}/notes/${noteId}`);
      return noteId;
    },
    onSuccess: (_, { teamId }) => {
      queryClient.invalidateQueries({
        queryKey: [...teamKeys.all, "notes", teamId],
      });
    },
  });
}

// ============ Time Logs / Wages ============
export interface TimeLog {
  id: number;
  clock_in: string;
  clock_out: string | null;
  hours_worked: number;
  type: string;
  appointment?: {
    id: number;
    client_name?: string;
  };
  notes?: string;
}

export interface PayPeriod {
  start_date: string;
  end_date: string;
  type: string;
  current: boolean;
  total_hours: number;
  regular_hours: number;
  overtime_hours: number;
  total_earnings: number;
  base_rate: number;
  overtime_rate: number;
  is_approved_report: boolean;
  logs: TimeLog[];
}

export interface TimeLogsResponse {
  pay_periods: PayPeriod[];
  current_period: PayPeriod | null; // ⭐ Exists in TenantApi response
  time_logs: TimeLog[]; // ⭐ Also available at root level
  ytd_totals: {
    hours: number;
    overtimeHours: number; // ⚠️ camelCase from Laravel
    earnings: number;
  };
  base_rate: number;
  overtime_rate: number;
  timezone: string;
}

export function useTeamTimeLogs(
  teamId: number,
  params?: {
    year?: number;
    start_date?: string;
    end_date?: string;
  }
) {
  return useQuery({
    queryKey: ["team", "time-logs", teamId, params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.year) searchParams.append("year", String(params.year));
      if (params?.start_date)
        searchParams.append("start_date", params.start_date);
      if (params?.end_date) searchParams.append("end_date", params.end_date);

      const queryString = searchParams.toString();
      const url = queryString
        ? `/tenant-api/team/${teamId}/time-logs?${queryString}`
        : `/tenant-api/team/${teamId}/time-logs`;

      const response = await api.get<{
        success: boolean;
        data: TimeLogsResponse;
      }>(url);

      // ✅ Extract data from success wrapper
      return response.data.data;
    },
    enabled: teamId > 0,
  });
}

// ============ Activities ============
export interface TeamActivity {
  id: number;
  title: string;
  type: "training" | "meeting" | "administrative" | "other";
  start_time: string;
  end_time: string;
  status: string;
  location_type?: string;
  notes?: string;
  is_in_finalized_report: boolean;
}

export function useTeamActivities(
  teamId: number,
  params?: { start_date?: string; end_date?: string }
) {
  return useQuery({
    queryKey: [...teamKeys.all, "activities", teamId, params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.start_date)
        searchParams.append("start_date", params.start_date);
      if (params?.end_date) searchParams.append("end_date", params.end_date);

      const response = await api.get<{
        success: boolean;
        data: TeamActivity[];
      }>(`/tenant-api/team/${teamId}/activities?${searchParams}`);
      return response.data.data;
    },
    enabled: teamId > 0,
  });
}

export function useCreateActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      teamId,
      data,
    }: {
      teamId: number;
      data: {
        title: string;
        type: string;
        start_time: string;
        end_time: string;
        location_type?: string;
        notes?: string;
      };
    }) => {
      const response = await api.post<{ success: boolean; data: TeamActivity }>(
        `/tenant-api/team/${teamId}/activities`,
        data
      );
      return response.data.data;
    },
    onSuccess: (_, { teamId }) => {
      queryClient.invalidateQueries({
        queryKey: [...teamKeys.all, "activities", teamId],
      });
    },
  });
}

export function useDeleteActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      teamId,
      activityId,
    }: {
      teamId: number;
      activityId: number;
    }) => {
      await api.delete(`/tenant-api/team/${teamId}/activities/${activityId}`);
      return activityId;
    },
    onSuccess: (_, { teamId }) => {
      queryClient.invalidateQueries({
        queryKey: [...teamKeys.all, "activities", teamId],
      });
    },
  });
}

// ============ Achievements ============
export interface TeamAchievement {
  id: number;
  title: string;
  description: string;
  type: string;
  icon: string;
  badge_color: string;
  awarded_at: string;
}

export interface AchievementsResponse {
  achievements: TeamAchievement[];
  achievements_by_type: Record<string, TeamAchievement[]>;
  total_count: number;
  team_rank: number;
  total_teams: number;
  ranking_details: {
    achievement_score: number;
    appointment_score: number;
    speciality_score: number;
    satisfaction_score: number;
    total_score: number;
  };
}

export function useTeamAchievements(teamId: number) {
  return useQuery({
    queryKey: [...teamKeys.all, "achievements", teamId],
    queryFn: async () => {
      const response = await api.get<{
        success: boolean;
        data: AchievementsResponse;
      }>(`/tenant-api/team/${teamId}/achievements`);
      return response.data.data;
    },
    enabled: teamId > 0,
  });
}

// ============ Warnings ============
export interface TeamWarningItem {
  id: number;
  type: string;
  severity: string;
  title: string;
  description: string;
  issued_by: string;
  issued_at: string;
  acknowledged: boolean;
  acknowledged_at?: string;
  acknowledged_by?: string;
  response?: string;
}

export function useTeamWarnings(teamId: number) {
  return useQuery({
    queryKey: [...teamKeys.all, "warnings", teamId],
    queryFn: async () => {
      const response = await api.get<{
        success: boolean;
        data: TeamWarningItem[];
      }>(`/tenant-api/team/${teamId}/warnings`);
      return response.data.data;
    },
    enabled: teamId > 0,
  });
}

// ============ Schedule Requests ============
export interface ScheduleRequest {
  id: number;
  type: string;
  status: string;
  start_date?: string;
  end_date?: string;
  reason: string;
  reviewed_by?: string;
  reviewed_at?: string;
  review_notes?: string;
  created_at: string;
}

export function useTeamScheduleRequests(teamId: number) {
  return useQuery({
    queryKey: [...teamKeys.all, "schedule-requests", teamId],
    queryFn: async () => {
      const response = await api.get<{
        success: boolean;
        data: ScheduleRequest[];
      }>(`/tenant-api/team/${teamId}/schedule-requests`);
      return response.data.data;
    },
    enabled: teamId > 0,
  });
}
