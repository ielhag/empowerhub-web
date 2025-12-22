"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  useClient,
  useClientUnits,
  useArchiveClient,
  useRestoreClient,
} from "@/hooks/useClients";
import { useAppointments } from "@/hooks/useAppointments";
import { useTenantSettings } from "@/hooks/useSettings";
import { cn, formatDate } from "@/lib/utils";
import {
  ArrowLeft,
  Edit,
  Archive,
  RotateCcw,
  User,
  Phone,
  Mail,
  MapPin,
  Building,
  Calendar,
  Clock,
  CreditCard,
  FileText,
  ChevronRight,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  Cake,
  Shield,
  Activity,
  Languages,
  Home,
  Truck,
  Users,
  TrendingUp,
  ChevronDown,
  Target,
  CheckCircle,
} from "lucide-react";
import type { AppointmentStatus, ClientWithDetails, Speciality } from "@/types";
import ClientModal from "@/components/features/clients/ClientModal";
import NEMTBrokerModal from "@/components/features/clients/NEMTBrokerModal";
import TransportationRequestsSection from "@/components/features/clients/TransportationRequestsSection";
import DSHSReportsSection from "@/components/features/clients/DSHSReportsSection";
import UnitTransactionsSection from "@/components/features/clients/UnitTransactionsSection";

const statusColors: Record<AppointmentStatus, string> = {
  pending:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  confirmed: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  scheduled: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  unassigned:
    "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  in_progress:
    "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  completed:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  no_show: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400",
  late: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  terminated_by_client:
    "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  terminated_by_staff:
    "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  deleted: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400",
};

const userStatusLabels: Record<number, string> = {
  0: "Inactive",
  1: "Active",
  2: "Terminated",
  3: "Deceased",
  4: "Resigned",
};

const userStatusColors: Record<number, string> = {
  0: "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300",
  1: "bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300",
  2: "bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300",
  3: "bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300",
  4: "bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-300",
};

