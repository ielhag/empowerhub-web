import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
  meta?: {
    current_page?: number;
    per_page?: number;
    total?: number;
    last_page?: number;
  };
}

export interface ApiError {
  success: false;
  message: string;
  errors?: Record<string, string[]>;
}

// Get tenant domain from subdomain or localStorage
export function getTenantDomain(): string | null {
  // In browser, extract from subdomain
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;

    // For local development with Valet (e.g., tenant.empowerhub-web.test or tenant.empowerhub.test)
    if (hostname.endsWith('.test')) {
      const parts = hostname.split('.');
      // tenant.empowerhub-web.test → ['tenant', 'empowerhub-web', 'test']
      // tenant.empowerhub.test → ['tenant', 'empowerhub', 'test']
      if (parts.length >= 3) {
        const subdomain = parts[0];
        if (!['www', 'app', 'api', 'admin', 'mail'].includes(subdomain)) {
          return subdomain;
        }
      }
    }

    // For localhost with query param fallback (e.g., localhost:3000?tenant=acme)
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      const urlParams = new URLSearchParams(window.location.search);
      const tenantParam = urlParams.get('tenant');
      if (tenantParam) {
        // Store it for subsequent requests
        localStorage.setItem('tenant_domain', tenantParam);
        return tenantParam;
      }
      // Fallback to stored domain
      return localStorage.getItem('tenant_domain');
    }

    // For production (e.g., tenant.empowerhub.io)
    const parts = hostname.split('.');
    if (parts.length >= 3) {
      const subdomain = parts[0];
      // Exclude common non-tenant subdomains
      if (!['www', 'app', 'api', 'admin', 'mail'].includes(subdomain)) {
        return subdomain;
      }
    }

    // Fallback to stored domain (from login or query param)
    return localStorage.getItem('tenant_domain');
  }

  return null;
}

// Get auth token from localStorage
function getAuthToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('auth_token');
  }
  return null;
}

// Get the API base URL for the current tenant
function getApiBaseUrl(): string {
  const tenantDomain = getTenantDomain();

  if (tenantDomain && typeof window !== 'undefined') {
    const hostname = window.location.hostname;

    // In development with Valet: use carecade.test for the API
    // The Next.js frontend runs on empowerhub-web.test
    // The Laravel API runs on carecade.test (linked in Valet)
    if (hostname.endsWith('.test')) {
      return `https://${tenantDomain}.carecade.test`;
    }

    // In production: tenant.empowerhub.io
    if (hostname.endsWith('.io')) {
      return `https://${tenantDomain}.empowerhub.io`;
    }

    // On localhost - target the tenant subdomain on carecade.test
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return `https://${tenantDomain}.carecade.test`;
    }
  }

  // Fallback to env variable or default
  return process.env.NEXT_PUBLIC_API_URL || 'https://carecade.test';
}

// Create axios instance
const api: AxiosInstance = axios.create({
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  timeout: 30000,
});

// Request interceptor - set baseURL, tenant domain, and auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Set base URL dynamically based on tenant
    config.baseURL = getApiBaseUrl();

    // Add tenant domain header
    const domain = getTenantDomain();
    if (domain) {
      config.headers['X-Tenant-Domain'] = domain;
    }

    // Add auth token
    const token = getAuthToken();
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => {
    // Handle 401 - redirect to login
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }

    // Handle 403 - permission denied
    if (error.response?.status === 403) {
      console.error('Permission denied:', error.response.data?.message);
    }

    // Handle 422 - validation error
    if (error.response?.status === 422) {
      // Let the caller handle validation errors
      return Promise.reject(error);
    }

    // Handle 500 - server error
    if (error.response?.status === 500) {
      console.error('Server error:', error.response.data?.message);
    }

    return Promise.reject(error);
  }
);

export default api;

/**
 * SECURITY NOTE: Token Storage
 *
 * Currently using localStorage for token storage. This is acceptable for our use case because:
 * 1. All PHI data remains on the server - frontend only displays it temporarily
 * 2. Tokens have 7-day expiration (configurable in Laravel Sanctum)
 * 3. We implement session timeout and inactivity logout
 * 4. CSP headers prevent XSS attacks that could steal tokens
 * 5. HTTPS enforced in production
 *
 * For enhanced security, consider migrating to httpOnly cookies:
 * - Requires backend changes to set cookies on login
 * - Prevents JavaScript access to tokens entirely
 * - Add CSRF protection for cookie-based auth
 */

// Helper function to make typed API calls
export async function apiGet<T>(url: string, params?: Record<string, unknown>): Promise<ApiResponse<T>> {
  const response = await api.get<ApiResponse<T>>(url, { params });
  return response.data;
}

export async function apiPost<T>(url: string, data?: Record<string, unknown>): Promise<ApiResponse<T>> {
  const response = await api.post<ApiResponse<T>>(url, data);
  return response.data;
}

export async function apiPut<T>(url: string, data?: Record<string, unknown>): Promise<ApiResponse<T>> {
  const response = await api.put<ApiResponse<T>>(url, data);
  return response.data;
}

export async function apiPatch<T>(url: string, data?: Record<string, unknown>): Promise<ApiResponse<T>> {
  const response = await api.patch<ApiResponse<T>>(url, data);
  return response.data;
}

export async function apiDelete<T>(url: string): Promise<ApiResponse<T>> {
  const response = await api.delete<ApiResponse<T>>(url);
  return response.data;
}
