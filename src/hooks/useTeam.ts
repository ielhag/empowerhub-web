import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api/client';
import type { TeamMember, PaginatedResponse } from '@/types';

// Query keys
export const teamKeys = {
  all: ['team'] as const,
  lists: () => [...teamKeys.all, 'list'] as const,
  list: (filters: TeamFilters) => [...teamKeys.lists(), filters] as const,
  details: () => [...teamKeys.all, 'detail'] as const,
  detail: (id: number) => [...teamKeys.details(), id] as const,
};

// Filter types
export interface TeamFilters {
  page?: number;
  per_page?: number;
  status?: 'active' | 'inactive' | 'archived' | 'all';
  search?: string;
}

// API response types
interface TeamListResponse {
  success: boolean;
  data: TeamMember[];
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
}

// Fetch team list
async function fetchTeam(filters: TeamFilters): Promise<PaginatedResponse<TeamMember>> {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== '' && value !== 'all') {
      params.append(key, String(value));
    }
  });

  const response = await api.get<TeamListResponse>(`/tenant-api/team?${params}`);
  
  return {
    data: response.data.data,
    current_page: response.data.current_page,
    per_page: response.data.per_page,
    total: response.data.total,
    last_page: response.data.last_page,
  };
}

// Hook: Fetch team list with pagination and filters
export function useTeam(filters: TeamFilters = {}) {
  return useQuery({
    queryKey: teamKeys.list(filters),
    queryFn: () => fetchTeam(filters),
    staleTime: 30 * 1000, // 30 seconds
  });
}

// API response types
interface TeamMemberResponse {
  success: boolean;
  data: TeamMember;
}

// Fetch single team member
async function fetchTeamMember(id: number): Promise<TeamMember> {
  const response = await api.get<TeamMemberResponse>(`/tenant-api/team/${id}`);
  return response.data.data;
}

// Hook: Fetch single team member
export function useTeamMember(id: number) {
  return useQuery({
    queryKey: teamKeys.detail(id),
    queryFn: () => fetchTeamMember(id),
    enabled: id > 0,
  });
}