import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api/client";

// Query keys
export const nemtRequestKeys = {
  all: ["nemt-requests"] as const,
  list: (filters?: NEMTRequestFilters) =>
    [...nemtRequestKeys.all, "list", filters] as const,
  detail: (id: number) => [...nemtRequestKeys.all, "detail", id] as const,
};

// Filter types
export interface NEMTRequestFilters {
  date?: string;
  start_date?: string;
  end_date?: string;
  week_offset?: number;
  status?: string;
}

// NEMT Request type
export interface NEMTRequest {
  id: number;
  client_id: number;
  client_name: string;
  client_date_of_birth?: string;
  client_providerone_id?: string;
  date: string;
  day: string;
  channel: string;
  provider: string;
  destination: string;
  pickup_address?: string;
  pickup_window?: string;
  return_pickup_window?: string;
  pickup_time_from?: string;
  pickup_time_to?: string;
  return_pickup_time_from?: string;
  return_pickup_time_to?: string;
  transportation_company?: string;
  notes?: string;
  is_cancelled: boolean;
  cancellation_reason?: string;
  is_recurring: boolean;
  is_facility_paused?: boolean;
  facility_name?: string;
  status?: "confirmed" | "pending" | "cancelled";
}

interface NEMTRequestResponse {
  success: boolean;
  data: NEMTRequest[];
}

// Fetch NEMT requests
async function fetchNEMTRequests(
  filters: NEMTRequestFilters = {}
): Promise<NEMTRequest[]> {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      params.append(key, String(value));
    }
  });

  const response = await api.get<NEMTRequestResponse | NEMTRequest[]>(
    `/tenant-api/nemt-requests?${params}`
  );

  // Handle both array response and wrapped response
  if (Array.isArray(response.data)) {
    return response.data;
  }
  return response.data.data || [];
}

// Hook: Fetch NEMT requests
export function useNEMTRequests(filters: NEMTRequestFilters = {}) {
  return useQuery({
    queryKey: nemtRequestKeys.list(filters),
    queryFn: () => fetchNEMTRequests(filters),
    staleTime: 30 * 1000, // 30 seconds
    placeholderData: (previousData) => previousData, // Keep previous data while fetching
  });
}

// Update NEMT occurrence
async function updateNEMTOccurrence({
  id,
  data,
}: {
  id: number;
  data: Partial<NEMTRequest>;
}) {
  const response = await api.put(
    `/tenant-api/nemt-requests/occurrences/${id}`,
    data
  );
  return response.data;
}

// Cancel NEMT occurrence
async function cancelNEMTOccurrence({
  id,
  reason,
  cancelAllFuture,
}: {
  id: number;
  reason: string;
  cancelAllFuture: boolean;
}) {
  const response = await api.post(
    `/tenant-api/nemt-requests/occurrences/${id}/cancel`,
    {
      cancellation_reason: reason,
      cancel_all_future: cancelAllFuture,
    }
  );
  return response.data;
}

// Restore (uncancel) NEMT occurrence
async function restoreNEMTOccurrence(id: number) {
  const response = await api.post(
    `/tenant-api/nemt-requests/occurrences/${id}/uncancel`
  );
  return response.data;
}

// Hook: Update NEMT occurrence
export function useUpdateNEMTOccurrence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateNEMTOccurrence,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: nemtRequestKeys.all });
    },
  });
}

// Hook: Cancel NEMT occurrence
export function useCancelNEMTOccurrence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: cancelNEMTOccurrence,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: nemtRequestKeys.all });
    },
  });
}

// Hook: Restore NEMT occurrence
export function useRestoreNEMTOccurrence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: restoreNEMTOccurrence,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: nemtRequestKeys.all });
    },
  });
}
