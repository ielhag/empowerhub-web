import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api/client';
import type { PayrollReport, ClientBillingReport, TeamMember, Client } from '@/types';

// Query keys
export const reportKeys = {
  all: ['reports'] as const,
  dashboard: () => [...reportKeys.all, 'dashboard'] as const,
  payroll: (filters: PayrollFilters) => [...reportKeys.all, 'payroll', filters] as const,
  billing: (filters: BillingFilters) => [...reportKeys.all, 'billing', filters] as const,
  teamPerformance: (filters: TeamPerformanceFilters) =>
    [...reportKeys.all, 'team-performance', filters] as const,
  unitUsage: (filters: UnitUsageFilters) => [...reportKeys.all, 'unit-usage', filters] as const,
};

// Filter types
export interface PayrollFilters {
  start_date: string;
  end_date: string;
  team_id?: number;
}

export interface BillingFilters {
  start_date: string;
  end_date: string;
  client_id?: number;
  speciality_id?: number;
}

export interface TeamPerformanceFilters {
  start_date: string;
  end_date: string;
  speciality_id?: number;
}

export interface UnitUsageFilters {
  month: number;
  year: number;
  speciality_id?: number;
}

// Dashboard types
export interface ReportsDashboard {
  payroll_summary: {
    total_hours: number;
    total_amount: number;
    staff_count: number;
    period: string;
  };
  billing_summary: {
    total_units: number;
    total_amount: number;
    clients_count: number;
    period: string;
  };
  unit_utilization: {
    allocated: number;
    used: number;
    percentage: number;
  };
  trends: {
    label: string;
    hours: number;
    units: number;
    amount: number;
  }[];
}

// Team Performance types
export interface TeamPerformanceData {
  team_member: TeamMember;
  total_appointments: number;
  completed_appointments: number;
  completion_rate: number;
  total_hours: number;
  on_time_rate: number;
  client_satisfaction?: number;
  units_delivered: number;
}

// Unit Usage types
export interface UnitUsageData {
  client: Client;
  speciality_name: string;
  allocated_units: number;
  used_units: number;
  remaining_units: number;
  usage_percentage: number;
}

// API response types
interface DashboardResponse {
  success: boolean;
  data: ReportsDashboard;
}

interface PayrollResponse {
  success: boolean;
  data: PayrollReport[];
}

interface BillingResponse {
  success: boolean;
  data: ClientBillingReport[];
}

interface TeamPerformanceResponse {
  success: boolean;
  data: TeamPerformanceData[];
}

interface UnitUsageResponse {
  success: boolean;
  data: UnitUsageData[];
}

// Fetch reports dashboard
async function fetchReportsDashboard(): Promise<ReportsDashboard> {
  const response = await api.get<DashboardResponse>('/tenant-api/reports/dashboard');
  return response.data.data;
}

// Fetch payroll report
async function fetchPayrollReport(filters: PayrollFilters): Promise<PayrollReport[]> {
  const params = new URLSearchParams();
  params.append('start_date', filters.start_date);
  params.append('end_date', filters.end_date);
  if (filters.team_id) params.append('team_id', String(filters.team_id));

  const response = await api.get<PayrollResponse>(`/tenant-api/reports/payroll?${params}`);
  return response.data.data;
}

// Fetch billing report
async function fetchBillingReport(filters: BillingFilters): Promise<ClientBillingReport[]> {
  const params = new URLSearchParams();
  params.append('start_date', filters.start_date);
  params.append('end_date', filters.end_date);
  if (filters.client_id) params.append('client_id', String(filters.client_id));
  if (filters.speciality_id) params.append('speciality_id', String(filters.speciality_id));

  const response = await api.get<BillingResponse>(`/tenant-api/reports/billing?${params}`);
  return response.data.data;
}

// Fetch team performance report
async function fetchTeamPerformance(
  filters: TeamPerformanceFilters
): Promise<TeamPerformanceData[]> {
  const params = new URLSearchParams();
  params.append('start_date', filters.start_date);
  params.append('end_date', filters.end_date);
  if (filters.speciality_id) params.append('speciality_id', String(filters.speciality_id));

  const response = await api.get<TeamPerformanceResponse>(
    `/tenant-api/reports/team-performance?${params}`
  );
  return response.data.data;
}

// Fetch unit usage report
async function fetchUnitUsage(filters: UnitUsageFilters): Promise<UnitUsageData[]> {
  const params = new URLSearchParams();
  params.append('month', String(filters.month));
  params.append('year', String(filters.year));
  if (filters.speciality_id) params.append('speciality_id', String(filters.speciality_id));

  const response = await api.get<UnitUsageResponse>(
    `/tenant-api/reports/unit-usage?${params}`
  );
  return response.data.data;
}

// Hook: Fetch reports dashboard
export function useReportsDashboard() {
  return useQuery({
    queryKey: reportKeys.dashboard(),
    queryFn: fetchReportsDashboard,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook: Fetch payroll report
export function usePayrollReport(filters: PayrollFilters) {
  return useQuery({
    queryKey: reportKeys.payroll(filters),
    queryFn: () => fetchPayrollReport(filters),
    enabled: !!filters.start_date && !!filters.end_date,
  });
}

// Hook: Fetch billing report
export function useBillingReport(filters: BillingFilters) {
  return useQuery({
    queryKey: reportKeys.billing(filters),
    queryFn: () => fetchBillingReport(filters),
    enabled: !!filters.start_date && !!filters.end_date,
  });
}

// Hook: Fetch team performance report
export function useTeamPerformance(filters: TeamPerformanceFilters) {
  return useQuery({
    queryKey: reportKeys.teamPerformance(filters),
    queryFn: () => fetchTeamPerformance(filters),
    enabled: !!filters.start_date && !!filters.end_date,
  });
}

// Hook: Fetch unit usage report
export function useUnitUsage(filters: UnitUsageFilters) {
  return useQuery({
    queryKey: reportKeys.unitUsage(filters),
    queryFn: () => fetchUnitUsage(filters),
    enabled: filters.month > 0 && filters.year > 0,
  });
}
