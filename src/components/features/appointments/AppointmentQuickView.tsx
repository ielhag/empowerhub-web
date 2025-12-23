'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  useAppointment,
  useStartAppointment,
  useCompleteAppointment,
  useCancelAppointment,
  useAssignToSelf,
} from '@/hooks/useAppointments';
import { useAuthStore } from '@/stores/auth';
import { cn, formatDate, formatTime } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { FormModal } from '@/components/ui/Modal';
import {
  X,
  Calendar,
  Clock,
  User,
  MapPin,
  Edit,
  Play,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  ExternalLink,
  Timer,
  UserPlus,
  Bus,
  FileText,
  Users,
  Briefcase,
} from 'lucide-react';

interface AppointmentQuickViewProps {
  appointmentId: number;
  isOpen: boolean;
  onClose: () => void;
}

export function AppointmentQuickView({
  appointmentId,
  isOpen,
  onClose,
}: AppointmentQuickViewProps) {
  const router = useRouter();
  const { isAdmin, isSuperAdmin, isStaff } = useAuthStore();

  const { data: appointment, isLoading, error } = useAppointment(appointmentId, { enabled: isOpen });

  const startMutation = useStartAppointment();
  const completeMutation = useCompleteAppointment();
  const cancelMutation = useCancelAppointment();
  const assignToSelfMutation = useAssignToSelf();

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completeNotes, setCompleteNotes] = useState('');

  if (!isOpen) return null;

  // Loading state
  if (isLoading) {
    return (
      <SlideOverPanel onClose={onClose}>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
        </div>
      </SlideOverPanel>
    );
  }

  // Error state
  if (error || !appointment) {
    return (
      <SlideOverPanel onClose={onClose}>
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
          <p className="text-gray-600 dark:text-gray-400">
            Failed to load appointment
          </p>
        </div>
      </SlideOverPanel>
    );
  }

  // Action handlers
  const handleStart = async () => {
    try {
      await startMutation.mutateAsync(appointmentId);
    } catch (err) {
      console.error('Failed to start appointment:', err);
    }
  };

  const handleComplete = async () => {
    try {
      await completeMutation.mutateAsync({ id: appointmentId, notes: completeNotes });
      setShowCompleteModal(false);
      setCompleteNotes('');
    } catch (err) {
      console.error('Failed to complete appointment:', err);
    }
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) return;
    try {
      await cancelMutation.mutateAsync({ id: appointmentId, reason: cancelReason });
      setShowCancelModal(false);
      setCancelReason('');
      onClose();
    } catch (err) {
      console.error('Failed to cancel appointment:', err);
    }
  };

  const handleAssignToSelf = async () => {
    try {
      await assignToSelfMutation.mutateAsync(appointmentId);
    } catch (err) {
      console.error('Failed to assign appointment:', err);
    }
  };

  // Permission checks
  const isAdminOrSuperAdmin = isAdmin() || isSuperAdmin();
  const canEdit = isAdminOrSuperAdmin && !['completed', 'cancelled', 'no_show', 'deleted'].includes(appointment.status);
  const canStart = appointment.status === 'scheduled' && appointment.team_id;
  const canComplete = appointment.status === 'in_progress';
  const canCancel = isAdminOrSuperAdmin && ['scheduled', 'unassigned'].includes(appointment.status);
  const canAssignToSelf = appointment.status === 'unassigned' && !appointment.team_id;

  // Client and Team info
  const clientName = appointment.client?.user?.name || appointment.client?.name || 'Unknown';
  const clientInitials = clientName.split(' ').map((n: string) => n[0]).join('').toUpperCase();
  const teamName = appointment.team?.name || appointment.historical_team_member_name || 'Unassigned';
  const teamInitials = teamName !== 'Unassigned'
    ? teamName.split(' ').map((n: string) => n[0]).join('').toUpperCase()
    : 'U';

  // Map URL
  const mapUrl = appointment.address?.latitude && appointment.address?.longitude
    ? `https://www.google.com/maps?q=${appointment.address.latitude},${appointment.address.longitude}`
    : null;

  return (
    <>
      <SlideOverPanel onClose={onClose}>
        {/* Header */}
        <div className="px-4 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
              <span className="text-sm font-medium text-violet-700 dark:text-violet-200">
                {clientInitials}
              </span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                {appointment.title || `Appointment with ${clientName}`}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                ID: {appointment.id}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Status & Actions */}
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={appointment.status} type="appointment" />

            {/* Cover Request Indicator */}
            {appointment.has_cover_request && (
              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300 rounded border border-yellow-300 dark:border-yellow-600">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Cover Requested
              </span>
            )}

            {/* NEMT Indicator */}
            {appointment.nemt_occurrence_id && (
              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300 rounded border border-violet-300 dark:border-violet-600">
                <Bus className="w-3.5 h-3.5" />
                NEMT
              </span>
            )}

            {canAssignToSelf && (
              <button
                onClick={handleAssignToSelf}
                disabled={assignToSelfMutation.isPending}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-600 hover:bg-green-700 text-white rounded transition-colors disabled:opacity-50"
              >
                {assignToSelfMutation.isPending ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <UserPlus className="w-3 h-3" />
                )}
                Assign to Self
              </button>
            )}

            {canStart && (
              <button
                onClick={handleStart}
                disabled={startMutation.isPending}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-violet-600 hover:bg-violet-700 text-white rounded transition-colors disabled:opacity-50"
              >
                {startMutation.isPending ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Play className="w-3 h-3" />
                )}
                Start
              </button>
            )}

            {canComplete && (
              <button
                onClick={() => setShowCompleteModal(true)}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
              >
                <CheckCircle2 className="w-3 h-3" />
                Complete
              </button>
            )}

            {canCancel && (
              <button
                onClick={() => setShowCancelModal(true)}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium border border-red-300 dark:border-red-600 text-red-700 dark:text-red-200 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
              >
                <XCircle className="w-3 h-3" />
                Cancel
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Date & Time */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
              Schedule
            </h3>
            <div className="space-y-2">
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600 dark:text-gray-300">
                  {formatDate(appointment.date, 'EEEE, MMMM d, yyyy')}
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600 dark:text-gray-300">
                  {formatTime(appointment.start_time)}
                  {appointment.end_time && ` - ${formatTime(appointment.end_time)}`}
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Timer className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600 dark:text-gray-300">
                  {appointment.duration || (appointment.units_required ? appointment.units_required * 15 : 0)} minutes
                  {appointment.units_required && (
                    <span className="text-gray-500"> ({appointment.units_required} units)</span>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Service */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
              Service
            </h3>
            <div className="flex items-center gap-3 text-sm">
              <Briefcase className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600 dark:text-gray-300">
                {appointment.speciality?.name || 'N/A'}
              </span>
            </div>
          </div>

          {/* Participants */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
              Participants
            </h3>
            <div className="space-y-3">
              {/* Client */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                    {clientInitials}
                  </span>
                </div>
                <div>
                  <Link
                    href={`/clients/${appointment.client_id}`}
                    className="text-sm font-medium text-gray-900 dark:text-white hover:text-violet-600"
                  >
                    {clientName}
                  </Link>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Client</p>
                </div>
              </div>

              {/* Team Member */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                    {teamInitials}
                  </span>
                </div>
                <div>
                  {appointment.team_id ? (
                    <Link
                      href={`/team/${appointment.team_id}`}
                      className="text-sm font-medium text-gray-900 dark:text-white hover:text-violet-600"
                    >
                      {teamName}
                    </Link>
                  ) : (
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {teamName}
                    </span>
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-400">Team Member</p>
                </div>
              </div>
            </div>
          </div>

          {/* Visit Location */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
              Visit Location
            </h3>
            <div className="space-y-2">
              <div className="flex items-start gap-3 text-sm">
                <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                <div>
                  {appointment.address?.full_address ? (
                    <span className="text-gray-600 dark:text-gray-300">
                      {appointment.address.full_address}
                    </span>
                  ) : (
                    <span className="text-gray-400 dark:text-gray-500">
                      No address on file
                    </span>
                  )}
                </div>
              </div>
              {mapUrl && (
                <a
                  href={mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 hover:bg-violet-200 transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  Open in Maps
                </a>
              )}
            </div>
          </div>

          {/* NEMT */}
          {appointment.nemt_occurrence && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
                <Bus className="w-4 h-4 text-violet-600" />
                Transportation
              </h3>
              <div className="p-3 bg-violet-50 dark:bg-violet-900/20 rounded-lg text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">Status</span>
                  <span className={cn(
                    'font-medium',
                    appointment.nemt_occurrence.status === 'confirmed'
                      ? 'text-green-600'
                      : appointment.nemt_occurrence.status === 'cancelled'
                      ? 'text-red-600'
                      : 'text-yellow-600'
                  )}>
                    {appointment.nemt_occurrence.status}
                  </span>
                </div>
                {appointment.nemt_occurrence.transportation_company && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Company</span>
                    <span className="text-gray-700 dark:text-gray-300">
                      {appointment.nemt_occurrence.transportation_company}
                    </span>
                  </div>
                )}
                {appointment.nemt_occurrence.confirmed_pickup_time && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Pickup</span>
                    <span className="text-gray-700 dark:text-gray-300">
                      {formatTime(appointment.nemt_occurrence.confirmed_pickup_time)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          {appointment.notes && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                Notes
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {appointment.notes}
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <Link
            href={`/appointments/${appointmentId}`}
            className="text-sm font-medium text-violet-600 dark:text-violet-400 hover:text-violet-700"
          >
            View Full Details
          </Link>

          {canEdit && (
            <Link
              href={`/appointments/${appointmentId}/edit`}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors"
            >
              <Edit className="w-4 h-4" />
              Edit
            </Link>
          )}
        </div>
      </SlideOverPanel>

      {/* Cancel Modal */}
      <FormModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onSubmit={handleCancel}
        title="Cancel Appointment"
        description="Please provide a reason for cancelling this appointment."
        inputValue={cancelReason}
        onInputChange={setCancelReason}
        inputPlaceholder="Reason for cancellation..."
        submitText="Cancel Appointment"
        cancelText="Go Back"
        isLoading={cancelMutation.isPending}
        variant="danger"
      />

      {/* Complete Modal */}
      <FormModal
        isOpen={showCompleteModal}
        onClose={() => setShowCompleteModal(false)}
        onSubmit={handleComplete}
        title="Complete Appointment"
        description="Add any notes about this appointment (optional)."
        inputValue={completeNotes}
        onInputChange={setCompleteNotes}
        inputPlaceholder="Notes (optional)..."
        submitText="Complete"
        cancelText="Go Back"
        isLoading={completeMutation.isPending}
        required={false}
      />
    </>
  );
}

// Slide Over Panel Component
function SlideOverPanel({
  onClose,
  children,
}: {
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 transition-opacity"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="absolute inset-y-0 right-0 flex max-w-full pl-10">
        <div className="w-screen max-w-md">
          <div className="flex h-full flex-col bg-white dark:bg-gray-800 shadow-xl">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AppointmentQuickView;
