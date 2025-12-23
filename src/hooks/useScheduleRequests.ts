import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api/client";

// Types
export interface TeamInfo {
  id: number;
  name: string;
  initials: string;
}

export interface ApproverInfo {
  id: number;
  name: string;
}

export type TimeOffType =
  | "VACATION"
  | "SICK"
  | "PERSONAL"
  | "UNPAID_TIME_OFF"
  | "FAMILY_EMERGENCY"
  | "JURY_DUTY"
  | "OTHER";

export type RequestStatus = "pending" | "approved" | "rejected" | "cancelled";

export interface TimeOffRequest {
  id: number;
  team_id: number;
  team: TeamInfo | null;
  type: TimeOffType;
  status: RequestStatus;
  reason: string;
  is_full_day: boolean;
  start_date: string;
  end_date: string;
  admin_notes: string | null;
  approved_by: ApproverInfo | null;
  approved_at: string | null;
  created_at: string;
}

export interface ScheduleChangeRequest {
  id: number;
  team_id: number;
  team: TeamInfo | null;
  date: string;
  status: RequestStatus;
  reason: string;
  current_start_time: string | null;
  current_end_time: string | null;
  requested_start_time: string;
  requested_end_time: string;
  admin_notes: string | null;
  approved_by: ApproverInfo | null;
  approved_at: string | null;
  created_at: string;
}

export interface ScheduleRequestsStats {
  pending_time_off: number;
  pending_schedule: number;
  approved_time_off: number;
  approved_schedule: number;
  total_requests: number;
}

export interface ScheduleRequestsData {
  time_off_requests: TimeOffRequest[];
  schedule_change_requests: ScheduleChangeRequest[];
  stats: ScheduleRequestsStats;
}

export interface UpdateRequestPayload {
  status: RequestStatus;
  admin_notes?: string;
}

// Query keys
export const scheduleRequestKeys = {
  all: ["schedule-requests"] as const,
  list: () => [...scheduleRequestKeys.all, "list"] as const,
};

// API response type
interface ScheduleRequestsResponse {
  success: boolean;
  data: ScheduleRequestsData;
}

// Fetch schedule requests
async function fetchScheduleRequests(): Promise<ScheduleRequestsData> {
  const response = await api.get<ScheduleRequestsResponse>(
    "/tenant-api/schedule-requests"
  );
  return response.data.data;
}

// Update time off request
async function updateTimeOffRequest(
  id: number,
  payload: UpdateRequestPayload
): Promise<TimeOffRequest> {
  const response = await api.patch<{
    success: boolean;
    data: { message: string; request: TimeOffRequest };
  }>(`/tenant-api/schedule-requests/time-off/${id}`, payload);
  return response.data.data.request;
}

// Update schedule change request
async function updateScheduleChangeRequest(
  id: number,
  payload: UpdateRequestPayload
): Promise<ScheduleChangeRequest> {
  const response = await api.patch<{
    success: boolean;
    data: { message: string; request: ScheduleChangeRequest };
  }>(`/tenant-api/schedule-requests/schedule-change/${id}`, payload);
  return response.data.data.request;
}

// Hook: Fetch all schedule requests
export function useScheduleRequests() {
  return useQuery({
    queryKey: scheduleRequestKeys.list(),
    queryFn: fetchScheduleRequests,
    staleTime: 30 * 1000,
  });
}

// Hook: Update time off request
export function useUpdateTimeOffRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateRequestPayload }) =>
      updateTimeOffRequest(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scheduleRequestKeys.all });
    },
  });
}

// Hook: Update schedule change request
export function useUpdateScheduleChangeRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateRequestPayload }) =>
      updateScheduleChangeRequest(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scheduleRequestKeys.all });
    },
  });
}

// Helper: Get time off type label
export function getTimeOffTypeLabel(type: TimeOffType): string {
  const labels: Record<TimeOffType, string> = {
    VACATION: "Vacation",
    SICK: "Sick Leave",
    PERSONAL: "Personal",
    UNPAID_TIME_OFF: "Unpaid Time Off",
    FAMILY_EMERGENCY: "Family Emergency",
    JURY_DUTY: "Jury Duty",
    OTHER: "Other",
  };
  return labels[type] || type;
}

// Helper: Get time off type color
export function getTimeOffTypeColor(type: TimeOffType): string {
  const colors: Record<TimeOffType, string> = {
    VACATION: "blue",
    SICK: "red",
    PERSONAL: "green",
    UNPAID_TIME_OFF: "yellow",
    FAMILY_EMERGENCY: "orange",
    JURY_DUTY: "purple",
    OTHER: "gray",
  };
  return colors[type] || "gray";
}

// Helper: Get status color
export function getStatusColor(status: RequestStatus): string {
  const colors: Record<RequestStatus, string> = {
    pending: "yellow",
    approved: "green",
    rejected: "red",
    cancelled: "gray",
  };
  return colors[status] || "gray";
}
