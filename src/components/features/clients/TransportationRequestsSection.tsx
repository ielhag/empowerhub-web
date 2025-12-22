"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import {
  Plus,
  Trash2,
  Download,
  MoreVertical,
  RotateCcw,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
  User,
  Car,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api/client";
import { Modal } from "@/components/ui/Modal";
import type { Client, NEMTRequest, PaginatedNEMTRequests } from "@/types";

interface TransportationRequestsSectionProps {
  client: Client;
}

interface Filters {
  dateFrom: string;
  dateTo: string;
  createdFrom: string;
  createdTo: string;
  requestType: string;
}

const formatDate = (dateString?: string): string => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return `${(date.getMonth() + 1).toString().padStart(2, "0")}/${date
    .getDate()
    .toString()
    .padStart(2, "0")}/${date.getFullYear()}`;
};

const truncateText = (text?: string, maxLength: number = 50): string => {
  if (!text) return "";
  return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
};

export default function TransportationRequestsSection({
  client,
}: TransportationRequestsSectionProps) {
  const queryClient = useQueryClient();
  const [showTrashedModal, setShowTrashedModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [perPage, setPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<Filters>({
    dateFrom: "",
    dateTo: "",
    createdFrom: "",
    createdTo: "",
    requestType: "",
  });

  const hasActiveFilters =
    filters.dateFrom ||
    filters.dateTo ||
    filters.createdFrom ||
    filters.createdTo ||
    filters.requestType;

  // Fetch NEMT requests
  const { data: nemtRequests, isLoading } = useQuery({
    queryKey: [
      "nemt-requests",
      client.id,
      currentPage,
      perPage,
      search,
      filters,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("page", currentPage.toString());
      params.append("per_page", perPage.toString());
      if (search) params.append("search", search);
      if (filters.dateFrom) params.append("date_from", filters.dateFrom);
      if (filters.dateTo) params.append("date_to", filters.dateTo);
      if (filters.createdFrom)
        params.append("created_from", filters.createdFrom);
      if (filters.createdTo) params.append("created_to", filters.createdTo);
      if (filters.requestType)
        params.append("request_type", filters.requestType);

      const response = await api.get<{ success: boolean; data: NEMTRequest[] }>(
        `/tenant-api/clients/${client.id}/nemt-requests?${params.toString()}`
      );
      // Extract the data array from the wrapped response
      return response.data.data || [];
    },
  });

  // Fetch trashed requests
  const { data: trashedRequests = [] } = useQuery({
    queryKey: ["nemt-requests-trashed", client.id],
    queryFn: async () => {
      const response = await api.get<{ success: boolean; data: NEMTRequest[] }>(
        `/tenant-api/nemt-requests/trashed/${client.id}`
      );
      // Extract the data array from the wrapped response
      return response.data.data || [];
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (requestId: number) => {
      await api.delete(`/tenant-api/nemt-requests/${requestId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nemt-requests", client.id] });
      queryClient.invalidateQueries({
        queryKey: ["nemt-requests-trashed", client.id],
      });
      setActiveDropdown(null);
    },
  });

  // Restore mutation
  const restoreMutation = useMutation({
    mutationFn: async (requestId: number) => {
      await api.post(`/tenant-api/nemt-requests/${requestId}/restore`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nemt-requests", client.id] });
      queryClient.invalidateQueries({
        queryKey: ["nemt-requests-trashed", client.id],
      });
    },
  });

  const handleDelete = async (request: NEMTRequest) => {
    let confirmMessage =
      "Are you sure you want to delete this transportation request?";

    if (request.is_recurring) {
      confirmMessage = `WARNING: This is a recurring transportation request.\n\nDeleting this request will remove all transportation occurrences.\n\nAre you sure you want to proceed with deletion?`;
    }

    if (window.confirm(confirmMessage)) {
      deleteMutation.mutate(request.id);
    }
  };

  const handleRestore = async (request: NEMTRequest) => {
    let confirmMessage =
      "Are you sure you want to restore this transportation request?";

    if (request.is_recurring) {
      confirmMessage = `This will restore a recurring transportation request with all occurrences.\n\nAre you sure you want to restore this request?`;
    }

    if (window.confirm(confirmMessage)) {
      restoreMutation.mutate(request.id);
    }
  };

  const handleDownloadPDF = async (requestId: number) => {
    try {
      // Fetch PDF directly from Laravel API with proper auth
      // Route is under /tenant-api/nemt-requests/{id}/pdf in tenant.php
      const response = await api.get(
        `/tenant-api/nemt-requests/${requestId}/pdf`,
        {
          responseType: "blob",
        }
      );

      // Create blob URL and trigger download
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `nemt-request-${requestId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading PDF:", error);
      alert("Failed to download PDF. Please try again.");
    }
    setActiveDropdown(null);
  };

  const resetFilters = () => {
    setFilters({
      dateFrom: "",
      dateTo: "",
      createdFrom: "",
      createdTo: "",
      requestType: "",
    });
    setCurrentPage(1);
  };

  // Can only create request if client has an NEMT broker ASSIGNED (not just available)
  const canCreateRequest = !!client.nemt_broker_id && !client.is_inactive;

  // nemtRequests is now the array directly from the API
  const allRequests = nemtRequests || [];
  // Since we're not paginating server-side, calculate local pagination
  const total = allRequests.length;
  const startIndex = (currentPage - 1) * perPage;
  const endIndex = startIndex + perPage;
  // Slice the requests to show only the current page (max 10 by default)
  const requests = allRequests.slice(startIndex, endIndex);
  const pagination = {
    current_page: currentPage,
    last_page: Math.ceil(total / perPage) || 1,
    total,
    from: total > 0 ? startIndex + 1 : 0,
    to: Math.min(endIndex, total),
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Transportation Requests
          </h2>
          {!client.nemt_broker_id && (
            <p className="text-sm text-red-600 dark:text-red-400 mt-1">
              Please assign an NEMT broker to this client before creating transportation requests
            </p>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {/* Recycle Bin Button */}
          {trashedRequests.length > 0 && (
            <button
              onClick={() => setShowTrashedModal(true)}
              className="relative text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
              title="View deleted transportation requests"
            >
              <Trash2 className="w-6 h-6" />
              <span className="absolute -top-2 -right-2 bg-violet-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                {trashedRequests.length}
              </span>
            </button>
          )}

          {/* New Request Button */}
          {canCreateRequest ? (
            <Link
              href={`/clients/${client.id}/nemt-request/new`}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-violet-600 hover:bg-violet-700 transition-colors"
            >
              <Plus className="h-5 w-5 mr-2" />
              New
            </Link>
          ) : (
            <button
              type="button"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gray-300 cursor-not-allowed"
              disabled
              title={
                !client.nemt_broker_id
                  ? "Cannot create request - no NEMT broker assigned to this client"
                  : "Cannot create request - client is inactive"
              }
            >
              <Plus className="h-5 w-5 mr-2" />
              New
            </button>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="px-6 py-4">
        <div className="flex flex-wrap gap-3 justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <label
              htmlFor="perPage"
              className="text-sm text-gray-600 dark:text-gray-400"
            >
              Show:
            </label>
            <select
              id="perPage"
              value={perPage}
              onChange={(e) => {
                setPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="form-select rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 text-sm"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search requests..."
                className="pl-9 pr-4 py-2 rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-4 bg-gray-50 dark:bg-gray-700 rounded-md p-3 border border-gray-200 dark:border-gray-600">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className="text-sm text-gray-700 dark:text-gray-300 flex items-center"
              >
                <Filter className="h-4 w-4 mr-1" />
                <span>{showFilters ? "Hide Filters" : "Show Filters"}</span>
              </button>
              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  type="button"
                  className="text-xs text-violet-600 dark:text-violet-400 hover:text-violet-800 dark:hover:text-violet-300"
                >
                  Reset Filters
                </button>
              )}
            </div>

            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Date Range Filter */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Transportation Date
                  </label>
                  <div className="flex space-x-2 items-center">
                    <input
                      type="date"
                      value={filters.dateFrom}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          dateFrom: e.target.value,
                        }))
                      }
                      className="form-input rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 text-sm w-full"
                    />
                    <span className="text-gray-500 dark:text-gray-400">to</span>
                    <input
                      type="date"
                      value={filters.dateTo}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          dateTo: e.target.value,
                        }))
                      }
                      className="form-input rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 text-sm w-full"
                    />
                  </div>
                </div>

                {/* Created Date Range Filter */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Created Date
                  </label>
                  <div className="flex space-x-2 items-center">
                    <input
                      type="date"
                      value={filters.createdFrom}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          createdFrom: e.target.value,
                        }))
                      }
                      className="form-input rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 text-sm w-full"
                    />
                    <span className="text-gray-500 dark:text-gray-400">to</span>
                    <input
                      type="date"
                      value={filters.createdTo}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          createdTo: e.target.value,
                        }))
                      }
                      className="form-input rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 text-sm w-full"
                    />
                  </div>
                </div>

                {/* Request Type Filter */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Request Type
                  </label>
                  <select
                    value={filters.requestType}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        requestType: e.target.value,
                      }))
                    }
                    className="form-select rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 text-sm w-full"
                  >
                    <option value="">All Types</option>
                    <option value="recurring">Recurring Only</option>
                    <option value="one-time">One-time Only</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead>
              <tr>
                <th className="px-6 py-3 bg-gray-50 dark:bg-gray-700 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                  Date
                </th>
                <th className="px-6 py-3 bg-gray-50 dark:bg-gray-700 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Pickup
                </th>
                <th className="px-6 py-3 bg-gray-50 dark:bg-gray-700 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Dropoff
                </th>
                <th className="px-6 py-3 bg-gray-50 dark:bg-gray-700 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 bg-gray-50 dark:bg-gray-700 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400"
                  >
                    Loading...
                  </td>
                </tr>
              ) : requests.length > 0 ? (
                requests.map((request) => (
                  <tr key={request.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                      {formatDate(request.transportation_date)}
                    </td>
                    <td
                      className="px-6 py-4 text-sm text-gray-900 dark:text-gray-300"
                      title={request.pickup_address}
                    >
                      {truncateText(request.pickup_address)}
                    </td>
                    <td
                      className="px-6 py-4 text-sm text-gray-900 dark:text-gray-300"
                      title={request.dropoff_address}
                    >
                      {truncateText(request.dropoff_address)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                      <div>
                        {request.is_recurring ? "Recurring" : "One-time"}
                      </div>
                      {request.creator_info && (
                        <div className="mt-1 flex items-center">
                          <span
                            className="text-xs text-gray-500 dark:text-gray-400"
                            title={`Created by ${request.creator_info.name}`}
                          >
                            <User className="h-3 w-3 inline-block mr-1" />
                            {request.creator_info.name.split(" ")[0]}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="relative inline-block text-left">
                        <button
                          type="button"
                          onClick={() =>
                            setActiveDropdown(
                              activeDropdown === request.id ? null : request.id
                            )
                          }
                          className="text-violet-600 dark:text-violet-400 hover:text-violet-900 dark:hover:text-violet-300"
                        >
                          <MoreVertical className="h-5 w-5" />
                        </button>

                        {activeDropdown === request.id && (
                          <div
                            className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-gray-700 ring-1 ring-black ring-opacity-5 z-50"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="py-1">
                              <button
                                onClick={() => handleDownloadPDF(request.id)}
                                className="group flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-violet-50 dark:hover:bg-violet-900 hover:text-violet-900 dark:hover:text-violet-100 w-full text-left"
                              >
                                <Download className="mr-3 h-5 w-5 text-gray-400 dark:text-gray-500 group-hover:text-violet-600 dark:group-hover:text-violet-400" />
                                Download PDF
                              </button>

                              <button
                                onClick={() => handleDelete(request)}
                                className="group flex items-center px-4 py-2 text-sm text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900 hover:text-red-900 dark:hover:text-red-100 w-full text-left"
                              >
                                <Trash2 className="mr-3 h-5 w-5 text-red-400 dark:text-red-500 group-hover:text-red-600 dark:group-hover:text-red-400" />
                                Delete Request
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400"
                  >
                    No transportation requests found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center">
            <p className="text-sm text-gray-700 dark:text-gray-400">
              Showing{" "}
              <span className="font-medium">{pagination.from || 0}</span> to{" "}
              <span className="font-medium">{pagination.to || 0}</span> of{" "}
              <span className="font-medium">{pagination.total}</span> results
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(currentPage - 1)}
              className={cn(
                "relative inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600",
                currentPage <= 1
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-gray-100 dark:hover:bg-gray-700"
              )}
            >
              Previous
            </button>
            <button
              type="button"
              disabled={currentPage >= (pagination.last_page || 1)}
              onClick={() => setCurrentPage(currentPage + 1)}
              className={cn(
                "relative inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600",
                currentPage >= (pagination.last_page || 1)
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-gray-100 dark:hover:bg-gray-700"
              )}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Trashed Requests Modal */}
      <Modal
        isOpen={showTrashedModal}
        onClose={() => setShowTrashedModal(false)}
        title="Deleted Transportation Requests"
        size="lg"
      >
        <div className="mb-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            These requests have been deleted but can be restored if needed.
          </p>
        </div>

        {trashedRequests.length === 0 ? (
          <div className="text-center py-8">
            <Trash2 className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600" />
            <p className="mt-4 text-gray-500 dark:text-gray-400">
              No deleted requests found
            </p>
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto space-y-3">
            {trashedRequests.map((request) => (
              <div
                key={request.id}
                className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {formatDate(request.transportation_date)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {request.is_recurring ? "Recurring" : "One-time"}
                      <span className="mx-1">•</span>
                      {formatDate(request.deleted_at)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 break-words max-w-[300px]">
                      {request.dropoff_address}
                    </div>
                    {request.deleter_info?.name && (
                      <div className="mt-2 text-xs text-red-400 dark:text-red-300 flex items-center">
                        <Trash2 className="h-3 w-3 mr-1" />
                        Deleted by {request.deleter_info.name}{" "}
                        {request.deleter_info.deleted_at_formatted &&
                          `on ${request.deleter_info.deleted_at_formatted}`}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleRestore(request)}
                    className="flex items-center text-sm text-violet-600 dark:text-violet-400 hover:text-violet-800 dark:hover:text-violet-300"
                  >
                    <RotateCcw className="w-4 h-4 mr-1" />
                    Restore
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* Click outside handler for dropdown */}
      {activeDropdown !== null && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setActiveDropdown(null)}
        />
      )}
    </div>
  );
}
