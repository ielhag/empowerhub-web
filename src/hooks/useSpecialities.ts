import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api/client';
import type { Speciality } from '@/types';

// Query keys
export const specialitiesKeys = {
  all: ['specialities'] as const,
};

// API response types
interface SpecialitiesResponse {
  success: boolean;
  data: Speciality[];
}

// Fetch specialities list
async function fetchSpecialities(): Promise<Speciality[]> {
  const response = await api.get<SpecialitiesResponse>('/tenant-api/specialities');
  return response.data.data;
}

// Hook: Fetch specialities list
export function useSpecialities() {
  return useQuery({
    queryKey: specialitiesKeys.all,
    queryFn: fetchSpecialities,
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}