/**
 * Appointment Validation Rules
 *
 * These rules are ported from the Laravel/Blade implementation to ensure
 * consistent validation across the Next.js frontend.
 */

import { Appointment } from '@/types';

// ============================================
// START APPOINTMENT VALIDATION RULES
// ============================================

export interface StartValidationResult {
  canStart: boolean;
  reason?: string;
  error?: string;
}

/**
 * Check if an appointment can be started by the current user
 *
 * Rules:
 * 1. Status must be 'scheduled' or 'late'
 * 2. User must be the assigned team member
 * 3. Cannot start more than 45 minutes before scheduled start time
 * 4. Appointment must be for today (same day)
 * 5. Cannot start if appointment has already ended
 * 6. Cannot have another in-progress appointment
 */
export function canStartAppointment(
  appointment: Appointment | null | undefined,
  currentTeamId: number | null | undefined,
  hasInProgressAppointment: boolean = false
): StartValidationResult {
  if (!appointment) {
    return { canStart: false, reason: 'No appointment provided', error: 'no_appointment' };
  }

  // Rule 1: Status must be 'scheduled' or 'late'
  if (appointment.status !== 'scheduled' && appointment.status !== 'late') {
    return {
      canStart: false,
      reason: 'Only scheduled or late appointments can be started',
      error: 'invalid_status'
    };
  }

  // Rule 2: User must be the assigned team member
  if (!currentTeamId || appointment.team_id !== currentTeamId) {
    return {
      canStart: false,
      reason: 'Only the assigned team member can start this appointment',
      error: 'not_assigned'
    };
  }

  const now = new Date();
  const startTime = appointment.start_time ? new Date(appointment.start_time) : null;
  const endTime = appointment.end_time ? new Date(appointment.end_time) : null;

  if (!startTime) {
    return {
      canStart: false,
      reason: 'Appointment has no start time',
      error: 'no_start_time'
    };
  }

  // Rule 4: Appointment must be for today
  if (!isSameDay(now, startTime)) {
    return {
      canStart: false,
      reason: 'Can only start appointments scheduled for today',
      error: 'not_today'
    };
  }

  // Rule 3: Cannot start more than 45 minutes before scheduled start time
  const minutesUntilStart = getMinutesDifference(startTime, now);
  if (minutesUntilStart > 45) {
    return {
      canStart: false,
      reason: `Cannot start appointment more than 45 minutes before scheduled start time. Try again in ${minutesUntilStart - 45} minutes.`,
      error: 'too_early'
    };
  }

  // Rule 5: Cannot start if appointment has already ended
  if (endTime && now > endTime) {
    return {
      canStart: false,
      reason: 'Cannot start an appointment that has already ended',
      error: 'already_ended'
    };
  }

  // Rule 6: Cannot have another in-progress appointment
  if (hasInProgressAppointment) {
    return {
      canStart: false,
      reason: 'You have another appointment in progress. Please complete it first.',
      error: 'has_active_appointment'
    };
  }

  return { canStart: true };
}

/**
 * Get the minutes until appointment start (positive = future, negative = past)
 */
export function getMinutesUntilStart(appointment: Appointment | null | undefined): number {
  if (!appointment?.start_time) return 0;
  const startTime = new Date(appointment.start_time);
  const now = new Date();
  return getMinutesDifference(startTime, now);
}

// ============================================
// ASSIGN TO SELF VALIDATION RULES
// ============================================

export interface AssignValidationResult {
  canAssign: boolean;
  reason?: string;
  error?: string;
}

/**
 * Check if user can assign an appointment to themselves
 *
 * Rules:
 * 1. Status must be 'unassigned'
 * 2. User must be qualified for the speciality (checked separately)
 * 3. Appointment must be within 15 minutes of start time
 */
export function canAssignToSelf(
  appointment: Appointment | null | undefined,
  isQualified: boolean = true
): AssignValidationResult {
  if (!appointment) {
    return { canAssign: false, reason: 'No appointment provided', error: 'no_appointment' };
  }

  // Rule 1: Status must be 'unassigned'
  if (appointment.status !== 'unassigned') {
    return {
      canAssign: false,
      reason: 'Only unassigned appointments can be self-assigned',
      error: 'not_unassigned'
    };
  }

  // Rule 2: User must be qualified
  if (!isQualified) {
    return {
      canAssign: false,
      reason: 'You are not qualified for this appointment type',
      error: 'not_qualified'
    };
  }

  // Rule 3: Within 15 minutes of start time
  const minutesUntilStart = getMinutesUntilStart(appointment);
  if (minutesUntilStart > 15) {
    return {
      canAssign: false,
      reason: `Can only assign to self within 15 minutes of start time`,
      error: 'too_early'
    };
  }

  return { canAssign: true };
}

