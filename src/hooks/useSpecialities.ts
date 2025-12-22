import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api/client';
import type { Speciality } from '@/types';

export const specialityKeys = {
  all: ['specialities'] as const,
  list: () => [...specialityKeys.all, 'list'] as const,
  forClients: () => [...specialityKeys.all, 'for-clients'] as const,
};

interface SpecialityListResponse {
  success?: boolean;
  data?: Speciality[];
}

// Extended speciality type with rate info
export interface SpecialityWithRate extends Speciality {
  rate_description?: string;
  is_transportation?: boolean;
}

// Fetch specialities for clients (may have different filtering)
async function fetchSpecialitiesForClients(): Promise<SpecialityWithRate[]> {
  const response = await api.get<SpecialityListResponse | SpecialityWithRate[]>(
    '/tenant-api/specialities/for-clients'
  );
  // Handle both array response and wrapped response
  if (Array.isArray(response.data)) {
    return response.data;
  }
  return response.data.data || [];
}

// Fetch all specialities
async function fetchSpecialities(): Promise<SpecialityWithRate[]> {
  const response = await api.get<SpecialityListResponse | SpecialityWithRate[]>(
    '/tenant-api/specialities'
  );
  // Handle both array response and wrapped response
  if (Array.isArray(response.data)) {
    return response.data;
  }
  return response.data.data || [];
}

// Hook: Fetch specialities for client selection
export function useSpecialitiesForClients() {
  return useQuery({
    queryKey: specialityKeys.forClients(),
    queryFn: fetchSpecialitiesForClients,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Hook: Fetch all specialities
export function useSpecialities() {
  return useQuery({
    queryKey: specialityKeys.list(),
    queryFn: fetchSpecialities,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Helper to check if a speciality is transportation-related
export function isTransportationService(speciality: SpecialityWithRate): boolean {
  if (speciality.is_transportation) return true;
  const name = speciality.name.toLowerCase();
  return (
    name.includes('transport') ||
    name.includes('nemt') ||
    name.includes('ride') ||
    name.includes('travel')
  );
}
