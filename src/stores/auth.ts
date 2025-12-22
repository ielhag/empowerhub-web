import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import api from '@/lib/api/client';
import type { User, Tenant, TenantSettings } from '@/types';

interface AuthState {
  // State
  user: User | null;
  token: string | null;
  tenant: Tenant | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  tenantCompany: string | null; // <-- Add company for external use

  // Actions
  sendCode: (email: string) => Promise<{ success: boolean; message?: string }>;
  verifyCode: (email: string, code: string) => Promise<boolean>;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>;
  setUser: (user: User | null) => void;
  setTenant: (tenant: Tenant | null) => void;
  clearError: () => void;

  // Computed helpers
  isAdmin: () => boolean;
  isSuperAdmin: () => boolean;
  isStaff: () => boolean;
  hasAccessLevel: (level: number) => boolean;
  isFeatureEnabled: (feature: keyof TenantSettings) => boolean;
  getTenantCompany: () => string | null; // Helper to access company
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      token: null,
      tenant: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      tenantCompany: null,

      // Send verification code
      sendCode: async (email: string) => {
        set({ isLoading: true, error: null });

        try {
          const response = await api.post('/tenant-api/auth/send-code', { email });

          set({ isLoading: false });

          if (response.data.success) {
            return { success: true, message: response.data.message };
          } else {
            return { success: false, message: response.data.message };
          }
        } catch (error: unknown) {
          let message = 'Failed to send verification code.';
          if (error && typeof error === 'object' && 'response' in error) {
            const axiosError = error as { response?: { data?: { message?: string } } };
            message = axiosError.response?.data?.message || message;
          }

          set({ isLoading: false, error: message });
          return { success: false, message };
        }
      },

      // Verify code and login
      verifyCode: async (email: string, code: string) => {
        set({ isLoading: true, error: null });

        try {
          const response = await api.post('/tenant-api/auth/verify-code', { email, code });

          if (response.data.success) {
            const { token, user, tenant } = response.data.data;

            // Store token
            if (typeof window !== 'undefined') {
              localStorage.setItem('auth_token', token);
            }

            set({
              user,
              token,
              tenant,
              tenantCompany: tenant?.company ?? null, // Store company for later use
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });

            return true;
          } else {
            set({
              isLoading: false,
              error: response.data.message || 'Verification failed.',
            });
            return false;
          }
        } catch (error: unknown) {
          let message = 'Verification failed. Please check your code.';
          if (error && typeof error === 'object' && 'response' in error) {
            const axiosError = error as { response?: { data?: { message?: string } } };
            message = axiosError.response?.data?.message || message;
          }

          set({
            isLoading: false,
            error: message,
            isAuthenticated: false,
          });

          return false;
        }
      },

      // Logout action
      logout: async () => {
        set({ isLoading: true });

        try {
          await api.post('/tenant-api/auth/logout');
        } catch {
          // Ignore logout errors
        } finally {
          // Clear local storage
          if (typeof window !== 'undefined') {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user');
            localStorage.removeItem('tenant_domain');
            sessionStorage.removeItem('verify_email');
          }

          set({
            user: null,
            token: null,
            tenant: null,
            tenantCompany: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        }
      },

      // Fetch current user
      fetchUser: async () => {
        const token = get().token || (typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null);
        if (!token) {
          set({ isAuthenticated: false });
          return;
        }

        set({ isLoading: true });

        try {
          const response = await api.get('/tenant-api/auth/user');

          if (response.data.success) {
            const { user, tenant } = response.data.data;

            set({
              user,
              tenant,
              token,
              tenantCompany: tenant?.company ?? null, // update company as well
              isAuthenticated: true,
              isLoading: false,
            });
          } else {
            throw new Error('Failed to fetch user');
          }
        } catch {
          // Token invalid or expired
          set({
            user: null,
            token: null,
            tenant: null,
            tenantCompany: null,
            isAuthenticated: false,
            isLoading: false,
          });

          if (typeof window !== 'undefined') {
            localStorage.removeItem('auth_token');
          }
        }
      },

      // Set user manually
      setUser: (user) => {
        set({ user, isAuthenticated: !!user });
      },

      // Set tenant manually
      setTenant: (tenant) => {
        set({ 
          tenant,
          tenantCompany: tenant?.company ?? null,
        });
      },

      // Clear error
      clearError: () => {
        set({ error: null });
      },

      // Check if user is admin (access level 0 or 1)
      isAdmin: () => {
        const user = get().user;
        return user ? user.access_level <= 1 : false;
      },

      // Check if user is super admin (access level 0)
      isSuperAdmin: () => {
        const user = get().user;
        return user ? user.access_level === 0 : false;
      },

      // Check if user is staff (access level 2)
      isStaff: () => {
        const user = get().user;
        return user ? user.access_level === 2 : false;
      },

      // Check if user has required access level
      hasAccessLevel: (level: number) => {
        const user = get().user;
        return user ? user.access_level <= level : false;
      },

      // Check if a feature is enabled for this tenant
      isFeatureEnabled: (feature: keyof TenantSettings) => {
        const tenant = get().tenant;
        const value = tenant?.settings?.[feature];
        return typeof value === 'boolean' ? value : false;
      },
      
      // Helper to get company
      getTenantCompany: () => {
        // fallback to state.tenant?.company if needed
        return get().tenantCompany ?? get().tenant?.company ?? null;
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        tenant: state.tenant,
        tenantCompany: state.tenantCompany,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Selectors for common access patterns
export const selectUser = (state: AuthState) => state.user;
export const selectTenant = (state: AuthState) => state.tenant;
export const selectTenantCompany = (state: AuthState) => state.tenantCompany;
export const selectIsAuthenticated = (state: AuthState) => state.isAuthenticated;
export const selectIsLoading = (state: AuthState) => state.isLoading;
export const selectError = (state: AuthState) => state.error;
