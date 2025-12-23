"use client";

import { use } from "react";
import Link from "next/link";
import { useSpeciality, type Speciality } from "@/hooks/useSpecialities";
import { cn, formatDate } from "@/lib/utils";
import {
  ArrowLeft,
  Edit2,
  Users,
  UserCircle,
  Calendar,
  BarChart3,
  Clock,
  Loader2,
  AlertTriangle,
} from "lucide-react";

// Color mapping for dynamic Tailwind classes
const colorStyles: Record<string, { bg: string; text: string; border: string }> = {
  violet: {
    bg: "bg-violet-100 dark:bg-violet-900/50",
    text: "text-violet-700 dark:text-violet-100",
    border: "border-violet-300 dark:border-violet-500",
  },
  emerald: {
    bg: "bg-emerald-100 dark:bg-emerald-900/50",
    text: "text-emerald-700 dark:text-emerald-100",
    border: "border-emerald-300 dark:border-emerald-500",
  },
  red: {
    bg: "bg-red-100 dark:bg-red-900/50",
    text: "text-red-700 dark:text-red-100",
    border: "border-red-300 dark:border-red-500",
  },
  blue: {
    bg: "bg-blue-100 dark:bg-blue-900/50",
    text: "text-blue-700 dark:text-blue-100",
    border: "border-blue-300 dark:border-blue-500",
  },
  indigo: {
    bg: "bg-indigo-100 dark:bg-indigo-900/50",
    text: "text-indigo-700 dark:text-indigo-100",
    border: "border-indigo-300 dark:border-indigo-500",
  },
};

