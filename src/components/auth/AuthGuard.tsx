'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import { Loader2 } from 'lucide-react';

// HIPAA compliant session timeout (8 hours = 480 minutes)
const SESSION_TIMEOUT_MS = 480 * 60 * 1000;
// Warning before timeout (15 minutes before)
const SESSION_WARNING_MS = 15 * 60 * 1000;
// Inactivity timeout (30 minutes of no activity)
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;

interface AuthGuardProps {
  children: React.ReactNode;
  requiredAccessLevel?: number; // 0=SuperAdmin, 1=Admin, 2=Staff
}

export function AuthGuard({ children, requiredAccessLevel }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading, fetchUser, logout, hasAccessLevel } = useAuthStore();

  const [isChecking, setIsChecking] = useState(true);
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);

  const lastActivityRef = useRef<number>(Date.now());
  const sessionStartRef = useRef<number>(Date.now());
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const logoutTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inactivityTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update last activity timestamp
  const updateActivity = useCallback(() => {
    lastActivityRef.current = Date.now();

    // Reset inactivity timeout
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
    }

    inactivityTimeoutRef.current = setTimeout(() => {
      console.log('Session expired due to inactivity');
      handleLogout('Your session has expired due to inactivity.');
    }, INACTIVITY_TIMEOUT_MS);
  }, []);

  // Handle logout with message
  const handleLogout = useCallback(
    async (message?: string) => {
      await logout();
      router.push(`/login${message ? `?message=${encodeURIComponent(message)}` : ''}`);
    },
    [logout, router]
  );

  // Extend session
  const extendSession = useCallback(() => {
    setShowTimeoutWarning(false);
    sessionStartRef.current = Date.now();
    updateActivity();
    setupSessionTimeouts();
  }, [updateActivity]);

  // Setup session timeouts
  const setupSessionTimeouts = useCallback(() => {
    // Clear existing timeouts
    if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
    if (logoutTimeoutRef.current) clearTimeout(logoutTimeoutRef.current);

    // Set warning timeout
    warningTimeoutRef.current = setTimeout(() => {
      setShowTimeoutWarning(true);
    }, SESSION_TIMEOUT_MS - SESSION_WARNING_MS);

    // Set logout timeout
    logoutTimeoutRef.current = setTimeout(() => {
      handleLogout('Your session has expired. Please log in again.');
    }, SESSION_TIMEOUT_MS);
  }, [handleLogout]);

  // Initial auth check
  useEffect(() => {
    const checkAuth = async () => {
      try {
        await fetchUser();
      } catch {
        // User not authenticated
      } finally {
        setIsChecking(false);
      }
    };

    checkAuth();
  }, [fetchUser]);

  // Setup activity listeners
  useEffect(() => {
    if (!isAuthenticated) return;

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];

    events.forEach((event) => {
      window.addEventListener(event, updateActivity, { passive: true });
    });

    // Initial activity update
    updateActivity();
    setupSessionTimeouts();

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, updateActivity);
      });

      if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
      if (logoutTimeoutRef.current) clearTimeout(logoutTimeoutRef.current);
      if (inactivityTimeoutRef.current) clearTimeout(inactivityTimeoutRef.current);
    };
  }, [isAuthenticated, updateActivity, setupSessionTimeouts]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isChecking && !isLoading && !isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [isChecking, isLoading, isAuthenticated, router, pathname]);

  // Check access level
  useEffect(() => {
    if (
      !isChecking &&
      !isLoading &&
      isAuthenticated &&
      requiredAccessLevel !== undefined &&
      !hasAccessLevel(requiredAccessLevel)
    ) {
      router.push('/dashboard?error=access_denied');
    }
  }, [isChecking, isLoading, isAuthenticated, requiredAccessLevel, hasAccessLevel, router]);

  // Loading state
  if (isChecking || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-violet-600 mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      {children}

      {/* Session Timeout Warning Modal */}
      {showTimeoutWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md mx-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Session Expiring Soon
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Your session will expire in 15 minutes. Would you like to stay logged in?
            </p>
            <div className="flex gap-3">
              <button
                onClick={extendSession}
                className="flex-1 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700"
              >
                Stay Logged In
              </button>
              <button
                onClick={() => handleLogout()}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
