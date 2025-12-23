import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import api from '@/lib/api/client';
import { subscribeToChannel, unsubscribeFromChannel } from '@/lib/pusher';
import type { Appointment, AppointmentStatus, PaginatedResponse } from '@/types';

// Query keys
export const appointmentKeys = {
  all: ['appointments'] as const,
  lists: () => [...appointmentKeys.all, 'list'] as const,
  list: (filters: AppointmentFilters) => [...appointmentKeys.lists(), filters] as const,
  details: () => [...appointmentKeys.all, 'detail'] as const,
  detail: (id: number) => [...appointmentKeys.details(), id] as const,
  calendar: (start: string, end: string) => [...appointmentKeys.all, 'calendar', start, end] as const,
};

// Filter types
export interface AppointmentFilters {
  page?: number;
  per_page?: number;
  status?: AppointmentStatus | 'all';
  date?: string;
  start_date?: string;
  end_date?: string;
  team_id?: number;
  client_id?: number;
  speciality_id?: number;
  search?: string;
}

// API response types - pagination fields at top level
interface AppointmentListResponse {
  success: boolean;
  data: Appointment[];
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
}

interface AppointmentDetailResponse {
  success: boolean;
  data: Appointment;
}

// Fetch appointments list
async function fetchAppointments(filters: AppointmentFilters): Promise<PaginatedResponse<Appointment>> {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== '' && value !== 'all') {
      params.append(key, String(value));
    }
  });

  const response = await api.get<AppointmentListResponse>(`/tenant-api/appointments?${params}`);
  // API returns pagination fields at top level, restructure for PaginatedResponse
  return {
    data: response.data.data,
    current_page: response.data.current_page,
    per_page: response.data.per_page,
    total: response.data.total,
    last_page: response.data.last_page,
  };
}

// Fetch single appointment
async function fetchAppointment(id: number): Promise<Appointment> {
  const response = await api.get<AppointmentDetailResponse>(`/tenant-api/appointments/${id}`);
  return response.data.data;
}

// Fetch appointments for calendar
async function fetchCalendarAppointments(start: string, end: string): Promise<Appointment[]> {
  const response = await api.get<{ success: boolean; data: Appointment[] }>(
    `/tenant-api/appointments/calendar?start=${start}&end=${end}`
  );
  return response.data.data;
}

// Hook: Fetch appointments list with pagination and filters
export function useAppointments(filters: AppointmentFilters = {}) {
  return useQuery({
    queryKey: appointmentKeys.list(filters),
    queryFn: () => fetchAppointments(filters),
    staleTime: 30 * 1000, // 30 seconds
  });
}

// Hook: Fetch appointments for a specific team member
export function useTeamAppointments(teamId: number, additionalFilters: Omit<AppointmentFilters, 'team_id'> = {}) {
  const filters = { ...additionalFilters, team_id: teamId, per_page: 100 };
  return useQuery({
    queryKey: [...appointmentKeys.all, 'team', teamId, filters] as const,
    queryFn: () => fetchAppointments(filters),
    enabled: teamId > 0,
    staleTime: 30 * 1000, // 30 seconds
  });
}

// Hook: Fetch single appointment
export function useAppointment(id: number, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: appointmentKeys.detail(id),
    queryFn: () => fetchAppointment(id),
    enabled: id > 0 && (options?.enabled ?? true),
  });
}

// Hook: Fetch calendar appointments
export function useCalendarAppointments(start: string, end: string) {
  return useQuery({
    queryKey: appointmentKeys.calendar(start, end),
    queryFn: () => fetchCalendarAppointments(start, end),
    enabled: !!start && !!end,
    staleTime: 60 * 1000, // 1 minute
  });
}

// Hook: Create appointment
export function useCreateAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<Appointment>) => {
      const response = await api.post<AppointmentDetailResponse>('/tenant-api/appointments', data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
    },
  });
}

// Hook: Update appointment
export function useUpdateAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Appointment> }) => {
      const response = await api.put<AppointmentDetailResponse>(`/tenant-api/appointments/${id}`, data);
      return response.data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
      queryClient.setQueryData(appointmentKeys.detail(data.id), data);
    },
  });
}

// Hook: Start appointment
export function useStartAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await api.post<AppointmentDetailResponse>(`/tenant-api/appointments/${id}/start`);
      return response.data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
      queryClient.setQueryData(appointmentKeys.detail(data.id), data);
    },
  });
}

