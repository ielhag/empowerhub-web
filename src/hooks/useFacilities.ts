import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api/client";
import type { Facility } from "@/types";

export const facilityKeys = {
  all: ["facilities"] as const,
  list: () => [...facilityKeys.all, "list"] as const,
  detail: (id: number) => [...facilityKeys.all, "detail", id] as const,
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

interface FacilityDetailResponse {
  success: boolean;
  data: {
    facility: Facility & {
      clients: Array<{
        id: number;
        client_id: string;
        name: string;
        status: number;
        phone?: string;
        upcoming_appointments_count: number;
        specialities: Array<{
          id: number;
          name: string;
          short_name: string;
        }>;
      }>;
    };
  };
}

// Fetch facilities list
async function fetchFacilities(): Promise<Facility[]> {
  const response = await api.get<FacilityListResponse | Facility[]>(
    "/tenant-api/facilities"
  );
  // Handle both array response and wrapped response
  if (Array.isArray(response.data)) {
    return response.data;
  }
  return response.data.data || [];
}

// Fetch facility by ID with clients
async function fetchFacilityById(id: number) {
  const response = await api.get<FacilityDetailResponse>(
    `/tenant-api/facilities/${id}`
  );
  return response.data.data.facility;
}

// Create facility
async function createFacility(data: CreateFacilityData): Promise<Facility> {
  const response = await api.post<FacilityCreateResponse>(
    "/tenant-api/facilities",
    data
  );
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

// Hook: Fetch facility by ID with clients
export function useFacilityById(id: string | number) {
  const numericId = typeof id === "string" ? parseInt(id, 10) : id;

  return useQuery({
    queryKey: facilityKeys.detail(numericId),
    queryFn: () => fetchFacilityById(numericId),
    enabled: !isNaN(numericId) && numericId > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Facility schedule types
export interface ScheduleAppointment {
  id: number;
  client_id: number;
  client_name: string;
  team_id?: number;
  team_name?: string;
  speciality_name: string;
  start_time: string;
  end_time: string;
  status: string;
  location_type: string;
  units_required?: number;
  nemt_occurrence_id?: number | null; // Indicates transportation is included
  title?: string;
}

export interface DaySchedule {
  date: string;
  appointments: ScheduleAppointment[];
}

interface FacilityScheduleResponse {
  success: boolean;
  data: {
    facility: {
      id: number;
      name: string;
    };
    schedule: Record<string, DaySchedule>;
  };
}

// Fetch facility schedule for a date range
async function fetchFacilitySchedule(
  facilityId: number,
  startDate: string,
  endDate: string
) {
  const params = new URLSearchParams({
    start_date: startDate,
    end_date: endDate,
  });

  const response = await api.get<FacilityScheduleResponse>(
    `/tenant-api/facilities/${facilityId}/schedule?${params}`
  );
  return response.data.data;
}

// Hook: Fetch facility schedule
export function useFacilitySchedule(
  facilityId: string | number,
  startDate: string,
  endDate: string
) {
  const numericId =
    typeof facilityId === "string" ? parseInt(facilityId, 10) : facilityId;

  return useQuery({
    queryKey: [
      ...facilityKeys.detail(numericId),
      "schedule",
      startDate,
      endDate,
    ],
    queryFn: () => fetchFacilitySchedule(numericId, startDate, endDate),
    enabled: !isNaN(numericId) && numericId > 0 && !!startDate && !!endDate,
    staleTime: 30 * 1000, // 30 seconds
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
