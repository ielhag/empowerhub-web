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
import { StatsCards } from "@/components/features/dashboard/StatsCards";
import { AppointmentsList } from "@/components/features/dashboard/AppointmentsList";
import { QuickActions } from "@/components/features/dashboard/QuickActions";
import { useDashboardAlerts } from "@/hooks/useDashboard";

type TabType = "upcoming" | "completed" | "no_shows";

function Alerts() {
  const { data: alerts, isLoading } = useDashboardAlerts();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="bg-white dark:bg-gray-900 shadow sm:rounded-md p-6">
          <div className="h-6 w-1/3 bg-gray-200 dark:bg-gray-700 rounded-md"></div>
          <div className="h-4 w-1/2 bg-gray-200 dark:bg-gray-700 rounded-md mt-2"></div>
        </div>
        <div className="bg-white dark:bg-gray-900 shadow sm:rounded-md p-6">
          <div className="h-6 w-1/3 bg-gray-200 dark:bg-gray-700 rounded-md"></div>
          <div className="h-4 w-1/2 bg-gray-200 dark:bg-gray-700 rounded-md mt-2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {alerts?.pendingRequests && alerts.pendingRequests > 0 ? (
        <div className="bg-white dark:bg-gray-900 shadow sm:rounded-md p-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                Pending Requests
              </h3>
              <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-100">
                <p>
                  There are {alerts.pendingRequests} pending requests that need
                  your attention.
                </p>
              </div>
              <div className="mt-4">
                <Link
                  href="/team/requests"
                  className="text-sm font-medium text-yellow-800 dark:text-yellow-200 hover:text-yellow-700 dark:hover:text-yellow-100"
                >
                  View requests &rarr;
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {alerts?.nemtToday && alerts.nemtToday > 0 ? (
        <div className="bg-white dark:bg-gray-900 shadow sm:rounded-md p-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <FileText className="h-5 w-5 text-blue-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                NEMT Requests Today
              </h3>
              <div className="mt-2 text-sm text-blue-700 dark:text-blue-100">
                <p>
                  There are {alerts.nemtToday} NEMT requests scheduled for
                  today.
                </p>
              </div>
              <div className="mt-4">
                <Link
                  href="/nemt-requests"
                  className="text-sm font-medium text-blue-800 dark:text-blue-200 hover:text-blue-700 dark:hover:text-blue-100"
                >
                  View NEMT requests &rarr;
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

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
      {isAdmin() && <Alerts />}
      <StatsCards />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <AppointmentsList />
        </div>
        <div className="space-y-6">
          <QuickActions />
        </div>
      </div>
    </div>
  );
}