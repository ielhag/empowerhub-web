import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api/client';
import type { TransportationTrip } from '@/types';
import { appointmentKeys } from './useAppointments';

// Trip creation data
interface CreateTripData {
  trip_type: 'outbound' | 'return';
  from_address: {
    address: string;
    city: string;
    state: string;
    zip: string;
  };
  to_address: {
    address: string;
    city: string;
    state: string;
    zip: string;
  };
  start_time: string;
  end_time: string;
  notes?: string;
}

// Trip creation response
interface CreateTripResponse {
  message: string;
  trip: TransportationTrip;
  miles_used: number;
  units_used: number;
  remaining_balance: number;
  team_compensation: number;
  transaction_reused?: boolean;
}

// Hook: Create transportation trip
export function useCreateTrip(appointmentId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateTripData): Promise<CreateTripResponse> => {
      const response = await api.post<CreateTripResponse>(
        `/tenant-api/appointments/${appointmentId}/trips`,
        data
      );
      return response.data;
    },
    onSuccess: () => {
      // Invalidate the appointment query to refetch with new trip
      queryClient.invalidateQueries({ queryKey: appointmentKeys.detail(appointmentId) });
    },
  });
}

// Hook: Delete transportation trip
export function useDeleteTrip(appointmentId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tripId: number): Promise<{ message: string }> => {
      const response = await api.delete<{ message: string }>(
        `/tenant-api/appointments/${appointmentId}/trips/${tripId}`
      );
      return response.data;
    },
    onSuccess: () => {
      // Invalidate the appointment query to refetch without deleted trip
      queryClient.invalidateQueries({ queryKey: appointmentKeys.detail(appointmentId) });
    },
  });
}

// Check if client has transportation service (speciality_id = 2)
export function hasTransportationService(specialities?: { id: number }[]): boolean {
  const TRANSPORTATION_SPECIALITY_ID = 2;
  return specialities?.some(s => s.id === TRANSPORTATION_SPECIALITY_ID) ?? false;
}

// Check if team member offers transportation (speciality_id = 2)
export function teamOffersTransportation(specialities?: { id: number }[]): boolean {
  const TRANSPORTATION_SPECIALITY_ID = 2;
  return specialities?.some(s => s.id === TRANSPORTATION_SPECIALITY_ID) ?? false;
}
