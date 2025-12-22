'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '@/lib/api/client';
import { useAuthStore } from '@/stores/auth';
import { getTenantDomain } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import { Loader2, Mail, Building2, Shield, Lock, ChevronDown, ChevronUp } from 'lucide-react';

// Login form schema - only email for passwordless
const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuthStore();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detectedDomain, setDetectedDomain] = useState<string | null>(null);
  const [showSecurityInfo, setShowSecurityInfo] = useState(false);

  // Login form
  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '' },
  });

  // Detect tenant domain from subdomain on mount
  useEffect(() => {
    const domain = getTenantDomain();
    if (domain) {
      setDetectedDomain(domain);
    }
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const redirect = searchParams.get('redirect') || '/dashboard';
      router.push(redirect);
    }
  }, [isAuthenticated, router, searchParams]);

  // Handle send verification code
  const handleSendCode = async (data: LoginFormData) => {
    if (!detectedDomain) {
      setError('Could not detect organization. Please access via your organization subdomain.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await api.post('/tenant-api/auth/send-code', {
        email: data.email,
      });

      if (response.data.success) {
        // Store email in sessionStorage for verify-code page
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('verify_email', data.email);
        }

        // Redirect to verify code page
        const redirect = searchParams.get('redirect') || '/dashboard';
        router.push(`/login/verify-code?redirect=${encodeURIComponent(redirect)}`);
      } else {
        setError(response.data.message || 'Failed to send verification code.');
      }
    } catch (err: unknown) {
      console.error('Send code error:', err);
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { data?: { message?: string } } };
        setError(axiosError.response?.data?.message || 'Failed to send verification code. Please try again.');
      } else {
        setError('Failed to send verification code. Please check your email and try again.');
      }
    } finally {
      setIsLoading(false);
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
            Welcome to EmpowerHub
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Sign in to your account
          </p>
          {detectedDomain ? (
            <p className="mt-1 text-sm text-violet-600 dark:text-violet-400">
              {detectedDomain}.empowerhub.io
            </p>
          ) : (
            <p className="mt-1 text-sm text-red-500">
              No organization detected. Add ?tenant=your-org to the URL.
            </p>
          )}
        </div>

        {/* Login Form */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8">
          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <form onSubmit={form.handleSubmit(handleSendCode)} className="space-y-5">
            {/* Email Field */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
              >
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  {...form.register('email')}
                  type="email"
                  id="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  autoFocus
                  className={cn(
                    'w-full pl-10 pr-4 py-3 rounded-lg border bg-white dark:bg-gray-900',
                    'text-gray-900 dark:text-white placeholder-gray-400',
                    'focus:ring-2 focus:ring-violet-500 focus:border-violet-500',
                    form.formState.errors.email
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-gray-300 dark:border-gray-600'
                  )}
                />
              </div>
              {form.formState.errors.email && (
                <p className="mt-1 text-sm text-red-500">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
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
                  Sending code...
                </span>
              ) : (
                'Send Verification Code'
              )}
            </button>

            {/* Security Notice */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                <Shield className="w-4 h-4 text-green-500" />
                <span>Passwordless login via secure verification code</span>
              </div>
            </div>
          </form>

          {/* Security & Compliance Section */}
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setShowSecurityInfo(!showSecurityInfo)}
              className="w-full flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
            >
              <div className="flex items-center space-x-2">
                <Lock className="w-5 h-5 text-green-500" />
                <span className="font-medium">HIPAA Compliant & Secure</span>
              </div>
              {showSecurityInfo ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            {showSecurityInfo && (
              <div className="mt-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 space-y-3">
                {/* Trust Badges */}
                <div className="flex items-center justify-center space-x-4 pb-3 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center space-x-1 text-xs text-gray-600 dark:text-gray-400">
                    <Shield className="w-4 h-4 text-green-500" />
                    <span>HIPAA</span>
                  </div>
                  <div className="flex items-center space-x-1 text-xs text-gray-600 dark:text-gray-400">
                    <Lock className="w-4 h-4 text-green-500" />
                    <span>256-bit SSL</span>
                  </div>
                  <div className="flex items-center space-x-1 text-xs text-gray-600 dark:text-gray-400">
                    <Lock className="w-4 h-4 text-green-500" />
                    <span>Encrypted</span>
                  </div>
                </div>

                {/* Security Features List */}
                <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
                  <div className="flex items-start space-x-2">
                    <Shield className="w-4 h-4 text-violet-500 mt-0.5 flex-shrink-0" />
                    <span><strong>No passwords stored</strong> - We use secure email verification codes</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <Shield className="w-4 h-4 text-violet-500 mt-0.5 flex-shrink-0" />
                    <span><strong>End-to-end encryption</strong> - All data encrypted in transit and at rest</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <Shield className="w-4 h-4 text-violet-500 mt-0.5 flex-shrink-0" />
                    <span><strong>Audit logging</strong> - All access to protected health information is logged</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <Shield className="w-4 h-4 text-violet-500 mt-0.5 flex-shrink-0" />
                    <span><strong>Session security</strong> - Auto-logout after inactivity, secure cookies</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Help Text */}
        <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          Need help?{' '}
          <a href="mailto:support@empowerhub.io" className="text-violet-600 hover:underline">
            Contact Support
          </a>
        </p>
      </div>
    </div>
  );
}
