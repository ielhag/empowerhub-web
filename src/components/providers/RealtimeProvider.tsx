'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/auth';
import { getPusher, disconnectPusher, updatePusherAuth } from '@/lib/pusher';
import { useAppointmentRealtime, useNotificationsRealtime } from '@/hooks/useRealtime';

interface RealtimeProviderProps {
  children: React.ReactNode;
}

export function RealtimeProvider({ children }: RealtimeProviderProps) {
  const { isAuthenticated, user } = useAuthStore();
  const [isConnected, setIsConnected] = useState(false);

  // Initialize Pusher connection when authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      try {
        const pusher = getPusher();

        if (!pusher) {
          console.warn('Pusher not available - realtime features disabled');
          return;
        }

        pusher.connection.bind('connected', () => {
          setIsConnected(true);
          console.log('Realtime connected');
        });

        pusher.connection.bind('disconnected', () => {
          setIsConnected(false);
          console.log('Realtime disconnected');
        });

        pusher.connection.bind('error', (err: unknown) => {
          console.error('Realtime error:', err);
        });
      } catch (error) {
        console.warn('Failed to initialize realtime connection:', error);
      }
    }

    return () => {
      if (!isAuthenticated) {
        disconnectPusher();
        setIsConnected(false);
      }
    };
  }, [isAuthenticated, user]);

  // Re-authenticate Pusher when user changes
  useEffect(() => {
    if (isAuthenticated && user) {
      updatePusherAuth();
    }
  }, [isAuthenticated, user?.id]);

  // Subscribe to appointment updates
  useAppointmentRealtime();

  // Subscribe to user notifications
  useNotificationsRealtime((notification) => {
    console.log('New notification:', notification);
    // Could show a toast notification here
  });

  return <>{children}</>;
}

// Hook to check realtime connection status
export function useRealtimeStatus() {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');

  useEffect(() => {
    try {
      const pusher = getPusher();

      if (!pusher) {
        setStatus('disconnected');
        return;
      }

      const handleConnected = () => setStatus('connected');
      const handleDisconnected = () => setStatus('disconnected');
      const handleConnecting = () => setStatus('connecting');
      const handleError = () => setStatus('error');

      pusher.connection.bind('connected', handleConnected);
      pusher.connection.bind('disconnected', handleDisconnected);
      pusher.connection.bind('connecting', handleConnecting);
      pusher.connection.bind('error', handleError);

      // Set initial status
      setStatus(pusher.connection.state as typeof status);

      return () => {
        pusher.connection.unbind('connected', handleConnected);
        pusher.connection.unbind('disconnected', handleDisconnected);
        pusher.connection.unbind('connecting', handleConnecting);
        pusher.connection.unbind('error', handleError);
      };
    } catch {
      setStatus('disconnected');
    }
  }, []);

  return status;
}
