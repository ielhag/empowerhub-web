import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api/client';
import type { Appointment, TeamMember, Client } from '@/types';

// Query keys
export const scheduleKeys = {
  all: ['schedule'] as const,
  week: (startDate: string) => [...scheduleKeys.all, 'week', startDate] as const,
  drafts: () => [...scheduleKeys.all, 'drafts'] as const,
  available: (date: string) => [...scheduleKeys.all, 'available', date] as const,
};

// Schedule types
export interface ScheduleWeek {
  start_date: string;
  end_date: string;
  days: ScheduleDay[];
}

export interface ScheduleDay {
  date: string;
  day_name: string;
  is_today: boolean;
  appointments: ScheduleAppointment[];
}

export interface ScheduleAppointment {
  id: number;
  client_id: number;
  client_name: string;
  team_id?: number;
  team_name?: string;
  start_time: string;
  end_time: string;
  duration: number;
  status: string;
  is_draft: boolean;
  speciality_name: string;
  location_type: string;
}

export interface DraftAppointment {
  id?: number;
  client_id: number;
  team_id?: number;
  speciality_id: number;
  date: string;
  start_time: string;
  end_time: string;
  location_type: 'in_home' | 'facility' | 'community';
  notes?: string;
}

export interface AvailableSlot {
  team_member: TeamMember;
  available_times: {
    start: string;
    end: string;
  }[];
}

// API response types
interface ScheduleWeekResponse {
  success: boolean;
  data: ScheduleWeek;
}

interface DraftsResponse {
  success: boolean;
  data: DraftAppointment[];
}

interface AvailableResponse {
  success: boolean;
  data: AvailableSlot[];
}

// Fetch schedule for a week
async function fetchScheduleWeek(startDate: string): Promise<ScheduleWeek> {
  const response = await api.get<ScheduleWeekResponse>(
    `/tenant-api/schedule?start_date=${startDate}`
  );
  return response.data.data;
}

// Fetch draft appointments
async function fetchDrafts(): Promise<DraftAppointment[]> {
  const response = await api.get<DraftsResponse>('/tenant-api/schedule/drafts');
  return response.data.data;
}

// Fetch available team members for a date
async function fetchAvailable(date: string): Promise<AvailableSlot[]> {
  const response = await api.get<AvailableResponse>(
    `/tenant-api/schedule/available?date=${date}`
  );
  return response.data.data;
}

// Hook: Fetch schedule week
export function useScheduleWeek(startDate: string) {
  return useQuery({
    queryKey: scheduleKeys.week(startDate),
    queryFn: () => fetchScheduleWeek(startDate),
    enabled: !!startDate,
    staleTime: 30 * 1000,
  });
}

// Hook: Fetch drafts
export function useScheduleDrafts() {
  return useQuery({
    queryKey: scheduleKeys.drafts(),
    queryFn: fetchDrafts,
  });
}

// Hook: Fetch available slots
export function useAvailableSlots(date: string) {
  return useQuery({
    queryKey: scheduleKeys.available(date),
    queryFn: () => fetchAvailable(date),
    enabled: !!date,
  });
}

// Hook: Create draft appointment
export function useCreateDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: DraftAppointment) => {
      const response = await api.post<{ success: boolean; data: DraftAppointment }>(
        '/tenant-api/schedule/drafts',
        data
      );
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scheduleKeys.all });
    },
  });
}

// Hook: Update draft appointment
export function useUpdateDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<DraftAppointment> }) => {
      const response = await api.put<{ success: boolean; data: DraftAppointment }>(
        `/tenant-api/schedule/drafts/${id}`,
        data
      );
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scheduleKeys.all });
    },
  });
}

// Hook: Delete draft appointment
export function useDeleteDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/tenant-api/schedule/drafts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scheduleKeys.all });
    },
  });
}

// Hook: Publish drafts (convert to real appointments)
export function usePublishDrafts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (draftIds: number[]) => {
      const response = await api.post<{ success: boolean; data: { published_count: number } }>(
        '/tenant-api/schedule/publish',
        { draft_ids: draftIds }
      );
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scheduleKeys.all });
    },
  });
}

// Hook: Auto-assign team members to unassigned appointments
export function useAutoAssign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (date: string) => {
      const response = await api.post<{ success: boolean; data: { assigned_count: number } }>(
        '/tenant-api/schedule/auto-assign',
        { date }
      );
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scheduleKeys.all });
    },
  });
}
