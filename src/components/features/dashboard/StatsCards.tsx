"use client";

import { useDashboardStats } from "@/hooks/useDashboard";
import { Loader2 } from "lucide-react";

export function StatsCards() {
  const { data: stats, isLoading } = useDashboardStats();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="bg-white dark:bg-gray-900 overflow-hidden shadow rounded-lg"
          >
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded-md"></div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                      <div className="w-20 h-4 bg-gray-200 dark:bg-gray-700 rounded-md"></div>
                    </dt>
                    <dd>
                      <div className="text-lg font-medium text-gray-900 dark:text-gray-100">
                        <div className="w-10 h-6 bg-gray-200 dark:bg-gray-700 rounded-md mt-1"></div>
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      <div className="bg-white dark:bg-gray-900 overflow-hidden shadow rounded-lg">
        <div className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg
                className="h-6 w-6 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M15 21v-1a6 6 0 00-5.197-5.197"
                />
              </svg>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                  Active Clients
                </dt>
                <dd>
                  <div className="text-lg font-medium text-gray-900 dark:text-gray-100">
                    {stats?.activeClients || 0}
                  </div>
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>
      <div className="bg-white dark:bg-gray-900 overflow-hidden shadow rounded-lg">
        <div className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg
                className="h-6 w-6 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M15 21v-1a6 6 0 00-5.197-5.197"
                />
              </svg>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                  Available Coaches
                </dt>
                <dd>
                  <div className="text-lg font-medium text-gray-900 dark:text-gray-100">
                    {stats?.availableCoaches || 0}
                  </div>
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>
      <div className="bg-white dark:bg-gray-900 overflow-hidden shadow rounded-lg">
        <div className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg
                className="h-6 w-6 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                  Today's Appointments
                </dt>
                <dd>
                  <div className="text-lg font-medium text-gray-900 dark:text-gray-100">
                    {stats?.todayAppointments || 0}
                  </div>
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>
      <div className="bg-white dark:bg-gray-900 overflow-hidden shadow rounded-lg">
        <div className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg
                className="h-6 w-6 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 9V7a2 2 0 00-2-2H9a2 2 0 00-2 2v2m4 5l-3 3m0 0l-3-3m3 3V3"
                />
              </svg>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                  Weekly Units
                </dt>
                <dd>
                  <div className="text-lg font-medium text-gray-900 dark:text-gray-100">
                    {stats?.weeklyUnits || 0}
                  </div>
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}