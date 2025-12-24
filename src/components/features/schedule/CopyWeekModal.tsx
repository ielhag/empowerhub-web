'use client';

import { useState, useEffect } from 'react';
import { X, Copy, AlertCircle, Loader2, CheckCircle, Calendar, Info, FileEdit } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, startOfWeek, addWeeks, isBefore } from 'date-fns';
import { useCopyWeek, CopyWeekResponse } from '@/hooks/useDraftAppointments';

interface CopyWeekModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDate: Date;
  onSuccess?: (batchId: string) => void;
}

export function CopyWeekModal({
  isOpen,
  onClose,
  currentDate,
  onSuccess,
}: CopyWeekModalProps) {
  // Source week defaults to current week
  const [sourceWeek, setSourceWeek] = useState<string>(
    format(startOfWeek(currentDate, { weekStartsOn: 0 }), 'yyyy-MM-dd')
  );
  // Target week defaults to next week
  const [targetWeek, setTargetWeek] = useState<string>(
    format(startOfWeek(addWeeks(currentDate, 1), { weekStartsOn: 0 }), 'yyyy-MM-dd')
  );
  const [result, setResult] = useState<CopyWeekResponse | null>(null);

  const copyWeekMutation = useCopyWeek();

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSourceWeek(format(startOfWeek(currentDate, { weekStartsOn: 0 }), 'yyyy-MM-dd'));
      setTargetWeek(format(startOfWeek(addWeeks(currentDate, 1), { weekStartsOn: 0 }), 'yyyy-MM-dd'));
      setResult(null);
      copyWeekMutation.reset();
    }
  }, [isOpen, currentDate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setResult(null);
    copyWeekMutation.mutate(
      { sourceWeek, targetWeek },
      {
        onSuccess: (data) => {
          setResult(data);
          // Backend returns total_drafts (not total_created)
          if (data.success && data.data?.total_drafts && data.data.total_drafts > 0) {
            onSuccess?.(data.data.batch_id);
          }
        },
        onError: (error: Error & { response?: { data?: CopyWeekResponse } }) => {
          if (error.response?.data) {
            setResult(error.response.data);
          } else {
            setResult({
              success: false,
              message: error.message || 'Failed to copy week',
            });
          }
        },
      }
    );
  };

  const handleClose = () => {
    setResult(null);
    copyWeekMutation.reset();
    onClose();
  };

  // Format week for display (e.g., "Dec 23 - Dec 29, 2024")
  const formatWeekDisplay = (dateStr: string) => {
    try {
      const start = new Date(dateStr + 'T00:00:00');
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
    } catch {
      return dateStr;
    }
  };

  // Validate that target week is after source week
  const isValidSelection = isBefore(new Date(sourceWeek), new Date(targetWeek));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={handleClose}
      />

      {/* Modal content */}
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="relative bg-white dark:bg-gray-900 rounded-lg max-w-lg w-full shadow-xl">
          {/* Header */}
          <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <Copy className="w-5 h-5 text-violet-600" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Copy Week
              </h3>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="p-2 text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="p-4 space-y-4">
              {/* Draft Info */}
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md flex items-start gap-2">
                <FileEdit className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  <p className="font-medium">Creates Draft Appointments</p>
                  <p className="text-blue-600 dark:text-blue-400 mt-0.5">
                    Appointments will be created as drafts. Review and publish them from the Drafts panel.
                  </p>
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Copy all appointments from one week to another. The appointments will be created with the same day and time in the target week.
              </p>

              {/* Source Week */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Source Week (copy from)
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="date"
                    value={sourceWeek}
                    onChange={(e) => setSourceWeek(e.target.value)}
                    className={cn(
                      'w-full pl-10 pr-3 py-2 border rounded-md text-sm',
                      'bg-white dark:bg-gray-800',
                      'text-gray-900 dark:text-gray-100',
                      'border-gray-300 dark:border-gray-700',
                      'focus:ring-2 focus:ring-violet-500 focus:border-violet-500'
                    )}
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Week of {formatWeekDisplay(sourceWeek)}
                </p>
              </div>

              {/* Target Week */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Target Week (copy to)
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="date"
                    value={targetWeek}
                    onChange={(e) => setTargetWeek(e.target.value)}
                    className={cn(
                      'w-full pl-10 pr-3 py-2 border rounded-md text-sm',
                      'bg-white dark:bg-gray-800',
                      'text-gray-900 dark:text-gray-100',
                      'border-gray-300 dark:border-gray-700',
                      'focus:ring-2 focus:ring-violet-500 focus:border-violet-500'
                    )}
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Week of {formatWeekDisplay(targetWeek)}
                </p>
              </div>

              {/* Validation error */}
              {!isValidSelection && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                  <p className="text-sm text-red-600 dark:text-red-400">
                    Target week must be after source week
                  </p>
                </div>
              )}

              {/* Result */}
              {result && (
                <div
                  className={cn(
                    'p-4 rounded-lg border',
                    result.success
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                      : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                  )}
                >
                  <div className="flex items-start gap-3">
                    {result.success ? (
                      <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p
                        className={cn(
                          'text-sm font-medium',
                          result.success
                            ? 'text-green-700 dark:text-green-300'
                            : 'text-red-700 dark:text-red-300'
                        )}
                      >
                        {result.message}
                      </p>
                      {result.data && (
                        <div className="mt-2 text-sm text-gray-600 dark:text-gray-400 space-y-1">
                          <p>Created: {result.data.total_drafts} draft appointments</p>
                          <p className="text-xs text-gray-500 dark:text-gray-500">
                            Batch ID: {result.data.batch_id.slice(0, 8)}...
                          </p>
                        </div>
                      )}
                      {result.success && result.data && result.data.total_drafts > 0 && (
                        <div className="mt-3 p-2 bg-amber-50 dark:bg-amber-900/20 rounded border border-amber-200 dark:border-amber-800">
                          <p className="text-xs text-amber-700 dark:text-amber-300 flex items-center gap-1">
                            <Info className="w-3 h-3" />
                            Review drafts in the Drafts panel, then publish to create appointments.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end space-x-3 p-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
              >
                {result?.success ? 'Close' : 'Cancel'}
              </button>
              {!result?.success && (
                <button
                  type="submit"
                  disabled={copyWeekMutation.isPending || !isValidSelection}
                  className={cn(
                    'px-4 py-2 text-sm font-medium text-white rounded-md transition-colors',
                    'bg-violet-600 hover:bg-violet-700 dark:bg-violet-600 dark:hover:bg-violet-700',
                    (copyWeekMutation.isPending || !isValidSelection) && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {copyWeekMutation.isPending ? (
                    <span className="flex items-center space-x-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Copying...</span>
                    </span>
                  ) : (
                    <span className="flex items-center space-x-2">
                      <Copy className="w-4 h-4" />
                      <span>Copy Week</span>
                    </span>
                  )}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
