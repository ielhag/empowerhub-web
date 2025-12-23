"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  useSpecialities,
  useCreateSpeciality,
  useUpdateSpeciality,
  useDeleteSpeciality,
  useRateInfo,
  type Speciality,
  type CreateSpecialityData,
  type UpdateSpecialityData,
  type RateHistoryItem,
} from "@/hooks/useSpecialities";
import {
  Layers,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  ChevronDown,
  Users,
  Loader2,
  Info,
  AlertTriangle,
} from "lucide-react";

// Color styles mapping for dynamic colors (since Tailwind can't purge dynamic classes)
const colorStylesMap: Record<string, { bg: string; text: string; bgDark: string; textDark: string }> = {
  violet: { bg: "#ede9fe", text: "#6d28d9", bgDark: "rgba(139, 92, 246, 0.5)", textDark: "#f5f3ff" },
  emerald: { bg: "#d1fae5", text: "#047857", bgDark: "rgba(16, 185, 129, 0.5)", textDark: "#ecfdf5" },
  red: { bg: "#fee2e2", text: "#b91c1c", bgDark: "rgba(239, 68, 68, 0.5)", textDark: "#fef2f2" },
  blue: { bg: "#dbeafe", text: "#1d4ed8", bgDark: "rgba(59, 130, 246, 0.5)", textDark: "#eff6ff" },
  indigo: { bg: "#e0e7ff", text: "#4338ca", bgDark: "rgba(99, 102, 241, 0.5)", textDark: "#eef2ff" },
};

// Extract base color from Tailwind class like "bg-violet-100" -> "violet"
function extractColorFromClass(colorClass: string): string {
  const match = colorClass.match(/bg-(\w+)-/);
  return match?.[1] || "indigo";
}

// Get inline styles for a speciality's color
function getColorStyles(colorBg: string, isDark: boolean) {
  const baseColor = extractColorFromClass(colorBg);
  const colors = colorStylesMap[baseColor] || colorStylesMap.indigo;
  return {
    backgroundColor: isDark ? colors.bgDark : colors.bg,
    color: isDark ? colors.textDark : colors.text,
  };
}

interface SpecialityFormData {
  id?: number;
  name: string;
  description: string;
  service_code: string;
  service_code_description: string;
  service_code_modifier: string;
  status: string;
  is_coach: boolean;
  rate: string;
  rate_description: string;
  effective_date: string;
  rate_change_reason: string;
}

const initialFormData: SpecialityFormData = {
  name: "",
  description: "",
  service_code: "",
  service_code_description: "",
  service_code_modifier: "",
  status: "1",
  is_coach: true,
  rate: "",
  rate_description: "",
  effective_date: "",
  rate_change_reason: "",
};

// Component to display speciality name with color badge
function SpecialityNameCell({ speciality }: { speciality: Speciality }) {
  const baseColor = extractColorFromClass(speciality.color.bg);
  const colors = colorStylesMap[baseColor] || colorStylesMap.indigo;

  return (
    <div className="flex items-center">
      <div
        className="h-8 w-8 rounded-full flex items-center justify-center"
        style={{ backgroundColor: colors.bg }}
      >
        <span
          className="text-xs font-medium"
          style={{ color: colors.text }}
        >
          {speciality.short_name}
        </span>
      </div>
      <div className="ml-3">
        <Link
          href={`/services/specialities/${speciality.id}`}
          className="text-sm font-medium text-gray-900 dark:text-white hover:text-violet-600 dark:hover:text-violet-400"
        >
          {speciality.name}
        </Link>
      </div>
    </div>
  );
}

