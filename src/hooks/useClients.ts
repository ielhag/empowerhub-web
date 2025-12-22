import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api/client';
import type { Client, PaginatedResponse, UnitBalance } from '@/types';

// Query keys
export const clientKeys = {
  all: ['clients'] as const,
  lists: () => [...clientKeys.all, 'list'] as const,
  list: (filters: ClientFilters) => [...clientKeys.lists(), filters] as const,
  details: () => [...clientKeys.all, 'detail'] as const,
  detail: (id: number) => [...clientKeys.details(), id] as const,
  units: (id: number) => [...clientKeys.all, 'units', id] as const,
  appointments: (id: number) => [...clientKeys.all, 'appointments', id] as const,
};

// Filter types
export interface ClientFilters {
  page?: number;
  per_page?: number;
  status?: 'active' | 'inactive' | 'archived' | 'all';
  facility_id?: number;
  case_manager_id?: number;
  search?: string;
}

// API response types - pagination fields at top level, not nested in data
interface ClientListResponse {
  success: boolean;
  data: Client[];
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
}

interface ClientDetailResponse {
  success: boolean;
  data: Client;
}

interface ClientCreateResponse {
  success: boolean;
  data: {
    client: Client;
    password: string;
  };
  message?: string;
}

interface ClientUnitsResponse {
  success: boolean;
  data: UnitBalance[];
}

// Fetch clients list
async function fetchClients(filters: ClientFilters): Promise<PaginatedResponse<Client>> {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== '' && value !== 'all') {
      params.append(key, String(value));
    }
  });

  const response = await api.get<ClientListResponse>(`/tenant-api/clients?${params}`);
  // API returns pagination fields at top level, restructure for PaginatedResponse
  return {
    data: response.data.data,
    current_page: response.data.current_page,
    per_page: response.data.per_page,
    total: response.data.total,
    last_page: response.data.last_page,
  };
}

// Fetch single client
async function fetchClient(id: number): Promise<Client> {
  const response = await api.get<ClientDetailResponse>(`/tenant-api/clients/${id}`);
  return response.data.data;
}

// Fetch client unit balances
async function fetchClientUnits(id: number): Promise<UnitBalance[]> {
  const response = await api.get<ClientUnitsResponse>(`/tenant-api/clients/${id}/units`);
  return response.data.data;
}

// Hook: Fetch clients list with pagination and filters
export function useClients(filters: ClientFilters = {}) {
  return useQuery({
    queryKey: clientKeys.list(filters),
    queryFn: () => fetchClients(filters),
    staleTime: 30 * 1000, // 30 seconds
  });
}

// Hook: Fetch single client
export function useClient(id: number) {
  return useQuery({
    queryKey: clientKeys.detail(id),
    queryFn: () => fetchClient(id),
    enabled: id > 0,
  });
}

// Hook: Fetch client unit balances
export function useClientUnits(id: number) {
  return useQuery({
    queryKey: clientKeys.units(id),
    queryFn: () => fetchClientUnits(id),
    enabled: id > 0,
  });
}

// Return type for create client - includes password
export interface CreateClientResult {
  client: Client;
  password: string;
}

// Hook: Create client
export function useCreateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<Client>): Promise<CreateClientResult> => {
      const response = await api.post<ClientCreateResponse>('/tenant-api/clients', data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clientKeys.all });
    },
  });
}

// Hook: Update client
export function useUpdateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Client> }) => {
      const response = await api.put<ClientDetailResponse>(`/tenant-api/clients/${id}`, data);
      return response.data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: clientKeys.all });
      queryClient.setQueryData(clientKeys.detail(data.id), data);
    },
  });
}

// Hook: Archive client
export function useArchiveClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await api.post<ClientDetailResponse>(`/tenant-api/clients/${id}/archive`);
      return response.data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: clientKeys.all });
      queryClient.setQueryData(clientKeys.detail(data.id), data);
    },
  });
}

// Hook: Restore archived client
export function useRestoreClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await api.post<ClientDetailResponse>(`/tenant-api/clients/${id}/restore`);
      return response.data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: clientKeys.all });
      queryClient.setQueryData(clientKeys.detail(data.id), data);
    },
  });
}

// Hook: Search clients (for autocomplete)
export function useClientSearch(query: string) {
  return useQuery({
    queryKey: [...clientKeys.all, 'search', query],
    queryFn: async () => {
      if (!query || query.length < 2) return [];
      const response = await api.get<{ success: boolean; data: Client[] }>(
        `/tenant-api/clients/search?q=${encodeURIComponent(query)}`
      );
      return response.data.data;
    },
    enabled: query.length >= 2,
    staleTime: 60 * 1000, // 1 minute
  });
}
