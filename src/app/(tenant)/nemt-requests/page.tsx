"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Truck,
  Edit2,
  X,
  RotateCcw,
  Loader2,
  MapPin,
  Building,
  Users,
  CheckCircle,
  AlertTriangle,
  XCircle,
  User,
  CreditCard,
  Cake,
  type LucideIcon,
} from "lucide-react";
import {
  useNEMTRequests,
  useUpdateNEMTOccurrence,
  useCancelNEMTOccurrence,
  useRestoreNEMTOccurrence,
} from "@/hooks/useNEMTRequests";
import { cn } from "@/lib/utils";
import { format, startOfWeek, endOfWeek, addWeeks, addDays } from "date-fns";

// Types
interface NEMTRequest {
  id: number;
  client_id: number;
  client_name: string;
  client_date_of_birth?: string;
  client_providerone_id?: string;
  client_full_client_id?: string; // Full formatted client ID
  client_address?: string; // Full address
  date: string;
  day: string;
  channel: string;
  provider: string;
  destination: string;
  pickup_address?: string;
  pickup_window?: string;
  return_pickup_window?: string;
  pickup_time_from?: string;
  pickup_time_to?: string;
  return_pickup_time_from?: string;
  return_pickup_time_to?: string;
  transportation_company?: string;
  notes?: string;
  is_cancelled: boolean;
  cancellation_reason?: string;
  is_recurring: boolean;
  is_facility_paused?: boolean;
  facility_name?: string;
  status?: "confirmed" | "pending" | "cancelled";
}

// Stats Card Component
function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  color: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {label}
          </p>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
            {value}
          </p>
        </div>
        <div className={cn("p-3 rounded-lg", color)}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}

