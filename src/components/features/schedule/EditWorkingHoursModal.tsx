'use client';

import { useState, useEffect } from 'react';
import { X, Clock, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useWorkingHours,
  useUpdateWorkingHours,
  DAYS_OF_WEEK,
  capitalizeDayName,
  type WorkingHoursFormData,
  type DayOfWeek,
  DEFAULT_WORKING_HOURS,
} from '@/hooks/useWorkingHours';

interface EditWorkingHoursModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamId: number;
  teamName: string;
  onSuccess?: () => void;
}

export function EditWorkingHoursModal({
  isOpen,
  onClose,
  teamId,
  teamName,
  onSuccess,
}: EditWorkingHoursModalProps) {
  const [workingHours, setWorkingHours] = useState<WorkingHoursFormData>(DEFAULT_WORKING_HOURS);

  const { data: existingHours, isLoading: isLoadingHours } = useWorkingHours(teamId);
  const updateHours = useUpdateWorkingHours(teamId);

  // Load existing hours when data is available
  useEffect(() => {
    if (existingHours) {
      setWorkingHours(existingHours);
    }
  }, [existingHours]);

  // Handle day toggle
  const handleDayToggle = (day: DayOfWeek) => {
    setWorkingHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        is_active: !prev[day].is_active,
      },
    }));
  };

  // Handle time change
  const handleTimeChange = (day: DayOfWeek, field: 'start' | 'end', value: string) => {
    setWorkingHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
      },
    }));
  };

  // Handle save
  const handleSave = async () => {
    try {
      await updateHours.mutateAsync(workingHours);
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error saving working hours:', error);
    }
  };

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
        <div className="relative bg-white dark:bg-gray-900 rounded-lg max-w-2xl w-full p-6 shadow-xl">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-violet-100 dark:bg-violet-900/50 rounded-lg">
                <Clock className="w-5 h-5 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Edit Working Hours
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {teamName}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Working hours form */}
          {isLoadingHours ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
            </div>
          ) : (
            <div className="space-y-4">
              {DAYS_OF_WEEK.map((day) => (
                <div key={day} className="flex items-center space-x-4">
                  {/* Day name */}
                  <div className="w-28">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {capitalizeDayName(day)}
                    </span>
                  </div>

                  {/* Start time */}
                  <input
                    type="time"
                    value={workingHours[day].start}
                    onChange={(e) => handleTimeChange(day, 'start', e.target.value)}
                    disabled={!workingHours[day].is_active}
                    className={cn(
                      'px-3 py-2 border rounded-md text-sm',
                      'bg-white dark:bg-gray-800',
                      'text-gray-900 dark:text-gray-100',
                      'border-gray-300 dark:border-gray-700',
                      'focus:ring-2 focus:ring-violet-500 focus:border-violet-500',
                      !workingHours[day].is_active && 'opacity-50 cursor-not-allowed'
                    )}
                  />

                  {/* To label */}
                  <span className="text-gray-500 dark:text-gray-400">to</span>

                  {/* End time */}
                  <input
                    type="time"
                    value={workingHours[day].end}
                    onChange={(e) => handleTimeChange(day, 'end', e.target.value)}
                    disabled={!workingHours[day].is_active}
                    className={cn(
                      'px-3 py-2 border rounded-md text-sm',
                      'bg-white dark:bg-gray-800',
                      'text-gray-900 dark:text-gray-100',
                      'border-gray-300 dark:border-gray-700',
                      'focus:ring-2 focus:ring-violet-500 focus:border-violet-500',
                      !workingHours[day].is_active && 'opacity-50 cursor-not-allowed'
                    )}
                  />

                  {/* Active checkbox */}
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={workingHours[day].is_active}
                      onChange={() => handleDayToggle(day)}
                      className="w-4 h-4 rounded text-violet-600 dark:text-violet-500 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 focus:ring-violet-500"
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Active
                    </span>
                  </label>
                </div>
              ))}
            </div>
          )}

          {/* Footer */}
          <div className="mt-6 flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={updateHours.isPending}
              className={cn(
                'px-4 py-2 text-sm font-medium text-white rounded-md transition-colors',
                'bg-violet-600 hover:bg-violet-700 dark:bg-violet-600 dark:hover:bg-violet-700',
                updateHours.isPending && 'opacity-50 cursor-not-allowed'
              )}
            >
              {updateHours.isPending ? (
                <span className="flex items-center space-x-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </span>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>

          {/* Error message */}
          {updateHours.isError && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
              <p className="text-sm text-red-600 dark:text-red-400">
                Failed to save working hours. Please try again.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