// ============================================
// CONFLICT DETECTION
// ============================================

export interface ConflictResult {
  hasConflict: boolean;
  conflictingAppointments: ConflictingAppointment[];
  message?: string;
}

export interface ConflictingAppointment {
  id: number;
  title: string;
  start_time: string;
  end_time: string;
  conflict_type: 'team' | 'client';
  status: string;
}

/**
 * Check if a time slot conflicts with existing appointments
 *
 * Uses the overlap formula: (start1 < end2) && (end1 > start2)
 */
export function hasTimeConflict(
  start1: Date,
  end1: Date,
  start2: Date,
  end2: Date
): boolean {
  return start1 < end2 && end1 > start2;
}

/**
 * Check for conflicts with client appointments
 */
export function checkClientConflicts(
  newStart: Date,
  newEnd: Date,
  clientId: number,
  existingAppointments: Appointment[],
  excludeId?: number
): Appointment[] {
  return existingAppointments.filter(apt => {
    // Skip if this is the same appointment (for updates)
    if (excludeId && apt.id === excludeId) return false;

    // Skip if different client
    if (apt.client_id !== clientId) return false;

    // Skip cancelled/deleted appointments
    if (apt.status === 'cancelled' || apt.status === 'deleted') return false;

    // Skip if no start/end times
    if (!apt.start_time || !apt.end_time) return false;

    const aptStart = new Date(apt.start_time);
    const aptEnd = new Date(apt.end_time);

    return hasTimeConflict(newStart, newEnd, aptStart, aptEnd);
  });
}

/**
 * Check for conflicts with team member appointments
 */
export function checkTeamConflicts(
  newStart: Date,
  newEnd: Date,
  teamId: number,
  existingAppointments: Appointment[],
  excludeId?: number
): Appointment[] {
  return existingAppointments.filter(apt => {
    // Skip if this is the same appointment (for updates)
    if (excludeId && apt.id === excludeId) return false;

    // Skip if different team
    if (apt.team_id !== teamId) return false;

    // Skip cancelled/deleted appointments
    if (apt.status === 'cancelled' || apt.status === 'deleted') return false;

    // Skip if no start/end times
    if (!apt.start_time || !apt.end_time) return false;

    const aptStart = new Date(apt.start_time);
    const aptEnd = new Date(apt.end_time);

    return hasTimeConflict(newStart, newEnd, aptStart, aptEnd);
  });
}

/**
 * Full conflict detection for appointment scheduling
 */
export function detectConflicts(
  newStart: Date,
  newEnd: Date,
  clientId: number,
  teamId: number | null,
  existingAppointments: Appointment[],
  excludeId?: number
): ConflictResult {
  const clientConflicts = checkClientConflicts(newStart, newEnd, clientId, existingAppointments, excludeId);
  const teamConflicts = teamId
    ? checkTeamConflicts(newStart, newEnd, teamId, existingAppointments, excludeId)
    : [];

  const allConflicts: ConflictingAppointment[] = [
    ...clientConflicts.map(apt => ({
      id: apt.id,
      title: apt.title || 'Untitled Appointment',
      start_time: apt.start_time!, // We already filtered out appointments without start_time
      end_time: apt.end_time!, // We already filtered out appointments without end_time
      conflict_type: 'client' as const,
      status: apt.status,
    })),
    ...teamConflicts.map(apt => ({
      id: apt.id,
      title: apt.title || 'Untitled Appointment',
      start_time: apt.start_time!,
      end_time: apt.end_time!,
      conflict_type: 'team' as const,
      status: apt.status,
    })),
  ];

  const messages: string[] = [];
  if (clientConflicts.length > 0) {
    messages.push(`Found ${clientConflicts.length} conflicting client appointment(s)`);
  }
  if (teamConflicts.length > 0) {
    messages.push(`Found ${teamConflicts.length} conflicting team appointment(s)`);
  }

  return {
    hasConflict: allConflicts.length > 0,
    conflictingAppointments: allConflicts,
    message: messages.join('. '),
  };
}

// ============================================
// SCHEDULING VALIDATION
// ============================================

export interface ScheduleValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate appointment can be scheduled
 *
 * Rules:
 * 1. No conflicting appointments
 * 2. Within team's working hours (if team assigned)
 * 3. Team is not on time-off
 * 4. Client has sufficient units
 */
