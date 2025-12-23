import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api/client';
import type { TeamWorkingHours } from '@/types';

// ============================================================================
// Query Keys
// ============================================================================

export const workingHoursKeys = {
  all: ['working-hours'] as const,
  team: (teamId: number) => [...workingHoursKeys.all, 'team', teamId] as const,
};

// ============================================================================
// Types
// ============================================================================

// Form data for working hours (object with days as keys)
export interface WorkingHoursFormData {
  monday: { start: string; end: string; is_active: boolean };
  tuesday: { start: string; end: string; is_active: boolean };
  wednesday: { start: string; end: string; is_active: boolean };
  thursday: { start: string; end: string; is_active: boolean };
  friday: { start: string; end: string; is_active: boolean };
  saturday: { start: string; end: string; is_active: boolean };
  sunday: { start: string; end: string; is_active: boolean };
}

export type DayOfWeek = keyof WorkingHoursFormData;

export const DAYS_OF_WEEK: DayOfWeek[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

// Default working hours (9-5, weekdays active)
export const DEFAULT_WORKING_HOURS: WorkingHoursFormData = {
  monday: { start: '09:00', end: '17:00', is_active: true },
  tuesday: { start: '09:00', end: '17:00', is_active: true },
  wednesday: { start: '09:00', end: '17:00', is_active: true },
  thursday: { start: '09:00', end: '17:00', is_active: true },
  friday: { start: '09:00', end: '17:00', is_active: true },
  saturday: { start: '09:00', end: '17:00', is_active: false },
  sunday: { start: '09:00', end: '17:00', is_active: false },
};

// ============================================================================
// Hook: Get team member working hours
// ============================================================================

export function useWorkingHours(teamId: number) {
  return useQuery({
    queryKey: workingHoursKeys.team(teamId),
    queryFn: async (): Promise<WorkingHoursFormData> => {
      const response = await api.get<TeamWorkingHours[]>(
        `/api/team/schedule/team-members/${teamId}/working-hours`
      );

      // API returns an array of days, convert to form data format
      const data = response.data;

      // Start with defaults
      const formData: WorkingHoursFormData = { ...DEFAULT_WORKING_HOURS };

      // Mark all days as inactive first
      DAYS_OF_WEEK.forEach(day => {
        formData[day].is_active = false;
      });

      // Update with actual data
      if (Array.isArray(data)) {
        data.forEach(hours => {
          const day = hours.day_of_week as DayOfWeek;
          if (day && formData[day]) {
            formData[day] = {
              start: hours.start_time?.substring(0, 5) || '09:00', // Get HH:mm from HH:mm:ss
              end: hours.end_time?.substring(0, 5) || '17:00',
              is_active: true,
            };
          }
        });
      }

      return formData;
    },
    enabled: !!teamId,
  });
}

// ============================================================================
// Hook: Update working hours
// ============================================================================

export function useUpdateWorkingHours(teamId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: WorkingHoursFormData): Promise<void> => {
      await api.put(
        `/api/team/schedule/team-members/${teamId}/working-hours`,
        data
      );
    },
    onSuccess: () => {
      // Invalidate working hours and schedule builder
      queryClient.invalidateQueries({ queryKey: workingHoursKeys.team(teamId) });
      queryClient.invalidateQueries({ queryKey: ['schedule-builder'] });
    },
  });
}

// ============================================================================
// Helper: Format time for display
// ============================================================================

export function formatTimeDisplay(time: string): string {
  const [hours, minutes] = time.split(':');
  const h = parseInt(hours, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${h12}:${minutes} ${ampm}`;
}

// ============================================================================
// Helper: Capitalize day name
// ============================================================================

export function capitalizeDayName(day: DayOfWeek): string {
  return day.charAt(0).toUpperCase() + day.slice(1);
}