export default function SpecialitiesPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [isCoachFilter, setIsCoachFilter] = useState<string>("");
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<SpecialityFormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [expandedCoaches, setExpandedCoaches] = useState<number | null>(null);

  // Queries and Mutations
  const { data, isLoading, error } = useSpecialities({
    search: search || undefined,
    status: statusFilter || undefined,
    is_coach: isCoachFilter || undefined,
  });
  const createMutation = useCreateSpeciality();
  const updateMutation = useUpdateSpeciality();
  const deleteMutation = useDeleteSpeciality();

  const specialities = data?.data ?? [];
  const isSuperAdmin = data?.is_super_admin ?? false;

  // Rate info for editing (only fetched when modal is open and editing)
  const { data: rateInfoData } = useRateInfo(
    formData.id ?? 0,
    showModal && isEditing && isSuperAdmin
  );

  const handleOpenModal = (speciality?: Speciality) => {
    if (speciality) {
      setIsEditing(true);
      setFormData({
        id: speciality.id,
        name: speciality.name,
        description: speciality.description,
        service_code: speciality.service_code,
        service_code_description: speciality.service_code_description,
        service_code_modifier: speciality.service_code_modifier ?? "",
        status: speciality.status ? "1" : "0",
        is_coach: speciality.is_coach,
        rate: speciality.rate?.toString() ?? "",
        rate_description: speciality.rate_description ?? "",
        effective_date: "",
        rate_change_reason: "",
      });
    } else {
      setIsEditing(false);
      setFormData(initialFormData);
    }
    setFormErrors({});
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setIsEditing(false);
    setFormData(initialFormData);
    setFormErrors({});
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) errors.name = "Name is required";
    if (!formData.description.trim()) errors.description = "Description is required";
    if (!formData.service_code.trim()) errors.service_code = "Service code is required";
    if (!formData.service_code_description.trim())
      errors.service_code_description = "Service code description is required";

    if (isSuperAdmin) {
      if (!formData.rate) errors.rate = "Rate is required";
      else if (isNaN(parseFloat(formData.rate)) || parseFloat(formData.rate) < 0)
        errors.rate = "Rate must be a positive number";
      if (!formData.rate_description.trim())
        errors.rate_description = "Rate description is required";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    const payload: CreateSpecialityData | UpdateSpecialityData = {
      name: formData.name,
      description: formData.description,
      service_code: formData.service_code,
      service_code_description: formData.service_code_description,
      service_code_modifier: formData.service_code_modifier || undefined,
      status: parseInt(formData.status),
      is_coach: formData.is_coach,
    };

    if (isSuperAdmin) {
      payload.rate = parseFloat(formData.rate);
      payload.rate_description = formData.rate_description;
      if (isEditing && formData.effective_date) {
        (payload as UpdateSpecialityData).effective_date = formData.effective_date;
      }
      if (isEditing && formData.rate_change_reason) {
        (payload as UpdateSpecialityData).rate_change_reason = formData.rate_change_reason;
      }
    }

    try {
      if (isEditing && formData.id) {
        await updateMutation.mutateAsync({ id: formData.id, data: payload });
      } else {
        await createMutation.mutateAsync(payload as CreateSpecialityData);
      }
      handleCloseModal();
    } catch (err) {
      console.error("Error saving speciality:", err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this speciality?")) return;
    try {
      await deleteMutation.mutateAsync(id);
    } catch (err) {
      console.error("Error deleting speciality:", err);
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-400" />
          <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">
            Failed to load specialities
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Please try again later.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
              Specialities / Services
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Manage your specialities and services
            </p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="inline-flex items-center px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Service
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search specialities..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500"
          >
            <option value="">All Statuses</option>
            <option value="1">Active</option>
            <option value="0">Inactive</option>
          </select>
          <select
            value={isCoachFilter}
            onChange={(e) => setIsCoachFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500"
          >
            <option value="">All Types</option>
            <option value="1">Coach Services</option>
            <option value="0">Administrative</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
          </div>
        ) : specialities.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-4">
              <Layers className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No specialities found
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              {search ? "Try adjusting your search." : "Click the button above to add your first speciality."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Coaches
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {specialities.map((speciality) => (
                  <tr
                    key={speciality.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <SpecialityNameCell speciality={speciality} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                        {speciality.description}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap relative">
                      <button
                        onClick={() =>
                          setExpandedCoaches(
                            expandedCoaches === speciality.id ? null : speciality.id
                          )
                        }
                        className="text-sm text-gray-900 dark:text-white hover:text-violet-600 dark:hover:text-violet-400 flex items-center space-x-1"
                      >
                        <Users className="w-4 h-4" />
                        <span>
                          {speciality.teams_count} coach{speciality.teams_count !== 1 ? "es" : ""}
                        </span>
                        <ChevronDown
                          className={cn(
                            "w-4 h-4 transition-transform",
                            expandedCoaches === speciality.id && "rotate-180"
                          )}
                        />
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
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
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={cn(
                          "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                          speciality.status
                            ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
                            : "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                        )}
                      >
                        {speciality.status ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleOpenModal(speciality)}
                          className="text-violet-600 dark:text-violet-400 hover:text-violet-900 dark:hover:text-violet-300"
                          title="Edit"
                        >
                          <Edit2 className="h-5 w-5" />
                        </button>
                        {isSuperAdmin && (
                          <button
                            onClick={() => handleDelete(speciality.id)}
                            disabled={deleteMutation.isPending}
                            className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                            title="Delete"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50" aria-modal="true" role="dialog">
          <div className="fixed inset-0 bg-gray-500 dark:bg-gray-900 bg-opacity-75 dark:bg-opacity-75 transition-opacity" />

          <div className="fixed inset-0 z-10 overflow-y-auto">
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
              <div className="relative transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
                {/* Modal Header */}
                <div className="bg-white dark:bg-gray-800 px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900 sm:mx-0 sm:h-10 sm:w-10">
                      <Layers className="h-6 w-6 text-violet-600 dark:text-violet-400" />
                    </div>
                    <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                      <h3 className="text-lg font-semibold leading-6 text-gray-900 dark:text-white">
                        {isEditing ? "Edit Service" : "Create Service"}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {isEditing
                          ? "Update the service details below"
                          : "Enter the service details below"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Modal Body */}
                <div className="bg-white dark:bg-gray-800 px-4 pb-4 sm:p-6 sm:pt-0">
                  <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                    {/* Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Name *
                      </label>
                      <input
                        type="text"
                        value={formData.name || ""}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g., Play Therapy"
                        className="mt-1 block w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-violet-500 focus:ring-2 focus:ring-violet-500 focus:outline-none sm:text-sm"
                      />
                      {formErrors.name && (
                        <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>
                      )}
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Description *
                      </label>
                      <textarea
                        value={formData.description || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, description: e.target.value })
                        }
                        placeholder="e.g., Play Therapy helps children express their feelings..."
                        rows={3}
                        className="mt-1 block w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-violet-500 focus:ring-2 focus:ring-violet-500 focus:outline-none sm:text-sm"
                      />
                      {formErrors.description && (
                        <p className="mt-1 text-sm text-red-600">{formErrors.description}</p>
                      )}
                    </div>

                    {/* Rate Management - Super Admin Only */}
                    {isSuperAdmin && (
                      <div className="border-l-4 border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                        <div className="flex items-center mb-3">
                          <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mr-2" />
                          <h4 className="text-sm font-semibold text-yellow-800 dark:text-yellow-200">
                            Rate Management (Owner Only)
                          </h4>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                              Rate *
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={formData.rate || ""}
                              onChange={(e) =>
                                setFormData({ ...formData, rate: e.target.value })
                              }
                              placeholder="e.g., 8.68"
                              className="mt-1 block w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-violet-500 focus:ring-2 focus:ring-violet-500 focus:outline-none sm:text-sm"
                            />
                            {formErrors.rate && (
                              <p className="mt-1 text-sm text-red-600">{formErrors.rate}</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                              Rate Description *
                            </label>
                            <input
                              type="text"
                              value={formData.rate_description || ""}
                              onChange={(e) =>
                                setFormData({ ...formData, rate_description: e.target.value })
                              }
                              placeholder="e.g., 1/4 Hour"
                              className="mt-1 block w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-violet-500 focus:ring-2 focus:ring-violet-500 focus:outline-none sm:text-sm"
                            />
                            {formErrors.rate_description && (
                              <p className="mt-1 text-sm text-red-600">
                                {formErrors.rate_description}
                              </p>
                            )}
                          </div>
                        </div>

                        {isEditing && (
                          <div className="grid grid-cols-1 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Effective Date{" "}
                                <span className="text-xs text-gray-500">
                                  (leave blank for immediate)
                                </span>
                              </label>
                              <input
                                type="date"
                                value={formData.effective_date || ""}
                                onChange={(e) =>
                                  setFormData({ ...formData, effective_date: e.target.value })
                                }
                                className="mt-1 block w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-violet-500 focus:ring-2 focus:ring-violet-500 focus:outline-none sm:text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Reason for Rate Change{" "}
                                <span className="text-xs text-gray-500">(optional)</span>
                              </label>
                              <input
                                type="text"
                                value={formData.rate_change_reason || ""}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    rate_change_reason: e.target.value,
                                  })
                                }
                                placeholder="e.g., DDA annual rate increase"
                                className="mt-1 block w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-violet-500 focus:ring-2 focus:ring-violet-500 focus:outline-none sm:text-sm"
                              />
                            </div>
                          </div>
                        )}

                        {/* Rate History */}
                        {isEditing && rateInfoData?.history && rateInfoData.history.length > 0 && (
                          <div className="mt-4">
                            <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Recent Rate History
                            </h5>
                            <div className="max-h-32 overflow-y-auto space-y-1">
                              {rateInfoData.history.map((rate: RateHistoryItem) => (
                                <div
                                  key={rate.id}
                                  className="text-xs text-gray-600 dark:text-gray-400 py-1 border-b border-gray-200 dark:border-gray-700"
                                >
                                  <span className="font-medium">${rate.rate}</span>{" "}
                                  <span>{rate.rate_description}</span>{" "}
                                  <span className="text-gray-500">from</span>{" "}
                                  <span>{rate.effective_from}</span>{" "}
                                  {rate.effective_to ? (
                                    <>
                                      <span className="text-gray-500">to</span>{" "}
                                      <span>{rate.effective_to}</span>
                                    </>
                                  ) : (
                                    <span className="text-green-600">(current)</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Service Code and Modifier */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Service Code *
                        </label>
                        <input
                          type="text"
                          value={formData.service_code || ""}
                          onChange={(e) =>
                            setFormData({ ...formData, service_code: e.target.value })
                          }
                          placeholder="e.g., SA268"
                          className="mt-1 block w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-violet-500 focus:ring-2 focus:ring-violet-500 focus:outline-none sm:text-sm"
                        />
                        {formErrors.service_code && (
                          <p className="mt-1 text-sm text-red-600">{formErrors.service_code}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Modifier
                        </label>
                        <input
                          type="text"
                          value={formData.service_code_modifier || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              service_code_modifier: e.target.value,
                            })
                          }
                          placeholder="e.g., U1"
                          className="mt-1 block w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-violet-500 focus:ring-2 focus:ring-violet-500 focus:outline-none sm:text-sm"
                        />
                      </div>
                    </div>

                    {/* Service Code Description */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Service Code Description *
                      </label>
                      <input
                        type="text"
                        value={formData.service_code_description || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            service_code_description: e.target.value,
                          })
                        }
                        placeholder="Description of the service code"
                        className="mt-1 block w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-violet-500 focus:ring-2 focus:ring-violet-500 focus:outline-none sm:text-sm"
                      />
                      {formErrors.service_code_description && (
                        <p className="mt-1 text-sm text-red-600">
                          {formErrors.service_code_description}
                        </p>
                      )}
                    </div>

                    {/* Is Coach Service */}
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="is_coach"
                        checked={formData.is_coach}
                        onChange={(e) =>
                          setFormData({ ...formData, is_coach: e.target.checked })
                        }
                        className="h-4 w-4 rounded border border-gray-300 dark:border-gray-600 text-violet-600 focus:ring-2 focus:ring-violet-500 focus:ring-offset-0"
                      />
                      <label
                        htmlFor="is_coach"
                        className="ml-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
                      >
                        This is a coach service
                      </label>
                      <div className="ml-2 group relative">
                        <Info className="w-4 h-4 text-gray-400 cursor-help" />
                        <div className="absolute bottom-6 left-0 w-64 p-2 bg-gray-800 text-gray-100 text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10">
                          Coach services are assigned to team members who work directly with
                          clients. Administrative services are only for staff who don&apos;t
                          provide direct client services.
                        </div>
                      </div>
                    </div>

                    {/* Status */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Status *
                      </label>
                      <select
                        value={formData.status || "1"}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-violet-500 focus:ring-2 focus:ring-violet-500 focus:outline-none sm:text-sm"
                      >
                        <option value="1">Active</option>
                        <option value="0">Inactive</option>
                      </select>
                    </div>
                  </form>
                </div>

                {/* Modal Footer */}
                <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={createMutation.isPending || updateMutation.isPending}
                    className="inline-flex w-full justify-center rounded-md bg-violet-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-violet-500 sm:ml-3 sm:w-auto disabled:opacity-50"
                  >
                    {createMutation.isPending || updateMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : null}
                    {isEditing ? "Save Changes" : "Create Speciality"}
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="mt-3 inline-flex w-full justify-center rounded-md bg-white dark:bg-gray-800 px-3 py-2 text-sm font-semibold text-gray-900 dark:text-white shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 sm:mt-0 sm:w-auto"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