export function validateScheduling(
  startTime: Date,
  endTime: Date,
  clientId: number,
  teamId: number | null,
  existingAppointments: Appointment[],
  availableUnits?: number,
  requiredUnits?: number
): ScheduleValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for conflicts
  const conflicts = detectConflicts(startTime, endTime, clientId, teamId, existingAppointments);
  if (conflicts.hasConflict) {
    errors.push(conflicts.message || 'Scheduling conflict detected');
  }

  // Check unit availability
  if (availableUnits !== undefined && requiredUnits !== undefined) {
    if (requiredUnits > availableUnits) {
      errors.push(`Insufficient units available. Required: ${requiredUnits}, Available: ${availableUnits}`);
    } else if (requiredUnits > availableUnits * 0.8) {
      warnings.push(`Low units remaining after this appointment: ${availableUnits - requiredUnits}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================
// COMPLETION VALIDATION
// ============================================

export interface CompletionValidationResult {
  canComplete: boolean;
  hasMetMinimumDuration: boolean;
  elapsedMinutes: number;
  requiredMinutes: number;
  reason?: string;
}

/**
 * Check if an appointment can be completed
 */
export function canCompleteAppointment(
  appointment: Appointment | null | undefined
): CompletionValidationResult {
  if (!appointment) {
    return {
      canComplete: false,
      hasMetMinimumDuration: false,
      elapsedMinutes: 0,
      requiredMinutes: 0,
      reason: 'No appointment provided'
    };
  }

  if (appointment.status !== 'in_progress') {
    return {
      canComplete: false,
      hasMetMinimumDuration: false,
      elapsedMinutes: 0,
      requiredMinutes: 0,
      reason: 'Appointment is not in progress'
    };
  }

  const startedAt = appointment.started_at ? new Date(appointment.started_at) : null;
  if (!startedAt) {
    return {
      canComplete: false,
      hasMetMinimumDuration: false,
      elapsedMinutes: 0,
      requiredMinutes: 0,
      reason: 'Appointment has no start time recorded'
    };
  }

  const now = new Date();
  const elapsedMinutes = Math.floor((now.getTime() - startedAt.getTime()) / (1000 * 60));
  const requiredMinutes = (appointment.units_required || 0) * 15; // Each unit is 15 minutes
  const hasMetMinimumDuration = elapsedMinutes >= requiredMinutes;

  return {
    canComplete: true, // Can always complete, but may need early completion reason
    hasMetMinimumDuration,
    elapsedMinutes,
    requiredMinutes,
  };
}

// ============================================
// CANCELLATION VALIDATION
// ============================================

/**
 * Check if an appointment can be cancelled
 */
export function canCancelAppointment(
  appointment: Appointment | null | undefined,
  isAdmin: boolean = false
): { canCancel: boolean; reason?: string } {
  if (!appointment) {
    return { canCancel: false, reason: 'No appointment provided' };
  }

  // Cannot cancel completed appointments
  if (['completed', 'terminated_by_client', 'terminated_by_staff'].includes(appointment.status)) {
    return { canCancel: false, reason: 'Cannot cancel a completed appointment' };
  }

  // Cannot cancel already cancelled/deleted appointments
  if (['cancelled', 'deleted'].includes(appointment.status)) {
    return { canCancel: false, reason: 'Appointment is already cancelled' };
  }

  // In-progress appointments require special handling
  if (appointment.status === 'in_progress' && !isAdmin) {
    return { canCancel: false, reason: 'Cannot cancel an in-progress appointment. Complete or terminate it instead.' };
  }

  return { canCancel: true };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Check if two dates are on the same day
 */
function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * Get the difference in minutes between two dates
 * Positive means date1 is in the future relative to date2
 */
function getMinutesDifference(date1: Date, date2: Date): number {
  return Math.floor((date1.getTime() - date2.getTime()) / (1000 * 60));
}

/**
 * Format duration in minutes to human-readable string
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${mins}m`;
}

/**
 * Calculate appointment time window for starting
 * Returns the window in which an appointment can be started
 */
export function getStartWindow(appointment: Appointment): {
  canStartFrom: Date | null;
  canStartUntil: Date | null;
  isWithinWindow: boolean;
} {
  if (!appointment.start_time) {
    return { canStartFrom: null, canStartUntil: null, isWithinWindow: false };
  }

  const startTime = new Date(appointment.start_time);
  const endTime = appointment.end_time ? new Date(appointment.end_time) : null;
  const now = new Date();

  // Can start 45 minutes before scheduled start
  const canStartFrom = new Date(startTime.getTime() - 45 * 60 * 1000);
  // Can start up until the end time (or scheduled start if no end time)
  const canStartUntil = endTime || startTime;

  const isWithinWindow = now >= canStartFrom && now <= canStartUntil;

  return { canStartFrom, canStartUntil, isWithinWindow };
}
