import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api/client';
import type { Tenant, TenantBranding, TenantSettings, User } from '@/types';

// Query keys
export const settingsKeys = {
  all: ['settings'] as const,
  profile: () => [...settingsKeys.all, 'profile'] as const,
  tenant: () => [...settingsKeys.all, 'tenant'] as const,
  branding: () => [...settingsKeys.all, 'branding'] as const,
  features: () => [...settingsKeys.all, 'features'] as const,
  notifications: () => [...settingsKeys.all, 'notifications'] as const,
};

// Settings types
export interface ProfileSettings {
  user: User;
}

export interface TenantSettingsData {
  tenant: Tenant;
  features: FeatureFlags;
}

export interface FeatureFlags {
  client_goals_enabled: boolean;
  recruitment_enabled: boolean;
  video_calls_enabled: boolean;
  nemt_enabled: boolean;
  chat_enabled: boolean;
}

export interface NotificationSettings {
  email_notifications: boolean;
  push_notifications: boolean;
  appointment_reminders: boolean;
  schedule_updates: boolean;
  chat_messages: boolean;
  system_alerts: boolean;
}

export interface BrandingUpdate {
  logo?: File;
  primary_color?: string;
  secondary_color?: string;
}

// API response types
interface ProfileResponse {
  success: boolean;
  data: ProfileSettings;
}

interface TenantResponse {
  success: boolean;
  data: TenantSettingsData;
}

interface NotificationResponse {
  success: boolean;
  data: NotificationSettings;
}

// Fetch user profile
async function fetchProfile(): Promise<ProfileSettings> {
  const response = await api.get<ProfileResponse>('/tenant-api/settings/profile');
  return response.data.data;
}

// Fetch tenant settings
async function fetchTenantSettings(): Promise<TenantSettingsData> {
  const response = await api.get<TenantResponse>('/tenant-api/settings/tenant');
  return response.data.data;
}

// Fetch notification settings
async function fetchNotificationSettings(): Promise<NotificationSettings> {
  const response = await api.get<NotificationResponse>('/tenant-api/settings/notifications');
  return response.data.data;
}

// Hook: Fetch profile
export function useProfileSettings() {
  return useQuery({
    queryKey: settingsKeys.profile(),
    queryFn: fetchProfile,
  });
}

// Hook: Fetch tenant settings
export function useTenantSettings() {
  return useQuery({
    queryKey: settingsKeys.tenant(),
    queryFn: fetchTenantSettings,
  });
}

// Hook: Fetch notification settings
export function useNotificationSettings() {
  return useQuery({
    queryKey: settingsKeys.notifications(),
    queryFn: fetchNotificationSettings,
  });
}

// Hook: Update profile
export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<User>) => {
      const response = await api.put<ProfileResponse>('/tenant-api/settings/profile', data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.profile() });
    },
  });
}

// Hook: Update password
export function useUpdatePassword() {
  return useMutation({
    mutationFn: async (data: { current_password: string; new_password: string; new_password_confirmation: string }) => {
      await api.put('/tenant-api/settings/password', data);
    },
  });
}

// Hook: Update tenant settings
export function useUpdateTenantSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<TenantSettings>) => {
      const response = await api.put<TenantResponse>('/tenant-api/settings/tenant', data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.tenant() });
    },
  });
}

// Hook: Update branding
export function useUpdateBranding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: BrandingUpdate) => {
      const formData = new FormData();
      if (data.logo) formData.append('logo', data.logo);
      if (data.primary_color) formData.append('primary_color', data.primary_color);
      if (data.secondary_color) formData.append('secondary_color', data.secondary_color);

      const response = await api.post<TenantResponse>('/tenant-api/settings/branding', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.tenant() });
    },
  });
}

// Hook: Update feature flags
export function useUpdateFeatures() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<FeatureFlags>) => {
      const response = await api.put<TenantResponse>('/tenant-api/settings/features', data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.tenant() });
    },
  });
}

// Hook: Update notification settings
export function useUpdateNotificationSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<NotificationSettings>) => {
      const response = await api.put<NotificationResponse>('/tenant-api/settings/notifications', data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.notifications() });
    },
  });
}

// Hook: Upload avatar
export function useUploadAvatar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await api.post<ProfileResponse>('/tenant-api/settings/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.profile() });
    },
  });
}
