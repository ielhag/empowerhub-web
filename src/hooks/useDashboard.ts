import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api/client';
import type { DashboardStats, DashboardAppointments, Appointment } from '@/types';

// Query keys
export const dashboardKeys = {
  all: ['dashboard'] as const,
  stats: () => [...dashboardKeys.all, 'stats'] as const,
  appointments: () => [...dashboardKeys.all, 'appointments'] as const,
};

// Dashboard response type matching backend DashboardController
export interface DashboardData {
  stats: DashboardStats;
  appointments: DashboardAppointments;
  alerts: {
    pendingRequests: number;
    nemtToday: number;
  };
}

// API response types
interface DashboardResponse {
  success: boolean;
  data: DashboardData;
}

// Fetch dashboard data
async function fetchDashboard(): Promise<DashboardData> {
  const response = await api.get<DashboardResponse>('/tenant-api/dashboard');
  return response.data.data;
}

// Hook: Fetch dashboard data
export function useDashboard() {
  return useQuery({
    queryKey: dashboardKeys.all,
    queryFn: fetchDashboard,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Auto-refresh every minute
  });
}

// Hook: Fetch just stats (lighter weight)
export function useDashboardStats() {
  const { data, ...rest } = useDashboard();
  return {
    data: data?.stats,
    ...rest,
  };
}

// Hook: Fetch just appointments
export function useDashboardAppointments() {
  const { data, ...rest } = useDashboard();
  return {
    data: data?.appointments,
    ...rest,
  };
}

// Hook: Fetch alerts
export function useDashboardAlerts() {
  const { data, ...rest } = useDashboard();
  return {
    data: data?.alerts,
    ...rest,
  };
}
