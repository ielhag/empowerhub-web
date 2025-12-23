"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  useScheduleRequests,
  useUpdateTimeOffRequest,
  useUpdateScheduleChangeRequest,
  getTimeOffTypeLabel,
  getTimeOffTypeColor,
  type TimeOffRequest,
  type ScheduleChangeRequest,
  type RequestStatus,
} from "@/hooks/useScheduleRequests";
import {
  Clock,
  Calendar,
  Check,
  X,
  Loader2,
  AlertTriangle,
  Search,
} from "lucide-react";

// Type badge component
function TypeBadge({ type }: { type: string }) {
  const color = getTimeOffTypeColor(type as TimeOffRequest["type"]);
  const colorClasses: Record<string, string> = {
    blue: "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200",
    red: "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200",
    green: "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200",
    yellow: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200",
    orange: "bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200",
    purple: "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200",
    gray: "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200",
  };

  return (
    <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-medium", colorClasses[color] || colorClasses.gray)}>
      {getTimeOffTypeLabel(type as TimeOffRequest["type"])}
    </span>
  );
}

// Expandable reason component
function ExpandableReason({ reason }: { reason: string }) {
  const [expanded, setExpanded] = useState(false);
  const shouldTruncate = reason && reason.length > 100;

  if (!reason) return <span className="text-gray-400 dark:text-gray-500">No reason provided</span>;

  return (
    <div className="text-sm text-gray-700 dark:text-gray-300">
      {shouldTruncate && !expanded ? (
        <>
          {reason.substring(0, 100)}...
          <button onClick={() => setExpanded(true)} className="text-violet-600 dark:text-violet-400 hover:underline ml-1">
            more
          </button>
        </>
      ) : (
        <>
          {reason}
          {shouldTruncate && (
            <button onClick={() => setExpanded(false)} className="text-violet-600 dark:text-violet-400 hover:underline ml-1">
              less
            </button>
          )}
        </>
      )}
    </div>
  );
}

