'use client';

import { useState, useEffect } from 'react';
import { X, Clock, AlertCircle, Loader2, Calendar, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO, isSameDay, isAfter, differenceInMinutes } from 'date-fns';
import {
  useCreateActivity,
  useUpdateActivity,
  ACTIVITY_TYPES,
  type ACTIVITY_TYPE_COLORS,
} from '@/hooks/useTeamActivities';
import type { TeamActivity, TeamActivityType } from '@/types';

interface ActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamId: number;
  teamName: string;
  activity?: TeamActivity; // For editing
  onSuccess?: () => void;
}

interface FormData {
  type: TeamActivityType;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  location_type: 'onsite' | 'remote';
  is_paid: boolean;
  rate_override: string;
}

interface TimeWarning {
  message: string;
  type: 'warning' | 'error';
}

interface AvailableTimeSlot {
  start: string;
  end: string;
  duration_minutes: number;
  due_to_early_completion?: boolean;
}

interface BusySlot {
  type: 'appointment' | 'activity';
  start: string;
  end: string;
  title: string;
  completed_early?: boolean;
}

interface AvailableTimeSlotsData {
  available_slots: AvailableTimeSlot[];
  busy_slots: BusySlot[];
  working_hours?: { start: string; end: string };
  time_off?: boolean;
  message?: string;
}

const DEFAULT_FORM_DATA: FormData = {
  type: 'training',
  title: '',
  description: '',
  start_time: '',
  end_time: '',
  location_type: 'onsite',
  is_paid: true,
  rate_override: '',
};

