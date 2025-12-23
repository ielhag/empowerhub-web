'use client';

import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  useCreateTrip,
  useDeleteTrip,
  hasTransportationService,
  teamOffersTransportation,
} from '@/hooks/useTransportationTrips';
import { useAuthStore } from '@/stores/auth';
import type { Appointment, TransportationTrip, Speciality } from '@/types';
import {
  Car,
  MapPin,
  Clock,
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  X,
  ArrowRight,
  Navigation,
} from 'lucide-react';

interface TransportationSectionProps {
  appointment: Appointment;
}

interface AddressInput {
  address: string;
  city: string;
  state: string;
  zip: string;
}

const emptyAddress: AddressInput = {
  address: '',
  city: '',
  state: '',
  zip: '',
};

export function TransportationSection({ appointment }: TransportationSectionProps) {
  const { user, isAdmin, isSuperAdmin } = useAuthStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [tripType, setTripType] = useState<'outbound' | 'return'>('outbound');
  const [fromAddress, setFromAddress] = useState<AddressInput>(emptyAddress);
  const [toAddress, setToAddress] = useState<AddressInput>(emptyAddress);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const createTripMutation = useCreateTrip(appointment.id);
  const deleteTripMutation = useDeleteTrip(appointment.id);

  // Get client and team specialities
  const clientSpecialities = (appointment.client as { specialities?: Speciality[] })?.specialities;
  const teamSpecialities = (appointment.team as { specialities?: Speciality[] })?.specialities;

  // Check if transportation section should be visible
  const clientHasTransportation = hasTransportationService(clientSpecialities);

  // If client doesn't have transportation service, don't show the section
  if (!clientHasTransportation) {
    return null;
  }

  // Check if user can add trips
  const isAssignedTeamMember = user?.team?.id === appointment.team_id;
  const isAdminOrSuperAdmin = isAdmin() || isSuperAdmin();
  const teamCanTransport = teamOffersTransportation(teamSpecialities);
  const appointmentCanHaveTrips = ['in_progress', 'completed', 'terminated_by_client', 'terminated_by_staff'].includes(appointment.status);

  // Can add if: appointment is in eligible status AND (is admin OR is assigned team member who offers transportation)
  const canAddTrip = appointmentCanHaveTrips && (isAdminOrSuperAdmin || (isAssignedTeamMember && teamCanTransport));

  // Check if trip type already exists
  const hasOutboundTrip = appointment.trips?.some(t => t.trip_type === 'outbound' && t.status !== 'cancelled');
  const hasReturnTrip = appointment.trips?.some(t => t.trip_type === 'return' && t.status !== 'cancelled');

  const resetForm = () => {
    setTripType('outbound');
    setFromAddress(emptyAddress);
    setToAddress(emptyAddress);
    setStartTime('');
    setEndTime('');
    setNotes('');
    setFormError(null);
  };

  const openAddModal = () => {
    resetForm();
    // Pre-select trip type based on what's already added
    if (hasOutboundTrip && !hasReturnTrip) {
      setTripType('return');
    }
    setShowAddModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validate required fields
    if (!fromAddress.address || !fromAddress.city || !fromAddress.state || !fromAddress.zip) {
      setFormError('Please fill in all pickup address fields');
      return;
    }
    if (!toAddress.address || !toAddress.city || !toAddress.state || !toAddress.zip) {
      setFormError('Please fill in all dropoff address fields');
      return;
    }
    if (!startTime || !endTime) {
      setFormError('Please select start and end times');
      return;
    }

    // Combine date with time
    const appointmentDate = appointment.date;
    const startDateTime = `${appointmentDate}T${startTime}:00`;
    const endDateTime = `${appointmentDate}T${endTime}:00`;

    try {
      await createTripMutation.mutateAsync({
        trip_type: tripType,
        from_address: fromAddress,
        to_address: toAddress,
        start_time: startDateTime,
        end_time: endDateTime,
        notes: notes || undefined,
      });
      setShowAddModal(false);
      resetForm();
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } } };
      setFormError(error.response?.data?.message || 'Failed to add transportation record');
    }
  };

  const handleDelete = async (tripId: number) => {
    if (!confirm('Are you sure you want to delete this transportation record? This will also reverse the mileage charges.')) {
      return;
    }
    try {
      await deleteTripMutation.mutateAsync(tripId);
    } catch (err) {
      console.error('Failed to delete trip:', err);
    }
  };

  const formatTripTime = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return format(parseISO(dateString), 'h:mm a');
    } catch {
      return 'N/A';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Car className="w-5 h-5 text-violet-600 dark:text-violet-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Transportation Mileage
          </h2>
        </div>
        {canAddTrip && (!hasOutboundTrip || !hasReturnTrip) && (
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Trip
          </button>
        )}
      </div>

      {/* Content */}
      <div className="px-4 sm:px-6 py-4">
        {appointment.trips && appointment.trips.length > 0 ? (
          <div className="space-y-4">
            {appointment.trips.map((trip) => (
              <div
                key={trip.id}
                className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                        trip.trip_type === 'outbound'
                          ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200'
                          : 'bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200'
                      )}
                    >
                      {trip.trip_type === 'outbound' ? 'Outbound Trip' : 'Return Trip'}
                    </span>
                    <span
                      className={cn(
                        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                        trip.status === 'completed'
                          ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200'
                          : 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200'
                      )}
                    >
                      {trip.status}
                    </span>
                  </div>
                  {canAddTrip && (
                    <button
                      onClick={() => handleDelete(trip.id)}
                      disabled={deleteTripMutation.isPending}
                      className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded transition-colors"
                      title="Delete trip"
                    >
                      {deleteTripMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  )}
                </div>

                {/* Route */}
                <div className="flex items-start gap-2 mb-3">
                  <Navigation className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-600 dark:text-gray-400">
                        {trip.from_address?.address}, {trip.from_address?.city}
                      </span>
                      <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="text-gray-600 dark:text-gray-400">
                        {trip.to_address?.address}, {trip.to_address?.city}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="block text-gray-500 dark:text-gray-400">Distance</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {trip.distance_miles} miles
                    </span>
                  </div>
                  <div>
                    <span className="block text-gray-500 dark:text-gray-400">Time</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formatTripTime(trip.start_time)} - {formatTripTime(trip.end_time)}
                    </span>
                  </div>
                  {trip.duration_minutes !== undefined && (
                    <div>
                      <span className="block text-gray-500 dark:text-gray-400">Duration</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {trip.duration_minutes} min
                      </span>
                    </div>
                  )}
                  {trip.units_used !== undefined && (
                    <div>
                      <span className="block text-gray-500 dark:text-gray-400">Units</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {trip.units_used}
                      </span>
                    </div>
                  )}
                </div>

                {/* Notes */}
                {trip.notes && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Notes: </span>
                    <span className="text-sm text-gray-700 dark:text-gray-300">{trip.notes}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Car className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-gray-500 dark:text-gray-400">No transportation records</p>
            {canAddTrip && (
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                Click &quot;Add Trip&quot; to record transportation mileage
              </p>
            )}
            {!canAddTrip && !appointmentCanHaveTrips && (
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                Transportation can be added once the appointment is in progress
              </p>
            )}
          </div>
        )}
      </div>

      {/* Add Trip Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div
            className="fixed inset-0 bg-black/50 transition-opacity"
            onClick={() => setShowAddModal(false)}
          />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-xl shadow-xl">
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Add Transportation Record
                </h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Form */}
              <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
                {/* Error Message */}
                {formError && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700 dark:text-red-300">{formError}</p>
                  </div>
                )}

                {/* Trip Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Trip Type
                  </label>
                  <div className="flex gap-3">
                    <label
                      className={cn(
                        'flex-1 p-3 rounded-lg border-2 cursor-pointer transition-all text-center',
                        tripType === 'outbound'
                          ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-violet-300',
                        hasOutboundTrip && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      <input
                        type="radio"
                        name="trip_type"
                        value="outbound"
                        checked={tripType === 'outbound'}
                        onChange={() => setTripType('outbound')}
                        disabled={hasOutboundTrip}
                        className="sr-only"
                      />
                      <span className="text-sm font-medium">Outbound</span>
                    </label>
                    <label
                      className={cn(
                        'flex-1 p-3 rounded-lg border-2 cursor-pointer transition-all text-center',
                        tripType === 'return'
                          ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-violet-300',
                        hasReturnTrip && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      <input
                        type="radio"
                        name="trip_type"
                        value="return"
                        checked={tripType === 'return'}
                        onChange={() => setTripType('return')}
                        disabled={hasReturnTrip}
                        className="sr-only"
                      />
                      <span className="text-sm font-medium">Return</span>
                    </label>
                  </div>
                </div>

                {/* Pickup Address */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <MapPin className="w-4 h-4 inline mr-1" />
                    {tripType === 'outbound' ? 'Pickup Location' : 'Return Pickup Location'}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={fromAddress.address}
                      onChange={(e) => setFromAddress({ ...fromAddress, address: e.target.value })}
                      placeholder="Street Address"
                      className="col-span-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    />
                    <input
                      type="text"
                      value={fromAddress.city}
                      onChange={(e) => setFromAddress({ ...fromAddress, city: e.target.value })}
                      placeholder="City"
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    />
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={fromAddress.state}
                        onChange={(e) => setFromAddress({ ...fromAddress, state: e.target.value })}
                        placeholder="State"
                        className="w-20 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      />
                      <input
                        type="text"
                        value={fromAddress.zip}
                        onChange={(e) => setFromAddress({ ...fromAddress, zip: e.target.value })}
                        placeholder="ZIP"
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Dropoff Address */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <MapPin className="w-4 h-4 inline mr-1" />
                    {tripType === 'outbound' ? 'Dropoff Location' : 'Return Dropoff Location'}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={toAddress.address}
                      onChange={(e) => setToAddress({ ...toAddress, address: e.target.value })}
                      placeholder="Street Address"
                      className="col-span-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    />
                    <input
                      type="text"
                      value={toAddress.city}
                      onChange={(e) => setToAddress({ ...toAddress, city: e.target.value })}
                      placeholder="City"
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    />
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={toAddress.state}
                        onChange={(e) => setToAddress({ ...toAddress, state: e.target.value })}
                        placeholder="State"
                        className="w-20 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      />
                      <input
                        type="text"
                        value={toAddress.zip}
                        onChange={(e) => setToAddress({ ...toAddress, zip: e.target.value })}
                        placeholder="ZIP"
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Times */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      <Clock className="w-4 h-4 inline mr-1" />
                      {tripType === 'outbound' ? 'Pickup Time' : 'Return Pickup Time'}
                    </label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      <Clock className="w-4 h-4 inline mr-1" />
                      {tripType === 'outbound' ? 'Dropoff Time' : 'Return Dropoff Time'}
                    </label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    placeholder="Any additional notes about this trip..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm resize-none"
                  />
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createTripMutation.isPending}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                  >
                    {createTripMutation.isPending && (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    )}
                    Save Trip
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
