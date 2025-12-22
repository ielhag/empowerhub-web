import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api/client';
import type { PayrollReport, ClientBillingReport } from '@/types';

// Query keys
export const reportsKeys = {
  all: ['reports'] as const,
  dashboard: () => [...reportsKeys.all, 'dashboard'] as const,
  payroll: (filters: any) => [...reportsKeys.all, 'payroll', filters] as const,
  billing: (filters: any) => [...reportsKeys.all, 'billing', filters] as const,
};

// API response types
interface ReportsDashboardResponse {
  success: boolean;
  data: {
    payrollSummary: any;
    clientBilling: any;
    unitUtilization: any;
  };
}

// Fetch reports dashboard data
async function fetchReportsDashboard(): Promise<ReportsDashboardResponse['data']> {
  const response = await api.get<ReportsDashboardResponse>('/tenant-api/reports/dashboard');
  return response.data.data;
}

// Hook: Fetch reports dashboard data
export function useReportsDashboard() {
  return useQuery({
    queryKey: reportsKeys.dashboard(),
    queryFn: fetchReportsDashboard,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// API response types
interface PayrollReportResponse {
  success: boolean;
  data: PayrollReport[];
}

// Fetch payroll report data
async function fetchPayrollReport(filters: any): Promise<PayrollReport[]> {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== '' && value !== 'all') {
      params.append(key, String(value));
    }
  });

  const response = await api.get<PayrollReportResponse>(`/tenant-api/reports/payroll?${params}`);
  return response.data.data;
}

// Hook: Fetch payroll report data
export function usePayrollReport(filters: any) {
  return useQuery({
    queryKey: reportsKeys.payroll(filters),
    queryFn: () => fetchPayrollReport(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// API response types
interface ClientBillingReportResponse {
  success: boolean;
  data: ClientBillingReport[];
}

// Fetch client billing report data
async function fetchClientBillingReport(filters: any): Promise<ClientBillingReport[]> {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== '' && value !== 'all') {
      params.append(key, String(value));
    }
  });

  const response = await api.get<ClientBillingReportResponse>(`/tenant-api/reports/billing?${params}`);
  return response.data.data;
}

// Hook: Fetch client billing report data
export function useClientBillingReport(filters: any) {
  return useQuery({
    queryKey: reportsKeys.billing(filters),
    queryFn: () => fetchClientBillingReport(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}