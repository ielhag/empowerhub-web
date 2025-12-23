import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api/client";

// Types
export interface SpecialityColor {
  bg: string;
  text: string;
  border: string;
  hover: string;
}

export interface Speciality {
  id: number;
  name: string;
  short_name: string;
  description: string;
  service_code: string;
  service_code_modifier: string | null;
  service_code_description: string;
  rate_description: string | null;
  rate?: number; // Only visible to super admins
  status: boolean;
  is_coach: boolean;
  color: SpecialityColor;
  teams_count: number;
  created_at: string;
  updated_at: string;
}

export interface SpecialityStats {
  total_units_allocated: number;
  total_units_used: number;
  active_clients: number;
  assigned_coaches: number;
}

export interface ChartDataPoint {
  month: string;
  allocation: number;
  usage: number;
}

export interface TeamMember {
  id: number;
  name: string;
  phone: string | null;
  initials: string;
}

export interface SpecialityClient {
  id: number;
  name: string;
  initials: string;
  current_balance: number;
}

export interface UpcomingAppointment {
  id: number;
  client_id: number;
  client_name: string;
  team_id: number | null;
  team_name: string;
  start_time: string;
  units_required: number;
}

export interface RateHistoryItem {
  id: number;
  rate: number;
  rate_description: string | null;
  effective_from: string;
  effective_to: string | null;
  reason: string | null;
}

export interface SpecialityFilters {
  search?: string;
  status?: string;
  is_coach?: string;
}

// Simpler type for client forms - matches ForClientsResponse structure
export interface SpecialityWithRate {
  id: number;
  name: string;
  short_name: string;
  description: string;
  rate_description?: string | null;
}

export interface CreateSpecialityData {
  name: string;
  description: string;
  service_code: string;
  service_code_description: string;
  service_code_modifier?: string;
  status: number;
  is_coach: boolean;
  rate?: number;
  rate_description?: string;
}

export interface UpdateSpecialityData extends Partial<CreateSpecialityData> {
  effective_date?: string;
  rate_change_reason?: string;
}

// Query keys
export const specialityKeys = {
  all: ["specialities"] as const,
  lists: () => [...specialityKeys.all, "list"] as const,
  list: (filters: SpecialityFilters) => [...specialityKeys.lists(), filters] as const,
  details: () => [...specialityKeys.all, "detail"] as const,
  detail: (id: number) => [...specialityKeys.details(), id] as const,
  rateInfo: (id: number) => [...specialityKeys.all, "rate-info", id] as const,
  forClients: () => [...specialityKeys.all, "for-clients"] as const,
};

// API response types
interface SpecialityListResponse {
  success: boolean;
  data: {
    data: Speciality[];
    is_super_admin: boolean;
  };
}

interface SpecialityDetailResponse {
  success: boolean;
  data: {
    speciality: Speciality;
    stats: SpecialityStats;
    chart_data: ChartDataPoint[];
    teams: TeamMember[];
    clients: SpecialityClient[];
    appointments: UpcomingAppointment[];
    is_super_admin: boolean;
  };
}

interface RateInfoResponse {
  success: boolean;
  data: {
    current_rate: number;
    rate_description: string | null;
    history: RateHistoryItem[];
  };
}

interface ForClientsResponse {
  success: boolean;
  data: SpecialityWithRate[];
}

// Fetch specialities list
async function fetchSpecialities(filters: SpecialityFilters): Promise<{
  data: Speciality[];
  is_super_admin: boolean;
}> {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      params.append(key, String(value));
    }
  });

  const response = await api.get<SpecialityListResponse>(
    `/tenant-api/specialities?${params}`
  );

  return response.data.data;
}

// Fetch single speciality
async function fetchSpeciality(id: number): Promise<{
  speciality: Speciality;
  stats: SpecialityStats;
  chart_data: ChartDataPoint[];
  teams: TeamMember[];
  clients: SpecialityClient[];
  appointments: UpcomingAppointment[];
  is_super_admin: boolean;
}> {
  const response = await api.get<SpecialityDetailResponse>(
    `/tenant-api/specialities/${id}`
  );
  return response.data.data;
}

// Fetch specialities for client forms
async function fetchSpecialitiesForClients(): Promise<SpecialityWithRate[]> {
  const response = await api.get<ForClientsResponse>(
    `/tenant-api/specialities/for-clients`
  );
  return response.data.data;
}

// Fetch rate info
async function fetchRateInfo(
  id: number
): Promise<{
  current_rate: number;
  rate_description: string | null;
  history: RateHistoryItem[];
}> {
  const response = await api.get<RateInfoResponse>(
    `/tenant-api/specialities/${id}/rate-info`
  );
  return response.data.data;
}

// Hook: Fetch specialities list
export function useSpecialities(filters: SpecialityFilters = {}) {
  return useQuery({
    queryKey: specialityKeys.list(filters),
    queryFn: () => fetchSpecialities(filters),
    staleTime: 30 * 1000,
  });
}

// Hook: Fetch single speciality
export function useSpeciality(id: number) {
  return useQuery({
    queryKey: specialityKeys.detail(id),
    queryFn: () => fetchSpeciality(id),
    enabled: id > 0,
  });
}

// Hook: Fetch specialities for clients
export function useSpecialitiesForClients() {
  return useQuery({
    queryKey: specialityKeys.forClients(),
    queryFn: fetchSpecialitiesForClients,
    staleTime: 60 * 1000,
  });
}

// Hook: Fetch rate info (super admin only)
export function useRateInfo(id: number, enabled = true) {
  return useQuery({
    queryKey: specialityKeys.rateInfo(id),
    queryFn: () => fetchRateInfo(id),
    enabled: id > 0 && enabled,
  });
}

// Hook: Create speciality
export function useCreateSpeciality() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateSpecialityData) => {
      const response = await api.post<{
        success: boolean;
        data: { message: string; data: Speciality };
      }>("/tenant-api/specialities", data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: specialityKeys.all });
    },
  });
}

// Hook: Update speciality
export function useUpdateSpeciality() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: UpdateSpecialityData;
    }) => {
      const response = await api.put<{
        success: boolean;
        data: { message: string; data: Speciality };
      }>(`/tenant-api/specialities/${id}`, data);
      return response.data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: specialityKeys.all });
      queryClient.invalidateQueries({
        queryKey: specialityKeys.detail(variables.id),
      });
    },
  });
}

// Hook: Delete speciality
export function useDeleteSpeciality() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/tenant-api/specialities/${id}`);
      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: specialityKeys.all });
      queryClient.removeQueries({ queryKey: specialityKeys.detail(id) });
    },
  });
}

// Helper to check if a speciality is transportation-related
export function isTransportationService(speciality: Speciality | SpecialityWithRate): boolean {
  const name = speciality.name.toLowerCase();
  const serviceCode = 'service_code' in speciality ? speciality.service_code : '';
  return (
    name.includes("transport") ||
    name.includes("nemt") ||
    name.includes("ride") ||
    name.includes("travel") ||
    serviceCode === "S0215"
  );
}
