"use client";

import { useDashboardAppointments } from "@/hooks/useDashboard";
import { Loader2 } from "lucide-react";
import Link from "next/link";

export function AppointmentsList() {
  const { data: appointmentsData, isLoading } = useDashboardAppointments();

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-900 shadow sm:rounded-md">
        <div className="px-4 py-5 sm:px-6">
          <div className="h-6 w-1/4 bg-gray-200 dark:bg-gray-700 rounded-md"></div>
        </div>
        <div className="border-t border-gray-200 dark:border-gray-800">
          <ul className="divide-y divide-gray-200 dark:divide-gray-800">
            {[...Array(3)].map((_, i) => (
              <li key={i}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="w-1/2 h-4 bg-gray-200 dark:bg-gray-700 rounded-md"></div>
                    <div className="w-1/4 h-4 bg-gray-200 dark:bg-gray-700 rounded-md"></div>
                  </div>
                  <div className="mt-2 sm:flex sm:justify-between">
                    <div className="sm:flex">
                      <div className="w-1/3 h-4 bg-gray-200 dark:bg-gray-700 rounded-md"></div>
                    </div>
                    <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                      <div className="w-1/4 h-4 bg-gray-200 dark:bg-gray-700 rounded-md"></div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  const allAppointments = [
    ...(appointmentsData?.current || []),
    ...(appointmentsData?.upcoming || []),
    ...(appointmentsData?.completed || []),
  ];

  return (
    <div className="bg-white dark:bg-gray-900 shadow sm:rounded-md">
      <div className="px-4 py-5 sm:px-6">
        <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100">
          Appointments
        </h3>
      </div>
      <div className="border-t border-gray-200 dark:border-gray-800">
        <ul className="divide-y divide-gray-200 dark:divide-gray-800">
          {allAppointments.map((appointment) => (
            <li key={appointment.id}>
              <Link href={`/appointments/${appointment.id}`} className="block hover:bg-gray-50 dark:hover:bg-gray-800">
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <p className="truncate text-sm font-medium text-violet-600 dark:text-violet-400">
                      {appointment.client_name}
                    </p>
                    <div className="ml-2 flex flex-shrink-0">
                      <p
                        className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                          appointment.status === "completed"
                            ? "bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300"
                            : "bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300"
                        }`}
                      >
                        {appointment.status}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 sm:flex sm:justify-between">
                    <div className="sm:flex">
                      <p className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                        {appointment.speciality_name} with {appointment.team_name}
                      </p>
                    </div>
                    <div className="mt-2 flex items-center text-sm text-gray-500 dark:text-gray-400 sm:mt-0">
                      <p>{appointment.start_time}</p>
                    </div>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}