// Helper to check if birthday is upcoming
function isUpcomingBirthday(dateOfBirth: string | null | undefined): boolean {
  if (!dateOfBirth) return false;
  const today = new Date();
  const birthday = new Date(dateOfBirth);
  const nextBirthday = new Date(birthday);
  nextBirthday.setFullYear(today.getFullYear());

  if (nextBirthday < today) {
    nextBirthday.setFullYear(today.getFullYear() + 1);
  }

  const daysUntil = Math.floor(
    (nextBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );
  return daysUntil >= 0 && daysUntil <= 7;
}

function getBirthdayMessage(dateOfBirth: string | null | undefined): string {
  if (!dateOfBirth) return "";
  const today = new Date();
  const birthday = new Date(dateOfBirth);
  const age = today.getFullYear() - birthday.getFullYear();

  const nextBirthday = new Date(birthday);
  nextBirthday.setFullYear(today.getFullYear());

  if (nextBirthday < today) {
    nextBirthday.setFullYear(today.getFullYear() + 1);
  }

  const daysUntil = Math.floor(
    (nextBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysUntil === 0) return `🎉 Birthday today! Turned ${age}`;
  if (daysUntil === 1) return `Birthday tomorrow! Turning ${age + 1}`;
  if (daysUntil <= 7)
    return `Birthday in ${daysUntil} days! Turning ${age + 1}`;
  return "";
}

export default function ClientProfilePage() {
  const params = useParams();
  const clientId = Number(params.id);

  const [showClientModal, setShowClientModal] = useState(false);
  const [showBrokerModal, setShowBrokerModal] = useState(false);
  const [showUnitsHistory, setShowUnitsHistory] = useState<
    Record<number, boolean>
  >({});

  const { data: client, isLoading, error, refetch } = useClient(clientId);
  const { data: units } = useClientUnits(clientId);
  const { data: appointmentsData } = useAppointments({
    client_id: clientId,
    per_page: 10,
  });
  const { data: tenantSettings } = useTenantSettings();

  const archiveMutation = useArchiveClient();
  const restoreMutation = useRestoreClient();

  // Feature flags
  const clientGoalsEnabled =
    tenantSettings?.features?.client_goals_enabled ?? false;

  const userStatus = client?.user?.status;
  const isInactive =
    client?.is_inactive ||
    client?.status === "inactive" ||
    userStatus === 0 ||
    userStatus === "inactive";

  const handleReactivate = async () => {
    if (confirm("Are you sure you want to reactivate this client?")) {
      await restoreMutation.mutateAsync(clientId);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
          <div>
            <h3 className="font-medium text-red-800 dark:text-red-200">
              Client not found
            </h3>
            <p className="text-sm text-red-600 dark:text-red-400 mt-1">
              The client you&apos;re looking for doesn&apos;t exist or you
              don&apos;t have access to view it.
            </p>
          </div>
        </div>
        <Link
          href="/clients"
          className="mt-4 inline-flex items-center gap-2 text-sm text-red-600 dark:text-red-400 hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to clients
        </Link>
      </div>
    );
  }

  const getDisplayName = () =>
    client.full_name || client.user?.name || "Unknown Client";
  const getInitials = () =>
    getDisplayName()
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const formatDateOfBirth = (dob: string | null | undefined) => {
    if (!dob) return "Not set";
    return new Date(dob).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });
  };

  const formatEnrolledDate = (date: string | null) => {
    if (!date) return "Unknown";
    const d = new Date(date);
    return d.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const getTimeAgo = (date: string | null) => {
    if (!date) return "";
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return "today";
    if (days === 1) return "yesterday";
    if (days < 30) return `${days} days ago`;
    if (days < 365) return `${Math.floor(days / 30)} months ago`;
    return `${Math.floor(days / 365)} years ago`;
  };

  // Get upcoming sessions
  const upcomingSessions =
    appointmentsData?.data?.filter(
      (apt) => new Date(apt.date) >= new Date() && apt.status !== "cancelled"
    ) || [];

  return (
    <div className="space-y-6">
      {/* Inactive Client Banner */}
      {isInactive && (
        <div className="bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 p-4">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-700 dark:text-red-300">
                Inactive Client
              </h3>
              <div className="mt-2 text-sm text-red-600 dark:text-red-300">
                <p>
                  <strong>This client account is currently inactive.</strong>{" "}
                  The following actions have been disabled:
                </p>
                <ul className="mt-1 list-disc list-inside">
                  <li>Creating new transportation requests</li>
                  <li>Allocating or managing units</li>
                  <li>Editing client preferences</li>
                  <li>Managing NEMT brokers</li>
                  <li>Updating client information</li>
                </ul>
                <button
                  onClick={handleReactivate}
                  disabled={restoreMutation.isPending}
                  className="mt-3 text-sm text-red-700 dark:text-red-300 font-medium underline hover:text-red-800 dark:hover:text-red-200"
                >
                  Reactivate this client to enable all functionality
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header Section */}
      <div className="flex items-center justify-between bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
        <div className="flex items-center space-x-4">
          <div className="h-20 w-20 rounded-full bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center">
            <span className="text-2xl font-medium text-violet-700 dark:text-violet-300">
              {getInitials()}
            </span>
          </div>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {getDisplayName()}
              </h1>

              {/* Active Appointment Indicator */}
              {client.active_appointments &&
                client.active_appointments.length > 0 && (
                  <div className="relative group">
                    <div className="flex items-center cursor-pointer p-1.5 -m-1.5">
                      <span className="flex h-3 w-3">
                        <span className="animate-pulse relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                      </span>
                    </div>
                    <div className="absolute left-0 top-full mt-1 w-64 bg-white dark:bg-gray-800 text-sm rounded-md shadow-lg p-3 z-50 border border-gray-200 dark:border-gray-700 hidden group-hover:block">
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        In session with:{" "}
                        {client.active_appointments[0]?.team?.user?.name ||
                          "Staff"}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Started at:{" "}
                        {client.active_appointments[0]?.started_at
                          ? new Date(
                              client.active_appointments[0].started_at
                            ).toLocaleTimeString("en-US", {
                              hour: "numeric",
                              minute: "2-digit",
                              hour12: true,
                            })
                          : "Unknown"}
                      </div>
                      <Link
                        href={`/appointments/${client.active_appointments[0]?.id}`}
                        className="mt-2 px-3 py-1.5 text-xs bg-violet-100 dark:bg-violet-900/30 hover:bg-violet-200 dark:hover:bg-violet-900/50 text-violet-700 dark:text-violet-300 rounded flex items-center justify-center transition-colors"
                      >
                        View appointment details
                      </Link>
                    </div>
                  </div>
                )}

              {/* Birthday Notification */}
              {isUpcomingBirthday(client.date_of_birth) && (
                <div className="flex items-center gap-2 px-3 py-1 bg-violet-50 dark:bg-violet-900/20 rounded-full animate-pulse">
                  <Cake className="w-5 h-5 text-violet-500" />
                  <span className="text-sm font-medium text-violet-600 dark:text-violet-300">
                    {getBirthdayMessage(client.date_of_birth)}
                  </span>
                </div>
              )}

              {/* Vaccination Requirement Badge */}
              {client.facility?.vaccine_required && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 rounded-full border border-amber-200 dark:border-amber-700">
                  <Shield className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                    Facility Requires Staff Vaccination
                  </span>
                </div>
              )}
            </div>
            <p className="text-gray-500 dark:text-gray-400">
              Client ID:{" "}
              <span className="font-mono">{client.client_id || "N/A"}</span>
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowClientModal(true)}
          disabled={isInactive}
          className={cn(
            "inline-flex items-center px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors",
            isInactive
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-violet-600 dark:bg-violet-500 hover:bg-violet-700 dark:hover:bg-violet-600"
          )}
        >
          <Edit className="w-4 h-4 mr-2" />
          Edit Profile
        </button>
      </div>

      {/* Main Content Grid - 3 Column Layout */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left Column - Client Info & Preferences */}
        <div className="col-span-12 lg:col-span-3 space-y-6">
          {/* Personal Information Card */}
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Personal Information
              </h2>
            </div>
            <div className="px-6 py-4">
              <dl className="space-y-4">
                <div className="flex justify-between">
                  <dt className="font-medium text-gray-400 dark:text-gray-500">
                    Date of Birth
                  </dt>
                  <dd className="text-gray-900 dark:text-gray-100">
                    {formatDateOfBirth(client.date_of_birth)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="font-medium text-gray-400 dark:text-gray-500">
                    Phone
                  </dt>
                  <dd className="text-gray-900 dark:text-gray-100">
                    {client.user?.phone || "Not set"}
                  </dd>
                </div>
                {client.user?.email &&
                  !client.user.email.endsWith("@empowerhub.io") && (
                    <div className="flex justify-between">
                      <dt className="font-medium text-gray-400 dark:text-gray-500">
                        Email
                      </dt>
                      <dd className="text-gray-900 dark:text-gray-100 text-right truncate max-w-[150px]">
                        {client.user.email}
                      </dd>
                    </div>
                  )}
                <div className="flex justify-between">
                  <dt className="font-medium text-gray-400 dark:text-gray-500">
                    Address
                  </dt>
                  <dd className="text-gray-900 dark:text-gray-100 text-right">
                    {[
                      client.address?.street,
                      client.address?.city,
                      client.address?.state,
                      client.address?.zip,
                    ]
                      .filter(Boolean)
                      .join(", ") || "Not set"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="font-medium text-gray-400 dark:text-gray-500">
                    Case Manager
                  </dt>
                  <dd>
                    {client.case_manager ? (
                      <Link
                        href={`/case-managers/${client.case_manager.id}`}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-violet-100 dark:bg-violet-900/50 text-violet-800 dark:text-violet-300 hover:bg-violet-200 dark:hover:bg-violet-800"
                      >
                        {client.case_manager.user?.name ||
                          client.case_manager.name ||
                          "Unknown"}
                      </Link>
                    ) : (
                      <span className="text-gray-500 dark:text-gray-400">
                        Not Assigned
                      </span>
                    )}
                  </dd>
                </div>
                {client.facility && (
                  <div className="flex justify-between">
                    <dt className="font-medium text-gray-400 dark:text-gray-500">
                      Facility
                    </dt>
                    <dd>
                      <Link
                        href={`/facilities/${client.facility.id}`}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-violet-100 dark:bg-violet-900/50 text-violet-800 dark:text-violet-300 hover:bg-violet-200 dark:hover:bg-violet-800"
                      >
                        {client.facility.name}
                      </Link>
                    </dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="font-medium text-gray-400 dark:text-gray-500">
                    Status
                  </dt>
                  <dd>
                    {(() => {
                      const status = client.user?.status;
                      const statusNum =
                        typeof status === "number"
                          ? status
                          : status === "active"
                          ? 1
                          : 0;
                      return (
                        <span
                          className={cn(
                            "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                            userStatusColors[statusNum] || userStatusColors[0]
                          )}
                        >
                          {userStatusLabels[statusNum] || "Unknown"}
                        </span>
                      );
                    })()}
                  </dd>
                </div>
                <div className="flex justify-between items-center">
                  <dt className="font-medium text-gray-400 dark:text-gray-500">
                    Enrolled
                  </dt>
                  <dd className="flex flex-col items-end">
                    <span className="text-gray-900 text-sm dark:text-gray-100 font-medium">
                      {formatEnrolledDate(client.created_at)}
                    </span>
                    <span className="text-gray-500 text-xs dark:text-gray-400">
                      ({getTimeAgo(client.created_at)})
                    </span>
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Client Preferences Card */}
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  Preferences
                </h3>
                <button
                  disabled={isInactive}
                  className={cn(
                    "inline-flex items-center px-3 py-1 text-white text-xs font-medium rounded-lg transition-colors",
                    isInactive
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-violet-600 hover:bg-violet-700"
                  )}
                >
                  <Edit className="w-3 h-3 mr-1" />
                  Edit
                </button>
              </div>
            </div>
            <div className="p-4">
              <div className="space-y-4">
                {/* Schedule */}
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 mt-0.5 text-blue-500 shrink-0" />
                  <div className="flex-1">
                    {client.preferences?.schedule_preferences?.in_home && (
                      <div className="mb-3">
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                          Home Service
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {client.preferences.schedule_preferences.in_home.days?.map(
                            (day: string) => (
                              <span
                                key={day}
                                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 capitalize"
                              >
                                {day.slice(0, 3)}
                              </span>
                            )
                          )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {
                            client.preferences.schedule_preferences.in_home
                              .times?.start_time
                          }{" "}
                          -{" "}
                          {
                            client.preferences.schedule_preferences.in_home
                              .times?.end_time
                          }
                        </p>
                      </div>
                    )}

                    {client.preferences?.schedule_preferences
                      ?.transportation && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                          Transportation
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {client.preferences.schedule_preferences.transportation.days?.map(
                            (day: string) => (
                              <span
                                key={day}
                                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 capitalize"
                              >
                                {day.slice(0, 3)}
                              </span>
                            )
                          )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {
                            client.preferences.schedule_preferences
                              .transportation.times?.start_time
                          }{" "}
                          -{" "}
                          {
                            client.preferences.schedule_preferences
                              .transportation.times?.end_time
                          }
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Languages and Gender */}
                <div className="flex gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <Languages className="w-5 h-5 mt-0.5 text-violet-500 shrink-0" />
                    <div className="flex-1">
                      <div className="flex flex-wrap gap-1.5">
                        {client.preferences?.general_preferences?.languages_display?.map(
                          (lang: string, index: number) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300"
                            >
                              {lang}
                            </span>
                          )
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <User className="w-5 h-5 mt-0.5 text-gray-400 shrink-0" />
                    <span className="text-sm font-medium capitalize text-gray-700 dark:text-gray-300">
                      {client.preferences?.general_preferences?.coach_gender ||
                        "Any"}
                    </span>
                  </div>
                </div>

                {/* Notes */}
                {client.preferences?.notes && (
                  <div className="flex items-start gap-3">
                    <FileText className="w-5 h-5 mt-0.5 text-gray-400 shrink-0" />
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {client.preferences.notes}
                    </p>
                  </div>
                )}

                {/* No Preferences */}
                {(!client.preferences ||
                  Object.keys(client.preferences).length === 0) && (
                  <div className="flex items-center justify-center py-3">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      No preferences set
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Middle Column - Services, Units & Team */}
        <div className="col-span-12 lg:col-span-6 space-y-6">
          {/* Service Overview Card */}
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Service Overview
              </h2>
            </div>
            <div className="px-6 py-4">
              <div className="space-y-4">
                {(() => {
                  // Deduplicate specialities - keep only active (pivot.status=1) when duplicates exist
                  const uniqueSpecialities =
                    client.specialities?.filter((s, index, arr) => {
                      const duplicates = arr.filter((sp) => sp.id === s.id);
                      if (duplicates.length === 1) return true;
                      // For duplicates, only keep the one with active status (pivot.status=1)
                      return s.pivot?.status === 1;
                    }) || [];

                  if (uniqueSpecialities.length === 0) {
                    return (
                      <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                        No services assigned
                      </p>
                    );
                  }

                  return uniqueSpecialities.map((speciality) => {
                    // Get balance from unit_balances
                    const balanceRecord = client.unit_balances?.find(
                      (b) => b.speciality_id === speciality.id
                    );
                    const balance = balanceRecord?.balance ?? 0;

                    // Get unit allocation from client.units
                    const unitAllocation = client.units?.find(
                      (u) => u.speciality_id === speciality.id && u.status === 1
                    );
                    const totalUnits = unitAllocation?.units ?? 0;

                    return (
                      <div key={`${speciality.id}-${speciality.pivot?.status}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <Link
                              href={`/services/specialities/${speciality.id}`}
                              className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-violet-100 dark:bg-violet-900/50 text-violet-800 dark:text-violet-300 hover:bg-violet-200 dark:hover:bg-violet-800"
                            >
                              {speciality.name}
                            </Link>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {balance} / {totalUnits} units remaining this
                              month
                            </p>
                          </div>
                          <span
                            className={cn(
                              "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                              unitAllocation?.status === 1 && balance >= 0
                                ? "bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300"
                                : unitAllocation?.status === 1 && balance < 0
                                ? "bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300"
                                : "bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300"
                            )}
                          >
                            {unitAllocation?.status === 1
                              ? balance >= 0
                                ? "Active"
                                : "Over Limit"
                              : "Inactive"}
                          </span>
                        </div>
                        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mt-1">
                          <span>Authorization ID: </span>
                          <span className="ml-1 font-medium dark:text-gray-300">
                            {unitAllocation?.authorization_id || "N/A"}
                          </span>
                          <span className="mx-2">•</span>
                          <span>Expires: </span>
                          <span className="ml-1 font-medium dark:text-gray-300">
                            {unitAllocation?.end_date
                              ? new Date(
                                  unitAllocation.end_date
                                ).toLocaleDateString()
                              : "N/A"}
                          </span>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </div>

          {/* Units Overview Card */}
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Units Overview
                </h2>
                <button
                  disabled={isInactive}
                  className={cn(
                    "inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md text-white transition-colors",
                    isInactive
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-violet-600 hover:bg-violet-700 dark:bg-violet-500 dark:hover:bg-violet-600"
                  )}
                >
                  <RefreshCw className="w-4 h-4 mr-1.5" />
                  Allocate Units
                </button>
              </div>
            </div>
            <div className="px-6 py-4">
              <div className="space-y-6">
                {(() => {
                  // Deduplicate specialities - keep only active (pivot.status=1) when duplicates exist
                  const uniqueSpecialities =
                    client.specialities?.filter((s, index, arr) => {
                      const duplicates = arr.filter((sp) => sp.id === s.id);
                      if (duplicates.length === 1) return true;
                      // For duplicates, only keep the one with active status
                      return s.pivot?.status === 1;
                    }) || [];

                  if (uniqueSpecialities.length === 0) {
                    return (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>No services assigned</p>
                      </div>
                    );
                  }

                  return uniqueSpecialities.map((speciality) => {
                    // Get balance from unit_balances
                    const balanceRecord = client.unit_balances?.find(
                      (b) => b.speciality_id === speciality.id
                    );
                    const balance = balanceRecord?.balance ?? 0;

                    // Get unit allocation from client.units
                    const unitAllocation = client.units?.find(
                      (u) => u.speciality_id === speciality.id && u.status === 1
                    );
                    const totalUnits = unitAllocation?.units ?? 0;
                    const usedUnits = totalUnits - balance;
                    const percentage =
                      totalUnits > 0
                        ? Math.min(
                            100,
                            Math.max(0, (usedUnits / totalUnits) * 100)
                          )
                        : 0;
                    const overLimit = balance < 0;

                    return (
                      <div key={speciality.id}>
                        <div className="flex justify-between items-center mb-2">
                          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {speciality.name}
                          </h3>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {balance} / {totalUnits} units remaining this month
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="relative pt-1">
                          <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-violet-100 dark:bg-violet-900/30">
                            <div
                              className={cn(
                                "shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center transition-all duration-500",
                                overLimit
                                  ? "bg-yellow-500 dark:bg-yellow-400"
                                  : "bg-violet-500 dark:bg-violet-400"
                              )}
                              style={{ width: `${percentage}%` }}
                            />
                            {overLimit && (
                              <div
                                className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-red-500 dark:bg-red-400 transition-all duration-500"
                                style={{
                                  width: `${Math.min(
                                    100,
                                    (Math.abs(balance) / totalUnits) * 100
                                  )}%`,
                                }}
                              />
                            )}
                          </div>

                          {/* Authorization Info */}
                          <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                            <span>
                              Authorization ID:{" "}
                              <span className="font-medium dark:text-gray-300">
                                {unitAllocation?.authorization_id || "N/A"}
                              </span>
                            </span>
                            <span>
                              Expires:{" "}
                              <span className="font-medium dark:text-gray-300">
                                {unitAllocation?.end_date
                                  ? new Date(
                                      unitAllocation.end_date
                                    ).toLocaleDateString()
                                  : "N/A"}
                              </span>
                            </span>
                          </div>

                          {/* View Balance History */}
                          <div className="mt-4">
                            <button
                              onClick={() =>
                                setShowUnitsHistory((prev) => ({
                                  ...prev,
                                  [speciality.id]: !prev[speciality.id],
                                }))
                              }
                              className="text-xs flex items-center text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300"
                            >
                              <ChevronDown
                                className={cn(
                                  "w-4 h-4 mr-1 transition-transform",
                                  showUnitsHistory[speciality.id] &&
                                    "rotate-180"
                                )}
                              />
                              View Balance History
                            </button>

                            {showUnitsHistory[speciality.id] && (
                              <div className="mt-2 space-y-2">
                                {client.unit_balances_history?.filter(
                                  (h) => h.speciality_id === speciality.id
                                ).length ? (
                                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                      <thead className="bg-gray-50 dark:bg-gray-800">
                                        <tr>
                                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                                            Month
                                          </th>
                                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">
                                            Allocated
                                          </th>
                                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">
                                            Used
                                          </th>
                                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">
                                            Balance
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                        {client.unit_balances_history
                                          ?.filter(
                                            (h) =>
                                              h.speciality_id === speciality.id
                                          )
                                          .slice(0, 6)
                                          .map((history) => (
                                            <tr
                                              key={history.id}
                                              className="text-xs"
                                            >
                                              <td className="px-3 py-2 text-gray-900 dark:text-gray-100">
                                                {new Date(
                                                  history.month_year
                                                ).toLocaleDateString("en-US", {
                                                  month: "short",
                                                  year: "numeric",
                                                })}
                                              </td>
                                              <td className="px-3 py-2 text-right text-gray-600 dark:text-gray-400">
                                                {history.allocated_units}
                                              </td>
                                              <td className="px-3 py-2 text-right text-gray-600 dark:text-gray-400">
                                                {history.used_units}
                                              </td>
                                              <td
                                                className={cn(
                                                  "px-3 py-2 text-right font-medium",
                                                  history.balance < 0
                                                    ? "text-red-600 dark:text-red-400"
                                                    : "text-gray-900 dark:text-gray-100"
                                                )}
                                              >
                                                {history.balance}
                                              </td>
                                            </tr>
                                          ))}
                                      </tbody>
                                    </table>
                                  </div>
                                ) : (
                                  <p className="text-xs text-gray-500 dark:text-gray-400 italic text-center py-2">
                                    No balance history available
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </div>

          {/* Care Team Card */}
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Care Team
              </h2>
              <Link
                href="/team"
                className="text-sm text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300"
              >
                View All
              </Link>
            </div>

            <div className="space-y-3">
              {client.recent_team_members &&
              client.recent_team_members.length > 0 ? (
                client.recent_team_members
                  .slice(0, 4)
                  .map(
                    (member: {
                      id: number;
                      name: string;
                      sessions_count?: number;
                    }) => (
                      <div
                        key={member.id}
                        className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <div className="flex-shrink-0">
                          <div className="h-10 w-10 rounded-full bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center">
                            <span className="text-sm font-medium text-violet-700 dark:text-violet-300">
                              {member.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .toUpperCase()
                                .slice(0, 2)}
                            </span>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <Link
                            href={`/team/${member.id}`}
                            className="hover:text-violet-600 dark:hover:text-violet-400"
                          >
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {member.name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {member.sessions_count || 0} session
                              {member.sessions_count !== 1 ? "s" : ""}
                            </p>
                          </Link>
                        </div>
                        <div className="flex-shrink-0">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300">
                            Active
                          </span>
                        </div>
                      </div>
                    )
                  )
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                  No team members assigned
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Sessions & Transactions */}
        <div className="col-span-12 lg:col-span-3 space-y-6">
          {/* Upcoming Sessions Card */}
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Upcoming Sessions
              </h2>
              <Link
                href={`/appointments?client_id=${client.id}`}
                className="text-sm text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300"
              >
                View All
              </Link>
            </div>

            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {upcomingSessions.length > 0 ? (
                upcomingSessions.slice(0, 5).map((session) => (
                  <Link
                    key={session.id}
                    href={`/appointments/${session.id}`}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-center space-x-2">
                      <div className="flex-shrink-0">
                        <div className="w-14 h-14 rounded-lg bg-violet-100 dark:bg-violet-900/50 flex items-center text-center justify-center">
                          <span className="text-lg font-medium opacity-75 text-violet-700 dark:text-violet-300">
                            {new Date(session.date).toLocaleDateString(
                              "en-US",
                              { weekday: "short" }
                            )}
                            <br />
                            <span className="text-xs opacity-60">
                              {new Date(session.date).toLocaleDateString(
                                "en-US",
                                { month: "short", day: "numeric" }
                              )}
                            </span>
                          </span>
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {session.start_time} - {session.end_time}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {session.speciality?.short_name ||
                            session.speciality?.name}{" "}
                          with {session.team?.name || "Unassigned"}
                        </p>
                      </div>
                    </div>
                    <span
                      className={cn(
                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize",
                        statusColors[session.status]
                      )}
                    >
                      {session.status.replace("_", " ")}
                    </span>
                  </Link>
                ))
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                  No upcoming sessions
                </p>
              )}
            </div>
          </div>

          {/* Recent Unit Transactions Card */}
          <UnitTransactionsSection transactions={client.unit_transactions || []} />
        </div>
      </div>

      {/* Full Width Sections - NEMT & Reports */}
      <div className="space-y-6">
        {/* NEMT Broker Assignment Card */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              NEMT Broker Assignment
            </h2>
            <button
              onClick={() => setShowBrokerModal(true)}
              disabled={isInactive}
              className={cn(
                "inline-flex items-center px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors",
                isInactive
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-violet-600 hover:bg-violet-700 dark:bg-violet-500 dark:hover:bg-violet-600"
              )}
            >
              <Users className="w-4 h-4 mr-2" />
              Manage Broker
            </button>
          </div>
          <div className="px-6 py-4">
            {client.nemt_broker ? (
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">
                    {client.nemt_broker.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {client.nemt_broker.phone &&
                      `Phone: ${client.nemt_broker.phone}`}
                    {client.nemt_broker.email &&
                      ` • ${client.nemt_broker.email}`}
                  </p>
                </div>
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-violet-100 dark:bg-violet-900/50 text-violet-800 dark:text-violet-300">
                  Primary
                </span>
              </div>
            ) : (
              <div className="text-center py-4">
                <Truck className="w-10 h-10 mx-auto text-gray-400 dark:text-gray-500 mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No broker assigned to this client.
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Assign a broker to enable NEMT requests.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Transportation Requests Section */}
        <TransportationRequestsSection client={client} />

        {/* DSHS Reports Section */}
        <DSHSReportsSection
          client={client}
          isAdmin={true}
          currentUserName="Admin"
        />

        {/* Goals & Tasks Card - Only show if feature is enabled */}
        {clientGoalsEnabled && (
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-violet-100 dark:bg-violet-900/30 rounded-lg">
                    <Target className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      Goals & Tasks
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Manage client goals and track progress
                    </p>
                  </div>
                </div>
                <button
                  disabled={isInactive}
                  onClick={() => {
                    // TODO: Implement goals modal
                    alert(
                      "Goals functionality coming soon. This will allow you to create and track client goals."
                    );
                  }}
                  className={cn(
                    "inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg text-white transition-colors",
                    isInactive
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-violet-600 hover:bg-violet-700 dark:bg-violet-500 dark:hover:bg-violet-600"
                  )}
                >
                  <Target className="w-4 h-4 mr-1.5" />
                  Add Goal
                </button>
              </div>
            </div>
            <div className="px-6 py-4">
              {/* Goals Coming Soon Placeholder */}
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-3" />
                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  No Goals Yet
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Create goals to track client progress and assign tasks to
                  appointments.
                </p>
                <button
                  disabled={isInactive}
                  onClick={() => {
                    // TODO: Implement goals modal
                    alert(
                      "Goals functionality coming soon. This will allow you to create and track client goals."
                    );
                  }}
                  className={cn(
                    "mt-4 inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg border transition-colors",
                    isInactive
                      ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                      : "text-violet-700 dark:text-violet-200 bg-violet-50 dark:bg-violet-900/50 border-violet-200 dark:border-violet-700 hover:bg-violet-100 dark:hover:bg-violet-900"
                  )}
                >
                  <Target className="w-4 h-4 mr-2" />
                  Create First Goal
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Client Modal */}
      <ClientModal
        isOpen={showClientModal}
        onClose={() => setShowClientModal(false)}
        client={client as ClientWithDetails}
        onSuccess={() => {
          refetch();
          setShowClientModal(false);
        }}
      />

      {/* NEMT Broker Modal */}
      <NEMTBrokerModal
        isOpen={showBrokerModal}
        onClose={() => setShowBrokerModal(false)}
        clientId={clientId}
        currentBrokerId={client.nemt_broker?.id}
        availableBrokers={client.available_nemt_brokers || []}
        onSuccess={() => {
          refetch();
          setShowBrokerModal(false);
        }}
      />
    </div>
  );
}
