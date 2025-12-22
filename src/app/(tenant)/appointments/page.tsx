"use client";

import { useState } from "react";
import { useAppointments } from "@/hooks/useAppointments";
import type { AppointmentFilters } from "@/hooks/useAppointments";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default function AppointmentsPage() {
  const [filters, setFilters] = useState<AppointmentFilters>({
    page: 1,
    per_page: 10,
  });
  const { data, isLoading, error } = useAppointments(filters);

  const appointments = data?.data || [];
  const meta = {
    current_page: data?.current_page,
    last_page: data?.last_page,
    total: data?.total,
    from: data?.from,
    to: data?.to,
  };

  const handlePageChange = (page: number) => {
    setFilters({ ...filters, page });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Appointments
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Manage all appointments
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/appointments/new"
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 transition-colors"
              >
                New Appointment
              </Link>
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search by client or coach..."
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:placeholder-gray-400 dark:focus:placeholder-gray-500 focus:ring-1 focus:ring-violet-500 focus:border-violet-500 sm:text-sm"
                  onChange={(e) =>
                    setFilters({ ...filters, search: e.target.value })
                  }
                />
              </div>
            </div>
            <div>
              <select
                className="block w-full pl-3 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500 sm:text-sm"
                onChange={(e) =>
                  setFilters({ ...filters, status: e.target.value })
                }
              >
                <option value="">All Statuses</option>
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <input
                type="date"
                className="block w-full pl-3 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500 sm:text-sm"
                onChange={(e) =>
                  setFilters({ ...filters, date: e.target.value })
                }
              />
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Coach
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Service
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-violet-600 mx-auto" />
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                    <p className="text-gray-500 dark:text-gray-400">
                      Failed to load appointments
                    </p>
                  </td>
                </tr>
              ) : appointments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <p className="text-gray-500 dark:text-gray-400">
                      No appointments found
                    </p>
                  </td>
                </tr>
              ) : (
                appointments.map((appointment) => (
                  <tr
                    key={appointment.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {appointment.client.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {appointment.team.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {appointment.speciality.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {appointment.date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {appointment.start_time}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span
                        className={cn(
                          "px-2 inline-flex text-xs leading-5 font-semibold rounded-full",
                          appointment.status === "completed"
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        )}
                      >
                        {appointment.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        href={`/appointments/${appointment.id}`}
                        className="text-violet-600 hover:text-violet-900"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => handlePageChange(meta.current_page - 1)}
              disabled={meta.current_page === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Previous
            </button>
            <button
              onClick={() => handlePageChange(meta.current_page + 1)}
              disabled={meta.current_page === meta.last_page}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Showing <span className="font-medium">{meta.from}</span> to{" "}
                <span className="font-medium">{meta.to}</span> of{" "}
                <span className="font-medium">{meta.total}</span> results
              </p>
            </div>
            <div>
              <nav
                className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
                aria-label="Pagination"
              >
                <button
                  onClick={() => handlePageChange(meta.current_page - 1)}
                  disabled={meta.current_page === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                >
                  <span className="sr-only">Previous</span>
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={() => handlePageChange(meta.current_page + 1)}
                  disabled={meta.current_page === meta.last_page}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                >
                  <span className="sr-only">Next</span>
                  <ChevronRight className="h-5 w-5" />
                </button>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}