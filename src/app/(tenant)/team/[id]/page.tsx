"use client";

import { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  useTeamMember,
  useDeactivateTeamMember,
  useReactivateTeamMember,
  useTeamDocuments,
  useTeamNotes,
  useAddNote,
  useDeleteNote,
  useTeamTimeLogs,
  useTeamActivities,
  useCreateActivity,
  useDeleteActivity,
  useTeamAchievements,
  useTeamWarnings,
  useTeamScheduleRequests,
} from "@/hooks/useTeam";
import { useTeamAppointments } from "@/hooks/useAppointments";
import { cn, formatDate } from "@/lib/utils";
import {
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  Edit,
  Play,
  X,
  Plus,
  Trash2,
  DollarSign,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Clock,
  Award,
  AlertCircle,
  CheckCircle,
  Shield,
  FileText,
  MessageSquare,
  Wallet,
  CalendarClock,
  Activity,
  Trophy,
  AlertTriangle,
  User,
  Briefcase,
  Settings,
  Globe,
  Upload,
  File,
  Download,
} from "lucide-react";
import type { AppointmentStatus, TeamMember, Appointment } from "@/types";

type MainTab =
  | "schedule"
  | "documents"
  | "notes"
  | "wages"
  | "schedule_requests"
  | "activities"
  | "achievements"
  | "warnings";
type AppointmentTab =
  | "upcoming"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "no_show";

const DAYS_OF_WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  fr: "French",
  de: "German",
  es: "Spanish",
  it: "Italian",
  pt: "Portuguese",
  nl: "Dutch",
  pl: "Polish",
  zh: "Chinese",
  ja: "Japanese",
  ko: "Korean",
  hi: "Hindi",
  ar: "Arabic",
  he: "Hebrew",
  tr: "Turkish",
  ru: "Russian",
  vi: "Vietnamese",
  th: "Thai",
  tl: "Tagalog",
  so: "Somali",
};

const appointmentStatusColors: Record<
  AppointmentStatus,
  { bg: string; text: string }
> = {
  scheduled: {
    bg: "bg-violet-100 dark:bg-violet-900/50",
    text: "text-violet-800 dark:text-violet-300",
  },
  in_progress: {
    bg: "bg-blue-100 dark:bg-blue-900/50",
    text: "text-blue-800 dark:text-blue-300",
  },
  completed: {
    bg: "bg-green-100 dark:bg-green-900/50",
    text: "text-green-800 dark:text-green-300",
  },
  cancelled: {
    bg: "bg-red-100 dark:bg-red-900/50",
    text: "text-red-800 dark:text-red-300",
  },
  no_show: {
    bg: "bg-yellow-100 dark:bg-yellow-900/50",
    text: "text-yellow-800 dark:text-yellow-300",
  },
  pending: {
    bg: "bg-gray-100 dark:bg-gray-800",
    text: "text-gray-600 dark:text-gray-400",
  },
  confirmed: {
    bg: "bg-blue-100 dark:bg-blue-900/50",
    text: "text-blue-800 dark:text-blue-300",
  },
  unassigned: {
    bg: "bg-orange-100 dark:bg-orange-900/50",
    text: "text-orange-800 dark:text-orange-300",
  },
  late: {
    bg: "bg-amber-100 dark:bg-amber-900/50",
    text: "text-amber-800 dark:text-amber-300",
  },
  rejected: {
    bg: "bg-red-100 dark:bg-red-900/50",
    text: "text-red-800 dark:text-red-300",
  },
  terminated_by_client: {
    bg: "bg-orange-100 dark:bg-orange-900/50",
    text: "text-orange-800 dark:text-orange-300",
  },
  terminated_by_staff: {
    bg: "bg-orange-100 dark:bg-orange-900/50",
    text: "text-orange-800 dark:text-orange-300",
  },
  deleted: {
    bg: "bg-gray-100 dark:bg-gray-800",
    text: "text-gray-600 dark:text-gray-400",
  },
};

function formatTime(timeStr: string): string {
  if (!timeStr) return "";
  try {
    let date;
    // If string looks like an ISO datetime, use as is
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(timeStr)) {
      date = new Date(timeStr);
    } else {
      // Otherwise, treat as time only (for legacy usage)
      date = new Date(`2000-01-01T${timeStr}`);
    }
    if (isNaN(date.getTime())) return timeStr;
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return timeStr;
  }
}

