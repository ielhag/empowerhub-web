import { AppointmentForm } from "@/components/features/appointments/AppointmentForm";

export default function NewAppointmentPage() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        New Appointment
      </h2>
      <AppointmentForm />
    </div>
  );
}