'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  useAppointment,
  useStartAppointment,
  useCompleteAppointment,
  useCancelAppointment,
  useDeleteAppointment,
  useAssignToSelf,
  useOverrideTimes,
} from '@/hooks/useAppointments';
import dynamic from 'next/dynamic';

// Dynamic import of LocationMap to avoid SSR issues with Leaflet
const LocationMap = dynamic(() => import('@/components/ui/LocationMap'), {
  ssr: false,
  loading: () => (
    <div className="h-[400px] bg-gray-100 dark:bg-gray-900 rounded-lg flex items-center justify-center">
      <div className="text-gray-500">Loading map...</div>
    </div>
  ),
});
import { useAuthStore } from '@/stores/auth';
import { cn, formatDate, formatTime } from '@/lib/utils';
import {
  getAppointmentStatusStyle,
  getAppointmentStatusLabel,
} from '@/lib/constants';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ConfirmModal, FormModal } from '@/components/ui/Modal';
import { VerificationMapModal } from '@/components/ui/VerificationMapModal';
import type { AssignmentHistory } from '@/types';
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  MapPin,
  Phone,
  Mail,
  Edit,
  Play,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  MessageSquare,
  FileText,
  Target,
  Trash2,
  UserPlus,
  ExternalLink,
  AlertTriangle,
  Timer,
  ArrowRightLeft,
  Users,
  MapPinned,
  Shield,
  RefreshCw,
  Cake,
  Bus,
} from 'lucide-react';