function formatDateTime(dateStr: string): string {
  if (!dateStr) return "";
  try {
    // Handle ISO date only (YYYY-MM-DD) by appending T00:00
    const isoDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
    const dateObj = isoDateOnly
      ? new Date(dateStr + "T00:00:00Z")
      : new Date(dateStr);

    if (isNaN(dateObj.getTime())) return dateStr;

    return dateObj.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function formatTimeFromDate(dateStr: string): string {
  if (!dateStr) return "";
  try {
    // If just a time, treat as 2000-01-01T... for legacy
    let date;
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(dateStr)) {
      // ISO with time
      date = new Date(dateStr);
    } else if (/^\d{2}:\d{2}/.test(dateStr)) {
      // HH:mm or HH:mm:ss format
      date = new Date(`2000-01-01T${dateStr}`);
    } else {
      // fallback, try as date
      date = new Date(dateStr);
    }
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return dateStr;
  }
}

export default function TeamMemberProfilePage() {
  const params = useParams();
  const router = useRouter();
  const memberId = Number(params.id);

  const [activeTab, setActiveTab] = useState<MainTab>("schedule");
  const [appointmentTab, setAppointmentTab] =
    useState<AppointmentTab>("upcoming");
  const [showEarningsDropdown, setShowEarningsDropdown] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState("");
  const [selectedPayPeriod, setSelectedPayPeriod] = useState<string | null>(
    null
  );
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [newActivity, setNewActivity] = useState<{
    title: string;
    type: "training" | "meeting" | "administrative" | "other";
    start_time: string;
    end_time: string;
    location_type: string;
    notes: string;
  }>({
    title: "",
    type: "training",
    start_time: "",
    end_time: "",
    location_type: "",
    notes: "",
  });
  const [expandedAchievementType, setExpandedAchievementType] = useState<
    string | null
  >(null);

  const { data: member, isLoading, error } = useTeamMember(memberId);
  const { data: appointmentsData } = useTeamAppointments(memberId);
  const { data: documents } = useTeamDocuments(memberId);
  const { data: notes } = useTeamNotes(memberId);
  const { data: timeLogsData } = useTeamTimeLogs(memberId, {
    year: new Date().getFullYear(),
  });
  const { data: activities } = useTeamActivities(memberId);
  const { data: achievementsData } = useTeamAchievements(memberId);
  const { data: warnings } = useTeamWarnings(memberId);
  const { data: scheduleRequests } = useTeamScheduleRequests(memberId);

  const deactivateMutation = useDeactivateTeamMember();
  const reactivateMutation = useReactivateTeamMember();
  const addNoteMutation = useAddNote();
  const deleteNoteMutation = useDeleteNote();
  const createActivityMutation = useCreateActivity();
  const deleteActivityMutation = useDeleteActivity();

  // Get selected period data - auto-select current period if none selected
  const currentPeriodData = useMemo(() => {
    if (!timeLogsData) return null;

    // If a period is explicitly selected, use that
    if (selectedPayPeriod) {
      return (
        timeLogsData.pay_periods?.find(
          (p) => p.start_date === selectedPayPeriod
        ) ||
        timeLogsData.current_period ||
        null
      );
    }

    // Otherwise, default to current period
    return timeLogsData.current_period || null;
  }, [selectedPayPeriod, timeLogsData]);

  // Filter out future pay periods - only show current and past
  const filteredPayPeriods = useMemo(() => {
    if (!timeLogsData?.pay_periods) return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return timeLogsData.pay_periods.filter((period) => {
      // Always include the current period
      if (period.current) return true;

      // Include past periods (start_date is on or before today)
      const periodStart = new Date(period.start_date);
      return periodStart <= today;
    });
  }, [timeLogsData?.pay_periods]);

  // Get logs for selected period
  const filteredTimeLogs = useMemo(() => {
    return currentPeriodData?.logs || [];
  }, [currentPeriodData]);

  // Group appointments by status
  const groupedAppointments = useMemo(() => {
    const appointments = appointmentsData?.data || [];
    return {
      upcoming: appointments.filter(
        (a) =>
          a.status === "scheduled" ||
          a.status === "confirmed" ||
          a.status === "pending"
      ),
      in_progress: appointments.filter((a) => a.status === "in_progress"),
      completed: appointments.filter((a) => a.status === "completed"),
      cancelled: appointments.filter(
        (a) => a.status === "cancelled" || a.status === "rejected"
      ),
      no_show: appointments.filter((a) => a.status === "no_show"),
    };
  }, [appointmentsData]);

  const handleDeactivate = async () => {
    if (confirm("Are you sure you want to deactivate this team member?")) {
      await deactivateMutation.mutateAsync(memberId);
    }
  };

  const handleAddNote = async () => {
    if (!newNoteContent.trim()) return;
    try {
      await addNoteMutation.mutateAsync({
        teamId: memberId,
        data: { content: newNoteContent },
      });
      setNewNoteContent("");
    } catch (error) {
      console.error("Failed to add note:", error);
    }
  };

  const handleDeleteNote = async (noteId: number) => {
    if (confirm("Are you sure you want to delete this note?")) {
      await deleteNoteMutation.mutateAsync({ teamId: memberId, noteId });
    }
  };

  const handleCreateActivity = async () => {
    if (!newActivity.title || !newActivity.start_time || !newActivity.end_time)
      return;
    try {
      await createActivityMutation.mutateAsync({
        teamId: memberId,
        data: newActivity,
      });
      setShowActivityModal(false);
      setNewActivity({
        title: "",
        type: "training",
        start_time: "",
        end_time: "",
        location_type: "",
        notes: "",
      });
    } catch (error) {
      console.error("Failed to create activity:", error);
    }
  };

  const handleDeleteActivity = async (activityId: number) => {
    if (confirm("Are you sure you want to delete this activity?")) {
      await deleteActivityMutation.mutateAsync({
        teamId: memberId,
        activityId,
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDateShort = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const getActivityTypeColor = (type: string) => {
    switch (type) {
      case "training":
        return "bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300";
      case "meeting":
        return "bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300";
      case "administrative":
        return "bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300";
      default:
        return "bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-300";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled":
        return "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300";
      case "completed":
        return "bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300";
      case "cancelled":
        return "bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300";
      case "approved":
        return "bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300";
      case "pending":
        return "bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300";
      case "rejected":
        return "bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300";
      default:
        return "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400";
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "low":
        return "bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300";
      case "medium":
        return "bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-300";
      case "high":
        return "bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300";
      default:
        return "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
      </div>
    );
  }

  if (error || !member) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
          <div>
            <h3 className="font-medium text-red-800 dark:text-red-200">
              Team member not found
            </h3>
            <p className="text-sm text-red-600 dark:text-red-400 mt-1">
              The team member you&apos;re looking for doesn&apos;t exist or you
              don&apos;t have access.
            </p>
          </div>
        </div>
        <Link
          href="/team"
          className="mt-4 inline-flex items-center gap-2 text-sm text-red-600 dark:text-red-400 hover:underline"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to team
        </Link>
      </div>
    );
  }

  const getInitials = () =>
    member.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const statusStyles = {
    active: {
      bg: "bg-green-100 dark:bg-green-900",
      text: "text-green-800 dark:text-green-200",
    },
    on_leave: {
      bg: "bg-yellow-100 dark:bg-yellow-900",
      text: "text-yellow-800 dark:text-yellow-200",
    },
    inactive: {
      bg: "bg-yellow-100 dark:bg-yellow-900",
      text: "text-yellow-800 dark:text-yellow-200",
    },
    terminated: {
      bg: "bg-red-100 dark:bg-red-900",
      text: "text-red-800 dark:text-red-200",
    },
  };

  const currentStatus =
    statusStyles[member.status as keyof typeof statusStyles] ||
    statusStyles.active;
  const isTerminated = member.status === "terminated";
  const hasInProgressAppointment = groupedAppointments.in_progress.length > 0;

  const tabs: { id: MainTab; label: string; icon: React.ElementType }[] = [
    { id: "schedule", label: "Schedule", icon: Calendar },
    { id: "documents", label: "Documents", icon: FileText },
    { id: "notes", label: "Notes", icon: MessageSquare },
    { id: "wages", label: "Wages & Hours", icon: Wallet },
    {
      id: "schedule_requests",
      label: "Schedule Requests",
      icon: CalendarClock,
    },
    { id: "activities", label: "Activities", icon: Activity },
    { id: "achievements", label: "Achievements", icon: Trophy },
    { id: "warnings", label: "Warnings", icon: AlertTriangle },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header Section */}
      <div className="flex flex-col bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4 md:p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          {/* Left Side - Profile Details */}
          <div className="flex items-start space-x-3 sm:space-x-4">
            {/* Profile Picture */}
            <div className="relative flex-shrink-0">
              <div className="h-14 w-14 sm:h-16 sm:w-16 md:h-20 md:w-20 rounded-full bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center">
                {member.avatar ? (
                  <img
                    src={member.avatar}
                    alt={member.name}
                    className="h-14 w-14 sm:h-16 sm:w-16 md:h-20 md:w-20 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-lg sm:text-xl md:text-2xl font-medium text-violet-700 dark:text-violet-300">
                    {getInitials()}
                  </span>
                )}
              </div>
            </div>

            {/* Name and Details */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100 truncate">
                  {member.name}
                </h1>
                {/* Active Appointment Indicator */}
                {!isTerminated && hasInProgressAppointment && (
                  <div className="relative inline-flex items-center">
                    <div className="flex items-center bg-violet-100 dark:bg-violet-900/50 text-violet-800 dark:text-violet-300 text-xs sm:text-sm px-1.5 sm:px-2 py-0.5 rounded-full">
                      <span className="flex h-2 w-2 mr-1">
                        <span className="animate-pulse relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                      </span>
                      <span className="ml-1 mr-1 hidden sm:inline">
                        With A Client
                      </span>
                      <span className="ml-1 mr-1 sm:hidden">Active</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-1 text-xs sm:text-sm text-gray-500 dark:text-gray-400 space-y-0.5">
                <div className="truncate">
                  {member.position || "No position set"}
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                  <span>
                    ID: <span>{member.employee_id || "N/A"}</span>
                  </span>
                  <span className="hidden sm:inline">|</span>
                  <span>@{member.username || "N/A"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Actions */}
          <div className="flex flex-col gap-2 sm:gap-3 w-full lg:w-auto">
            {/* Top Row: Edit Profile */}
            <div className="flex flex-row gap-2 sm:gap-3">
              <Link
                href={`/team/${member.id}/edit`}
                className="flex-1 lg:flex-none inline-flex items-center justify-center px-3 sm:px-4 py-2 bg-violet-600 dark:bg-violet-500 hover:bg-violet-700 dark:hover:bg-violet-600 text-white text-xs sm:text-sm font-medium rounded-lg transition-colors"
              >
                <Edit className="w-4 h-4 mr-1.5 sm:hidden" />
                <span className="hidden sm:inline">Edit Profile</span>
                <span className="sm:hidden">Edit</span>
              </Link>
            </div>

            {/* Clock In/Out Section */}
            {!isTerminated && (
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                {/* Clock In/Out Button */}
                <button
                  className={cn(
                    "flex-1 sm:flex-none inline-flex items-center justify-center px-3 sm:px-4 py-2 text-white text-xs sm:text-sm font-medium rounded-lg transition-colors shadow",
                    hasInProgressAppointment
                      ? "bg-red-600 dark:bg-red-500 hover:bg-red-700 dark:hover:bg-red-600"
                      : "bg-green-600 dark:bg-green-500 hover:bg-green-700 dark:hover:bg-green-600"
                  )}
                >
                  {hasInProgressAppointment ? (
                    <X className="w-4 h-4 mr-1" />
                  ) : (
                    <Play className="w-4 h-4 mr-1" />
                  )}
                  <span>
                    {hasInProgressAppointment ? "Clock Out" : "Clock In"}
                  </span>
                </button>

                {/* Earnings Summary Dropdown */}
                <div className="relative flex-1 sm:flex-none">
                  <button
                    onClick={() =>
                      setShowEarningsDropdown(!showEarningsDropdown)
                    }
                    className="w-full sm:w-auto inline-flex items-center justify-center px-3 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs sm:text-sm font-medium rounded-lg transition-colors"
                  >
                    <DollarSign className="w-4 h-4 sm:mr-1" />
                    <span className="hidden sm:inline">Earnings</span>
                    <ChevronDown className="w-4 h-4 ml-1" />
                  </button>
                  {showEarningsDropdown && (
                    <div
                      className="absolute right-0 sm:right-0 left-0 sm:left-auto mt-2 w-full sm:w-48 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 z-50"
                      onClick={() => setShowEarningsDropdown(false)}
                    >
                      <div className="py-1">
                        <div className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">
                          <div>Total Hours: {member.total_hours || "0"}</div>
                          <div>
                            Total Wages: ${member.total_wages || "0.00"}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Profile Grid - Two Columns */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Basic Info */}
        <div className="lg:col-span-1">
          <div className="flex flex-col bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
            {/* Contact Information */}
            <div className="px-4 sm:px-6 py-4">
              <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">
                Contact Information
              </h3>
              <div className="space-y-3">
                {member.phone && (
                  <div className="flex items-center">
                    <Phone className="mr-3 h-5 w-5 text-gray-400 dark:text-gray-500" />
                    <span className="text-gray-600 dark:text-gray-400">
                      {member.phone}
                    </span>
                  </div>
                )}
                {member.email && (
                  <div className="flex items-center">
                    <Mail className="mr-3 h-5 w-5 text-gray-400 dark:text-gray-500" />
                    <span className="text-gray-600 dark:text-gray-400">
                      {member.email}
                    </span>
                  </div>
                )}
                {member.address && (
                  <div className="flex items-start">
                    <MapPin className="mr-3 h-5 w-5 text-gray-400 dark:text-gray-500 mt-0.5" />
                    <span className="text-gray-600 dark:text-gray-400 text-sm">
                      {[
                        member.address.street,
                        member.address.city,
                        member.address.state,
                        member.address.zip,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </span>
                  </div>
                )}
                {member.hire_date && (
                  <div className="flex items-center">
                    <Calendar className="mr-3 h-5 w-5 text-gray-400 dark:text-gray-500" />
                    <span className="text-gray-400 dark:text-gray-500">
                      Joined:{" "}
                    </span>
                    <span className="text-gray-600 dark:text-gray-400 ml-1">
                      {formatDate(member.hire_date)}
                    </span>
                  </div>
                )}
                {member.date_of_birth && (
                  <div className="flex items-center">
                    <Clock className="mr-3 h-5 w-5 text-gray-400 dark:text-gray-500" />
                    <span className="text-gray-400 dark:text-gray-500">
                      Date of Birth:{" "}
                    </span>
                    <span className="text-gray-600 dark:text-gray-400 ml-1">
                      {formatDate(member.date_of_birth)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="px-4 sm:px-6 py-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Weekly Hours
                  </p>
                  <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-gray-100">
                    {member.preferences?.max_weekly_hours || 0}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Service Areas
                  </p>
                  <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-gray-100">
                    {member.preferences?.service_areas?.length || 0}
                  </p>
                </div>
              </div>

              {/* App Version Info */}
              {member.app_version && (
                <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-center space-x-2">
                    <span
                      className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
                        "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      )}
                    >
                      v{member.app_version}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-center text-gray-400 dark:text-gray-500">
                    {member.device_type === "ios"
                      ? "iOS"
                      : member.device_type === "android"
                      ? "Android"
                      : "Mobile App"}
                  </p>
                </div>
              )}
            </div>

            {/* Employment Information */}
            <div className="bg-white dark:bg-gray-900 shadow rounded-lg p-4 sm:p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">
                  Employment Information
                </h3>
              </div>

              {/* Job Application */}
              {member.job_application && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-400 dark:text-gray-400">Applied:</span>
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        {new Date(member.job_application.created_at).toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                  <a
                    href={`/recruitment/applications/${member.job_application.id}`}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors duration-150 ease-in-out"
                  >
                    &rarr;
                  </a>
                </div>
              )}

              {/* Employment Status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-400 dark:text-gray-400">
                    Status:
                  </span>
                  <span
                    className={cn(
                      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium uppercase",
                      currentStatus.bg,
                      currentStatus.text
                    )}
                  >
                    {String(member.status).replace("_", " ")}
                  </span>
                </div>
              </div>

              {/* Vaccination Status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-400 dark:text-gray-400">
                    Vaccination:
                  </span>
                  {member.vaccinated ? (
                    <span title="Vaccinated">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    </span>
                  ) : (
                    <span title="Not Vaccinated">
                      <AlertCircle className="h-5 w-5 text-gray-400" />
                    </span>
                  )}
                </div>
              </div>

              {/* Position */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-400 dark:text-gray-400">
                    Position:
                  </span>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {member.position || "N/A"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Details */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          {/* Specialties Card */}
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">
                Specialties
              </h2>
            </div>
            <div className="px-4 sm:px-6 py-4 sm:py-8">
              <div className="flex flex-wrap gap-2 sm:gap-4">
                {member.specialities && member.specialities.length > 0 ? (
                  member.specialities.map((specialty) => (
                    <Link
                      key={specialty.id}
                      href={`/specialities/${specialty.id}`}
                      className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium border border-violet-300 dark:border-violet-500 bg-violet-100 dark:bg-violet-900/50 text-violet-800 dark:text-violet-300 hover:bg-violet-200 dark:hover:bg-violet-800 transition-colors"
                    >
                      {specialty.short_name || specialty.name}
                    </Link>
                  ))
                ) : (
                  <p className="text-gray-500 dark:text-gray-400">
                    No specialties assigned
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Working Schedule Card */}
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">
                Working Schedule
              </h2>
            </div>
            <div className="px-4 sm:px-6 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
                {DAYS_OF_WEEK.map((day) => {
                  const dayKey = day.toLowerCase();
                  const schedule = member.working_hours?.[dayKey];
                  const isActive = schedule?.enabled;
                  return (
                    <div
                      key={day}
                      className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800"
                    >
                      <div className="flex-1">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {day}
                        </span>
                        {isActive ? (
                          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            <span>
                              {formatTime(schedule?.start_time || "")}
                            </span>
                            <span className="mx-1">-</span>
                            <span>{formatTime(schedule?.end_time || "")}</span>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                            Off
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Preferences Card */}
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">
                Preferences & Settings
              </h2>
            </div>
            <div className="px-4 sm:px-6 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                {/* Languages */}
                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Languages
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {member.preferences?.languages &&
                    member.preferences.languages.length > 0 ? (
                      member.preferences.languages.map((lang) => (
                        <span
                          key={lang}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300"
                        >
                          {LANGUAGE_NAMES[lang] || lang}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        Not specified
                      </span>
                    )}
                  </div>
                </div>

                {/* Service Areas */}
                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Service Areas
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {member.preferences?.service_areas &&
                    member.preferences.service_areas.length > 0 ? (
                      member.preferences.service_areas.map((area) => (
                        <span
                          key={area}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300"
                        >
                          {area}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        Not specified
                      </span>
                    )}
                  </div>
                </div>

                {/* Client Preferences */}
                {member.preferences?.client_preferences && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                      Client Preferences
                    </h3>
                    <div className="space-y-2">
                      {member.preferences.client_preferences
                        .gender_preference && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Gender Preference:{" "}
                          <span className="font-medium capitalize">
                            {
                              member.preferences.client_preferences
                                .gender_preference
                            }
                          </span>
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Schedule Preferences */}
                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Schedule Preferences
                  </h3>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Maximum Weekly Hours:{" "}
                      <span className="font-medium">
                        {member.preferences?.max_weekly_hours || "Not set"}
                      </span>
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Maximum Travel Distance:{" "}
                      <span className="font-medium">
                        {member.preferences?.max_travel_distance || "Not set"}
                      </span>{" "}
                      miles
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Tabs */}
      <div className="hidden sm:block border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-4 lg:space-x-8 overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2",
                activeTab === tab.id
                  ? "border-violet-500 text-violet-600 dark:text-violet-400"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "schedule" && (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">
              Appointments
            </h2>
          </div>
          <div className="px-4 sm:px-6 py-4">
            {/* Appointment Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-4 mb-6">
              <div className="bg-violet-50 dark:bg-violet-900/50 rounded-lg p-3 sm:p-4">
                <p className="text-xs sm:text-sm font-medium text-violet-600 dark:text-violet-400">
                  Upcoming
                </p>
                <p className="mt-1 sm:mt-2 text-xl sm:text-2xl font-semibold text-violet-900 dark:text-violet-100">
                  {groupedAppointments.upcoming.length}
                </p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/50 rounded-lg p-3 sm:p-4">
                <p className="text-xs sm:text-sm font-medium text-blue-600 dark:text-blue-400">
                  In Progress
                </p>
                <p className="mt-1 sm:mt-2 text-xl sm:text-2xl font-semibold text-blue-900 dark:text-blue-100">
                  {groupedAppointments.in_progress.length}
                </p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/50 rounded-lg p-3 sm:p-4">
                <p className="text-xs sm:text-sm font-medium text-green-600 dark:text-green-400">
                  Completed
                </p>
                <p className="mt-1 sm:mt-2 text-xl sm:text-2xl font-semibold text-green-900 dark:text-green-100">
                  {groupedAppointments.completed.length}
                </p>
              </div>
              <div className="bg-red-50 dark:bg-red-900/50 rounded-lg p-3 sm:p-4">
                <p className="text-xs sm:text-sm font-medium text-red-600 dark:text-red-400">
                  Cancelled
                </p>
                <p className="mt-1 sm:mt-2 text-xl sm:text-2xl font-semibold text-red-900 dark:text-red-100">
                  {groupedAppointments.cancelled.length}
                </p>
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-900/50 rounded-lg p-3 sm:p-4 col-span-2 sm:col-span-1">
                <p className="text-xs sm:text-sm font-medium text-yellow-600 dark:text-yellow-400">
                  No Show
                </p>
                <p className="mt-1 sm:mt-2 text-xl sm:text-2xl font-semibold text-yellow-900 dark:text-yellow-100">
                  {groupedAppointments.no_show.length}
                </p>
              </div>
            </div>

            {/* Appointment Tabs */}
            <div className="hidden sm:block border-b border-gray-200 dark:border-gray-700 mb-4">
              <nav className="-mb-px flex space-x-4 lg:space-x-8 overflow-x-auto scrollbar-hide">
                {(
                  [
                    "upcoming",
                    "in_progress",
                    "completed",
                    "cancelled",
                    "no_show",
                  ] as AppointmentTab[]
                ).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setAppointmentTab(tab)}
                    className={cn(
                      "whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors",
                      appointmentTab === tab
                        ? "border-violet-500 text-violet-600 dark:text-violet-400"
                        : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                    )}
                  >
                    <span className="capitalize">{tab.replace("_", " ")}</span>
                    <span className="ml-2 rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs">
                      {groupedAppointments[tab].length}
                    </span>
                  </button>
                ))}
              </nav>
            </div>

            {/* Mobile Select */}
            <div className="sm:hidden mb-4">
              <select
                value={appointmentTab}
                onChange={(e) =>
                  setAppointmentTab(e.target.value as AppointmentTab)
                }
                className="block w-full rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 py-2.5 pl-3 pr-10 text-base focus:border-violet-500 focus:ring-violet-500"
              >
                <option value="upcoming">
                  Upcoming ({groupedAppointments.upcoming.length})
                </option>
                <option value="in_progress">
                  In Progress ({groupedAppointments.in_progress.length})
                </option>
                <option value="completed">
                  Completed ({groupedAppointments.completed.length})
                </option>
                <option value="cancelled">
                  Cancelled ({groupedAppointments.cancelled.length})
                </option>
                <option value="no_show">
                  No Show ({groupedAppointments.no_show.length})
                </option>
              </select>
            </div>

            {/* Appointment List */}
            <div className="space-y-3">
              {groupedAppointments[appointmentTab].length > 0 ? (
                groupedAppointments[appointmentTab].map((appointment) => (
                  <div
                    key={appointment.id}
                    className="bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors p-4 rounded-lg shadow-sm border border-gray-100 dark:border-gray-800"
                  >
                    <div className="text-xs text-gray-400 dark:text-gray-500 mb-2">
                      <Link
                        href={`/appointments/${appointment.id}`}
                        className="hover:text-violet-600 dark:hover:text-violet-400"
                      >
                        #{appointment.id}
                      </Link>
                    </div>
                    <div className="flex justify-between items-start">
                      <div>
                        {/* Client Name */}
                        <Link
                          href={`/clients/${appointment.client?.id}`}
                          className="text-sm font-medium text-violet-600 dark:text-violet-400 hover:text-violet-800 dark:hover:text-violet-300"
                        >
                          {appointment.client?.full_name ||
                            appointment.client?.user?.name ||
                            "Client"}
                        </Link>

                        {/* Date and Time */}
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          <Link
                            href={`/appointments/${appointment.id}`}
                            className="hover:text-violet-600 dark:hover:text-violet-400"
                          >
                            <span>
                              {formatDateTime(
                                appointment.start_time || appointment.date
                              )}
                            </span>
                            <span className="mx-1">•</span>
                            <span>
                              {formatTimeFromDate(
                                appointment.start_time ||
                                  `${appointment.date}T${
                                    appointment.scheduled_start || "00:00"
                                  }`
                              )}
                            </span>
                            <span className="mx-1">-</span>
                            <span>
                              {formatTimeFromDate(
                                appointment.end_time ||
                                  `${appointment.date}T${
                                    appointment.scheduled_end || "00:00"
                                  }`
                              )}
                            </span>
                          </Link>
                        </p>

                        {/* Location */}
                        {appointment.address && (
                          <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mt-2">
                            <MapPin className="h-4 w-4 mr-1" />
                            <span className="ml-1">
                              {[
                                appointment.address.street,
                                appointment.address.city,
                                appointment.address.state,
                                appointment.address.zip,
                              ]
                                .filter(Boolean)
                                .join(", ")}
                            </span>
                          </div>
                        )}

                        {/* Units Required */}
                        {appointment.units_required && (
                          <p className="text-xs text-violet-600 dark:text-violet-400 mt-2">
                            Units Required: {appointment.units_required}
                          </p>
                        )}
                      </div>

                      {/* Status Badge */}
                      <div className="flex flex-col items-end space-y-2">
                        <span
                          className={cn(
                            "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize",
                            appointmentStatusColors[appointment.status]?.bg,
                            appointmentStatusColors[appointment.status]?.text
                          )}
                        >
                          {appointment.status.replace("_", " ")}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No appointments found
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Documents Tab */}
      {activeTab === "documents" && (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">
              Documents
            </h2>
            <button className="inline-flex items-center px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors">
              <Upload className="w-4 h-4 mr-2" />
              Upload Document
            </button>
          </div>
          <div className="px-4 sm:px-6 py-4">
            {documents && documents.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden sm:table-cell">
                        Expiry
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden sm:table-cell">
                        Files
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                    {documents.map((doc) => (
                      <tr
                        key={doc.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <File className="w-5 h-5 text-gray-400 mr-2" />
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {doc.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {doc.type}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 hidden sm:table-cell">
                          {doc.expiry_date
                            ? formatDate(doc.expiry_date)
                            : "No expiry"}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 hidden sm:table-cell">
                          {doc.file_count}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <button className="text-violet-600 hover:text-violet-800 dark:text-violet-400 dark:hover:text-violet-300">
                            <Download className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No documents uploaded yet</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Notes Tab */}
      {activeTab === "notes" && (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">
              Staff Notes
            </h2>
          </div>
          <div className="px-4 sm:px-6 py-4 space-y-4">
            {/* Existing Notes */}
            {notes && notes.length > 0 ? (
              notes.map((note) => (
                <div
                  key={note.id}
                  className="border-b border-gray-200 dark:border-gray-800 pb-4"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      {note.title && (
                        <span className="font-semibold text-gray-900 dark:text-gray-100">
                          {note.title}
                        </span>
                      )}
                      <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                        {formatDate(note.created_at)}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      className="text-red-600 hover:text-red-800 dark:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {note.content}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    By: {note.created_by}
                  </p>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No notes yet</p>
              </div>
            )}

            {/* Add New Note */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <label
                htmlFor="new-note"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Add New Note
              </label>
              <textarea
                id="new-note"
                rows={3}
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm focus:border-violet-300 focus:ring focus:ring-violet-200 focus:ring-opacity-50"
                placeholder="Type your note here..."
              />
              <button
                onClick={handleAddNote}
                disabled={addNoteMutation.isPending || !newNoteContent.trim()}
                className="mt-2 inline-flex items-center px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <Plus className="mr-2 h-4 w-4" />
                {addNoteMutation.isPending ? "Adding..." : "Add Note"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Wages & Hours Tab */}
      {activeTab === "wages" && (
        <div className="space-y-6">
          {/* Current Compensation */}
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">
                Current Compensation
              </h3>
            </div>
            <div className="px-4 sm:px-6 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Base Rate
                  </div>
                  <div className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {formatCurrency(timeLogsData?.base_rate || 0)}/hr
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Overtime Rate (1.5x)
                  </div>
                  <div className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {formatCurrency(timeLogsData?.overtime_rate || 0)}/hr
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Total Hours
              </h3>
              <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                {currentPeriodData?.total_hours?.toFixed(2) || "0.00"}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Regular Hours
              </h3>
              <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                {currentPeriodData?.regular_hours?.toFixed(2) || "0.00"}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Overtime Hours
              </h3>
              <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                {currentPeriodData?.overtime_hours?.toFixed(2) || "0.00"}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Period Earnings
              </h3>
              <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                {formatCurrency(currentPeriodData?.total_earnings || 0)}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                YTD Hours
              </h3>
              <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                {timeLogsData?.ytd_totals?.hours?.toFixed(2) || "0.00"}
              </p>
            </div>
          </div>

          {/* Pay Periods */}
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">
                Pay Periods
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-600">
                <thead className="bg-gray-100 dark:bg-gray-950">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase">
                      Period
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase hidden sm:table-cell">
                      Regular
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase hidden sm:table-cell">
                      OT
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase">
                      Hours
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase hidden sm:table-cell">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayPeriods.slice(0, 10).map((period) => (
                    <tr
                      key={period.start_date}
                      className={cn(
                        "hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer",
                        currentPeriodData?.start_date === period.start_date
                          ? "bg-violet-100 dark:bg-violet-900/40"
                          : "bg-white dark:bg-gray-900"
                      )}
                      onClick={() => setSelectedPayPeriod(period.start_date)}
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        <div className="flex items-center">
                          {period.current && (
                            <span className="mr-2 h-2 w-2 rounded-full bg-green-500"></span>
                          )}
                          {formatDateShort(period.start_date)} -{" "}
                          {formatDateShort(period.end_date)}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 hidden sm:table-cell">
                        {period.regular_hours}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 hidden sm:table-cell">
                        {period.overtime_hours}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {period.total_hours}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm hidden sm:table-cell">
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-full text-xs font-bold tracking-wide",
                            period.is_approved_report
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                              : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                          )}
                        >
                          {period.is_approved_report ? "Approved" : "Pending"}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filteredPayPeriods.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-8 text-center text-gray-500 dark:text-gray-300"
                      >
                        No pay periods available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Time Logs */}
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">
                Time Log Entries
                <span className="text-sm font-normal text-gray-500 ml-2">
                  ({filteredTimeLogs?.length || 0} entries)
                </span>
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-600">
                <thead className="bg-gray-100 dark:bg-gray-950">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase hidden sm:table-cell">
                      In
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase hidden sm:table-cell">
                      Out
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase">
                      Hours
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase">
                      Type
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTimeLogs?.map((log) => (
                    <tr
                      key={log.id}
                      className="hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {formatDate(log.clock_in)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 hidden sm:table-cell">
                        {formatTimeFromDate(log.clock_in)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 hidden sm:table-cell">
                        {log.clock_out
                          ? formatTimeFromDate(log.clock_out)
                          : "-"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {typeof log.hours_worked === "number"
                          ? log.hours_worked.toFixed(2)
                          : "-"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-full text-xs font-bold tracking-wide",
                            log.type === "appointment"
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                              : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                          )}
                        >
                          {log.type}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {(!filteredTimeLogs || filteredTimeLogs.length === 0) && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-8 text-center text-gray-500 dark:text-gray-300"
                      >
                        No time logs available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Requests Tab */}
      {activeTab === "schedule_requests" && (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">
              Schedule Change Requests
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Dates
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase hidden sm:table-cell">
                    Reason
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase hidden sm:table-cell">
                    Reviewed By
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {scheduleRequests?.map((request) => (
                  <tr
                    key={request.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <td className="px-4 py-3 whitespace-nowrap text-sm capitalize">
                      {request.type}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      {request.start_date &&
                        formatDateShort(request.start_date)}
                      {request.end_date &&
                        ` - ${formatDateShort(request.end_date)}`}
                    </td>
                    <td className="px-4 py-3 text-sm hidden sm:table-cell max-w-xs truncate">
                      {request.reason}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded-full text-xs font-medium capitalize",
                          getStatusColor(request.status)
                        )}
                      >
                        {request.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm hidden sm:table-cell">
                      {request.reviewed_by || "-"}
                    </td>
                  </tr>
                ))}
                {(!scheduleRequests || scheduleRequests.length === 0) && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-gray-500 dark:text-gray-400"
                    >
                      <CalendarClock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      No schedule requests found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Activities Tab */}
      {activeTab === "activities" && (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">
              Activities
            </h2>
            <button
              onClick={() => setShowActivityModal(true)}
              className="inline-flex items-center px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Activity
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase hidden sm:table-cell">
                    Title
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase hidden sm:table-cell">
                    Time
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {activities?.map((activity) => (
                  <tr
                    key={activity.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      {formatDateShort(activity.start_time)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded-full text-xs font-medium capitalize",
                          getActivityTypeColor(activity.type)
                        )}
                      >
                        {activity.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm hidden sm:table-cell">
                      {activity.title}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm hidden sm:table-cell">
                      {formatTimeFromDate(activity.start_time)} -{" "}
                      {formatTimeFromDate(activity.end_time)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded-full text-xs font-medium capitalize",
                          getStatusColor(activity.status)
                        )}
                      >
                        {activity.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {!activity.is_in_finalized_report && (
                        <button
                          onClick={() => handleDeleteActivity(activity.id)}
                          className="text-red-600 hover:text-red-800 dark:text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {(!activities || activities.length === 0) && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-gray-500 dark:text-gray-400"
                    >
                      <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      No activities found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Achievements Tab */}
      {activeTab === "achievements" && (
        <div className="space-y-6">
          {/* Achievement Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-md bg-violet-100 dark:bg-violet-900 text-xl">
                  🏆
                </div>
                <div className="ml-4">
                  <h3 className="text-base font-medium text-gray-900 dark:text-gray-100">
                    Total Achievements
                  </h3>
                  <p className="mt-1 text-2xl font-semibold text-violet-600 dark:text-violet-400">
                    {achievementsData?.total_count || 0}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-md bg-indigo-100 dark:bg-indigo-900 text-xl">
                  {achievementsData?.team_rank &&
                  achievementsData.team_rank <= 3
                    ? ["🥇", "🥈", "🥉"][achievementsData.team_rank - 1]
                    : `#${achievementsData?.team_rank || "-"}`}
                </div>
                <div className="ml-4">
                  <h3 className="text-base font-medium text-gray-900 dark:text-gray-100">
                    Team Rank
                  </h3>
                  <p className="mt-1 text-2xl font-semibold text-indigo-600 dark:text-indigo-400">
                    {achievementsData?.team_rank || "-"} of{" "}
                    {achievementsData?.total_teams || "-"}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-md bg-green-100 dark:bg-green-900 text-xl">
                  ⭐
                </div>
                <div className="ml-4">
                  <h3 className="text-base font-medium text-gray-900 dark:text-gray-100">
                    Total Score
                  </h3>
                  <p className="mt-1 text-2xl font-semibold text-green-600 dark:text-green-400">
                    {achievementsData?.ranking_details?.total_score || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Latest Achievements */}
          {achievementsData?.achievements &&
            achievementsData.achievements.length > 0 && (
              <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
                <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Latest Achievements
                  </h3>
                </div>
                <div className="px-4 sm:px-6 py-4 space-y-4">
                  {achievementsData.achievements
                    .slice(0, 5)
                    .map((achievement) => (
                      <div
                        key={achievement.id}
                        className="bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-lg p-4"
                      >
                        <div className="flex items-start">
                          <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-md bg-violet-100 dark:bg-violet-900 text-xl">
                            {achievement.icon}
                          </div>
                          <div className="ml-4">
                            <h5 className="text-md font-medium text-violet-800 dark:text-violet-300">
                              {achievement.title}
                            </h5>
                            <p className="text-sm text-violet-700 dark:text-violet-400">
                              {achievement.description}
                            </p>
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                              Achieved {formatDate(achievement.awarded_at)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

          {/* Achievements By Type */}
          {achievementsData?.achievements_by_type &&
            Object.keys(achievementsData.achievements_by_type).length > 0 && (
              <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
                <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Achievements By Type
                  </h3>
                </div>
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {Object.entries(achievementsData.achievements_by_type).map(
                    ([type, typeAchievements]) => (
                      <div key={type} className="bg-gray-50 dark:bg-gray-800">
                        <button
                          onClick={() =>
                            setExpandedAchievementType(
                              expandedAchievementType === type ? null : type
                            )
                          }
                          className="w-full px-4 py-3 flex justify-between items-center"
                        >
                          <div className="flex items-center">
                            <span className="mr-2 text-xl">🏆</span>
                            <span className="text-base font-medium text-gray-900 dark:text-gray-100 capitalize">
                              {type.replace("_", " ")}
                            </span>
                            <span className="ml-2 text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 px-2 py-1 rounded-full">
                              {typeAchievements.length}
                            </span>
                          </div>
                          <ChevronRight
                            className={cn(
                              "h-5 w-5 text-gray-500 transition-transform",
                              expandedAchievementType === type && "rotate-90"
                            )}
                          />
                        </button>
                        {expandedAchievementType === type && (
                          <div className="px-4 pb-4 space-y-2">
                            {typeAchievements.map((achievement) => (
                              <div
                                key={achievement.id}
                                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3"
                              >
                                <div className="flex items-start">
                                  <div className="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-md bg-violet-100 dark:bg-violet-900 text-lg">
                                    {achievement.icon}
                                  </div>
                                  <div className="ml-3">
                                    <h5 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                      {achievement.title}
                                    </h5>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                      {achievement.description}
                                    </p>
                                    <p className="mt-1 text-xs text-gray-400">
                                      {formatDate(achievement.awarded_at)}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  )}
                </div>
              </div>
            )}

          {(!achievementsData?.achievements ||
            achievementsData.achievements.length === 0) && (
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <Trophy className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No achievements yet</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Warnings Tab */}
      {activeTab === "warnings" && (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">
              HR Warnings
            </h2>
          </div>
          <div className="px-4 sm:px-6 py-4">
            {warnings && warnings.length > 0 ? (
              <div className="space-y-4">
                {warnings.map((warning) => (
                  <div
                    key={warning.id}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                          {warning.title}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded-full text-xs font-medium capitalize",
                              getSeverityColor(warning.severity)
                            )}
                          >
                            {warning.severity}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                            {warning.type}
                          </span>
                        </div>
                      </div>
                      <div className="text-right text-sm text-gray-500 dark:text-gray-400">
                        <p>{formatDate(warning.issued_at)}</p>
                        <p>By: {warning.issued_by}</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                      {warning.description}
                    </p>
                    {warning.acknowledged && (
                      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Acknowledged{" "}
                          {warning.acknowledged_at &&
                            `on ${formatDate(warning.acknowledged_at)}`}
                        </span>
                        {warning.response && (
                          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 italic">
                            &#34;{warning.response}&#34;
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500 opacity-50" />
                <p>No warnings on record</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Activity Modal */}
      {showActivityModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setShowActivityModal(false)}
            ></div>
            <div className="inline-block align-bottom bg-white dark:bg-gray-900 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                  Add Activity
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Title
                    </label>
                    <input
                      type="text"
                      value={newActivity.title}
                      onChange={(e) =>
                        setNewActivity({
                          ...newActivity,
                          title: e.target.value,
                        })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 shadow-sm focus:border-violet-500 focus:ring-violet-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Type
                    </label>
                    <select
                      value={newActivity.type}
                      onChange={(e) =>
                        setNewActivity({
                          ...newActivity,
                          type: e.target.value as
                            | "training"
                            | "meeting"
                            | "administrative"
                            | "other",
                        })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 shadow-sm focus:border-violet-500 focus:ring-violet-500"
                    >
                      <option value="training">Training</option>
                      <option value="meeting">Meeting</option>
                      <option value="administrative">Administrative</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Start Time
                      </label>
                      <input
                        type="datetime-local"
                        value={newActivity.start_time}
                        onChange={(e) =>
                          setNewActivity({
                            ...newActivity,
                            start_time: e.target.value,
                          })
                        }
                        className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 shadow-sm focus:border-violet-500 focus:ring-violet-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        End Time
                      </label>
                      <input
                        type="datetime-local"
                        value={newActivity.end_time}
                        onChange={(e) =>
                          setNewActivity({
                            ...newActivity,
                            end_time: e.target.value,
                          })
                        }
                        className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 shadow-sm focus:border-violet-500 focus:ring-violet-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Notes
                    </label>
                    <textarea
                      value={newActivity.notes}
                      onChange={(e) =>
                        setNewActivity({
                          ...newActivity,
                          notes: e.target.value,
                        })
                      }
                      rows={3}
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 shadow-sm focus:border-violet-500 focus:ring-violet-500"
                    />
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  onClick={handleCreateActivity}
                  disabled={createActivityMutation.isPending}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-violet-600 text-base font-medium text-white hover:bg-violet-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                >
                  {createActivityMutation.isPending
                    ? "Creating..."
                    : "Create Activity"}
                </button>
                <button
                  onClick={() => setShowActivityModal(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-700 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
