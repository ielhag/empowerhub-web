import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api/client';
import { format } from 'date-fns';

// Types
export interface DraftAppointment {
  id: number;
  client_id: number;
  team_id: number | null;
  service_id: number | null;
  speciality_id: number | null;
  start_time: string;
  end_time: string;
  title: string | null;
  description: string | null;
  validation_status: 'pending' | 'valid' | 'invalid';
  validation_errors: Array<{ type: string; message: string }> | null;
  grouped_errors?: Record<string, string[]>;
  batch_id: string | null;
  source_appointment_id: number | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  // Relationships
  client?: {
    id: number;
    name?: string | null;
    user?: { name: string | null };
  };
  team?: {
    id: number;
    name?: string | null;
    user?: { name: string | null };
    speciality?: { id: number; name: string; color: string };
  };
  service?: {
    id: number;
    name: string;
    color: string | null;
  };
  speciality?: {
    id: number;
    name: string;
    color: string;
    short_name?: string;
  };
}

export interface CopyWeekBatch {
  batch_id: string;
  source_week: string;
  target_week: string;
  target_week_date: string;
  created_by: string;
  created_at: string;
  total_drafts: number;
  valid_drafts: number;
  invalid_drafts: number;
  published_drafts: number;
  unpublished_drafts: number;
  can_revert: boolean;
}

// API Response types matching backend exactly
export interface DraftAppointmentsResponse {
  success: boolean;
  data: {
    drafts: DraftAppointment[];
    total: number;
    valid_count: number;
    invalid_count: number;
  };
  message?: string;
  error?: string;
}

export interface CopyWeekResponse {
  success: boolean;
  message: string;
  data?: {
    batch_id: string;
    draft_ids: number[];
    total_drafts: number;
    skipped_appointments: Array<{
      client_name: string;
      team_name?: string;
      start_time: string;
      reason: string;
      conflict_type: string;
    }>;
  };
  error?: string;
}

export interface PublishResponse {
  success: boolean;
  message: string;
  data?: {
    published_count: number;
    errors: Array<{
      draft_id: number;
      message: string;
    }>;
  };
  error?: string;
}

export interface RevertResponse {
  success: boolean;
  message: string;
  data?: {
    deleted_draft_count: number;
    deleted_appointment_count: number;
    source_week: string;
    target_week: string;
    batch_id: string;
  };
  error?: string;
}

export interface CopyWeekBatchesResponse {
  success: boolean;
  data: {
    batches: CopyWeekBatch[];
    total_batches: number;
  };
  message?: string;
  error?: string;
}

export interface DeleteResponse {
  success: boolean;
  message: string;
  deleted_count?: number;
  error?: string;
}

export interface RevalidateResponse {
  success: boolean;
  message: string;
  revalidated_count?: number;
  error?: string;
}

// Helper to safely extract drafts array from response
function extractDrafts(response: DraftAppointmentsResponse | undefined): DraftAppointment[] {
  if (!response?.success || !response?.data) return [];
  if (Array.isArray(response.data.drafts)) return response.data.drafts;
  return [];
}

// Helper to safely extract batches array from response
function extractBatches(response: CopyWeekBatchesResponse | undefined): CopyWeekBatch[] {
  if (!response?.success || !response?.data) return [];
  if (Array.isArray(response.data.batches)) return response.data.batches;
  return [];
}

// Fetch draft appointments for a week
export function useDraftAppointments(weekStart: Date, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['draft-appointments', format(weekStart, 'yyyy-MM-dd')],
    queryFn: async () => {
      const response = await api.get<DraftAppointmentsResponse>('/tenant-api/draft-appointments', {
        params: {
          week_start: format(weekStart, 'yyyy-MM-dd'),
        },
      });
      return response.data;
    },
    enabled: options?.enabled !== false,
    staleTime: 30000, // 30 seconds
    // Transform data to include helper getters
    select: (data) => ({
      ...data,
      drafts: extractDrafts(data),
      meta: data?.data ? {
        total: data.data.total || 0,
        valid_count: data.data.valid_count || 0,
        invalid_count: data.data.invalid_count || 0,
      } : null,
    }),
  });
}