// Format date helper
function formatDate(dateString: string | null): string {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Format time helper
function formatTime(timeString: string | null): string {
  if (!timeString) return "N/A";
  try {
    const date = new Date(timeString);
    if (!isNaN(date.getTime())) {
      return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
    }
    const [hours, minutes] = timeString.split(":");
    const d = new Date();
    d.setHours(parseInt(hours), parseInt(minutes));
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  } catch {
    return timeString;
  }
}

// Format date range helper
function formatDateRange(startDate: string | null, endDate: string | null): string {
  if (!startDate || !endDate) return "N/A";
  const start = formatDate(startDate);
  const end = formatDate(endDate);
  return start === end ? start : `${start} - ${end}`;
}

type TabType = "time_off" | "schedule";

export default function TeamRequestsPage() {
  const [activeTab, setActiveTab] = useState<TabType>("time_off");
  const [timeOffStatus, setTimeOffStatus] = useState<RequestStatus>("pending");
  const [scheduleStatus, setScheduleStatus] = useState<RequestStatus>("pending");
  const [timeOffSearch, setTimeOffSearch] = useState("");
  const [scheduleSearch, setScheduleSearch] = useState("");
  const [timeOffPage, setTimeOffPage] = useState(1);
  const [schedulePage, setSchedulePage] = useState(1);
  const perPage = 15;

  const { data, isLoading, error } = useScheduleRequests();
  const updateTimeOff = useUpdateTimeOffRequest();
  const updateScheduleChange = useUpdateScheduleChangeRequest();

  // Filter time off requests
  const filteredTimeOffRequests = useMemo(() => {
    if (!data) return [];
    let filtered = data.time_off_requests.filter((r) => r.status === timeOffStatus);
    if (timeOffSearch.trim()) {
      const search = timeOffSearch.toLowerCase();
      filtered = filtered.filter((r) => r.team?.name?.toLowerCase().includes(search));
    }
    return filtered;
  }, [data, timeOffStatus, timeOffSearch]);

  // Filter schedule change requests
  const filteredScheduleRequests = useMemo(() => {
    if (!data) return [];
    let filtered = data.schedule_change_requests.filter((r) => r.status === scheduleStatus);
    if (scheduleSearch.trim()) {
      const search = scheduleSearch.toLowerCase();
      filtered = filtered.filter((r) => r.team?.name?.toLowerCase().includes(search));
    }
    return filtered;
  }, [data, scheduleStatus, scheduleSearch]);

  // Paginated results
  const paginatedTimeOff = useMemo(() => {
    const start = (timeOffPage - 1) * perPage;
    return filteredTimeOffRequests.slice(start, start + perPage);
  }, [filteredTimeOffRequests, timeOffPage]);

  const paginatedSchedule = useMemo(() => {
    const start = (schedulePage - 1) * perPage;
    return filteredScheduleRequests.slice(start, start + perPage);
  }, [filteredScheduleRequests, schedulePage]);

  // Status counts
  const timeOffCounts = useMemo(() => {
    if (!data) return { pending: 0, approved: 0, rejected: 0, cancelled: 0 };
    const requests = data.time_off_requests;
    return {
      pending: requests.filter((r) => r.status === "pending").length,
      approved: requests.filter((r) => r.status === "approved").length,
      rejected: requests.filter((r) => r.status === "rejected").length,
      cancelled: requests.filter((r) => r.status === "cancelled").length,
    };
  }, [data]);

  const scheduleCounts = useMemo(() => {
    if (!data) return { pending: 0, approved: 0, rejected: 0, cancelled: 0 };
    const requests = data.schedule_change_requests;
    return {
      pending: requests.filter((r) => r.status === "pending").length,
      approved: requests.filter((r) => r.status === "approved").length,
      rejected: requests.filter((r) => r.status === "rejected").length,
      cancelled: requests.filter((r) => r.status === "cancelled").length,
    };
  }, [data]);

  // Handlers
  const handleApproveTimeOff = async (id: number) => {
    if (!confirm("Are you sure you want to approve this time-off request?")) return;
    await updateTimeOff.mutateAsync({ id, payload: { status: "approved", admin_notes: "approved" } });
  };

  const handleRejectTimeOff = async (id: number) => {
    const notes = prompt("Please provide a reason for rejection:");
    if (notes === null) return;
    await updateTimeOff.mutateAsync({ id, payload: { status: "rejected", admin_notes: notes } });
  };

  const handleCancelTimeOff = async (id: number) => {
    const notes = prompt("Please provide a reason for cancellation:");
    if (notes === null) return;
    await updateTimeOff.mutateAsync({ id, payload: { status: "cancelled", admin_notes: notes } });
  };

  const handleApproveSchedule = async (id: number) => {
    if (!confirm("Are you sure you want to approve this schedule change request?")) return;
    await updateScheduleChange.mutateAsync({ id, payload: { status: "approved", admin_notes: "approved" } });
  };

  const handleRejectSchedule = async (id: number) => {
    const notes = prompt("Please provide a reason for rejection:");
    if (notes === null) return;
    await updateScheduleChange.mutateAsync({ id, payload: { status: "rejected", admin_notes: notes } });
  };

  const handleCancelSchedule = async (id: number) => {
    const notes = prompt("Please provide a reason for cancellation:");
    if (notes === null) return;
    await updateScheduleChange.mutateAsync({ id, payload: { status: "cancelled", admin_notes: notes } });
  };

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-400" />
          <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">Failed to load requests</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Please try again later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Stats */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Schedule Requests Management</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Review and manage team schedule and time-off requests.
          </p>

          {/* Quick Stats */}
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-2">
              <div className="text-xs font-medium text-yellow-800 dark:text-yellow-300">Pending Time Off</div>
              <div className="mt-0.5 text-xl font-semibold text-yellow-900 dark:text-yellow-200">
                {isLoading ? "-" : data?.stats.pending_time_off}
              </div>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-2">
              <div className="text-xs font-medium text-blue-800 dark:text-blue-300">Pending Schedule</div>
              <div className="mt-0.5 text-xl font-semibold text-blue-900 dark:text-blue-200">
                {isLoading ? "-" : data?.stats.pending_schedule}
              </div>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-2">
              <div className="text-xs font-medium text-green-800 dark:text-green-300">Total Approved</div>
              <div className="mt-0.5 text-xl font-semibold text-green-900 dark:text-green-200">
                {isLoading ? "-" : (data?.stats.approved_time_off ?? 0) + (data?.stats.approved_schedule ?? 0)}
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-700 rounded-lg p-2">
              <div className="text-xs font-medium text-gray-800 dark:text-gray-300">Total Requests</div>
              <div className="mt-0.5 text-xl font-semibold text-gray-900 dark:text-gray-200">
                {isLoading ? "-" : data?.stats.total_requests}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 rounded-lg">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-6 px-4" aria-label="Tabs">
            <button
              onClick={() => setActiveTab("time_off")}
              className={cn(
                "whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm",
                activeTab === "time_off"
                  ? "border-violet-500 text-violet-600 dark:text-violet-400"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              )}
            >
              Time Off Requests
              <span className="ml-1.5 text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-full px-2 py-0.5">
                {data?.time_off_requests.length ?? 0}
              </span>
            </button>
            <button
              onClick={() => setActiveTab("schedule")}
              className={cn(
                "whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm",
                activeTab === "schedule"
                  ? "border-violet-500 text-violet-600 dark:text-violet-400"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              )}
            >
              Schedule Changes
              <span className="ml-1.5 text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-full px-2 py-0.5">
                {data?.schedule_change_requests.length ?? 0}
              </span>
            </button>
          </nav>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
          </div>
        ) : (
          <>
            {/* Time Off Tab */}
            {activeTab === "time_off" && (
              <div>
                {/* Filters */}
                <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="flex flex-wrap gap-1.5">
                      {(["pending", "approved", "rejected", "cancelled"] as RequestStatus[]).map((status) => (
                        <button
                          key={status}
                          onClick={() => { setTimeOffStatus(status); setTimeOffPage(1); }}
                          className={cn(
                            "px-3 py-1.5 text-xs font-medium rounded-md border transition-colors",
                            timeOffStatus === status
                              ? "bg-violet-600 text-white border-violet-600"
                              : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600"
                          )}
                        >
                          {status.charAt(0).toUpperCase() + status.slice(1)} ({timeOffCounts[status]})
                        </button>
                      ))}
                    </div>
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          value={timeOffSearch}
                          onChange={(e) => { setTimeOffSearch(e.target.value); setTimeOffPage(1); }}
                          placeholder="Search by team member..."
                          className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cards */}
                <div className="p-3 space-y-2">
                  {paginatedTimeOff.length === 0 ? (
                    <div className="text-center py-12">
                      <Clock className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No requests found</h3>
                    </div>
                  ) : (
                    paginatedTimeOff.map((request) => (
                      <TimeOffCard
                        key={request.id}
                        request={request}
                        onApprove={handleApproveTimeOff}
                        onReject={handleRejectTimeOff}
                        onCancel={handleCancelTimeOff}
                        isUpdating={updateTimeOff.isPending}
                      />
                    ))
                  )}
                  {filteredTimeOffRequests.length > perPage && (
                    <Pagination currentPage={timeOffPage} totalItems={filteredTimeOffRequests.length} perPage={perPage} onPageChange={setTimeOffPage} />
                  )}
                </div>
              </div>
            )}

            {/* Schedule Tab */}
            {activeTab === "schedule" && (
              <div>
                {/* Filters */}
                <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="flex flex-wrap gap-1.5">
                      {(["pending", "approved", "rejected", "cancelled"] as RequestStatus[]).map((status) => (
                        <button
                          key={status}
                          onClick={() => { setScheduleStatus(status); setSchedulePage(1); }}
                          className={cn(
                            "px-3 py-1.5 text-xs font-medium rounded-md border transition-colors",
                            scheduleStatus === status
                              ? "bg-violet-600 text-white border-violet-600"
                              : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600"
                          )}
                        >
                          {status.charAt(0).toUpperCase() + status.slice(1)} ({scheduleCounts[status]})
                        </button>
                      ))}
                    </div>
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          value={scheduleSearch}
                          onChange={(e) => { setScheduleSearch(e.target.value); setSchedulePage(1); }}
                          placeholder="Search by team member..."
                          className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cards */}
                <div className="p-3 space-y-2">
                  {paginatedSchedule.length === 0 ? (
                    <div className="text-center py-12">
                      <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No requests found</h3>
                    </div>
                  ) : (
                    paginatedSchedule.map((request) => (
                      <ScheduleChangeCard
                        key={request.id}
                        request={request}
                        onApprove={handleApproveSchedule}
                        onReject={handleRejectSchedule}
                        onCancel={handleCancelSchedule}
                        isUpdating={updateScheduleChange.isPending}
                      />
                    ))
                  )}
                  {filteredScheduleRequests.length > perPage && (
                    <Pagination currentPage={schedulePage} totalItems={filteredScheduleRequests.length} perPage={perPage} onPageChange={setSchedulePage} />
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Time Off Card
function TimeOffCard({ request, onApprove, onReject, onCancel, isUpdating }: {
  request: TimeOffRequest;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
  onCancel: (id: number) => void;
  isUpdating: boolean;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-violet-100 dark:bg-violet-900 rounded-full flex items-center justify-center">
              <span className="text-violet-600 dark:text-violet-300 font-semibold text-sm">{request.team?.initials || "?"}</span>
            </div>
            <div>
              {request.team ? (
                <Link href={`/team/${request.team.id}`} className="font-semibold text-gray-900 dark:text-gray-100 hover:text-violet-600">
                  {request.team.name}
                </Link>
              ) : <span className="font-semibold text-gray-500">Team not found</span>}
              <div className="flex items-center gap-2 mt-1">
                <TypeBadge type={request.type} />
                <span className="text-xs text-gray-500">{request.is_full_day ? "Full Day" : "Partial Day"}</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs font-medium text-gray-500">Dates</div>
              <div className="text-sm text-gray-900 dark:text-gray-100">{formatDateRange(request.start_date, request.end_date)}</div>
            </div>
            {!request.is_full_day && (
              <div>
                <div className="text-xs font-medium text-gray-500">Time</div>
                <div className="text-sm text-gray-900 dark:text-gray-100">{formatTime(request.start_date)} - {formatTime(request.end_date)}</div>
              </div>
            )}
          </div>
          <div>
            <div className="text-xs font-medium text-gray-500 mb-1">Reason</div>
            <ExpandableReason reason={request.reason} />
          </div>
          {request.status !== "pending" && (
            <div className="text-xs text-gray-500">
              {request.status.charAt(0).toUpperCase() + request.status.slice(1)} by {request.approved_by?.name || "N/A"} on {formatDate(request.approved_at)}
            </div>
          )}
        </div>
        <div className="flex sm:flex-col gap-2">
          {request.status === "pending" && (
            <>
              <button onClick={() => onApprove(request.id)} disabled={isUpdating} className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50">
                <Check className="w-4 h-4 mr-1" /> Approve
              </button>
              <button onClick={() => onReject(request.id)} disabled={isUpdating} className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50">
                <X className="w-4 h-4 mr-1" /> Reject
              </button>
            </>
          )}
          {request.status !== "cancelled" && request.status !== "rejected" && (
            <button onClick={() => onCancel(request.id)} disabled={isUpdating} className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50">
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Schedule Change Card
function ScheduleChangeCard({ request, onApprove, onReject, onCancel, isUpdating }: {
  request: ScheduleChangeRequest;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
  onCancel: (id: number) => void;
  isUpdating: boolean;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
              <span className="text-blue-600 dark:text-blue-300 font-semibold text-sm">{request.team?.initials || "?"}</span>
            </div>
            <div>
              {request.team ? (
                <Link href={`/team/${request.team.id}`} className="font-semibold text-gray-900 dark:text-gray-100 hover:text-violet-600">
                  {request.team.name}
                </Link>
              ) : <span className="font-semibold text-gray-500">Team not found</span>}
              <div className="text-sm text-gray-500 mt-0.5">{formatDate(request.date)}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
              <div className="text-xs font-medium text-gray-500 mb-1">Current Time</div>
              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {formatTime(request.current_start_time)} - {formatTime(request.current_end_time)}
              </div>
            </div>
            <div className="bg-violet-50 dark:bg-violet-900/20 rounded-lg p-3">
              <div className="text-xs font-medium text-violet-600 dark:text-violet-400 mb-1">Requested Time</div>
              <div className="text-sm font-semibold text-violet-900 dark:text-violet-200">
                {formatTime(request.requested_start_time)} - {formatTime(request.requested_end_time)}
              </div>
            </div>
          </div>
          <div>
            <div className="text-xs font-medium text-gray-500 mb-1">Reason</div>
            <ExpandableReason reason={request.reason} />
          </div>
          {request.status !== "pending" && (
            <div className="text-xs text-gray-500">
              {request.status.charAt(0).toUpperCase() + request.status.slice(1)} by {request.approved_by?.name || "N/A"} on {formatDate(request.approved_at)}
            </div>
          )}
        </div>
        <div className="flex sm:flex-col gap-2">
          {request.status === "pending" && (
            <>
              <button onClick={() => onApprove(request.id)} disabled={isUpdating} className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50">
                <Check className="w-4 h-4 mr-1" /> Approve
              </button>
              <button onClick={() => onReject(request.id)} disabled={isUpdating} className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50">
                <X className="w-4 h-4 mr-1" /> Reject
              </button>
            </>
          )}
          {request.status !== "cancelled" && request.status !== "rejected" && (
            <button onClick={() => onCancel(request.id)} disabled={isUpdating} className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50">
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Pagination
function Pagination({ currentPage, totalItems, perPage, onPageChange }: {
  currentPage: number;
  totalItems: number;
  perPage: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.ceil(totalItems / perPage);
  return (
    <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 pt-4">
      <div className="text-sm text-gray-700 dark:text-gray-300">
        Showing {(currentPage - 1) * perPage + 1} to {Math.min(currentPage * perPage, totalItems)} of {totalItems}
      </div>
      <div className="flex gap-2">
        <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50">
          Previous
        </button>
        <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage >= totalPages} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50">
          Next
        </button>
      </div>
    </div>
  );
}
