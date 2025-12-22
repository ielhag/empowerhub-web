import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api/client';
import type { Appointment } from '@/types';

// Query keys
export const scheduleKeys = {
  all: ['schedule'] as const,
  list: (filters: any) => [...scheduleKeys.all, 'list', filters] as const,
};

// API response types
interface ScheduleResponse {
  success: boolean;
  data: Appointment[];
}

// Fetch schedule data
async function fetchSchedule(filters: any): Promise<Appointment[]> {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== '' && value !== 'all') {
      params.append(key, String(value));
    }
  });

  const response = await api.get<ScheduleResponse>(`/tenant-api/schedule?${params}`);
  return response.data.data;
}

// Hook: Fetch schedule data
export function useSchedule(filters: any) {
  return useQuery({
    queryKey: scheduleKeys.list(filters),
    queryFn: () => fetchSchedule(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}