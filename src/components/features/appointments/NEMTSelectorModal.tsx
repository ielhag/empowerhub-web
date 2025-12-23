'use client';

import { useState } from 'react';
import { format, parseISO, isWithinInterval, subHours } from 'date-fns';
import { cn } from '@/lib/utils';
import type { NEMTOccurrence } from '@/types';
import {
  X,
  Bus,
  Clock,
  MapPin,
  Check,
  AlertTriangle,
  Building2,
} from 'lucide-react';

interface NEMTSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  occurrences: NEMTOccurrence[];
  selectedOccurrenceId?: number;
  appointmentDate?: string;
  appointmentTime?: string;
  onSelect: (occurrence: NEMTOccurrence) => void;
  onUnselect: () => void;
}

export function NEMTSelectorModal({
  isOpen,
  onClose,
  occurrences,
  selectedOccurrenceId,
  appointmentDate,
  appointmentTime,
  onSelect,
  onUnselect,
}: NEMTSelectorModalProps) {
  const [validationError, setValidationError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Format time to 12-hour format
  const formatTimeDisplay = (time?: string) => {
    if (!time) return 'N/A';
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  // Check if appointment time is within valid pickup window (1 hour before to pickup end)
  const isWithinPickupWindow = (occurrence: NEMTOccurrence): boolean => {
    if (!appointmentDate || !appointmentTime || !occurrence.pickup_time_from) {
      return true; // Can't validate without all data
    }

    try {
      const appointmentDateTime = parseISO(`${appointmentDate}T${appointmentTime}`);
      const pickupFrom = parseISO(`${appointmentDate}T${occurrence.pickup_time_from}`);
      const pickupTo = occurrence.pickup_time_to
        ? parseISO(`${appointmentDate}T${occurrence.pickup_time_to}`)
        : pickupFrom;

      // Allow 1 hour before pickup window
      const windowStart = subHours(pickupFrom, 1);

      return isWithinInterval(appointmentDateTime, {
        start: windowStart,
        end: pickupTo,
      });
    } catch {
      return true;
    }
  };

  const handleSelect = (occurrence: NEMTOccurrence) => {
    // Validate time window
    if (!isWithinPickupWindow(occurrence)) {
      setValidationError(
        'Appointment must be scheduled on the same day and within 1 hour of the transportation pickup window'
      );
      setTimeout(() => setValidationError(null), 5000);
      return;
    }

    setValidationError(null);
    onSelect(occurrence);
    onClose();
  };

  const handleUnselect = () => {
    setValidationError(null);
    onUnselect();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-xl shadow-xl transform transition-all">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center">
                <Bus className="w-5 h-5 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Link Transportation
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Select a NEMT request to link with this appointment
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Validation Error */}
          {validationError && (
            <div className="mx-6 mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 dark:text-red-300">{validationError}</p>
            </div>
          )}

          {/* Content */}
          <div className="p-6 max-h-[60vh] overflow-y-auto">
            {occurrences.length === 0 ? (
              <div className="text-center py-8">
                <Bus className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  No transportation requests found for this date
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {occurrences.map((occurrence) => {
                  const isSelected = selectedOccurrenceId === occurrence.id;
                  const isValidWindow = isWithinPickupWindow(occurrence);
                  const brokerName = occurrence.nemt_request?.broker_name || occurrence.broker_name || 'Unknown Broker';

                  return (
                    <div
                      key={occurrence.id}
                      className={cn(
                        'p-4 rounded-lg border-2 transition-all cursor-pointer',
                        isSelected
                          ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-violet-300 dark:hover:border-violet-600',
                        !isValidWindow && 'opacity-60'
                      )}
                      onClick={() => !isSelected && handleSelect(occurrence)}
                    >
                      {/* Header */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-gray-400" />
                          <span className="font-medium text-gray-900 dark:text-white">
                            {brokerName}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            (#{occurrence.nemt_request_id})
                          </span>
                        </div>
                        {isSelected ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUnselect();
                            }}
                            className="px-3 py-1 text-xs font-medium text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-900/50 rounded-full hover:bg-violet-200 dark:hover:bg-violet-800 transition-colors"
                          >
                            <Check className="w-3 h-3 inline mr-1" />
                            Selected
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelect(occurrence);
                            }}
                            className="px-3 py-1 text-xs font-medium text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/30 rounded-full transition-colors"
                          >
                            Select
                          </button>
                        )}
                      </div>

                      {/* Details */}
                      <div className="space-y-2 text-sm">
                        {/* Transportation Company */}
                        {occurrence.transportation_company && (
                          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                            <Bus className="w-4 h-4" />
                            <span>{occurrence.transportation_company}</span>
                          </div>
                        )}

                        {/* Date */}
                        {occurrence.transportation_date && (
                          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                            <Clock className="w-4 h-4" />
                            <span>
                              {format(parseISO(occurrence.transportation_date), 'MMM d, yyyy')}
                            </span>
                          </div>
                        )}

                        {/* Pickup Window */}
                        {occurrence.pickup_time_from && (
                          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                            <Clock className="w-4 h-4" />
                            <span>
                              Pickup: {formatTimeDisplay(occurrence.pickup_time_from)}
                              {occurrence.pickup_time_to && ` - ${formatTimeDisplay(occurrence.pickup_time_to)}`}
                            </span>
                            {!isValidWindow && (
                              <span className="text-xs text-amber-600 dark:text-amber-400">
                                (Outside window)
                              </span>
                            )}
                          </div>
                        )}

                        {/* Return Window */}
                        {occurrence.return_time_from && (
                          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                            <Clock className="w-4 h-4" />
                            <span>
                              Return: {formatTimeDisplay(occurrence.return_time_from)}
                              {occurrence.return_time_to && ` - ${formatTimeDisplay(occurrence.return_time_to)}`}
                            </span>
                          </div>
                        )}

                        {/* Dropoff Address */}
                        {occurrence.dropoff_address && (
                          <div className="flex items-start gap-2 text-gray-500 dark:text-gray-400">
                            <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            <span className="text-xs">{occurrence.dropoff_address}</span>
                          </div>
                        )}
                      </div>

                      {/* Already matched warning */}
                      {occurrence.appointment_id && occurrence.appointment_id !== selectedOccurrenceId && (
                        <div className="mt-3 p-2 bg-amber-50 dark:bg-amber-900/20 rounded border border-amber-200 dark:border-amber-800">
                          <p className="text-xs text-amber-700 dark:text-amber-300 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Already linked to another appointment
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
