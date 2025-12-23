'use client';

import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { useAppointment } from '@/hooks/useAppointments';
import AppointmentForm from '@/components/features/appointments/AppointmentForm';

export default function EditAppointmentPage() {
  const params = useParams();
  const router = useRouter();
  const appointmentId = Number(params.id);

  const { data: appointment, isLoading, error, refetch } = useAppointment(appointmentId);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-violet-600 mx-auto" />
          <p className="mt-2 text-gray-600 dark:text-gray-400">Loading appointment...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !appointment) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Failed to load appointment
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            The appointment could not be found or you don&apos;t have permission to edit it.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => refetch()}
              className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700"
            >
              Try Again
            </button>
            <button
              onClick={() => router.back()}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Check if appointment can be edited
  const nonEditableStatuses = ['completed', 'cancelled', 'no_show', 'deleted'];
  if (nonEditableStatuses.includes(appointment.status)) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Cannot Edit Appointment
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            This appointment is {appointment.status.replace('_', ' ')} and cannot be edited.
          </p>
          <button
            onClick={() => router.push(`/appointments/${appointmentId}`)}
            className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700"
          >
            View Appointment Details
          </button>
        </div>
      </div>
    );
  }

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
          Edit Appointment
        </h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">
          Update appointment details for {appointment.client?.user?.name || appointment.client?.name || 'Unknown Client'}
        </p>
      </div>

      {/* Form */}
      <AppointmentForm
        appointment={appointment}
        onCancel={() => router.push(`/appointments/${appointmentId}`)}
        onSuccess={() => router.push(`/appointments/${appointmentId}`)}
      />
    </div>
  );
}
