'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api/client';
import { useAuthStore } from '@/stores/auth';
import { cn } from '@/lib/utils';
import { Loader2, Mail, Building2, ArrowLeft, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export default function VerifyCodePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser, setTenant } = useAuthStore();

  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Get email from sessionStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedEmail = sessionStorage.getItem('verify_email');
      if (storedEmail) {
        setEmail(storedEmail);
      } else {
        // No email stored, redirect back to login
        router.push('/login');
      }
    }
  }, [router]);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Handle code input
  const handleCodeChange = (index: number, value: string) => {
    // Only allow digits
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];

    // Handle paste of full code
    if (value.length > 1) {
      const chars = value.slice(0, 6).split('');
      chars.forEach((char, i) => {
        if (i < 6) newCode[i] = char;
      });
      setCode(newCode);
      // Focus last input or first empty
      const lastFilledIndex = chars.length - 1;
      if (lastFilledIndex < 5) {
        inputRefs.current[lastFilledIndex + 1]?.focus();
      } else {
        inputRefs.current[5]?.focus();
      }
      return;
    }

    newCode[index] = value;
    setCode(newCode);

    // Move to next input if value entered
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle backspace
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Handle paste
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pastedData) {
      const newCode = [...code];
      pastedData.split('').forEach((char, i) => {
        if (i < 6) newCode[i] = char;
      });
      setCode(newCode);
      // Focus appropriate input
      const focusIndex = Math.min(pastedData.length, 5);
      inputRefs.current[focusIndex]?.focus();
    }
  };

  // Verify code
  const handleVerify = async () => {
    const fullCode = code.join('');
    if (fullCode.length !== 6) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    if (!email) {
      setError('Email not found. Please try logging in again.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await api.post('/tenant-api/auth/verify-code', {
        email,
        code: fullCode,
      });

      if (response.data.success) {
        const { token, user, tenant } = response.data.data;

        // Store token
        if (typeof window !== 'undefined') {
          localStorage.setItem('auth_token', token);
          // Clear verify email
          sessionStorage.removeItem('verify_email');
        }

        // Update auth store
        setUser(user);
        setTenant(tenant);

        // Redirect
        const redirect = searchParams.get('redirect') || '/dashboard';
        router.push(redirect);
      } else {
        setError(response.data.message || 'Verification failed. Please try again.');
      }
    } catch (err: unknown) {
      console.error('Verify error:', err);
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { data?: { message?: string } } };
        setError(axiosError.response?.data?.message || 'Invalid or expired verification code.');
      } else {
        setError('Verification failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-submit when code is complete
  useEffect(() => {
    const fullCode = code.join('');
    if (fullCode.length === 6) {
      handleVerify();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  // Resend code
  const handleResend = async () => {
    if (!email || countdown > 0) return;

    setIsResending(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await api.post('/tenant-api/auth/resend-code', { email });

      if (response.data.success) {
        setSuccess('A new verification code has been sent to your email.');
        setCountdown(60); // 60 second cooldown
        // Clear the code inputs
        setCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      } else {
        setError(response.data.message || 'Failed to resend code.');
      }
    } catch (err: unknown) {
      console.error('Resend error:', err);
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { data?: { message?: string } } };
        setError(axiosError.response?.data?.message || 'Failed to resend verification code.');
      } else {
        setError('Failed to resend verification code.');
      }
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 px-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute -top-40 -right-40 w-80 h-80 bg-violet-100 dark:bg-violet-900/30 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-pulse" />
      <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-violet-200 dark:bg-violet-800/30 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-pulse" style={{ animationDelay: '2s' }} />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-violet-600 text-white mb-4">
            <Building2 className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Check your email
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            We sent a verification code to
          </p>
          {email && (
            <p className="mt-1 text-sm font-medium text-violet-600 dark:text-violet-400 flex items-center justify-center gap-1">
              <Mail className="w-4 h-4" />
              {email}
            </p>
          )}
        </div>

        {/* Verify Form */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8">
          {/* Success Message */}
          {success && (
            <div className="mb-6 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
              <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <div className="space-y-6">
            {/* Code Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 text-center">
                Enter 6-digit code
              </label>
              <div className="flex justify-center gap-2" onPaste={handlePaste}>
                {code.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => { inputRefs.current[index] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleCodeChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className={cn(
                      'w-12 h-14 text-center text-xl font-bold rounded-lg border',
                      'bg-white dark:bg-gray-900 text-gray-900 dark:text-white',
                      'focus:ring-2 focus:ring-violet-500 focus:border-violet-500',
                      'transition-all duration-200',
                      error
                        ? 'border-red-500'
                        : 'border-gray-300 dark:border-gray-600'
                    )}
                    disabled={isLoading}
                    autoFocus={index === 0}
                  />
                ))}
              </div>
            </div>

            {/* Verify Button */}
            <button
              onClick={handleVerify}
              disabled={isLoading || code.join('').length !== 6}
              className={cn(
                'w-full py-3 px-4 rounded-lg font-semibold text-white',
                'bg-violet-600 hover:bg-violet-700',
                'focus:ring-2 focus:ring-offset-2 focus:ring-violet-500',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'transition-colors duration-200'
              )}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Verifying...
                </span>
              ) : (
                'Verify & Sign In'
              )}
            </button>

            {/* Resend Code */}
            <div className="text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                Didn&apos;t receive the code?
              </p>
              <button
                onClick={handleResend}
                disabled={isResending || countdown > 0}
                className={cn(
                  'inline-flex items-center gap-2 text-sm font-medium',
                  'text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  'transition-colors'
                )}
              >
                {isResending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : countdown > 0 ? (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Resend in {countdown}s
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Resend code
                  </>
                )}
              </button>
            </div>

            {/* Code expires notice */}
            <p className="text-xs text-center text-gray-400 dark:text-gray-500">
              Code expires in 10 minutes
            </p>
          </div>
        </div>

        {/* Back to Login */}
        <div className="mt-6 text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