// Fetch copy week batches
export function useCopyWeekBatches(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['copy-week-batches'],
    queryFn: async () => {
      const response = await api.get<CopyWeekBatchesResponse>('/tenant-api/draft-appointments/copy-week-batches');
      return response.data;
    },
    enabled: options?.enabled !== false,
    staleTime: 60000, // 1 minute
    // Transform data to include helper getters
    select: (data) => ({
      ...data,
      batches: extractBatches(data),
      total_batches: data?.data?.total_batches || 0,
    }),
  });
}

// Copy week mutation - creates draft appointments
export function useCopyWeek() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sourceWeek, targetWeek }: { sourceWeek: string; targetWeek: string }) => {
      const response = await api.post<CopyWeekResponse>('/tenant-api/draft-appointments/copy-week', {
        source_week: sourceWeek,
        target_week: targetWeek,
      });
      return response.data;
    },
    onSuccess: () => {
      // Invalidate draft appointments query for the target week
      queryClient.invalidateQueries({ queryKey: ['draft-appointments'] });
      // Invalidate batches list
      queryClient.invalidateQueries({ queryKey: ['copy-week-batches'] });
      // Invalidate schedule data
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
    },
  });
}

// Publish draft appointments
export function usePublishDrafts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ draftIds, weekStart }: { draftIds?: number[]; weekStart?: string }) => {
      const response = await api.post<PublishResponse>('/tenant-api/draft-appointments/publish', {
        draft_ids: draftIds,
        week_start: weekStart,
      });
      return response.data;
    },
    onSuccess: () => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['draft-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['copy-week-batches'] });
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
}

// Revalidate draft appointments
export function useRevalidateDrafts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ draftIds, weekStart }: { draftIds?: number[]; weekStart?: string }) => {
      const response = await api.post<RevalidateResponse>('/tenant-api/draft-appointments/revalidate', {
        draft_ids: draftIds,
        week_start: weekStart,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['draft-appointments'] });
    },
  });
}

// Revert a copy week batch
export function useRevertCopyWeek() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ batchId }: { batchId: string }) => {
      const response = await api.post<RevertResponse>('/tenant-api/draft-appointments/revert-copy-week', {
        batch_id: batchId,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['draft-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['copy-week-batches'] });
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
    },
  });
}

// Delete draft appointments
export function useDeleteDrafts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ draftIds, weekStart }: { draftIds?: number[]; weekStart?: string }) => {
      const response = await api.delete<DeleteResponse>('/tenant-api/draft-appointments', {
        data: {
          draft_ids: draftIds,
          week_start: weekStart,
        },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['draft-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['copy-week-batches'] });
    },
  });
}

// Unassign team from a draft appointment
export function useUnassignDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ draftId }: { draftId: number }) => {
      const response = await api.post<{ success: boolean; message: string; data?: DraftAppointment }>(`/tenant-api/draft-appointments/${draftId}/unassign`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['draft-appointments'] });
    },
  });
}

// Remove a draft appointment
export function useRemoveDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ draftId }: { draftId: number }) => {
      const response = await api.post<{ success: boolean; message: string }>(`/tenant-api/draft-appointments/${draftId}/remove`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['draft-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['copy-week-batches'] });
    },
  });
}

// Bulk unassign team from draft appointments
export function useBulkUnassignDrafts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ draftIds }: { draftIds: number[] }) => {
      const response = await api.post<{ success: boolean; message: string }>('/tenant-api/draft-appointments/bulk-unassign', {
        draft_ids: draftIds,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['draft-appointments'] });
    },
  });
}

// Bulk remove draft appointments
export function useBulkRemoveDrafts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ draftIds }: { draftIds: number[] }) => {
      const response = await api.post<{ success: boolean; message: string }>('/tenant-api/draft-appointments/bulk-remove', {
        draft_ids: draftIds,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['draft-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['copy-week-batches'] });
    },
  });
}
