'use client';

import { useState } from 'react';
import {
  X,
  FileEdit,
  CheckCircle,
  AlertCircle,
  Clock,
  Loader2,
  Send,
  Trash2,
  Undo2,
  ChevronDown,
  ChevronUp,
  User,
  Users,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO, startOfWeek } from 'date-fns';
import {
  useDraftAppointments,
  useCopyWeekBatches,
  usePublishDrafts,
  useRevertCopyWeek,
  useDeleteDrafts,
  useRemoveDraft,
  DraftAppointment,
  CopyWeekBatch,
} from '@/hooks/useDraftAppointments';

interface DraftAppointmentsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentDate: Date;
  onPublishSuccess?: () => void;
}

export function DraftAppointmentsPanel({
  isOpen,
  onClose,
  currentDate,
  onPublishSuccess,
}: DraftAppointmentsPanelProps) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set());
  const [selectedDrafts, setSelectedDrafts] = useState<Set<number>>(new Set());

  const { data: draftsData, isLoading: draftsLoading, refetch: refetchDrafts } = useDraftAppointments(weekStart);
  const { data: batchesData, isLoading: batchesLoading } = useCopyWeekBatches();

  const publishMutation = usePublishDrafts();
  const revertMutation = useRevertCopyWeek();
  const deleteMutation = useDeleteDrafts();
  const removeDraftMutation = useRemoveDraft();

  // Safely extract arrays from transformed response data
  // The hook's select function transforms data to include drafts/batches at top level
  const drafts = Array.isArray(draftsData?.drafts) ? draftsData.drafts : [];
  const batches = Array.isArray(batchesData?.batches) ? batchesData.batches : [];

  // Filter batches for current week using target_week_date (YYYY-MM-DD format)
  const weekBatches = batches.filter((batch) => {
    if (!batch.target_week_date) return false;
    try {
      const batchDate = parseISO(batch.target_week_date);
      const batchWeekStart = startOfWeek(batchDate, { weekStartsOn: 0 });
      return batchWeekStart.getTime() === weekStart.getTime();
    } catch {
      return false;
    }
  });

  // Group drafts by batch
  const draftsByBatch = drafts.reduce((acc, draft) => {
    const batchId = draft.batch_id || 'manual';
    if (!acc[batchId]) {
      acc[batchId] = [];
    }
    acc[batchId].push(draft);
    return acc;
  }, {} as Record<string, DraftAppointment[]>);

  const validDrafts = drafts.filter((d) => d.validation_status === 'valid');
  const invalidDrafts = drafts.filter((d) => d.validation_status === 'invalid');
  const pendingDrafts = drafts.filter((d) => d.validation_status === 'pending');

  const toggleBatch = (batchId: string) => {
    setExpandedBatches((prev) => {
      const next = new Set(prev);
      if (next.has(batchId)) {
        next.delete(batchId);
      } else {
        next.add(batchId);
      }
      return next;
    });
  };

  const handlePublishAll = async () => {
    if (validDrafts.length === 0) return;

    try {
      await publishMutation.mutateAsync({ weekStart: format(weekStart, 'yyyy-MM-dd') });
      onPublishSuccess?.();
    } catch (error) {
      console.error('Failed to publish drafts:', error);
    }
  };

  const handlePublishSelected = async () => {
    if (selectedDrafts.size === 0) return;

    try {
      await publishMutation.mutateAsync({ draftIds: Array.from(selectedDrafts) });
      setSelectedDrafts(new Set());
      onPublishSuccess?.();
    } catch (error) {
      console.error('Failed to publish selected drafts:', error);
    }
  };

  const handleRevertBatch = async (batchId: string) => {
    try {
      await revertMutation.mutateAsync({ batchId });
      refetchDrafts();
    } catch (error) {
      console.error('Failed to revert batch:', error);
    }
  };

  const handleDeleteAll = async () => {
    if (drafts.length === 0) return;

    if (!confirm('Are you sure you want to delete all draft appointments for this week?')) return;

    try {
      await deleteMutation.mutateAsync({ weekStart: format(weekStart, 'yyyy-MM-dd') });
    } catch (error) {
      console.error('Failed to delete drafts:', error);
    }
  };

  const handleRemoveDraft = async (draftId: number) => {
    try {
      await removeDraftMutation.mutateAsync({ draftId });
    } catch (error) {
      console.error('Failed to remove draft:', error);
    }
  };

  const toggleDraftSelection = (draftId: number) => {
    setSelectedDrafts((prev) => {
      const next = new Set(prev);
      if (next.has(draftId)) {
        next.delete(draftId);
      } else {
        next.add(draftId);
      }
      return next;
    });
  };

  const ValidationBadge = ({ status }: { status: string }) => {
    switch (status) {
      case 'valid':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
            <CheckCircle className="w-3 h-3" />
            Valid
          </span>
        );
      case 'invalid':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
            <AlertCircle className="w-3 h-3" />
            Invalid
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400">
            <Clock className="w-3 h-3" />
            Pending
          </span>
        );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      {/* Panel - slides in from right */}
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white dark:bg-gray-900 shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <FileEdit className="w-5 h-5 text-violet-600" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Draft Appointments
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Week info */}
        <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Week of {format(weekStart, 'MMM d, yyyy')}
          </p>
        </div>

        {/* Stats summary */}
        {!draftsLoading && drafts.length > 0 && (
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-gray-700 dark:text-gray-300">
                  {validDrafts.length} valid
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <span className="text-gray-700 dark:text-gray-300">
                  {invalidDrafts.length} invalid
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-yellow-500" />
                <span className="text-gray-700 dark:text-gray-300">
                  {pendingDrafts.length} pending
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {draftsLoading || batchesLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-violet-600" />
            </div>
          ) : drafts.length === 0 ? (
            <div className="text-center py-12">
              <FileEdit className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400 font-medium">
                No draft appointments
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                Use Copy Week to create draft appointments
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Batches */}
              {weekBatches.map((batch) => {
                const batchDrafts = draftsByBatch[batch.batch_id] || [];
                const isExpanded = expandedBatches.has(batch.batch_id);

                return (
                  <div
                    key={batch.batch_id}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
                  >
                    {/* Batch header */}
                    <div
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 cursor-pointer"
                      onClick={() => toggleBatch(batch.batch_id)}
                    >
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        )}
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            Copied from {batch.source_week}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {batchDrafts.length} appointments
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {batch.can_revert && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRevertBatch(batch.batch_id);
                            }}
                            disabled={revertMutation.isPending}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                            title="Undo this copy"
                          >
                            {revertMutation.isPending ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Undo2 className="w-4 h-4" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Batch drafts */}
                    {isExpanded && batchDrafts.length > 0 && (
                      <div className="divide-y divide-gray-100 dark:divide-gray-800">
                        {batchDrafts.map((draft) => (
                          <DraftAppointmentItem
                            key={draft.id}
                            draft={draft}
                            isSelected={selectedDrafts.has(draft.id)}
                            onToggleSelect={() => toggleDraftSelection(draft.id)}
                            onRemove={() => handleRemoveDraft(draft.id)}
                            isRemoving={removeDraftMutation.isPending}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Manual drafts (not from copy-week) */}
              {draftsByBatch['manual'] && draftsByBatch['manual'].length > 0 && (
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <div className="p-3 bg-gray-50 dark:bg-gray-800">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      Manual Drafts
                    </p>
                  </div>
                  <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {draftsByBatch['manual'].map((draft) => (
                      <DraftAppointmentItem
                        key={draft.id}
                        draft={draft}
                        isSelected={selectedDrafts.has(draft.id)}
                        onToggleSelect={() => toggleDraftSelection(draft.id)}
                        onRemove={() => handleRemoveDraft(draft.id)}
                        isRemoving={removeDraftMutation.isPending}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        {drafts.length > 0 && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 space-y-3">
            {/* Selected actions */}
            {selectedDrafts.size > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedDrafts.size} selected
                </span>
                <button
                  onClick={handlePublishSelected}
                  disabled={publishMutation.isPending}
                  className={cn(
                    'px-3 py-1.5 text-sm font-medium text-white rounded-md transition-colors',
                    'bg-violet-600 hover:bg-violet-700',
                    publishMutation.isPending && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {publishMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Publish Selected'
                  )}
                </button>
              </div>
            )}

            {/* Bulk actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleDeleteAll}
                disabled={deleteMutation.isPending}
                className={cn(
                  'flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors',
                  'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20',
                  'border border-red-200 dark:border-red-800',
                  deleteMutation.isPending && 'opacity-50 cursor-not-allowed'
                )}
              >
                {deleteMutation.isPending ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Trash2 className="w-4 h-4" />
                    Delete All
                  </span>
                )}
              </button>
              <button
                onClick={handlePublishAll}
                disabled={publishMutation.isPending || validDrafts.length === 0}
                className={cn(
                  'flex-1 px-4 py-2 text-sm font-medium text-white rounded-md transition-colors',
                  'bg-green-600 hover:bg-green-700',
                  (publishMutation.isPending || validDrafts.length === 0) && 'opacity-50 cursor-not-allowed'
                )}
              >
                {publishMutation.isPending ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Publishing...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Send className="w-4 h-4" />
                    Publish All ({validDrafts.length})
                  </span>
                )}
              </button>
            </div>

            {invalidDrafts.length > 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {invalidDrafts.length} invalid drafts cannot be published
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Helper to get client name from draft
function getClientName(draft: DraftAppointment): string {
  if (!draft.client) return 'Unknown Client';
  // Try client.user.name first (nested user model), then client.name
  return draft.client.user?.name || draft.client.name || 'Unknown Client';
}

// Helper to get team name from draft
function getTeamName(draft: DraftAppointment): string | null {
  if (!draft.team) return null;
  // Try team.user.name first (nested user model), then team.name
  return draft.team.user?.name || draft.team.name || null;
}

// Helper to extract validation error messages
function getValidationErrorMessages(draft: DraftAppointment): string[] {
  if (!draft.validation_errors) return [];

  // Handle both array of objects {type, message} and array of strings
  if (Array.isArray(draft.validation_errors)) {
    return draft.validation_errors.map((error) => {
      if (typeof error === 'string') return error;
      if (typeof error === 'object' && error !== null && 'message' in error) {
        return error.message;
      }
      return String(error);
    });
  }

  // Handle grouped_errors if present
  if (draft.grouped_errors) {
    return Object.values(draft.grouped_errors).flat();
  }

  return [];
}

// Draft appointment item component
function DraftAppointmentItem({
  draft,
  isSelected,
  onToggleSelect,
  onRemove,
  isRemoving,
}: {
  draft: DraftAppointment;
  isSelected: boolean;
  onToggleSelect: () => void;
  onRemove: () => void;
  isRemoving: boolean;
}) {
  // Safely parse dates with fallback
  let startTime: Date;
  let endTime: Date;
  try {
    startTime = parseISO(draft.start_time);
    endTime = parseISO(draft.end_time);
  } catch {
    startTime = new Date();
    endTime = new Date();
  }

  const clientName = getClientName(draft);
  const teamName = getTeamName(draft);
  const errorMessages = getValidationErrorMessages(draft);

  return (
    <div
      className={cn(
        'p-3 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors',
        isSelected && 'bg-violet-50 dark:bg-violet-900/20'
      )}
    >
      {/* Selection checkbox */}
      <input
        type="checkbox"
        checked={isSelected}
        onChange={onToggleSelect}
        disabled={draft.validation_status !== 'valid'}
        className="mt-1 h-4 w-4 text-violet-600 border-gray-300 rounded focus:ring-violet-500 disabled:opacity-50"
      />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {clientName}
          </p>
          <ValidationBadge status={draft.validation_status} />
        </div>
        <div className="mt-1 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
          <span>{format(startTime, 'EEE, MMM d')}</span>
          <span>{format(startTime, 'h:mm a')} - {format(endTime, 'h:mm a')}</span>
        </div>
        {teamName && (
          <div className="mt-1 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <User className="w-3 h-3" />
            <span>{teamName}</span>
          </div>
        )}
        {draft.validation_status === 'invalid' && errorMessages.length > 0 && (
          <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-xs text-red-600 dark:text-red-400">
            {errorMessages.map((error, i) => (
              <p key={i}>{error}</p>
            ))}
          </div>
        )}
      </div>

      {/* Remove button */}
      <button
        onClick={onRemove}
        disabled={isRemoving}
        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
        title="Remove draft"
      >
        {isRemoving ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Trash2 className="w-4 h-4" />
        )}
      </button>
    </div>
  );
}

// Validation badge component (defined inline for simplicity)
function ValidationBadge({ status }: { status: string }) {
  switch (status) {
    case 'valid':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
          <CheckCircle className="w-3 h-3" />
          Valid
        </span>
      );
    case 'invalid':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
          <AlertCircle className="w-3 h-3" />
          Invalid
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400">
          <Clock className="w-3 h-3" />
          Pending
        </span>
      );
  }
}
