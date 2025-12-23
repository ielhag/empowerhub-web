import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api/client';
import type { TeamActivity, TeamActivityType } from '@/types';

// ============================================================================
// Query Keys
// ============================================================================

export const teamActivityKeys = {
  all: ['team-activities'] as const,
  list: (teamId: number) => [...teamActivityKeys.all, 'list', teamId] as const,
  detail: (teamId: number, activityId: number) => [...teamActivityKeys.all, 'detail', teamId, activityId] as const,
};

// ============================================================================
// Types
// ============================================================================

interface CreateActivityData {
  title: string;
  type: TeamActivityType;
  start_time: string;
  end_time: string;
  location_type?: 'onsite' | 'remote';
  description?: string;
  is_paid?: boolean;
  rate_override?: number | null;
}

interface UpdateActivityData extends Partial<CreateActivityData> {
  id: number;
}

interface ActivitiesListParams {
  start_date?: string;
  end_date?: string;
}

// ============================================================================
// Hook: Get team activities
// ============================================================================

export function useTeamActivities(teamId: number, params?: ActivitiesListParams) {
  return useQuery({
    queryKey: teamActivityKeys.list(teamId),
    queryFn: async (): Promise<TeamActivity[]> => {
      const queryParams = new URLSearchParams();
      if (params?.start_date) queryParams.append('start_date', params.start_date);
      if (params?.end_date) queryParams.append('end_date', params.end_date);

      const url = `/tenant-api/team/${teamId}/activities${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      const response = await api.get<{ success: boolean; data: TeamActivity[] }>(url);
      return response.data.data;
    },
    enabled: !!teamId,
  });
}

// ============================================================================
// Hook: Create activity
// ============================================================================

export function useCreateActivity(teamId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateActivityData): Promise<TeamActivity> => {
      const response = await api.post<{ success: boolean; data: TeamActivity; message: string }>(
        `/tenant-api/team/${teamId}/activities`,
        data
      );
      return response.data.data;
    },
    onSuccess: () => {
      // Invalidate activities list and schedule builder
      queryClient.invalidateQueries({ queryKey: teamActivityKeys.list(teamId) });
      queryClient.invalidateQueries({ queryKey: ['schedule-builder'] });
    },
  });
}

// ============================================================================
// Hook: Update activity
// ============================================================================

export function useUpdateActivity(teamId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateActivityData): Promise<TeamActivity> => {
      const { id, ...updateData } = data;
      const response = await api.put<{ success: boolean; data: TeamActivity }>(
        `/tenant-api/team/${teamId}/activities/${id}`,
        updateData
      );
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamActivityKeys.list(teamId) });
      queryClient.invalidateQueries({ queryKey: ['schedule-builder'] });
    },
  });
}

// ============================================================================
// Hook: Delete activity
// ============================================================================

export function useDeleteActivity(teamId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (activityId: number): Promise<void> => {
      await api.delete(`/tenant-api/team/${teamId}/activities/${activityId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamActivityKeys.list(teamId) });
      queryClient.invalidateQueries({ queryKey: ['schedule-builder'] });
    },
  });
}

// ============================================================================
// Constants
// ============================================================================

export const ACTIVITY_TYPES: { value: TeamActivityType; label: string }[] = [
  { value: 'adjustment', label: 'Adjustment' },
  { value: 'training', label: 'Training' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'administrative', label: 'Administrative' },
  { value: 'other', label: 'Other' },
];

export const ACTIVITY_TYPE_COLORS: Record<TeamActivityType, { bg: string; text: string }> = {
  training: { bg: 'bg-blue-100 dark:bg-blue-900/50', text: 'text-blue-800 dark:text-blue-300' },
  meeting: { bg: 'bg-green-100 dark:bg-green-900/50', text: 'text-green-800 dark:text-green-300' },
  administrative: { bg: 'bg-yellow-100 dark:bg-yellow-900/50', text: 'text-yellow-800 dark:text-yellow-300' },
  adjustment: { bg: 'bg-orange-100 dark:bg-orange-900/50', text: 'text-orange-800 dark:text-orange-300' },
  other: { bg: 'bg-purple-100 dark:bg-purple-900/50', text: 'text-purple-800 dark:text-purple-300' },
};
