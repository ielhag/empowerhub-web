"use client";

import { useState } from "react";
import { useAuthStore } from "@/stores/auth";
import { useDashboard } from "@/hooks/useDashboard";
import { cn, getStatusColor, getStatusLabel } from "@/lib/utils";
import {
  ChevronRight,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Loader2,
  Search,
  Calendar,
  DollarSign,
  FileText,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import type { Appointment } from "@/types";

type TabType = "upcoming" | "completed" | "no_shows";

export default function DashboardPage() {
  const { user, isAdmin, tenant } = useAuthStore();
  const { data: dashboardData, isLoading, error } = useDashboard();
  const [isBusinessOverviewOpen, setIsBusinessOverviewOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("upcoming");

  // Get appointments by tab
  const currentAppointments = dashboardData?.appointments.current ?? [];
  const completedAppointments = dashboardData?.appointments.completed ?? [];
  const noShowAppointments = currentAppointments.filter(
    (apt) => apt.status === "no_show"
  );
  const upcomingAppointments = currentAppointments.filter(
    (apt) => apt.status !== "no_show"
  );

  // Alerts from API
  const alerts = [];
  if (
    dashboardData?.alerts.pendingRequests &&
    dashboardData.alerts.pendingRequests > 0
  ) {
    alerts.push({
      id: 1,
      type: "warning",
      message: `${dashboardData.alerts.pendingRequests} pending schedule requests need approval`,
      link: "/schedule/requests",
    });
  }
  if (dashboardData?.alerts.nemtToday && dashboardData.alerts.nemtToday > 0) {
    alerts.push({
      id: 2,
      type: "info",
      message: `${dashboardData.alerts.nemtToday} NEMT requests for today require confirmation`,
      link: "/appointments/nemt",
    });
  }

  const getActiveAppointments = () => {
    switch (activeTab) {
      case "completed":
        return completedAppointments;
      case "no_shows":
        return noShowAppointments;
      default:
        return upcomingAppointments;
    }
  };

  // Get initials from name
  const getInitials = (name: string | undefined) => {
    if (!name) return "??";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Format time to 12-hour AM/PM format
  const formatTime12h = (time: string | undefined) => {
    if (!time) return "";
    const [hours, minutes] = time.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const hour12 = hours % 12 || 12;
    return `${hour12}:${minutes.toString().padStart(2, "0")} ${period}`;
  };

  // Format time range
  const formatTimeRange = (apt: Appointment) => {
    const start = apt.start_time;
    const end = apt.end_time;
    if (start && end) {
      return (
        <div className="text-sm">
          <div className="font-medium text-gray-900 dark:text-white">
            {formatTime12h(start)}
          </div>
          <div className="text-gray-500 dark:text-gray-400">
            {formatTime12h(end)}
          </div>
        </div>
      );
    }
    return (
      <span className="text-sm text-gray-900 dark:text-white">
        {formatTime12h(start) || "-"}
      </span>
    );
  };

  // Format duration
  const getDurationDisplay = (apt: Appointment) => {
    const minutes = apt.duration || 0;
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${minutes}m`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Failed to load dashboard
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Please try refreshing the page.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alerts */}
      {isAdmin() && alerts.length > 0 && (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <Link
              key={alert.id}
              href={alert.link}
              className={cn(
                "flex items-center gap-3 p-4 rounded-lg",
                "transition-colors hover:opacity-90",
                alert.type === "warning"
                  ? "bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800"
                  : "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
              )}
            >
              <AlertCircle
                className={cn(
                  "w-5 h-5 flex-shrink-0",
                  alert.type === "warning"
                    ? "text-yellow-600 dark:text-yellow-400"
                    : "text-blue-600 dark:text-blue-400"
                )}
              />
              <span
                className={cn(
                  "flex-1 text-sm font-medium",
                  alert.type === "warning"
                    ? "text-yellow-800 dark:text-yellow-200"
                    : "text-blue-800 dark:text-blue-200"
                )}
              >
                {alert.message}
              </span>
              <ChevronRight
                className={cn(
                  "w-5 h-5",
                  alert.type === "warning"
                    ? "text-yellow-600 dark:text-yellow-400"
                    : "text-blue-600 dark:text-blue-400"
                )}
              />
            </Link>
          ))}
        </div>
      )}

      {/* Business Overview - Collapsible */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setIsBusinessOverviewOpen(!isBusinessOverviewOpen)}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors rounded-xl"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            <span className="font-semibold text-gray-900 dark:text-white">
              Business Overview
            </span>
          </div>
          {isBusinessOverviewOpen ? (
            <ChevronUp className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          )}
        </button>

        {isBusinessOverviewOpen && (
          <div className="px-6 pb-6 border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {dashboardData?.stats.activeClients?.toLocaleString() ?? "-"}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Active Clients
                </p>
              </div>
              <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {dashboardData?.stats.todayAppointments ?? "-"}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Today&apos;s Appointments
                </p>
              </div>
              <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {dashboardData?.stats.weeklyUnits?.toLocaleString() ?? "-"}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Weekly Units
                </p>
              </div>
              <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {dashboardData?.stats.availableCoaches ?? "-"}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Available Coaches
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Today's Schedule */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Today&apos;s Schedule
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {dashboardData?.stats.todayAppointments ?? 0} appointments
                scheduled for today
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                <Search className="w-4 h-4" />
                Search
              </button>
              <Link
                href="/schedule"
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 transition-colors"
              >
                <Calendar className="w-4 h-4" />
                View schedule
              </Link>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex gap-6">
            <button
              onClick={() => setActiveTab("upcoming")}
              className={cn(
                "py-3 text-sm font-medium border-b-2 transition-colors",
                activeTab === "upcoming"
                  ? "border-violet-600 text-violet-600 dark:text-violet-400"
                  : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              )}
            >
              Now & Upcoming
              <span
                className={cn(
                  "ml-2 px-2 py-0.5 text-xs rounded-full",
                  activeTab === "upcoming"
                    ? "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                )}
              >
                {upcomingAppointments.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab("completed")}
              className={cn(
                "py-3 text-sm font-medium border-b-2 transition-colors",
                activeTab === "completed"
                  ? "border-violet-600 text-violet-600 dark:text-violet-400"
                  : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              )}
            >
              Completed
              <span
                className={cn(
                  "ml-2 px-2 py-0.5 text-xs rounded-full",
                  activeTab === "completed"
                    ? "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                )}
              >
                {completedAppointments.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab("no_shows")}
              className={cn(
                "py-3 text-sm font-medium border-b-2 transition-colors",
                activeTab === "no_shows"
                  ? "border-violet-600 text-violet-600 dark:text-violet-400"
                  : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              )}
            >
              No Shows
              <span
                className={cn(
                  "ml-2 px-2 py-0.5 text-xs rounded-full",
                  activeTab === "no_shows"
                    ? "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                )}
              >
                {noShowAppointments.length}
              </span>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Service
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Coach
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Duration
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
              {getActiveAppointments().map((apt) => (
                <tr
                  key={apt.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group"
                >
                  {/* Time with Quick Links */}
                  <td className="px-6 py-4">
                    <div className="flex items-start gap-3">
                      {/* Quick Links Column */}
                      <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link
                          href={`/reports/payroll?appointment=${apt.id}`}
                          className="p-1 rounded hover:bg-violet-100 dark:hover:bg-violet-900/30"
                          title="Payroll"
                        >
                          <DollarSign className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                        </Link>
                        <Link
                          href={`/reports/billing?client=${apt.client_id}`}
                          className="p-1 rounded hover:bg-violet-100 dark:hover:bg-violet-900/30"
                          title="Client Billing"
                        >
                          <FileText className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                        </Link>
                      </div>
                      {formatTimeRange(apt)}
                    </div>
                  </td>

                  {/* Client */}
                  <td className="px-6 py-4">
                    <Link
                      href={apt.client_id ? `/clients/${apt.client_id}` : "#"}
                      tabIndex={apt.client_id ? 0 : -1}
                      className="flex items-center gap-3 group"
                    >
                      <div
                        className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-medium transition ring-offset-2 focus:ring-2",
                          "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300",
                          apt.client_id
                            ? "group-hover:ring-2 group-hover:ring-violet-300 dark:group-hover:ring-violet-800"
                            : ""
                        )}
                      >
                        {getInitials(apt.client_name || apt.client?.user?.name || "UN")}
                      </div>
                      <span
                        className={cn(
                          "font-medium transition-colors",
                          apt.client_name || apt.client?.user?.name
                            ? "text-gray-900 dark:text-white hover:text-violet-700 dark:hover:text-violet-300"
                            : "text-gray-500 dark:text-gray-400 italic pointer-events-none"
                        )}
                      >
                        {apt.client_name || apt.client?.user?.name || "Unknown"}
                      </span>
                    </Link>
                  </td>

                  {/* Service */}
                  <td className="px-6 py-4">
                    <span
                      className={cn(
                        "px-2.5 py-1 text-xs font-medium rounded-lg",
                        "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300"
                      )}
                    >
                      {apt.speciality_name ||
                        apt.speciality?.short_name ||
                        apt.speciality?.name ||
                        "CE"}
                    </span>
                  </td>

                  {/* Coach */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Link
                        href={apt.team_id ? `/team/${apt.team_id}` : "#"}
                        tabIndex={apt.team_id ? 0 : -1}
                        className={cn(
                          // Apply client avatar styling to coach avatar
                          "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-medium transition ring-offset-2 focus:ring-2",
                          "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300",
                          apt.team_id
                            ? "group-hover:ring-2 group-hover:ring-violet-300 dark:group-hover:ring-violet-800"
                            : ""
                        )}
                        title={
                          apt.team_name || apt.team?.name
                            ? `View profile for ${
                                apt.team_name || apt.team?.name
                              }`
                            : undefined
                        }
                      >
                        {getInitials(apt.team_name || apt.team?.name || "UN")}
                      </Link>
                      <Link
                        href={apt.team_id ? `/team/${apt.team_id}` : "#"}
                        tabIndex={apt.team_id ? 0 : -1}
                        className={cn(
                          // Apply client name/link styling to coach name/link
                          "font-medium transition-colors",
                          apt.team_name || apt.team?.name
                            ? "text-gray-900 dark:text-white hover:text-violet-700 dark:hover:text-violet-300"
                            : "text-gray-500 dark:text-gray-400 italic pointer-events-none"
                        )}
                        title={
                          apt.team_name || apt.team?.name
                            ? `View profile for ${
                                apt.team_name || apt.team?.name
                              }`
                            : undefined
                        }
                      >
                        {apt.team_name || apt.team?.name || "Unassigned"}
                      </Link>
                    </div>
                  </td>

                  {/* Duration */}
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {getDurationDisplay(apt)}
                  </td>

                  {/* Status */}
                  <td className="px-6 py-4">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full",
                        getStatusColor(apt.status)
                      )}
                    >
                      <Calendar className="w-3 h-3" />
                      {getStatusLabel(apt.status)}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4">
                    <Link
                      href={`/appointments/${apt.id}`}
                      className="text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </Link>
                  </td>
                </tr>
              ))}

              {getActiveAppointments().length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <Calendar className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                    <p className="text-gray-500 dark:text-gray-400">
                      {activeTab === "upcoming" && "No upcoming appointments"}
                      {activeTab === "completed" && "No completed appointments"}
                      {activeTab === "no_shows" && "No no-shows today"}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