export default function NEMTRequestsPage() {
  // Track week offset (0 = current week, 1 = next week, -1 = previous week)
  const [weekOffset, setWeekOffset] = useState(0);
  // Default to today's date
  const [selectedDate, setSelectedDate] = useState<string | null>(
    format(new Date(), "yyyy-MM-dd")
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [sortColumn, setSortColumn] = useState<string>("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<NEMTRequest | null>(
    null
  );
  const [editFormData, setEditFormData] = useState({
    transportation_company: "",
    pickup_time_from: "",
    pickup_time_to: "",
    return_pickup_time_from: "",
    return_pickup_time_to: "",
    notes: "",
    update_all_future: false,
  });
  const [cancelReason, setCancelReason] = useState("");
  const [cancelAllFuture, setCancelAllFuture] = useState(false);

  // Calculate week boundaries for display (based on week offset)
  const { weekStart, weekEnd } = useMemo(() => {
    const baseDate = addWeeks(new Date(), weekOffset);
    const start = startOfWeek(baseDate, { weekStartsOn: 1 });
    const end = endOfWeek(baseDate, { weekStartsOn: 1 });
    return { weekStart: start, weekEnd: end };
  }, [weekOffset]);

  // Memoize query parameters - use weekOffset or date
  const queryParams = useMemo(() => {
    if (selectedDate) {
      return { date: selectedDate };
    }
    // Only send weekOffset if it's not 0 (current week)
    return weekOffset !== 0 ? { week_offset: weekOffset } : {};
  }, [selectedDate, weekOffset]);

  // Fetch data - keep previous data while fetching new data
  const {
    data: requests,
    isLoading,
    isFetching,
  } = useNEMTRequests(queryParams);

  // Mutations
  const updateMutation = useUpdateNEMTOccurrence();
  const cancelMutation = useCancelNEMTOccurrence();
  const restoreMutation = useRestoreNEMTOccurrence();

  // Filter and sort
  const filteredAndSortedRequests = useMemo(() => {
    if (!requests) return [];

    let filtered = requests;

    // Apply search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = requests.filter(
        (req: NEMTRequest) =>
          req.client_name?.toLowerCase().includes(term) ||
          req.provider?.toLowerCase().includes(term) ||
          req.channel?.toLowerCase().includes(term) ||
          req.destination?.toLowerCase().includes(term) ||
          req.id?.toString().includes(term)
      );
    }

    // Apply sorting
    return [...filtered].sort((a, b) => {
      const modifier = sortDirection === "asc" ? 1 : -1;
      const aVal = (a as unknown as Record<string, unknown>)[sortColumn];
      const bVal = (b as unknown as Record<string, unknown>)[sortColumn];

      if (!aVal) return 1 * modifier;
      if (!bVal) return -1 * modifier;

      if (typeof aVal === "string" && typeof bVal === "string") {
        return aVal.localeCompare(bVal) * modifier;
      }

      return 0;
    });
  }, [requests, searchTerm, sortColumn, sortDirection]);

  // Calculate stats
  const stats = useMemo(() => {
    if (!requests) return { total: 0, confirmed: 0, pending: 0, cancelled: 0 };

    return {
      total: requests.length,
      confirmed: requests.filter(
        (r) =>
          r.status === "confirmed" ||
          (r.transportation_company && r.pickup_time_from)
      ).length,
      pending: requests.filter(
        (r) =>
          !r.is_cancelled && (!r.transportation_company || !r.pickup_time_from)
      ).length,
      cancelled: requests.filter((r) => r.is_cancelled).length,
    };
  }, [requests]);

  // Handlers
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const handleToday = () => {
    setSelectedDate(format(new Date(), "yyyy-MM-dd"));
  };

  const handleTomorrow = () => {
    setSelectedDate(format(addDays(new Date(), 1), "yyyy-MM-dd"));
  };

  const clearDateFilter = () => {
    setSelectedDate(null);
    setWeekOffset(0);
  };

  const handleThisWeek = () => {
    setWeekOffset(0);
    setSelectedDate(null);
  };

  // Modal handlers
  const handleOpenEditModal = (request: NEMTRequest) => {
    setSelectedRequest(request);
    setEditFormData({
      transportation_company: request.transportation_company || "",
      pickup_time_from: request.pickup_time_from || "",
      pickup_time_to: request.pickup_time_to || "",
      return_pickup_time_from: request.return_pickup_time_from || "",
      return_pickup_time_to: request.return_pickup_time_to || "",
      notes: request.notes || "",
      update_all_future: false,
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedRequest) return;

    try {
      await updateMutation.mutateAsync({
        id: selectedRequest.id,
        data: editFormData,
      });
      setShowEditModal(false);
      setSelectedRequest(null);
    } catch (error) {
      console.error("Failed to update request:", error);
      alert("Failed to update request. Please try again.");
    }
  };

  const handleOpenCancelModal = (request: NEMTRequest) => {
    setSelectedRequest(request);
    setCancelReason("");
    setCancelAllFuture(false);
    setShowCancelModal(true);
  };

  const handleCancelRequest = async () => {
    if (!selectedRequest || !cancelReason.trim()) return;

    try {
      await cancelMutation.mutateAsync({
        id: selectedRequest.id,
        reason: cancelReason,
        cancelAllFuture,
      });
      setShowCancelModal(false);
      setSelectedRequest(null);
      setCancelReason("");
      setCancelAllFuture(false);
    } catch (error) {
      console.error("Failed to cancel request:", error);
      alert("Failed to cancel request. Please try again.");
    }
  };

  const handleOpenRestoreModal = (request: NEMTRequest) => {
    setSelectedRequest(request);
    setShowRestoreModal(true);
  };

  const handleRestoreRequest = async () => {
    if (!selectedRequest) return;

    try {
      await restoreMutation.mutateAsync(selectedRequest.id);
      setShowRestoreModal(false);
      setSelectedRequest(null);
    } catch (error) {
      console.error("Failed to restore request:", error);
      alert("Failed to restore request. Please try again.");
    }
  };

  const hasRequests = requests && requests.length > 0;

  // Only show full loading on initial load (no previous data)
  if (isLoading && !requests) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-12 h-12 animate-spin text-violet-600 mb-4" />
        <p className="text-gray-600 dark:text-gray-400">
          Loading transportation requests...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-gray-800 dark:to-gray-800 rounded-2xl border border-indigo-100 dark:border-gray-700 p-8 shadow-sm relative">
        {/* Fetching Indicator */}
        {isFetching && (
          <div className="absolute top-4 right-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-700 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600">
              <Loader2 className="w-4 h-4 animate-spin text-violet-600" />
              <span className="text-sm text-gray-600 dark:text-gray-300">
                Loading...
              </span>
            </div>
          </div>
        )}

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg">
              <Truck className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Ride Requests
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {selectedDate
                  ? format(
                      new Date(selectedDate + "T12:00:00"),
                      "EEEE, MMMM d, yyyy"
                    )
                  : `${format(weekStart, "MMMM d")} - ${format(
                      weekEnd,
                      "MMMM d, yyyy"
                    )}`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Rides"
          value={stats.total}
          icon={Truck}
          color="bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400"
        />
        <StatCard
          label="Confirmed"
          value={stats.confirmed}
          icon={CheckCircle}
          color="bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400"
        />
        <StatCard
          label="Pending"
          value={stats.pending}
          icon={AlertTriangle}
          color="bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400"
        />
        <StatCard
          label="Cancelled"
          value={stats.cancelled}
          icon={XCircle}
          color="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
        />
      </div>

      {/* Main Content */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
        {/* Controls */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 space-y-4">
          {/* Week Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                setWeekOffset((prev) => prev - 1);
                setSelectedDate(null);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous Week
            </button>

            <div className="flex items-center gap-3">
              <button
                onClick={handleToday}
                className="px-4 py-2 text-sm font-medium text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg transition-colors"
              >
                Today
              </button>
              <button
                onClick={handleTomorrow}
                className="px-4 py-2 text-sm font-medium text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg transition-colors"
              >
                Tomorrow
              </button>
              <button
                onClick={handleThisWeek}
                className="px-4 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
              >
                This Week
              </button>
              <input
                type="date"
                value={selectedDate || format(weekStart, "yyyy-MM-dd")}
                onChange={(e) => {
                  const value = e.target.value;
                  setSelectedDate(value || null);
                  // Reset week offset when selecting a specific date
                  if (value) {
                    setWeekOffset(0);
                  }
                }}
                className="px-4 py-2 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-violet-500/20"
              />
              {selectedDate && (
                <button
                  onClick={clearDateFilter}
                  className="px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  Clear
                </button>
              )}
            </div>

            <button
              onClick={() => {
                setWeekOffset((prev) => prev + 1);
                setSelectedDate(null);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Next Week
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by ID, client name, provider, channel, or destination..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 rounded-xl border border-gray-200 dark:border-gray-700 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
            />
            {searchTerm && (
              <>
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  ✕
                </button>
                <p className="absolute -bottom-6 right-0 text-sm text-gray-500 dark:text-gray-400">
                  {filteredAndSortedRequests.length} ride
                  {filteredAndSortedRequests.length !== 1 ? "s" : ""} found
                </p>
              </>
            )}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 pt-4">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              Confirmed
            </span>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400">
              <span className="w-2 h-2 rounded-full bg-yellow-500" />
              Pending
            </span>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              Cancelled
            </span>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400">
              <Building className="w-3 h-3" />
              Facility Paused
            </span>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {!hasRequests ? (
            <div className="p-16 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-indigo-50 dark:bg-indigo-900/20 mb-6">
                <Truck className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                NEMT Ride Request Schedule
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
                This page helps you manage transportation requests for your
                clients. To get started:
              </p>

              <div className="space-y-4 max-w-xl mx-auto mb-8 text-left">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 font-semibold">
                    1
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      Add Clients
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      First, add your clients in the Clients section
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 font-semibold">
                    2
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      Create Transportation Requests
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Visit a client&apos;s profile to create NEMT ride requests
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 font-semibold">
                    3
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      Manage Schedule
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Return here to view and manage all transportation requests
                    </p>
                  </div>
                </div>
              </div>

              <Link
                href="/clients"
                className="inline-flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-medium transition-colors shadow-sm"
              >
                <Users className="w-5 h-5" />
                Add Your First Client
              </Link>
            </div>
          ) : filteredAndSortedRequests.length === 0 ? (
            <div className="p-16 text-center">
              <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No rides found
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                No rides match your search for &quot;{searchTerm}&quot;
              </p>
              <button
                onClick={() => setSearchTerm("")}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors"
              >
                Clear search
              </button>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th
                    onClick={() => handleSort("client_name")}
                    className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      Client Name
                      {sortColumn === "client_name" && (
                        <span>{sortDirection === "asc" ? "↑" : "↓"}</span>
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("day")}
                    className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      Day
                      {sortColumn === "day" && (
                        <span>{sortDirection === "asc" ? "↑" : "↓"}</span>
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("date")}
                    className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      Date
                      {sortColumn === "date" && (
                        <span>{sortDirection === "asc" ? "↑" : "↓"}</span>
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("channel")}
                    className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      Channel
                      {sortColumn === "channel" && (
                        <span>{sortDirection === "asc" ? "↑" : "↓"}</span>
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("provider")}
                    className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      Provider
                      {sortColumn === "provider" && (
                        <span>{sortDirection === "asc" ? "↑" : "↓"}</span>
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("destination")}
                    className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      Destination
                      {sortColumn === "destination" && (
                        <span>{sortDirection === "asc" ? "↑" : "↓"}</span>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Pickup
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Return
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredAndSortedRequests.map((request) => {
                  const isConfirmed =
                    request.transportation_company && request.pickup_time_from;

                  return (
                    <tr
                      key={request.id}
                      className={cn(
                        "transition-colors",
                        request.is_cancelled
                          ? "bg-red-50 dark:bg-red-900/10"
                          : isConfirmed
                          ? "bg-green-50 dark:bg-green-900/10 hover:bg-green-100 dark:hover:bg-green-900/20"
                          : "bg-yellow-50 dark:bg-yellow-900/10 hover:bg-yellow-100 dark:hover:bg-yellow-900/20"
                      )}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/clients/${request.client_id}`}
                            className="font-medium text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300"
                          >
                            {request.client_name}
                          </Link>
                          {request.is_facility_paused && (
                            <span
                              title={`Facility paused: ${request.facility_name}`}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-200"
                            >
                              <Building className="w-3 h-3" />
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                        {request.day}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                        {request.date}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {request.channel}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={cn(
                            "font-medium",
                            request.provider === "PENDING"
                              ? "text-yellow-600 dark:text-yellow-400"
                              : "text-gray-900 dark:text-gray-100"
                          )}
                        >
                          {request.provider}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-start gap-2 max-w-xs">
                          <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-gray-600 dark:text-gray-300 truncate">
                            {request.destination}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div
                          className="text-sm text-gray-700 dark:text-gray-200"
                          dangerouslySetInnerHTML={{
                            __html: request.pickup_window || "-",
                          }}
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div
                          className="text-sm text-gray-700 dark:text-gray-200"
                          dangerouslySetInnerHTML={{
                            __html: request.return_pickup_window || "-",
                          }}
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end items-center gap-2">
                          {!request.is_cancelled ? (
                            <>
                              <button
                                onClick={() => handleOpenEditModal(request)}
                                className="p-2 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg transition-colors"
                                title="Edit"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleOpenCancelModal(request)}
                                className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                title="Cancel"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <span
                                className="px-2 py-1 text-xs font-medium bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200 rounded"
                                title={request.cancellation_reason}
                              >
                                Cancelled
                              </span>
                              <button
                                onClick={() => handleOpenRestoreModal(request)}
                                className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                                title="Restore"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && selectedRequest && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-gray-500/75 dark:bg-gray-900/75 transition-opacity"
              onClick={() => setShowEditModal(false)}
            />

            {/* Modal */}
            <div className="relative inline-block align-bottom bg-white dark:bg-gray-800 rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSaveEdit();
                }}
              >
                <div className="px-6 pt-6 pb-4">
                  <div className="flex items-start justify-between mb-6">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                      Edit Transportation Details
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowEditModal(false)}
                      className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  {/* Client Information Header */}
                  <div className="mb-2 p-5 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
                    {/* First Row: Request ID & Client ID */}
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          Request ID:
                        </span>
                        <span className="text-xs font-bold text-gray-900 dark:text-white">
                          {selectedRequest.id}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 justify-end">
                        <CreditCard className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-700 dark:text-gray-300 font-mono">
                          {selectedRequest.client_full_client_id ||
                            selectedRequest.client_providerone_id ||
                            "N/A"}
                        </span>
                      </div>
                    </div>
                    {/* Second Row: Client Name & DOB */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                          <User className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                        </div>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                          {selectedRequest.client_name}
                        </span>
                      </div>
                      {selectedRequest.client_date_of_birth ? (
                        <div className="flex items-center gap-2 justify-end">
                          <Cake className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                            {format(
                              new Date(selectedRequest.client_date_of_birth),
                              "MM/dd/yyyy"
                            )}
                          </span>
                        </div>
                      ) : (
                        <div />
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Transportation Company */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Transportation Company
                      </label>
                      <input
                        type="text"
                        value={editFormData.transportation_company}
                        onChange={(e) =>
                          setEditFormData((prev) => ({
                            ...prev,
                            transportation_company: e.target.value,
                          }))
                        }
                        placeholder="e.g., Acme Transportation"
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500/20"
                      />
                    </div>

                    {/* Pickup Window */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Pickup Window
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                            From
                          </label>
                          <input
                            type="time"
                            value={editFormData.pickup_time_from}
                            onChange={(e) =>
                              setEditFormData((prev) => ({
                                ...prev,
                                pickup_time_from: e.target.value,
                              }))
                            }
                            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500/20"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                            To
                          </label>
                          <input
                            type="time"
                            value={editFormData.pickup_time_to}
                            onChange={(e) =>
                              setEditFormData((prev) => ({
                                ...prev,
                                pickup_time_to: e.target.value,
                              }))
                            }
                            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500/20"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Return Pickup Window */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Return Pickup Window
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                            From
                          </label>
                          <input
                            type="time"
                            value={editFormData.return_pickup_time_from}
                            onChange={(e) =>
                              setEditFormData((prev) => ({
                                ...prev,
                                return_pickup_time_from: e.target.value,
                              }))
                            }
                            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500/20"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                            To
                          </label>
                          <input
                            type="time"
                            value={editFormData.return_pickup_time_to}
                            onChange={(e) =>
                              setEditFormData((prev) => ({
                                ...prev,
                                return_pickup_time_to: e.target.value,
                              }))
                            }
                            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500/20"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Notes
                      </label>
                      <textarea
                        value={editFormData.notes}
                        onChange={(e) =>
                          setEditFormData((prev) => ({
                            ...prev,
                            notes: e.target.value,
                          }))
                        }
                        placeholder="Add any special instructions or notes..."
                        rows={3}
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500/20"
                      />
                    </div>

                    {/* Update all future (for recurring) */}
                    {selectedRequest.is_recurring && (
                      <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                        <input
                          type="checkbox"
                          id="update_all_future"
                          checked={editFormData.update_all_future}
                          onChange={(e) =>
                            setEditFormData((prev) => ({
                              ...prev,
                              update_all_future: e.target.checked,
                            }))
                          }
                          className="w-4 h-4 text-violet-600 rounded"
                        />
                        <label
                          htmlFor="update_all_future"
                          className="text-sm text-gray-700 dark:text-gray-300"
                        >
                          Update all future occurrences
                        </label>
                      </div>
                    )}

                    {/* Read-only Info */}
                    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                        Request Details
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Pickup
                            </p>
                            <p className="text-gray-700 dark:text-gray-300">
                              {selectedRequest.pickup_address || "N/A"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Destination
                            </p>
                            <p className="text-gray-700 dark:text-gray-300">
                              {selectedRequest.destination}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            Date:
                          </span>
                          <span className="text-gray-700 dark:text-gray-300">
                            {selectedRequest.date}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="bg-gray-50 dark:bg-gray-900/50 px-6 py-4 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updateMutation.isPending}
                    className="px-6 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {updateMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {showCancelModal && selectedRequest && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-gray-500/75 dark:bg-gray-900/75 transition-opacity"
              onClick={() => setShowCancelModal(false)}
            />

            {/* Modal */}
            <div className="relative inline-block align-bottom bg-white dark:bg-gray-800 rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleCancelRequest();
                }}
              >
                <div className="px-6 pt-6 pb-4">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                        Cancel Transportation Request
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {selectedRequest.client_name} - {selectedRequest.date}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowCancelModal(false)}
                      className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    {/* Cancellation Reason */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Reason for Cancellation{" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        placeholder="Please provide a reason for cancellation..."
                        rows={4}
                        required
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                      />
                    </div>

                    {/* Cancel all future */}
                    {selectedRequest.is_recurring && (
                      <div className="flex items-start gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                        <input
                          type="checkbox"
                          id="cancel_all_future"
                          checked={cancelAllFuture}
                          onChange={(e) => setCancelAllFuture(e.target.checked)}
                          className="mt-1 w-4 h-4 text-red-600 rounded"
                        />
                        <div>
                          <label
                            htmlFor="cancel_all_future"
                            className="text-sm font-medium text-gray-900 dark:text-white cursor-pointer"
                          >
                            Cancel all future occurrences
                          </label>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                            This will cancel all upcoming rides in this
                            recurring series
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="bg-gray-50 dark:bg-gray-900/50 px-6 py-4 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCancelModal(false)}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    Keep Request
                  </button>
                  <button
                    type="submit"
                    disabled={cancelMutation.isPending || !cancelReason.trim()}
                    className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {cancelMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Cancelling...
                      </>
                    ) : (
                      "Cancel Request"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Restore Modal */}
      {showRestoreModal && selectedRequest && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-gray-500/75 dark:bg-gray-900/75 transition-opacity"
              onClick={() => setShowRestoreModal(false)}
            />

            {/* Modal */}
            <div className="relative inline-block align-bottom bg-white dark:bg-gray-800 rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full">
              <div className="px-6 pt-6 pb-4">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                      <RotateCcw className="w-6 h-6 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                        Restore Request
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {selectedRequest.client_name}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowRestoreModal(false)}
                    className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Are you sure you want to restore this cancelled transportation
                  request? This will make the request active again.
                </p>

                {selectedRequest.cancellation_reason && (
                  <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      <span className="font-medium">Cancellation reason:</span>{" "}
                      {selectedRequest.cancellation_reason}
                    </p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="bg-gray-50 dark:bg-gray-900/50 px-6 py-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowRestoreModal(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRestoreRequest}
                  disabled={restoreMutation.isPending}
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {restoreMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Restoring...
                    </>
                  ) : (
                    "Restore Request"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
