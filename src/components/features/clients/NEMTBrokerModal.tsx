'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Users, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NEMTBroker } from '@/types';

interface NEMTBrokerModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: number;
  currentBrokerId?: number;
  availableBrokers: NEMTBroker[];
  onSuccess: (brokerId: number) => void;
}

export default function NEMTBrokerModal({
  isOpen,
  onClose,
  clientId,
  currentBrokerId,
  availableBrokers,
  onSuccess,
}: NEMTBrokerModalProps) {
  const [selectedBrokerId, setSelectedBrokerId] = useState<number | null>(currentBrokerId || null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedBrokerId(currentBrokerId || null);
    }
  }, [isOpen, currentBrokerId]);

  const handleSave = async () => {
    if (!selectedBrokerId) return;

    setIsLoading(true);
    try {
      // TODO: Call API to update client's NEMT broker
      // await api.post(`/tenant-api/clients/${clientId}/nemt-broker`, { broker_id: selectedBrokerId });
      onSuccess(selectedBrokerId);
      onClose();
    } catch (error) {
      console.error('Failed to update NEMT broker:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Select NEMT Broker"
      size="lg"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 inline-flex justify-center items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!selectedBrokerId || isLoading}
            className={cn(
              'flex-1 inline-flex justify-center items-center px-4 py-2 text-sm font-medium text-white rounded-md shadow-sm',
              selectedBrokerId && !isLoading
                ? 'bg-violet-600 hover:bg-violet-700 dark:bg-violet-500 dark:hover:bg-violet-600'
                : 'bg-gray-400 cursor-not-allowed'
            )}
          >
            {isLoading ? 'Saving...' : 'Save Changes'}
          </button>
        </>
      }
    >
      <div className="mb-4">
        {availableBrokers.length > 0 ? (
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {availableBrokers.map((broker) => (
              <div
                key={broker.id}
                onClick={() => setSelectedBrokerId(broker.id)}
                className={cn(
                  'flex items-center justify-between p-4 rounded-lg cursor-pointer border-2 transition-colors',
                  selectedBrokerId === broker.id
                    ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
                    : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
                )}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={cn(
                      'w-5 h-5 rounded-full border-2 flex items-center justify-center',
                      selectedBrokerId === broker.id
                        ? 'border-violet-500 bg-violet-500'
                        : 'border-gray-300 dark:border-gray-600'
                    )}
                  >
                    {selectedBrokerId === broker.id && (
                      <Check className="w-3 h-3 text-white" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {broker.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {broker.phone && `Phone: ${broker.phone}`}
                      {broker.email && (broker.phone ? ` • ${broker.email}` : broker.email)}
                    </p>
                  </div>
                </div>
                {currentBrokerId === broker.id && (
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-violet-100 dark:bg-violet-900/50 text-violet-800 dark:text-violet-300">
                    Current
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Users className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">No NEMT brokers available</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Contact your administrator to add NEMT brokers.
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}