export default function AppointmentDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const appointmentId = Number(params.id);

  const { user, isAdmin, isSuperAdmin, isStaff, isFeatureEnabled, tenant } = useAuthStore();
  const { data: appointment, isLoading, error, refetch } = useAppointment(appointmentId);

  const startMutation = useStartAppointment();
  const completeMutation = useCompleteAppointment();
  const cancelMutation = useCancelAppointment();
  const deleteMutation = useDeleteAppointment();
  const assignToSelfMutation = useAssignToSelf();
  const overrideTimesMutation = useOverrideTimes();

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completeNotes, setCompleteNotes] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAllTracks, setShowAllTracks] = useState(false);
  const [now, setNow] = useState(new Date());

  // Override times state
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideStartTime, setOverrideStartTime] = useState('');
  const [overrideEndTime, setOverrideEndTime] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideErrors, setOverrideErrors] = useState<string[]>([]);
  const [overrideWarning, setOverrideWarning] = useState<{ message: string; type: 'warning' | 'error' } | null>(null);

  // Verification map state
  const [showVerificationMap, setShowVerificationMap] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState<AssignmentHistory | null>(null);

  // Update time every minute for timers
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Calculate time-related values
  const timeInfo = useMemo(() => {
    if (!appointment) return null;

    const startTime = appointment.scheduled_start ? new Date(appointment.scheduled_start) : null;
    const startedAt = appointment.started_at ? new Date(appointment.started_at) : null;
    const requiredMinutes = (appointment.units_required || 0) * 15;

    let elapsedMinutes = 0;
    if (startedAt) {
      elapsedMinutes = Math.floor((now.getTime() - startedAt.getTime()) / 60000);
    }

    let minutesUntilStart = 0;
    if (startTime) {
      minutesUntilStart = Math.floor((startTime.getTime() - now.getTime()) / 60000);
    }

    const hasMetMinimumDuration = elapsedMinutes >= requiredMinutes;

    return {
      startTime,
      startedAt,
      requiredMinutes,
      elapsedMinutes,
      minutesUntilStart,
      hasMetMinimumDuration,
    };
  }, [appointment, now]);

  // Sorted assignment history - must be before early returns
  const sortedHistory = useMemo(() => {
    if (!appointment?.assignment_history) return [];
    return [...appointment.assignment_history].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [appointment?.assignment_history]);

  // Location tracks - must be before early returns
  const visibleTracks = useMemo(() => {
    if (!appointment?.location_tracks) return [];
    const reversed = [...appointment.location_tracks].reverse();
    return showAllTracks ? reversed : reversed.slice(0, 3);
  }, [appointment?.location_tracks, showAllTracks]);

  // Format duration
  const formatDuration = (minutes: number) => {
    if (minutes < 0) minutes = 0;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${mins}m`;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
      </div>
    );
  }

  // Error state
  if (error || !appointment) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Failed to load appointment details
        </p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700"
        >
          Try Again
        </button>
      </div>
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
    } catch (err) {
      console.error('Failed to cancel appointment:', err);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(appointmentId);
      router.push('/appointments');
    } catch (err) {
      console.error('Failed to delete appointment:', err);
    }
  };

  const handleAssignToSelf = async () => {
    try {
      await assignToSelfMutation.mutateAsync(appointmentId);
    } catch (err) {
      console.error('Failed to assign appointment:', err);
    }
  };

  // Validate override times
  const validateOverrideTimes = (startTime: string, endTime: string) => {
    const errors: string[] = [];
    let warning: { message: string; type: 'warning' | 'error' } | null = null;

    // Skip validation if no start time or no end time
    if (!startTime || !endTime) {
      setOverrideErrors(errors);
      setOverrideWarning(null);
      return;
    }

    // Parse times (HH:MM format)
    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const [endHours, endMinutes] = endTime.split(':').map(Number);

    const startMins = startHours * 60 + startMinutes;
    const endMins = endHours * 60 + endMinutes;
    const durationMins = endMins - startMins;

    // Check if end time is before start time
    if (endMins < startMins) {
      errors.push('End time cannot be before start time');
    }

    // Check for night appointments (after 9 PM)
    if (startMins >= 21 * 60 || endMins >= 21 * 60) {
      warning = {
        message: '⚠️ ATTENTION: You are setting a night time override. This is unusual for most appointments. Please double-check if this is correct.',
        type: 'error'
      };
    }
    // Check for potential AM/PM confusion
    else if ((startHours === 11 && endHours < 11) || (startHours === 12 && endHours > 12)) {
      warning = {
        message: '⚠️ CAUTION: Your time selection suggests possible AM/PM confusion. Please verify the times are correct.',
        type: 'error'
      };
    }
    // Check for evening appointments (after 6 PM)
    else if (startMins >= 18 * 60) {
      warning = {
        message: '⚠️ Warning: You are setting an evening start time. Please confirm this is intentional and matches the actual appointment time.',
        type: 'warning'
      };
    }
    // Check for very early appointments (before 7 AM)
    else if (startMins < 7 * 60) {
      warning = {
        message: '⚠️ Warning: You are setting a very early start time. Please confirm this is intentional and matches the actual appointment time.',
        type: 'warning'
      };
    }
    // Check for long appointments (more than planned units)
    else if (appointment) {
      const plannedMinutes = (appointment.units_required || 0) * 15;
      if (plannedMinutes > 0 && durationMins > plannedMinutes * 1.5) {
        warning = {
          message: `⚠️ Warning: This override is significantly longer (${durationMins} minutes) than the planned duration (${plannedMinutes} minutes). Please verify this is correct.`,
          type: 'warning'
        };
      }
    }

    setOverrideErrors(errors);
    setOverrideWarning(warning);
  };

  const handleStartTimeChange = (value: string) => {
    setOverrideStartTime(value);
    validateOverrideTimes(value, overrideEndTime);
  };

  const handleEndTimeChange = (value: string) => {
    setOverrideEndTime(value);
    validateOverrideTimes(overrideStartTime, value);
  };

  const handleOverride = async () => {
    if (!overrideStartTime || !overrideReason.trim() || overrideErrors.length > 0) return;

    try {
      // Combine date with time for the API
      const appointmentDate = appointment?.date || new Date().toISOString().split('T')[0];
      const startedAt = `${appointmentDate}T${overrideStartTime}:00`;
      const completedAt = overrideEndTime ? `${appointmentDate}T${overrideEndTime}:00` : undefined;

      await overrideTimesMutation.mutateAsync({
        id: appointmentId,
        started_at: startedAt,
        completed_at: completedAt,
        reason: overrideReason,
      });
      setShowOverrideModal(false);
      setOverrideStartTime('');
      setOverrideEndTime('');
      setOverrideReason('');
      setOverrideErrors([]);
      setOverrideWarning(null);
    } catch (err) {
      console.error('Failed to override times:', err);
    }
  };

  const openOverrideModal = () => {
    // Pre-populate with current values if available (extract time from datetime)
    if (appointment?.started_at) {
      const startDate = new Date(appointment.started_at);
      setOverrideStartTime(startDate.toTimeString().slice(0, 5));
    } else if (appointment?.scheduled_start) {
      const startDate = new Date(appointment.scheduled_start);
      setOverrideStartTime(startDate.toTimeString().slice(0, 5));
    }
    if (appointment?.completed_at) {
      const endDate = new Date(appointment.completed_at);
      setOverrideEndTime(endDate.toTimeString().slice(0, 5));
    }
    setOverrideErrors([]);
    setOverrideWarning(null);
    setShowOverrideModal(true);
  };

  const isOverrideValid = () => {
    return overrideStartTime && overrideReason.trim() && overrideErrors.length === 0;
  };

  // Check if there's already an override in history
  const hasExistingOverride = appointment?.assignment_history?.some(h => h.action === 'time_override');

  // Permission checks
  const isAdminOrSuperAdmin = isAdmin() || isSuperAdmin();
  const canEdit = isAdminOrSuperAdmin && !['completed', 'cancelled', 'no_show', 'deleted'].includes(appointment.status);
  const canStart = appointment.status === 'scheduled' && appointment.team_id;
  const canComplete = appointment.status === 'in_progress';
  const canCancel = isAdminOrSuperAdmin && ['scheduled', 'unassigned'].includes(appointment.status);
  const canDelete = isAdminOrSuperAdmin && !['completed', 'in_progress', 'cancelled', 'rejected', 'no_show', 'deleted'].includes(appointment.status);
  const canAssignToSelf = appointment.status === 'unassigned' && !appointment.team_id;
  const canOverride = isAdminOrSuperAdmin && ['in_progress', 'completed', 'terminated_by_client', 'terminated_by_staff'].includes(appointment.status);

  // Client and Team info
  const clientName = appointment.client?.user?.name || appointment.client?.name || 'Unknown';
  const clientInitials = clientName.split(' ').map((n: string) => n[0]).join('').toUpperCase();
  const clientPhone = appointment.client?.phone || appointment.client?.user?.phone;
  const clientEmail = appointment.client?.user?.email;

  const teamName = appointment.team?.name || appointment.historical_team_member_name || 'Unassigned';
  const teamInitials = teamName !== 'Unassigned'
    ? teamName.split(' ').map((n: string) => n[0]).join('').toUpperCase()
    : 'U';

  // Build map URL
  const mapUrl = appointment.address?.latitude && appointment.address?.longitude
    ? `https://www.google.com/maps?q=${appointment.address.latitude},${appointment.address.longitude}`
    : null;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
        <div className="flex flex-col gap-4">
          {/* Top row: Back, Avatar, Title, ID */}
          <div className="flex items-start gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 -ml-2"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center flex-shrink-0">
              <span className="text-lg sm:text-xl font-medium text-violet-700 dark:text-violet-200">
                {clientInitials}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white truncate">
                {appointment.title || `Appointment with ${clientName}`}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                ID: {appointment.id}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            {/* Edit Button - Admin only */}
            {canEdit && (
              <Link
                href={`/appointments/${appointmentId}/edit`}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-violet-100 dark:bg-violet-900/30 border border-violet-300 dark:border-violet-600 hover:bg-violet-200 dark:hover:bg-violet-800/40 text-violet-700 dark:text-violet-200 text-sm font-medium rounded-lg transition-colors"
              >
                <Edit className="w-4 h-4" />
                Edit
              </Link>
            )}

            {/* Assign to Self - Staff when unassigned */}
            {canAssignToSelf && (
              <button
                onClick={handleAssignToSelf}
                disabled={assignToSelfMutation.isPending}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {assignToSelfMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <UserPlus className="w-4 h-4" />
                )}
                Assign to Self
              </button>
            )}

            {/* Start Button */}
            {canStart && (
              <button
                onClick={handleStart}
                disabled={startMutation.isPending}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {startMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                Start
              </button>
            )}

            {/* Complete Button */}
            {canComplete && (
              <button
                onClick={() => setShowCompleteModal(true)}
                disabled={completeMutation.isPending}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                Complete
              </button>
            )}

            {/* Cancel Button - Admin only */}
            {canCancel && (
              <button
                onClick={() => setShowCancelModal(true)}
                disabled={cancelMutation.isPending}
                className="inline-flex items-center gap-1.5 px-3 py-2 border border-red-300 dark:border-red-600 text-red-700 dark:text-red-200 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm font-medium rounded-lg transition-colors"
              >
                <XCircle className="w-4 h-4" />
                Cancel
              </button>
            )}

            {/* Status Badge */}
            <StatusBadge
              status={appointment.status}
              type="appointment"
              size="md"
              showBorder
            />

            {/* Delete Button - Admin only */}
            {canDelete && (
              <button
                onClick={() => setShowDeleteModal(true)}
                disabled={deleteMutation.isPending}
                className="inline-flex items-center gap-1.5 px-3 py-2 border border-red-300 dark:border-red-600 text-red-700 dark:text-red-200 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm font-medium rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            )}

            {/* Override Times Button - Admin only for in_progress/completed appointments */}
            {canOverride && (
              <button
                onClick={openOverrideModal}
                disabled={overrideTimesMutation.isPending}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-600 hover:bg-amber-200 dark:hover:bg-amber-800/40 text-amber-700 dark:text-amber-200 text-sm font-medium rounded-lg transition-colors"
              >
                {overrideTimesMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Clock className="w-4 h-4" />
                )}
                Override Times
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
        {/* Left Column - Basic Info */}
        <div className="lg:col-span-1 space-y-4 sm:space-y-6">
          {/* Status & Appointment Details Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Status & Timer Section */}
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700 space-y-2">
              {/* Status Badges */}
              <div className="flex flex-wrap gap-2">
                <StatusBadge status={appointment.status} type="appointment" />

                {/* Duration Badge for completed appointments */}
                {[
                  "completed",
                  "terminated_by_client",
                  "terminated_by_staff",
                ].includes(appointment.status) && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-700 text-gray-200">
                    Duration:{" "}
                    {appointment.duration_minutes || appointment.duration || 0}{" "}
                    minutes
                  </span>
                )}
              </div>

              {/* Time Information */}
              <div className="flex flex-wrap gap-2">
                {/* Upcoming Timer */}
                {appointment.status === "scheduled" &&
                  timeInfo &&
                  timeInfo.minutesUntilStart > 0 && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-700 text-gray-200">
                      <Timer className="w-3 h-3" />
                      Starts in {formatDuration(timeInfo.minutesUntilStart)}
                    </span>
                  )}

                {/* In Progress Timer */}
                {appointment.status === "in_progress" && timeInfo && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium",
                      timeInfo.hasMetMinimumDuration
                        ? "bg-green-800 text-green-100"
                        : "bg-yellow-800 text-yellow-100"
                    )}
                  >
                    <Timer className="w-3 h-3" />
                    {timeInfo.hasMetMinimumDuration
                      ? `Required time met (${formatDuration(
                          timeInfo.elapsedMinutes
                        )}/${formatDuration(timeInfo.requiredMinutes)})`
                      : `${formatDuration(timeInfo.elapsedMinutes)} elapsed`}
                  </span>
                )}
              </div>
            </div>

            {/* Appointment Details */}
            <div className="px-4 sm:px-6 py-4">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                Appointment Details
              </h3>
              <div className="space-y-3">
                {/* Date */}
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-600 dark:text-gray-400">
                    {formatDate(appointment.date, "EEEE, MMMM d, yyyy")}
                  </span>
                </div>

                {/* Time */}
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  <div className="text-gray-600 dark:text-gray-400">
                    <span>{formatTime(appointment.start_time)}</span>
                    {appointment.end_time && (
                      <>
                        <span className="mx-2">to</span>
                        <span>{formatTime(appointment.end_time)}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Duration */}
                <div className="flex items-center gap-3">
                  <Timer className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-600 dark:text-gray-400">
                    {appointment.duration ||
                      (appointment.units_required
                        ? appointment.units_required * 15
                        : 0)}{" "}
                    minutes
                    {appointment.units_required && (
                      <span className="text-gray-500">
                        {" "}
                        ({appointment.units_required} units)
                      </span>
                    )}
                  </span>
                </div>

                {/* Service */}
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-600 dark:text-gray-400">
                    {appointment.speciality?.name || "N/A"}
                  </span>
                </div>

                {/* Location */}
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                  <div className="flex flex-col gap-2">
                    <span className="text-gray-600 dark:text-gray-400 capitalize">
                      {appointment.location_type?.replace("_", " ") || "N/A"}
                    </span>
                    {appointment.address?.full_address && (
                      <span className="text-gray-500 dark:text-gray-500 text-sm">
                        {appointment.address.full_address}
                      </span>
                    )}
                    {mapUrl && (
                      <a
                        href={mapUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1 text-sm rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 hover:bg-violet-200 dark:hover:bg-violet-800 transition-colors w-fit"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Open in Maps
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Timeline - Started/Completed/Cancelled */}
            {(appointment.started_at ||
              appointment.completed_at ||
              appointment.cancelled_at) && (
              <div className="px-4 sm:px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                  Timeline
                </h3>
                <div className="space-y-2 text-sm">
                  {appointment.started_at && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Started</span>
                      <span className="text-gray-700 dark:text-gray-300">
                        {formatDate(appointment.started_at, "MMM d, h:mm a")}
                      </span>
                    </div>
                  )}
                  {appointment.completed_at && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Completed</span>
                      <span className="text-gray-700 dark:text-gray-300">
                        {formatDate(appointment.completed_at, "MMM d, h:mm a")}
                      </span>
                    </div>
                  )}
                  {appointment.cancelled_at && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Cancelled</span>
                      <span className="text-gray-700 dark:text-gray-300">
                        {formatDate(appointment.cancelled_at, "MMM d, h:mm a")}
                      </span>
                    </div>
                  )}
                  {appointment.cancellation_reason && (
                    <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-red-600 dark:text-red-400">
                      Reason: {appointment.cancellation_reason}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* NEMT Transportation Details */}
          {appointment.nemt_occurrence && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-violet-200 dark:border-violet-700 overflow-hidden">
              <div className="px-4 sm:px-6 py-4 border-b border-violet-200 dark:border-violet-700 bg-violet-50 dark:bg-violet-900/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bus className="w-6 h-6 text-violet-600 dark:text-violet-400" />
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Transportation Details
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  {/* Status Badge */}
                  <span
                    className={cn(
                      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                      appointment.nemt_occurrence.status === "confirmed"
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        : appointment.nemt_occurrence.status === "cancelled"
                        ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                        : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                    )}
                  >
                    {appointment.nemt_occurrence.status === "confirmed"
                      ? "Confirmed"
                      : appointment.nemt_occurrence.status === "cancelled"
                      ? "Cancelled"
                      : "Pending"}
                  </span>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-violet-100 dark:bg-violet-800 text-violet-800 dark:text-violet-200">
                    #{appointment.nemt_occurrence.id}
                  </span>
                </div>
              </div>

              {/* Cancelled Warning */}
              {appointment.nemt_occurrence.is_cancelled && (
                <div className="px-4 sm:px-6 py-3 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-800 dark:text-red-200">
                        Transportation Cancelled
                      </p>
                      {appointment.nemt_occurrence.cancellation_reason && (
                        <p className="text-sm text-red-600 dark:text-red-300 mt-1">
                          {appointment.nemt_occurrence.cancellation_reason}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="px-4 sm:px-6 py-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* Transportation Date */}
                  {appointment.nemt_occurrence.transportation_date && (
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Transportation Date
                      </label>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {formatDate(
                          appointment.nemt_occurrence.transportation_date,
                          "EEEE, MMMM d, yyyy"
                        )}
                      </p>
                    </div>
                  )}

                  {/* Transportation Company */}
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Transportation Company
                    </label>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {appointment.nemt_occurrence.transportation_company || (
                        <span className="text-yellow-600 dark:text-yellow-400">
                          Pending Assignment
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Broker */}
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Broker
                    </label>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {appointment.nemt_occurrence.broker_name || "N/A"}
                    </p>
                  </div>

                  {/* Confirmed Pickup Time */}
                  {appointment.nemt_occurrence.confirmed_pickup_time && (
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Confirmed Pickup
                      </label>
                      <p className="text-sm font-medium text-green-600 dark:text-green-400">
                        {formatTime(
                          appointment.nemt_occurrence.confirmed_pickup_time
                        )}
                      </p>
                    </div>
                  )}

                  {/* Pickup Window */}
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Pickup Window
                    </label>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {appointment.nemt_occurrence.pickup_window_start &&
                      appointment.nemt_occurrence.pickup_window_end
                        ? `${appointment.nemt_occurrence.pickup_window_start} - ${appointment.nemt_occurrence.pickup_window_end}`
                        : "Not set"}
                    </p>
                  </div>

                  {/* Return Window */}
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Return Window
                    </label>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {appointment.nemt_occurrence.return_window_start &&
                      appointment.nemt_occurrence.return_window_end
                        ? `${appointment.nemt_occurrence.return_window_start} - ${appointment.nemt_occurrence.return_window_end}`
                        : "Not set"}
                    </p>
                  </div>
                </div>

                {/* Pickup Address */}
                {appointment.nemt_occurrence.pickup_address && (
                  <div className="mt-4 space-y-1">
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Pickup Address
                    </label>
                    <p className="text-sm text-gray-900 dark:text-gray-100">
                      {appointment.nemt_occurrence.pickup_address}
                    </p>
                  </div>
                )}

                {/* Dropoff Address */}
                {appointment.nemt_occurrence.dropoff_address && (
                  <div className="mt-4 space-y-1">
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Dropoff Address
                    </label>
                    <p className="text-sm text-gray-900 dark:text-gray-100">
                      {appointment.nemt_occurrence.dropoff_address}
                    </p>
                  </div>
                )}

                {/* Notes */}
                {appointment.nemt_occurrence.notes && (
                  <div className="mt-4 space-y-1">
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Notes
                    </label>
                    <p className="text-sm text-gray-900 dark:text-gray-100">
                      {appointment.nemt_occurrence.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Participants, Notes, History */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          {/* Participants Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Participants
              </h2>
            </div>
            <div className="px-4 sm:px-6 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                {/* Client Details */}
                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
                    Client
                  </h3>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                        {clientInitials}
                      </span>
                    </div>
                    <div>
                      <Link
                        href={`/clients/${appointment.client_id}`}
                        className="text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-violet-600 dark:hover:text-violet-400 hover:underline"
                      >
                        {clientName}
                      </Link>
                      {clientPhone && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {clientPhone}
                        </p>
                      )}
                      {clientEmail &&
                        !clientEmail.endsWith("@empowerhub.io") && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {clientEmail}
                          </p>
                        )}

                      {/* Birthday Indicator */}
                      {appointment.client?.birthday_info?.is_upcoming && (
                        <div className="mt-2">
                          <span
                            className={cn(
                              "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                              appointment.client.birthday_info.is_today
                                ? "bg-pink-100 dark:bg-pink-900 text-pink-800 dark:text-pink-200"
                                : "bg-violet-100 dark:bg-violet-900 text-violet-800 dark:text-violet-200"
                            )}
                          >
                            <Cake className="w-4 h-4 mr-1" />
                            {appointment.client.birthday_info.is_today
                              ? `Birthday today! Turned ${appointment.client.birthday_info.last_birthday?.age_was}`
                              : `Birthday ${appointment.client.birthday_info.relative_text}! Turning ${appointment.client.birthday_info.age_will_be}`}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Team Member Details */}
                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
                    Team Member
                  </h3>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                        {teamInitials}
                      </span>
                    </div>
                    <div>
                      {appointment.team ? (
                        <>
                          <Link
                            href={`/team/${appointment.team_id}`}
                            className="text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-violet-600 dark:hover:text-violet-400 hover:underline"
                          >
                            {teamName}
                          </Link>
                          {appointment.team.email && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {appointment.team.email}
                            </p>
                          )}
                        </>
                      ) : appointment.historical_team_member_name &&
                        appointment.historical_team_member_name !==
                          "Unassigned" ? (
                        <>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {teamName}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            (Team member no longer active)
                          </p>
                        </>
                      ) : (
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          Unassigned
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Notes & Confirmation Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Notes & Confirmation
              </h2>
            </div>
            <div className="px-4 sm:px-6 py-4 space-y-6">
              {/* Appointment Notes */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Appointment Notes
                </h3>
                {appointment.notes ? (
                  <p className="text-gray-600 dark:text-gray-300">
                    {appointment.notes}
                  </p>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No appointment notes available
                  </p>
                )}
              </div>

              {/* Completion Notes */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Completion Notes
                </h3>
                {appointment.completion_notes ? (
                  <div className="space-y-2">
                    <p className="text-gray-600 dark:text-gray-300">
                      {appointment.completion_notes}
                    </p>
                    {appointment.completed_at && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Added on{" "}
                        {formatDate(
                          appointment.completed_at,
                          "MMMM d, yyyy h:mm a"
                        )}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No completion notes available
                  </p>
                )}
              </div>

              {/* Completion Confirmation */}
              {[
                "completed",
                "terminated_by_client",
                "terminated_by_staff",
              ].includes(appointment.status) && (
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    Completion Confirmation
                  </h3>

                  {/* Client Signature */}
                  {appointment.signature_data ? (
                    <div className="space-y-2">
                      <h4 className="text-sm text-gray-700 dark:text-gray-300">
                        Client Signature
                      </h4>
                      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
                        <img
                          src={appointment.signature_data}
                          alt="Client Signature"
                          className="max-w-md mx-auto cursor-pointer"
                        />
                      </div>
                    </div>
                  ) : appointment.voice_confirmation_path ? (
                    <div className="space-y-2">
                      <h4 className="text-sm text-gray-700 dark:text-gray-300">
                        Voice Confirmation
                      </h4>
                      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
                        <audio controls className="w-full">
                          <source
                            src={appointment.voice_confirmation_path}
                            type="audio/wav"
                          />
                          Your browser does not support the audio element.
                        </audio>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      No confirmation data available
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Goals & Tasks (if enabled) */}
          {isFeatureEnabled("client_goals_enabled") && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
                <Target className="w-5 h-5 text-violet-600" />
                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Goals & Tasks
                </h2>
              </div>
              <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No tasks assigned to this appointment</p>
              </div>
            </div>
          )}

          {/* Assignment History Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Assignment History
              </h2>
              <button className="inline-flex items-center px-3 py-1 text-xs font-medium text-violet-700 bg-violet-100 rounded-full hover:bg-violet-200">
                <Shield className="w-4 h-4 mr-1" />
                Location Verification
              </button>
            </div>
            <div className="px-4 sm:px-6 py-4">
              {sortedHistory.length > 0 ? (
                <div className="relative">
                  {/* Timeline line */}
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700"></div>

                  {/* Timeline items */}
                  <div className="space-y-6">
                    {sortedHistory.map((history, index) => (
                      <div
                        key={index}
                        className="relative flex items-start ml-6"
                      >
                        {/* Timeline dot */}
                        <div className="absolute -left-9 mt-1.5">
                          <span className="h-4 w-4 rounded-full bg-violet-200 dark:bg-violet-900 border-2 border-violet-600 flex items-center justify-center">
                            {history.location_verified && (
                              <CheckCircle2 className="h-2.5 w-2.5 text-violet-600" />
                            )}
                          </span>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                <span>
                                  {history.by_user_name ||
                                    history.team_name ||
                                    history.admin_name ||
                                    "System"}
                                </span>
                                <span className="text-gray-500 dark:text-gray-400">
                                  {" "}
                                  {history.action?.replace(/_/g, " ")}
                                </span>
                                {history.resolution && (
                                  <span className="text-gray-500 dark:text-gray-400">
                                    {" "}
                                    ({history.resolution})
                                  </span>
                                )}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {formatDate(
                                  history.timestamp,
                                  "MMMM d, yyyy h:mm a"
                                )}
                              </p>

                              {/* Location verification details */}
                              {history.location_verified &&
                                (history.action === "started" ||
                                  history.action === "completed") && (
                                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                      <MapPinned className="w-3 h-3 mr-1" />
                                      Location Verified
                                    </span>
                                    {(history.location_distance ||
                                      history.verification_distance) && (
                                      <span className="text-xs text-gray-500">
                                        {Math.round(
                                          (history.location_distance ||
                                            history.verification_distance ||
                                            0) * 3.28084
                                        )}{" "}
                                        ft away
                                      </span>
                                    )}
                                    <button
                                      onClick={() => {
                                        setSelectedHistory(history);
                                        setShowVerificationMap(true);
                                      }}
                                      className="inline-flex items-center px-2 py-0.5 text-xs font-medium text-violet-600 bg-violet-50 rounded hover:bg-violet-100"
                                    >
                                      <MapPin className="w-3 h-3 mr-1" />
                                      View Verification Map
                                    </button>
                                  </div>
                                )}

                              {/* Time Override details */}
                              {history.action === "time_override" && (
                                <div className="mt-2 text-sm text-gray-600 dark:text-gray-300 space-y-1">
                                  <p>
                                    <span className="font-medium text-xs">
                                      Reason:
                                    </span>{" "}
                                    <span>
                                      {history.reason || "Not specified"}
                                    </span>
                                  </p>
                                  {history.changes?.started_at && (
                                    <p>
                                      <span className="font-medium text-xs">
                                        Override Started at:
                                      </span>{" "}
                                      <span className="text-xs">
                                        {history.changes.started_at.from
                                          ? `Changed from ${formatDate(
                                              history.changes.started_at.from,
                                              "MMMM d, yyyy h:mm a"
                                            )} to ${formatDate(
                                              history.changes.started_at.to,
                                              "MMMM d, yyyy h:mm a"
                                            )}`
                                          : `Set to ${formatDate(
                                              history.changes.started_at.to,
                                              "MMMM d, yyyy h:mm a"
                                            )}`}
                                      </span>
                                    </p>
                                  )}
                                  {history.changes?.completed_at?.to && (
                                    <p>
                                      <span className="font-medium text-xs">
                                        Override Completed at:
                                      </span>{" "}
                                      <span className="text-xs">
                                        {history.changes.completed_at.from
                                          ? `Changed from ${formatDate(
                                              history.changes.completed_at.from,
                                              "MMMM d, yyyy h:mm a"
                                            )} to ${formatDate(
                                              history.changes.completed_at.to,
                                              "MMMM d, yyyy h:mm a"
                                            )}`
                                          : `Set to ${formatDate(
                                              history.changes.completed_at.to,
                                              "MMMM d, yyyy h:mm a"
                                            )}`}
                                      </span>
                                    </p>
                                  )}
                                </div>
                              )}

                              {/* Team switch details */}
                              {history.team_switch && (
                                <div className="mt-2 text-sm text-gray-600 dark:text-gray-300 space-y-1">
                                  <p>
                                    <span className="font-medium">From:</span>{" "}
                                    {history.team_switch.previous_team_id ? (
                                      <Link
                                        href={`/team/${history.team_switch.previous_team_id}`}
                                        className="text-violet-600 hover:text-violet-800"
                                      >
                                        {history.team_switch
                                          .previous_team_name ||
                                          "Previous Team"}
                                      </Link>
                                    ) : (
                                      <span>
                                        {history.team_switch
                                          .previous_team_name || "Unassigned"}
                                      </span>
                                    )}
                                  </p>
                                  <p>
                                    <span className="font-medium">To:</span>{" "}
                                    {history.team_switch.new_team_id ? (
                                      <Link
                                        href={`/team/${history.team_switch.new_team_id}`}
                                        className="text-violet-600 hover:text-violet-800"
                                      >
                                        {history.team_switch.new_team_name ||
                                          "New Team"}
                                      </Link>
                                    ) : (
                                      <span className="text-gray-600 dark:text-gray-300">
                                        Unassigned
                                      </span>
                                    )}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                  No assignment history available
                </p>
              )}
            </div>
          </div>

          {/* Location Tracking Card */}
          {appointment.location_tracks &&
            appointment.location_tracks.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        Location Tracking
                      </h2>
                      {/* Status indicator */}
                      {[
                        "completed",
                        "terminated_by_client",
                        "terminated_by_staff",
                      ].includes(appointment.status) ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Completed
                        </span>
                      ) : (
                        appointment.status === "in_progress" && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            <span className="h-2 w-2 mr-1.5 rounded-full bg-green-400 animate-pulse"></span>
                            Live
                          </span>
                        )
                      )}
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {appointment.location_tracks.length} points tracked
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {appointment.completed_at && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          Completed at{" "}
                          {formatDate(
                            appointment.completed_at,
                            "M/d/yyyy, h:mm:ss a"
                          )}
                        </span>
                      )}
                      <button
                        onClick={() => refetch()}
                        className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                      >
                        <RefreshCw className="w-3 h-3 mr-1" />
                        Refresh
                      </button>
                    </div>
                  </div>
                </div>

                {/* Location Map */}
                <div className="px-4 sm:px-6 py-4">
                  <LocationMap
                    tracks={appointment.location_tracks}
                    clientAddress={appointment.address}
                    className="h-[300px]"
                  />

                  {/* Recent Locations */}
                  <div className="mt-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                          Recent Locations
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {appointment.location_tracks.length} total points
                        </p>
                      </div>
                      {appointment.location_tracks.length > 3 && (
                        <button
                          onClick={() => setShowAllTracks(!showAllTracks)}
                          className="text-xs text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 font-medium"
                        >
                          {showAllTracks
                            ? "Show recent only"
                            : `Show all (${appointment.location_tracks.length})`}
                        </button>
                      )}
                    </div>

                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {visibleTracks.map((track) => (
                        <div
                          key={track.id}
                          className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
                        >
                          <div className="flex-shrink-0 mt-1">
                            <div className="h-3 w-3 rounded-full bg-violet-500"></div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {formatTime(track.captured_at)}
                              </p>
                              {track.accuracy && (
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  +/-{Math.round(track.accuracy)}m accuracy
                                </span>
                              )}
                            </div>
                            {track.address && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {track.address}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Show older message */}
                    {!showAllTracks &&
                      appointment.location_tracks.length > 3 && (
                        <div className="mt-3 text-center">
                          <p className="text-xs text-gray-400 dark:text-gray-500">
                            {appointment.location_tracks.length - 3} older
                            location
                            {appointment.location_tracks.length - 3 > 1
                              ? "s"
                              : ""}{" "}
                            hidden
                          </p>
                        </div>
                      )}
                  </div>
                </div>
              </div>
            )}
        </div>
      </div>

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

      {/* Delete Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete Appointment"
        message="Are you sure you want to delete this appointment? This action cannot be undone."
        confirmText="Delete"
        isLoading={deleteMutation.isPending}
        variant="danger"
      />

      {/* Override Times Modal */}
      {showOverrideModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div
            className="fixed inset-0 bg-gray-500 dark:bg-gray-900 bg-opacity-90 dark:bg-opacity-90 transition-opacity"
            onClick={() => setShowOverrideModal(false)}
          />

          <div className="flex min-h-screen items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="relative transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
              {/* Modal Header */}
              <div className="mb-4">
                <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100">
                  {hasExistingOverride ? "Edit Override" : "Create Override"}
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Appointment Date:{" "}
                  {appointment?.date
                    ? formatDate(appointment.date, "EEEE, MMMM d, yyyy")
                    : "N/A"}
                </p>
              </div>

              {/* Form Fields */}
              <div className="space-y-4">
                {/* Time Inputs */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Start Time <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="time"
                      value={overrideStartTime}
                      onChange={(e) => handleStartTimeChange(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:border-violet-500 focus:ring-violet-500 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={overrideEndTime}
                      onChange={(e) => handleEndTimeChange(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:border-violet-500 focus:ring-violet-500 px-3 py-2"
                    />
                  </div>
                </div>

                {/* Time Warnings */}
                {overrideWarning && (
                  <div
                    className={cn(
                      "p-3 rounded-md text-sm",
                      overrideWarning.type === "warning"
                        ? "bg-yellow-50 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200"
                        : "bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-200"
                    )}
                  >
                    <p>{overrideWarning.message}</p>
                  </div>
                )}

                {/* Reason Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Override Reason <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    rows={3}
                    placeholder="Please provide a reason for this override"
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:border-violet-500 focus:ring-violet-500 px-3 py-2 resize-none"
                  />
                </div>

                {/* Error Messages */}
                {overrideErrors.length > 0 && (
                  <div className="text-sm text-red-600 dark:text-red-400 space-y-1">
                    {overrideErrors.map((error, index) => (
                      <p key={index}>{error}</p>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                <button
                  type="button"
                  onClick={handleOverride}
                  disabled={
                    !isOverrideValid() || overrideTimesMutation.isPending
                  }
                  className="inline-flex w-full justify-center rounded-md border border-transparent bg-violet-600 dark:bg-violet-500 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-violet-700 dark:hover:bg-violet-600 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 sm:col-start-2 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {overrideTimesMutation.isPending && (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  )}
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowOverrideModal(false);
                    setOverrideStartTime("");
                    setOverrideEndTime("");
                    setOverrideReason("");
                    setOverrideErrors([]);
                    setOverrideWarning(null);
                  }}
                  className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-base font-medium text-gray-700 dark:text-gray-300 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 sm:col-start-1 sm:mt-0 sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Verification Map Modal */}
      <VerificationMapModal
        isOpen={showVerificationMap}
        onClose={() => {
          setShowVerificationMap(false);
          setSelectedHistory(null);
        }}
        appointmentAddress={appointment?.address}
        history={selectedHistory || {}}
      />
    </div>
  );
}
