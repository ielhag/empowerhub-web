import Pusher, { Channel, PresenceChannel } from 'pusher-js';
import { getTenantDomain } from './api/client';

// Pusher configuration
const PUSHER_KEY = process.env.NEXT_PUBLIC_PUSHER_KEY || '';
const PUSHER_CLUSTER = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'mt1';

// Get API URL dynamically based on tenant
function getApiUrl(): string {
  const tenantDomain = getTenantDomain();
  if (tenantDomain && typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname.endsWith('.test')) {
      return `https://${tenantDomain}.carecade.test`;
    }
    if (hostname.endsWith('.io')) {
      return `https://${tenantDomain}.empowerhub.io`;
    }
  }
  return process.env.NEXT_PUBLIC_API_URL || 'https://carecade.test';
}

// Singleton Pusher instance
let pusherInstance: Pusher | null = null;

// Initialize Pusher client
export function initializePusher(): Pusher | null {
  if (pusherInstance) {
    return pusherInstance;
  }

  if (!PUSHER_KEY) {
    console.warn('Pusher key not configured - realtime features disabled');
    return null;
  }

  const apiUrl = getApiUrl();

  pusherInstance = new Pusher(PUSHER_KEY, {
    cluster: PUSHER_CLUSTER,
    forceTLS: true,
    authEndpoint: `${apiUrl}/api/broadcasting/auth`,
    auth: {
      headers: {
        'X-Tenant-Domain': getTenantDomain() || '',
        'Authorization': `Bearer ${getAuthToken()}`,
        'Accept': 'application/json',
      },
    },
  });

  // Debug logging in development
  if (process.env.NODE_ENV === 'development') {
    pusherInstance.connection.bind('connected', () => {
      console.log('Pusher connected');
    });

    pusherInstance.connection.bind('disconnected', () => {
      console.log('Pusher disconnected');
    });

    pusherInstance.connection.bind('error', (err: Error) => {
      console.error('Pusher error:', err);
    });
  }

  return pusherInstance;
}

// Get Pusher instance (creates if not exists)
export function getPusher(): Pusher | null {
  if (!pusherInstance) {
    return initializePusher();
  }
  return pusherInstance;
}

// Disconnect and cleanup Pusher
export function disconnectPusher(): void {
  if (pusherInstance) {
    pusherInstance.disconnect();
    pusherInstance = null;
  }
}

// Update auth headers (call after login)
// Reconnects Pusher with new credentials
export function updatePusherAuth(): void {
  if (pusherInstance) {
    // Disconnect and reinitialize with new auth
    pusherInstance.disconnect();
    pusherInstance = null;
    initializePusher();
  }
}

// Subscribe to a public channel
export function subscribeToChannel(channelName: string): Channel | null {
  const pusher = getPusher();
  if (!pusher) return null;
  return pusher.subscribe(channelName);
}

// Subscribe to a private channel
export function subscribeToPrivateChannel(channelName: string): Channel | null {
  const pusher = getPusher();
  if (!pusher) return null;
  return pusher.subscribe(`private-${channelName}`);
}

// Subscribe to a presence channel
export function subscribeToPresenceChannel(channelName: string): PresenceChannel | null {
  const pusher = getPusher();
  if (!pusher) return null;
  return pusher.subscribe(`presence-${channelName}`) as PresenceChannel;
}

// Unsubscribe from a channel
export function unsubscribeFromChannel(channelName: string): void {
  const pusher = getPusher();
  if (!pusher) return;
  pusher.unsubscribe(channelName);
}

// Helper to get auth token
function getAuthToken(): string {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('auth_token') || '';
  }
  return '';
}

// Event types for type safety
export interface AppointmentStatusChangedEvent {
  appointmentId: number;
  oldStatus: string;
  newStatus: string;
  tenantId: string;
}

export interface NewMessageEvent {
  roomId: number;
  message: {
    id: number;
    content: string;
    sender_id: number;
    created_at: string;
  };
}

export interface TypingEvent {
  userId: number;
  userName: string;
  isTyping: boolean;
}

export interface CallSignalingEvent {
  type: 'incoming_call' | 'call_accepted' | 'call_rejected' | 'call_ended' | 'offer' | 'answer' | 'ice_candidate';
  callId: number;
  callerId: number;
  callerName: string;
  roomId: number;
  payload?: unknown;
}