// Hook: Complete appointment
export function useCompleteAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, notes }: { id: number; notes?: string }) => {
      const response = await api.post<AppointmentDetailResponse>(
        `/tenant-api/appointments/${id}/complete`,
        { notes }
      );
      return response.data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
      queryClient.setQueryData(appointmentKeys.detail(data.id), data);
    },
  });
}

// Hook: Cancel appointment
export function useCancelAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      const response = await api.post<AppointmentDetailResponse>(
        `/tenant-api/appointments/${id}/cancel`,
        { reason }
      );
      return response.data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
      queryClient.setQueryData(appointmentKeys.detail(data.id), data);
    },
  });
}

// Hook: Delete appointment
export function useDeleteAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await api.patch(`/tenant-api/appointments/${id}/destroy`);
      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
      queryClient.removeQueries({ queryKey: appointmentKeys.detail(id) });
    },
  });
}

// Hook: Assign appointment to self (for staff)
export function useAssignToSelf() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await api.post<AppointmentDetailResponse>(
        `/tenant-api/appointments/${id}/assign-self`
      );
      return response.data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
      queryClient.setQueryData(appointmentKeys.detail(data.id), data);
    },
  });
}

// Hook: Override appointment times (admin only)
export function useOverrideTimes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      started_at,
      completed_at,
      reason,
    }: {
      id: number;
      started_at: string;
      completed_at?: string;
      reason: string;
    }) => {
      const response = await api.post<AppointmentDetailResponse>(
        `/tenant-api/appointments/${id}/override-times`,
        { started_at, completed_at, reason }
      );
      return response.data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
      queryClient.setQueryData(appointmentKeys.detail(data.id), data);
    },
  });
}

// Hook: Delete override (admin only)
export function useDeleteOverride() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, overrideId }: { id: number; overrideId: number }) => {
      const response = await api.delete<AppointmentDetailResponse>(
        `/tenant-api/appointments/${id}/override-times/${overrideId}`
      );
      return response.data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
      queryClient.setQueryData(appointmentKeys.detail(data.id), data);
    },
  });
}

// Hook: Create backdated appointment
export interface BackdatedAppointmentData {
  team_id: number;
  client_id: number;
  service_type: number;
  date: string;
  start_time: string;
  duration: number; // in units (15 min each)
  notes?: string;
  reason: string;
  location_type?: string;
}

export function useCreateBackdatedAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: BackdatedAppointmentData) => {
      const response = await api.post<AppointmentDetailResponse>(
        '/tenant-api/appointments/backdated',
        data
      );
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
    },
  });
}

// Hook: Check if user has an in-progress appointment
export function useHasInProgressAppointment(teamId: number | null | undefined) {
  return useQuery({
    queryKey: [...appointmentKeys.all, 'in-progress', teamId] as const,
    queryFn: async () => {
      if (!teamId) return false;
      const response = await api.get<AppointmentListResponse>(
        `/tenant-api/appointments?status=in_progress&team_id=${teamId}&per_page=1`
      );
      return response.data.data.length > 0;
    },
    enabled: !!teamId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

// Hook: Check if user is qualified for a speciality
export function useCheckQualifications(teamId: number | null | undefined, specialityId: number | null | undefined) {
  return useQuery({
    queryKey: ['qualifications', teamId, specialityId] as const,
    queryFn: async () => {
      if (!teamId || !specialityId) return true; // Default to qualified if no data
      try {
        const response = await api.get<{ success: boolean; data: { is_qualified: boolean } }>(
          `/tenant-api/team/${teamId}/qualifications/${specialityId}`
        );
        return response.data.data.is_qualified;
      } catch {
        // If endpoint doesn't exist or fails, default to true
        return true;
      }
    },
    enabled: !!teamId && !!specialityId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook: Real-time appointment updates via Pusher
export function useAppointmentRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = subscribeToChannel('appointments');
    if (!channel) return;

    channel.bind('AppointmentStatusChanged', (data: {
      appointmentId: number;
      oldStatus: string;
      newStatus: string;
    }) => {
      // Invalidate queries to refetch with new data
      queryClient.invalidateQueries({ queryKey: appointmentKeys.all });

      console.log('Appointment status changed:', data);
    });

    channel.bind('AppointmentCreated', () => {
      queryClient.invalidateQueries({ queryKey: appointmentKeys.lists() });
    });

    channel.bind('AppointmentUpdated', (data: { appointmentId: number }) => {
      queryClient.invalidateQueries({ queryKey: appointmentKeys.detail(data.appointmentId) });
      queryClient.invalidateQueries({ queryKey: appointmentKeys.lists() });
    });

    return () => {
      unsubscribeFromChannel('appointments');
    };
  }, [queryClient]);
}
