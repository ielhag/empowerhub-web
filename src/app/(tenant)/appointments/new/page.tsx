'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import AppointmentForm from '@/components/features/appointments/AppointmentForm';

export default function NewAppointmentPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 sm:px-6 lg:px-8">
      {/* Back Link */}
      <div className="max-w-4xl mx-auto mb-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      </div>

      {/* Header */}
      <div className="max-w-4xl mx-auto mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Create New Appointment
        </h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">
          Schedule a new appointment for a client
        </p>
      </div>

      {/* Form */}
      <AppointmentForm
        onCancel={() => router.push('/appointments')}
        onSuccess={() => router.push('/appointments')}
      />
    </div>
  );
}
