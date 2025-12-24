'use client';

import { useState } from 'react';
import {
  X,
  History,
  Undo2,
  Loader2,
  CheckCircle,
  AlertCircle,
  Clock,
  ChevronRight,
  Calendar,
  AlertTriangle,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import {
  useCopyWeekBatches,
  useRevertCopyWeek,
  CopyWeekBatch,
} from '@/hooks/useDraftAppointments';

interface CopyManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRevertSuccess?: () => void;
}

export function CopyManagementModal({
  isOpen,
  onClose,
  onRevertSuccess,
}: CopyManagementModalProps) {
  const [selectedBatch, setSelectedBatch] = useState<CopyWeekBatch | null>(null);
  const [confirmRevert, setConfirmRevert] = useState<string | null>(null);

  const { data: batchesData, isLoading } = useCopyWeekBatches();
  const revertMutation = useRevertCopyWeek();

  // The hook's select function transforms data to include batches at top level
  const batches = Array.isArray(batchesData?.batches) ? batchesData.batches : [];

  // Sort batches by created_at descending (most recent first)
  // created_at is already formatted as string, so parse it safely
  const sortedBatches = [...batches].sort((a, b) => {
    try {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    } catch {
      return 0;
    }
  });

  const handleRevert = async (batchId: string) => {
    try {
      await revertMutation.mutateAsync({ batchId });
      setConfirmRevert(null);
      onRevertSuccess?.();
    } catch (error) {
      console.error('Failed to revert batch:', error);
    }
  };

  const handleClose = () => {
    setSelectedBatch(null);
    setConfirmRevert(null);
    onClose();
  };

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
        <div className="relative bg-white dark:bg-gray-900 rounded-lg max-w-2xl w-full shadow-xl max-h-[80vh] flex flex-col">
          {/* Header */}
          <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-violet-600" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Copy Week History
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

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-violet-600" />
              </div>
            ) : sortedBatches.length === 0 ? (
              <div className="text-center py-12">
                <History className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400 font-medium">
                  No copy week history
                </p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                  Copy weeks will appear here once you use the Copy Week feature
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {sortedBatches.map((batch) => (
                  <BatchCard
                    key={batch.batch_id}
                    batch={batch}
                    isConfirmingRevert={confirmRevert === batch.batch_id}
                    isReverting={revertMutation.isPending && confirmRevert === batch.batch_id}
                    onConfirmRevert={() => setConfirmRevert(batch.batch_id)}
                    onCancelRevert={() => setConfirmRevert(null)}
                    onRevert={() => handleRevert(batch.batch_id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end p-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Batch card component
function BatchCard({
  batch,
  isConfirmingRevert,
  isReverting,
  onConfirmRevert,
  onCancelRevert,
  onRevert,
}: {
  batch: CopyWeekBatch;
  isConfirmingRevert: boolean;
  isReverting: boolean;
  onConfirmRevert: () => void;
  onCancelRevert: () => void;
  onRevert: () => void;
}) {
  // Backend returns source_week and target_week as already formatted strings (e.g., "Dec 23, 2024")
  // and created_at as formatted string (e.g., "Dec 23, 2024 10:30 AM")
  // No need to parse and reformat - just use the values directly

  const hasIssues = (batch.invalid_drafts || 0) > 0;
  const isFullyPublished = (batch.published_drafts || 0) === (batch.total_drafts || 0) && (batch.total_drafts || 0) > 0;

  return (
    <div
      className={cn(
        'border rounded-lg overflow-hidden',
        isConfirmingRevert
          ? 'border-red-300 dark:border-red-700'
          : 'border-gray-200 dark:border-gray-700'
      )}
    >
      {/* Batch info */}
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {/* Source to target */}
            <div className="flex items-center gap-2 text-sm">
              <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span>{batch.source_week || 'Unknown'}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
              <div className="flex items-center gap-1.5 text-gray-900 dark:text-white font-medium">
                <span>{batch.target_week || 'Unknown'}</span>
              </div>
            </div>

            {/* Stats row */}
            <div className="mt-3 flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-gray-500 dark:text-gray-400">Total:</span>
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  {batch.total_drafts || 0}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                <span className="text-gray-700 dark:text-gray-300">
                  {batch.valid_drafts || 0} valid
                </span>
              </div>
              {(batch.invalid_drafts || 0) > 0 && (
                <div className="flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                  <span className="text-red-600 dark:text-red-400">
                    {batch.invalid_drafts} invalid
                  </span>
                </div>
              )}
              {(batch.published_drafts || 0) > 0 && (
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-blue-500" />
                  <span className="text-blue-600 dark:text-blue-400">
                    {batch.published_drafts} published
                  </span>
                </div>
              )}
            </div>

            {/* Created time - already formatted by backend */}
            <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
              Created {batch.created_at || 'Unknown'}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {!isConfirmingRevert && batch.can_revert && (
              <button
                onClick={onConfirmRevert}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                title="Undo this copy"
              >
                <Undo2 className="w-4 h-4" />
              </button>
            )}
            {!batch.can_revert && (batch.total_drafts || 0) > 0 && (
              <span className="text-xs text-gray-400 dark:text-gray-500 italic">
                Cannot revert
              </span>
            )}
          </div>
        </div>

        {/* Status badges */}
        {(isFullyPublished || hasIssues) && (
          <div className="mt-3 flex items-center gap-2">
            {isFullyPublished && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                <CheckCircle className="w-3 h-3" />
                Fully Published
              </span>
            )}
            {hasIssues && !isFullyPublished && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                <AlertTriangle className="w-3 h-3" />
                Has Conflicts
              </span>
            )}
          </div>
        )}
      </div>

      {/* Confirm revert */}
      {isConfirmingRevert && (
        <div className="px-4 py-3 bg-red-50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-800">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-700 dark:text-red-300">
                Revert this copy?
              </p>
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                This will delete all {(batch.total_drafts || 0) - (batch.published_drafts || 0)} unpublished draft appointments from this batch.
                Published appointments will not be affected.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={onRevert}
                  disabled={isReverting}
                  className={cn(
                    'px-3 py-1.5 text-xs font-medium text-white rounded-md transition-colors',
                    'bg-red-600 hover:bg-red-700',
                    isReverting && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {isReverting ? (
                    <span className="flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Reverting...
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <Trash2 className="w-3 h-3" />
                      Yes, Revert
                    </span>
                  )}
                </button>
                <button
                  onClick={onCancelRevert}
                  disabled={isReverting}
                  className="px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