// Extract base color from Tailwind class like "bg-violet-100" -> "violet"
function extractColorFromClass(colorClass: string): string {
  const match = colorClass.match(/bg-(\w+)-/);
  return match?.[1] || "indigo";
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function SpecialityDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const specialityId = parseInt(id);

  const { data, isLoading, error } = useSpeciality(specialityId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-400" />
          <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">
            Failed to load speciality
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Please try again later.
          </p>
          <Link
            href="/services/specialities"
            className="mt-4 inline-flex items-center text-violet-600 hover:text-violet-700"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Specialities
          </Link>
        </div>
      </div>
    );
  }

  const { speciality, stats, chart_data, teams, clients, appointments } = data;
  const baseColor = extractColorFromClass(speciality.color.bg);
  const colorStyle = colorStyles[baseColor] || colorStyles.indigo;

  // Get chart colors for ApexCharts-style bar chart
  const primaryColor = {
    violet: "#8b5cf6",
    emerald: "#10b981",
    red: "#ef4444",
    blue: "#3b82f6",
    indigo: "#6366f1",
  }[baseColor] || "#6366f1";

  const secondaryColor = {
    violet: "#7c3aed",
    emerald: "#059669",
    red: "#dc2626",
    blue: "#2563eb",
    indigo: "#4f46e5",
  }[baseColor] || "#4f46e5";

  return (
    <div className="space-y-6 max-w-full overflow-x-hidden">
      {/* Header Section with Service Overview */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-start">
            <div className="flex items-center space-x-4">
              <div
                className={cn(
                  "h-16 w-16 rounded-full flex items-center justify-center",
                  colorStyle.bg
                )}
              >
                <span className={cn("text-xl font-medium", colorStyle.text)}>
                  {speciality.short_name}
                </span>
              </div>
              <div>
                <div className="flex items-center space-x-3">
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {speciality.name}
                  </h1>
                  <span
                    className={cn(
                      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                      speciality.status
                        ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                    )}
                  >
                    {speciality.status ? "Active" : "Inactive"}
                  </span>
                  <span
                    className={cn(
                      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                      speciality.is_coach
                        ? "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
                        : "bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200"
                    )}
                  >
                    {speciality.is_coach ? "Coach Service" : "Administrative"}
                  </span>
                </div>
                <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  <p>
                    {speciality.service_code}
                    {speciality.service_code_modifier
                      ? ` (${speciality.service_code_modifier})`
                      : ""}
                  </p>
                  <p className="mt-1">{speciality.description}</p>
                </div>
              </div>
            </div>
            <Link
              href="/services/specialities"
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Link>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-gray-200 dark:divide-gray-700">
          <div className="p-6">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Total Units Allocated
            </h3>
            <p className="mt-2 text-3xl font-semibold text-gray-900 dark:text-white">
              {stats.total_units_allocated.toLocaleString()}
            </p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Across all clients
            </p>
          </div>
          <div className="p-6">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Total Units Used
            </h3>
            <p className="mt-2 text-3xl font-semibold text-gray-900 dark:text-white">
              {stats.total_units_used.toLocaleString()}
            </p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              From all sessions
            </p>
          </div>
          <div className="p-6">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Active Clients
            </h3>
            <p className="mt-2 text-3xl font-semibold text-gray-900 dark:text-white">
              {stats.active_clients.toLocaleString()}
            </p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Using this service
            </p>
          </div>
          <div className="p-6">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Assigned Coaches
            </h3>
            <p className="mt-2 text-3xl font-semibold text-gray-900 dark:text-white">
              {stats.assigned_coaches.toLocaleString()}
            </p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Qualified to provide
            </p>
          </div>
        </div>
      </div>

      {/* Service Usage Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Service Usage Trends
          </h2>
        </div>
        <div className="p-6">
          {/* Simple bar chart visualization */}
          <div className="flex items-end justify-between gap-4" style={{ height: "250px" }}>
            {chart_data.map((point, index) => {
              const maxValue = Math.max(
                ...chart_data.map((d) => Math.max(d.allocation, d.usage)),
                1
              );
              const allocationHeight = Math.max((point.allocation / maxValue) * 100, point.allocation > 0 ? 2 : 0);
              const usageHeight = Math.max((point.usage / maxValue) * 100, point.usage > 0 ? 2 : 0);

              return (
                <div key={index} className="flex-1 flex flex-col items-center h-full">
                  <div className="flex-1 w-full flex items-end justify-center gap-1 pb-2">
                    <div
                      className="w-5 rounded-t transition-all"
                      style={{
                        height: `${allocationHeight}%`,
                        backgroundColor: primaryColor,
                      }}
                      title={`Allocated: ${point.allocation.toLocaleString()}`}
                    />
                    <div
                      className="w-5 rounded-t transition-all"
                      style={{
                        height: `${usageHeight}%`,
                        backgroundColor: secondaryColor,
                      }}
                      title={`Used: ${point.usage.toLocaleString()}`}
                    />
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700 w-full text-center">
                    {point.month}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex justify-center gap-6 mt-6">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded"
                style={{ backgroundColor: primaryColor }}
              />
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Units Allocated
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded"
                style={{ backgroundColor: secondaryColor }}
              />
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Units Used
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Three Column Layout for Details, Coaches, and Clients */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Service Details */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Service Details
            </h2>
          </div>
          <div className="p-6">
            <dl className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Service Code
                </dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                  {speciality.service_code}
                  {speciality.service_code_modifier && (
                    <span className="text-gray-500 dark:text-gray-400">
                      {" "}
                      ({speciality.service_code_modifier})
                    </span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Service Code Description
                </dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                  {speciality.service_code_description || "No description available"}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Rate Description
                </dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                  {speciality.rate_description || "No rate description available"}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Service Type
                </dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                  <span
                    className={cn(
                      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                      speciality.is_coach
                        ? "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
                        : "bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200"
                    )}
                  >
                    {speciality.is_coach ? "Coach Service" : "Administrative"}
                  </span>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {speciality.is_coach
                      ? "This service is performed by coaches who work directly with clients"
                      : "This service is for administrative staff only"}
                  </p>
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Assigned Coaches */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Assigned Coaches
            </h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {teams.length} total
            </span>
          </div>
          <div className="p-6">
            <div className="space-y-4 max-h-[400px] overflow-y-auto">
              {teams.length === 0 ? (
                <div className="text-center py-4 text-sm text-gray-500 dark:text-gray-400">
                  No coaches assigned
                </div>
              ) : (
                teams.map((team) => (
                  <div
                    key={team.id}
                    className="flex items-start space-x-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700"
                  >
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-violet-100 dark:bg-violet-900 flex items-center justify-center">
                        <span className="text-sm font-medium text-violet-700 dark:text-violet-200">
                          {team.initials}
                        </span>
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        <Link
                          href={`/team/${team.id}`}
                          className="hover:text-violet-600 dark:hover:text-violet-400"
                        >
                          {team.name}
                        </Link>
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {team.phone || "No phone"}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Assigned Clients */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Assigned Clients
            </h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {clients.length} active
            </span>
          </div>
          <div className="p-6">
            <div className="space-y-4 max-h-[400px] overflow-y-auto">
              {clients.length === 0 ? (
                <div className="text-center py-4 text-sm text-gray-500 dark:text-gray-400">
                  No clients assigned to this service
                </div>
              ) : (
                clients.map((client) => (
                  <div
                    key={client.id}
                    className="flex items-start space-x-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700"
                  >
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-violet-100 dark:bg-violet-900 flex items-center justify-center">
                        <span className="text-sm font-medium text-violet-700 dark:text-violet-200">
                          {client.initials}
                        </span>
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        <Link
                          href={`/clients/${client.id}`}
                          className="hover:text-violet-600 dark:hover:text-violet-400"
                        >
                          {client.name}
                        </Link>
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {client.current_balance} units remaining
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming Sessions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Upcoming Sessions
          </h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {appointments.length === 0 ? (
              <div className="col-span-3 text-center py-4 text-sm text-gray-500 dark:text-gray-400">
                No upcoming sessions scheduled
              </div>
            ) : (
              appointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="flex flex-col p-4 rounded-lg bg-gray-50 dark:bg-gray-700"
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      <Link
                        href={`/clients/${appointment.client_id}`}
                        className="hover:text-violet-600 dark:hover:text-violet-400"
                      >
                        {appointment.client_name}
                      </Link>
                    </p>
                    <span
                      className={cn(
                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                        colorStyle.bg,
                        colorStyle.text
                      )}
                    >
                      {appointment.units_required} units
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    <p>
                      <Link
                        href={`/appointments/${appointment.id}`}
                        className="hover:text-violet-600 dark:hover:text-violet-400"
                      >
                        {new Date(appointment.start_time).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Link>
                    </p>
                    <p className="mt-1">
                      Coach:{" "}
                      {appointment.team_id ? (
                        <Link
                          href={`/team/${appointment.team_id}`}
                          className="hover:text-violet-600 dark:hover:text-violet-400"
                        >
                          {appointment.team_name}
                        </Link>
                      ) : (
                        <span>Unassigned</span>
                      )}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