export function ActivityModal({
  isOpen,
  onClose,
  teamId,
  teamName,
  activity,
  onSuccess,
}: ActivityModalProps) {
  const [formData, setFormData] = useState<FormData>(DEFAULT_FORM_DATA);
  const [timeWarning, setTimeWarning] = useState<TimeWarning | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<AvailableTimeSlotsData | null>(null);

  const isEditing = !!activity;

  const createActivity = useCreateActivity(teamId);
  const updateActivity = useUpdateActivity(teamId);

  // Reset form when modal opens/closes or activity changes
  useEffect(() => {
    if (isOpen) {
      if (activity) {
        // Editing - populate form with existing data
        setFormData({
          type: activity.type,
          title: activity.title,
          description: activity.description || '',
          start_time: formatDateTimeLocal(activity.start_time),
          end_time: formatDateTimeLocal(activity.end_time),
          location_type: activity.location_type || 'onsite',
          is_paid: activity.is_paid,
          rate_override: activity.rate_override?.toString() || '',
        });
      } else {
        // Creating - reset form
        setFormData(DEFAULT_FORM_DATA);
      }
      setTimeWarning(null);
      setError(null);
      setAvailableTimeSlots(null);
    }
  }, [isOpen, activity]);

  // Validate times when they change
  useEffect(() => {
    validateTimes();
  }, [formData.start_time, formData.end_time]);

  // Format datetime for input
  function formatDateTimeLocal(dateString: string): string {
    try {
      const date = parseISO(dateString);
      return format(date, "yyyy-MM-dd'T'HH:mm");
    } catch {
      return '';
    }
  }

  // Validate times
  function validateTimes() {
    setTimeWarning(null);

    if (!formData.start_time || !formData.end_time) return;

    const startDate = parseISO(formData.start_time);
    const endDate = parseISO(formData.end_time);

    // Check if dates are different
    if (!isSameDay(startDate, endDate)) {
      setTimeWarning({
        message: 'Activities must start and end on the same day',
        type: 'error',
      });
      return;
    }

    // Check if end time is before start time
    if (!isAfter(endDate, startDate)) {
      setTimeWarning({
        message: 'End time must be after start time',
        type: 'error',
      });
      return;
    }

    // Check for activities longer than 8 hours
    const durationMins = differenceInMinutes(endDate, startDate);
    if (durationMins > 480) {
      setTimeWarning({
        message: 'Activity duration exceeds 8 hours. Please verify this is correct.',
        type: 'warning',
      });
      return;
    }

    // Check for evening activities (after 6 PM)
    const startHour = startDate.getHours();
    if (startHour >= 18) {
      setTimeWarning({
        message: 'You are setting an evening start time. Please confirm this is intentional.',
        type: 'warning',
      });
      return;
    }

    // Check for early morning activities (before 7 AM)
    if (startHour < 7) {
      setTimeWarning({
        message: 'You are setting a very early start time. Please confirm this is intentional.',
        type: 'warning',
      });
      return;
    }
  }

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate required fields
    if (!formData.title.trim()) {
      setError('Please enter a title');
      return;
    }
    if (!formData.start_time) {
      setError('Please select a start time');
      return;
    }
    if (!formData.end_time) {
      setError('Please select an end time');
      return;
    }
    if (timeWarning?.type === 'error') {
      return; // Don't submit if there's a time error
    }

    try {
      const submitData = {
        type: formData.type,
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        start_time: format(parseISO(formData.start_time), 'yyyy-MM-dd HH:mm:ss'),
        end_time: format(parseISO(formData.end_time), 'yyyy-MM-dd HH:mm:ss'),
        location_type: formData.location_type,
        is_paid: formData.is_paid,
        rate_override: formData.rate_override ? parseFloat(formData.rate_override) : null,
      };

      if (isEditing && activity) {
        await updateActivity.mutateAsync({ id: activity.id, ...submitData });
      } else {
        await createActivity.mutateAsync(submitData);
      }

      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      console.error('Error saving activity:', err);
      // Check if error has available time slots
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { data?: { message?: string; available_time_slots?: AvailableTimeSlotsData } } };
        if (axiosError.response?.data?.available_time_slots) {
          setAvailableTimeSlots(axiosError.response.data.available_time_slots);
          setError(axiosError.response.data.message || 'Conflict detected - please select a different time');
        } else if (axiosError.response?.data?.message) {
          setError(axiosError.response.data.message);
          setAvailableTimeSlots(null);
        } else {
          setError('Failed to save activity. Please try again.');
          setAvailableTimeSlots(null);
        }
      } else {
        setError('Failed to save activity. Please try again.');
        setAvailableTimeSlots(null);
      }
    }
  };

  // Handle clicking on an available time slot
  const handleSelectTimeSlot = (slot: AvailableTimeSlot) => {
    if (!formData.start_time) return;

    const date = formData.start_time.split('T')[0];
    setFormData(prev => ({
      ...prev,
      start_time: `${date}T${slot.start}`,
      end_time: `${date}T${slot.end}`,
    }));
    setError(null);
    setAvailableTimeSlots(null);
  };

  // Format time for display (e.g., "09:00" -> "9:00 AM")
  const formatTimeForDisplay = (timeStr: string): string => {
    try {
      const [hours, minutes] = timeStr.split(':').map(Number);
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHour = hours % 12 || 12;
      return `${displayHour}:${minutes.toString().padStart(2, '0')} ${period}`;
    } catch {
      return timeStr;
    }
  };

  // Format duration
  const formatDuration = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes}min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMins = minutes % 60;
    if (remainingMins === 0) {
      return `${hours}hr`;
    }
    return `${hours}hr ${remainingMins}min`;
  };

  // Handle start time change - update end date to match
  const handleStartTimeChange = (value: string) => {
    setFormData(prev => {
      const newData = { ...prev, start_time: value };

      // If end_time exists, keep its time but update the date
      if (prev.end_time && value) {
        try {
          const startDate = parseISO(value);
          const endDate = parseISO(prev.end_time);
          const newEndDate = new Date(
            startDate.getFullYear(),
            startDate.getMonth(),
            startDate.getDate(),
            endDate.getHours(),
            endDate.getMinutes()
          );
          newData.end_time = format(newEndDate, "yyyy-MM-dd'T'HH:mm");
        } catch {
          // Keep original end_time if parsing fails
        }
      }

      return newData;
    });
  };

  const isPending = createActivity.isPending || updateActivity.isPending;
  const isFinalized = activity?.is_in_finalized_report;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal content */}
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="relative bg-white dark:bg-gray-900 rounded-lg max-w-lg w-full shadow-xl">
          {/* Header */}
          <form onSubmit={handleSubmit}>
            <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {isEditing ? 'Edit Activity' : 'Create Activity'}
              </h3>
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Finalized warning */}
              {isFinalized && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                  <p className="text-sm text-blue-600 dark:text-blue-400">
                    This activity is part of a finalized pay period report and cannot be edited.
                  </p>
                </div>
              )}

              {/* Team member display */}
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Team member: <span className="font-medium text-gray-900 dark:text-white">{teamName}</span>
              </div>

              {/* Type and Title row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as TeamActivityType }))}
                    disabled={isFinalized}
                    className={cn(
                      'w-full px-3 py-2 border rounded-md text-sm',
                      'bg-white dark:bg-gray-800',
                      'text-gray-900 dark:text-gray-100',
                      'border-gray-300 dark:border-gray-700',
                      'focus:ring-2 focus:ring-violet-500 focus:border-violet-500',
                      isFinalized && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    {ACTIVITY_TYPES.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Activity title"
                    disabled={isFinalized}
                    className={cn(
                      'w-full px-3 py-2 border rounded-md text-sm',
                      'bg-white dark:bg-gray-800',
                      'text-gray-900 dark:text-gray-100',
                      'border-gray-300 dark:border-gray-700',
                      'focus:ring-2 focus:ring-violet-500 focus:border-violet-500',
                      isFinalized && 'opacity-50 cursor-not-allowed'
                    )}
                  />
                </div>
              </div>

              {/* Schedule row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Start Time
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.start_time}
                    onChange={(e) => handleStartTimeChange(e.target.value)}
                    disabled={isFinalized}
                    className={cn(
                      'w-full px-3 py-2 border rounded-md text-sm',
                      'bg-white dark:bg-gray-800',
                      'text-gray-900 dark:text-gray-100',
                      'border-gray-300 dark:border-gray-700',
                      'focus:ring-2 focus:ring-violet-500 focus:border-violet-500',
                      isFinalized && 'opacity-50 cursor-not-allowed'
                    )}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    End Time
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.end_time}
                    onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
                    disabled={isFinalized}
                    className={cn(
                      'w-full px-3 py-2 border rounded-md text-sm',
                      'bg-white dark:bg-gray-800',
                      'text-gray-900 dark:text-gray-100',
                      'border-gray-300 dark:border-gray-700',
                      'focus:ring-2 focus:ring-violet-500 focus:border-violet-500',
                      isFinalized && 'opacity-50 cursor-not-allowed'
                    )}
                  />
                </div>
              </div>

              {/* Time warning */}
              {timeWarning && (
                <div
                  className={cn(
                    'p-3 rounded-md border flex items-center space-x-2',
                    timeWarning.type === 'error'
                      ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800'
                      : 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800'
                  )}
                >
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm">{timeWarning.message}</span>
                </div>
              )}

              {/* Location type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Location
                </label>
                <select
                  value={formData.location_type}
                  onChange={(e) => setFormData(prev => ({ ...prev, location_type: e.target.value as 'onsite' | 'remote' }))}
                  disabled={isFinalized}
                  className={cn(
                    'w-full px-3 py-2 border rounded-md text-sm',
                    'bg-white dark:bg-gray-800',
                    'text-gray-900 dark:text-gray-100',
                    'border-gray-300 dark:border-gray-700',
                    'focus:ring-2 focus:ring-violet-500 focus:border-violet-500',
                    isFinalized && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <option value="onsite">Onsite</option>
                  <option value="remote">Remote</option>
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Optional description"
                  rows={2}
                  disabled={isFinalized}
                  className={cn(
                    'w-full px-3 py-2 border rounded-md text-sm',
                    'bg-white dark:bg-gray-800',
                    'text-gray-900 dark:text-gray-100',
                    'border-gray-300 dark:border-gray-700',
                    'focus:ring-2 focus:ring-violet-500 focus:border-violet-500',
                    isFinalized && 'opacity-50 cursor-not-allowed'
                  )}
                />
              </div>

              {/* Compensation */}
              <div className="space-y-3">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_paid}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_paid: e.target.checked }))}
                    disabled={isFinalized}
                    className="w-4 h-4 rounded text-violet-600 dark:text-violet-500 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 focus:ring-violet-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Count towards wages
                  </span>
                </label>

                {formData.is_paid && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Hourly Rate Override (optional)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.rate_override}
                      onChange={(e) => setFormData(prev => ({ ...prev, rate_override: e.target.value }))}
                      placeholder="Leave blank to use default rate"
                      disabled={isFinalized}
                      className={cn(
                        'w-full px-3 py-2 border rounded-md text-sm',
                        'bg-white dark:bg-gray-800',
                        'text-gray-900 dark:text-gray-100',
                        'border-gray-300 dark:border-gray-700',
                        'focus:ring-2 focus:ring-violet-500 focus:border-violet-500',
                        isFinalized && 'opacity-50 cursor-not-allowed'
                      )}
                    />
                  </div>
                )}
              </div>

              {/* Error message */}
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}

              {/* Available time slots */}
              {availableTimeSlots && (
                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg space-y-4">
                  {/* Working hours info */}
                  {availableTimeSlots.working_hours && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <Clock className="w-4 h-4" />
                      <span>
                        Working hours: {formatTimeForDisplay(availableTimeSlots.working_hours.start)} - {formatTimeForDisplay(availableTimeSlots.working_hours.end)}
                      </span>
                    </div>
                  )}

                  {/* Time off notice */}
                  {availableTimeSlots.time_off && (
                    <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                      <Calendar className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                      <span className="text-sm text-yellow-700 dark:text-yellow-300">
                        Team member has time off scheduled on this day
                      </span>
                    </div>
                  )}

                  {/* Available slots */}
                  {availableTimeSlots.available_slots.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                        Available Time Slots
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {availableTimeSlots.available_slots.map((slot, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => handleSelectTimeSlot(slot)}
                            className={cn(
                              'px-3 py-2 text-sm rounded-md border transition-colors',
                              'bg-white dark:bg-gray-800 hover:bg-violet-50 dark:hover:bg-violet-900/20',
                              'border-gray-300 dark:border-gray-600 hover:border-violet-500',
                              'text-gray-700 dark:text-gray-300 hover:text-violet-700 dark:hover:text-violet-300',
                              slot.due_to_early_completion && 'border-green-400 bg-green-50 dark:bg-green-900/20'
                            )}
                          >
                            <div className="font-medium">
                              {formatTimeForDisplay(slot.start)} - {formatTimeForDisplay(slot.end)}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {formatDuration(slot.duration_minutes)}
                              {slot.due_to_early_completion && ' (freed up)'}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Busy slots */}
                  {availableTimeSlots.busy_slots.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                        Existing Schedule
                      </h4>
                      <div className="space-y-2">
                        {availableTimeSlots.busy_slots.map((slot, index) => (
                          <div
                            key={index}
                            className={cn(
                              'flex items-center gap-3 p-2 rounded-md text-sm',
                              slot.type === 'appointment'
                                ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                                : 'bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800',
                              slot.completed_early && 'opacity-60'
                            )}
                          >
                            <div className={cn(
                              'w-2 h-2 rounded-full flex-shrink-0',
                              slot.type === 'appointment' ? 'bg-blue-500' : 'bg-purple-500'
                            )} />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-gray-900 dark:text-white truncate">
                                {slot.title}
                                {slot.completed_early && (
                                  <span className="ml-2 text-xs text-green-600 dark:text-green-400">
                                    (completed early)
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {formatTimeForDisplay(slot.start)} - {formatTimeForDisplay(slot.end)}
                                {' • '}
                                {slot.type === 'appointment' ? 'Appointment' : 'Activity'}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* No slots message */}
                  {availableTimeSlots.available_slots.length === 0 && (
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {availableTimeSlots.message || 'No available time slots found for this day. Consider selecting a different date.'}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            {!isFinalized && (
              <div className="flex justify-end space-x-3 p-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className={cn(
                    'px-4 py-2 text-sm font-medium text-white rounded-md transition-colors',
                    'bg-violet-600 hover:bg-violet-700 dark:bg-violet-600 dark:hover:bg-violet-700',
                    isPending && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {isPending ? (
                    <span className="flex items-center space-x-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{isEditing ? 'Updating...' : 'Creating...'}</span>
                    </span>
                  ) : (
                    isEditing ? 'Update' : 'Create'
                  )}
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
