'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  getPusher,
  disconnectPusher,
  subscribeToChannel,
  subscribeToPrivateChannel,
  unsubscribeFromChannel,
  AppointmentStatusChangedEvent,
  NewMessageEvent,
  TypingEvent,
} from '@/lib/pusher';
import { useAuthStore } from '@/stores/auth';
import { appointmentKeys } from './useAppointments';
import type { Channel } from 'pusher-js';

// Hook to manage Pusher connection lifecycle
export function usePusherConnection() {
  const { isAuthenticated } = useAuthStore();
  const connectionRef = useRef<boolean>(false);

  useEffect(() => {
    if (isAuthenticated && !connectionRef.current) {
      try {
        getPusher();
        connectionRef.current = true;
      } catch (error) {
        console.error('Failed to initialize Pusher:', error);
      }
    }

    return () => {
      if (connectionRef.current) {
        disconnectPusher();
        connectionRef.current = false;
      }
    };
  }, [isAuthenticated]);
}

// Generic hook for subscribing to channels
export function useChannel(
  channelName: string,
  isPrivate = false
): Channel | null {
  const [channel, setChannel] = useState<Channel | null>(null);
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated || !channelName) {
      setChannel(null);
      return;
    }

    let subscribedChannel: Channel | null = null;
    try {
      subscribedChannel = isPrivate
        ? subscribeToPrivateChannel(channelName)
        : subscribeToChannel(channelName);
      setChannel(subscribedChannel);
    } catch (error) {
      console.error(`Failed to subscribe to ${channelName}:`, error);
      setChannel(null);
    }

    return () => {
      if (channelName) {
        unsubscribeFromChannel(isPrivate ? `private-${channelName}` : channelName);
        setChannel(null);
      }
    };
  }, [channelName, isPrivate, isAuthenticated]);

  return channel;
}

// Hook for real-time appointment updates
export function useAppointmentRealtime() {
  const queryClient = useQueryClient();
  const { tenant } = useAuthStore();

  useEffect(() => {
    if (!tenant?.id) return;

    const channelName = `appointments.${tenant.id}`;
    let channel: Channel | null = null;

    try {
      channel = subscribeToChannel(channelName);

      if (!channel) {
        // Pusher not available - realtime disabled
        return;
      }

      // Appointment status changed
      channel.bind('AppointmentStatusChanged', (data: AppointmentStatusChangedEvent) => {
        console.log('Appointment status changed:', data);

        // Invalidate appointment queries to trigger refetch
        queryClient.invalidateQueries({ queryKey: appointmentKeys.all });

        // Optionally update specific appointment in cache
        if (data.appointmentId) {
          queryClient.invalidateQueries({
            queryKey: appointmentKeys.detail(data.appointmentId)
          });
        }
      });

      // New appointment created
      channel.bind('AppointmentCreated', () => {
        queryClient.invalidateQueries({ queryKey: appointmentKeys.lists() });
      });

      // Appointment updated
      channel.bind('AppointmentUpdated', (data: { appointmentId: number }) => {
        queryClient.invalidateQueries({ queryKey: appointmentKeys.detail(data.appointmentId) });
        queryClient.invalidateQueries({ queryKey: appointmentKeys.lists() });
      });

      // Appointment deleted
      channel.bind('AppointmentDeleted', (data: { appointmentId: number }) => {
        queryClient.invalidateQueries({ queryKey: appointmentKeys.lists() });
        queryClient.removeQueries({ queryKey: appointmentKeys.detail(data.appointmentId) });
      });

    } catch (error) {
      console.error('Failed to set up appointment realtime:', error);
    }

    return () => {
      if (channel) {
        channel.unbind_all();
        unsubscribeFromChannel(channelName);
      }
    };
  }, [queryClient, tenant?.id]);
}

// Hook for real-time chat updates
export function useChatRealtime(roomId: number | null, onNewMessage?: (message: NewMessageEvent['message']) => void) {
  const { tenant } = useAuthStore();

  useEffect(() => {
    if (!tenant?.id || !roomId) return;

    const channelName = `private-chat.${roomId}`;
    let channel: Channel | null = null;

    try {
      channel = subscribeToPrivateChannel(`chat.${roomId}`);
      if (!channel) return;

      // New message received
      channel.bind('NewMessage', (data: NewMessageEvent) => {
        onNewMessage?.(data.message);
      });

      // Typing indicator
      channel.bind('Typing', (data: TypingEvent) => {
        console.log(`${data.userName} is ${data.isTyping ? 'typing...' : 'done typing'}`);
      });

    } catch (error) {
      console.error('Failed to set up chat realtime:', error);
    }

    return () => {
      if (channel) {
        channel.unbind_all();
        unsubscribeFromChannel(channelName);
      }
    };
  }, [roomId, tenant?.id, onNewMessage]);
}

// Hook for real-time notifications
export function useNotificationsRealtime(onNotification?: (notification: unknown) => void) {
  const { user, tenant } = useAuthStore();

  useEffect(() => {
    if (!tenant?.id || !user?.id) return;

    const channelName = `private-user.${user.id}`;
    let channel: Channel | null = null;

    try {
      channel = subscribeToPrivateChannel(`user.${user.id}`);
      if (!channel) return;

      // New notification
      channel.bind('NewNotification', (data: unknown) => {
        onNotification?.(data);
      });

      // Notification read
      channel.bind('NotificationRead', () => {
        // Handle notification read
      });

    } catch (error) {
      console.error('Failed to set up notifications realtime:', error);
    }

    return () => {
      if (channel) {
        channel.unbind_all();
        unsubscribeFromChannel(channelName);
      }
    };
  }, [user?.id, tenant?.id, onNotification]);
}

// Hook to emit typing indicator
export function useTypingIndicator(roomId: number | null) {
  const { user } = useAuthStore();
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const startTyping = useCallback(() => {
    if (!roomId || !user) return;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Emit typing event via API (backend will broadcast via Pusher)
    // This would need an API endpoint to be implemented

    // Set timeout to stop typing after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      // Emit stop typing
    }, 3000);
  }, [roomId, user]);

  const stopTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    // Emit stop typing event
  }, []);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return { startTyping, stopTyping };
}
