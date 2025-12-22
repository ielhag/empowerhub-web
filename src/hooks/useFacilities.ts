import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api/client';
import type { Facility } from '@/types';

export const facilityKeys = {
  all: ['facilities'] as const,
  list: () => [...facilityKeys.all, 'list'] as const,
  detail: (id: number) => [...facilityKeys.all, 'detail', id] as const,
};

interface FacilityListResponse {
  success?: boolean;
  data?: Facility[];
}

interface FacilityCreateResponse {
  success: boolean;
  facility: Facility;
  message?: string;
}

interface CreateFacilityData {
  name: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  vaccine_required?: boolean;
}

// Fetch facilities list
async function fetchFacilities(): Promise<Facility[]> {
  const response = await api.get<FacilityListResponse | Facility[]>('/tenant-api/facilities');
  // Handle both array response and wrapped response
  if (Array.isArray(response.data)) {
    return response.data;
  }
  return response.data.data || [];
}

// Create facility
async function createFacility(data: CreateFacilityData): Promise<Facility> {
  const response = await api.post<FacilityCreateResponse>('/tenant-api/facilities', data);
  return response.data.facility;
}

// Hook: Fetch facilities
export function useFacilities() {
  return useQuery({
    queryKey: facilityKeys.list(),
    queryFn: fetchFacilities,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook: Create facility
export function useCreateFacility() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createFacility,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: facilityKeys.all });
    },
  });
}

// Hook: Search facilities
export function useFacilitySearch(query: string, facilities: Facility[] = []) {
  if (!query) return [];

  return facilities.filter((f) =>
    f.name.toLowerCase().includes(query.toLowerCase())
  );
}
