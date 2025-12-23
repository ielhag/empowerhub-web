"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Modal } from "@/components/ui/Modal";
import {
  Plus,
  Trash2,
  Download,
  MoreVertical,
  RotateCcw,
  ChevronDown,
  AlertTriangle,
  X,
  User,
  MapPin,
  Calendar,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api/client";
import type {
  Client,
  NEMTRequest,
  NEMTBroker,
  NEMTRequestFormData,
  NEMTServiceCheckboxes,
  NEMTRecurringDays,
  PaginatedNEMTRequests,
} from "@/types";

interface NEMTRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client;
  onSuccess?: () => void;
}

interface FormErrors {
  [key: string]: string;
}

const formatDate = (dateString?: string): string => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return `${(date.getMonth() + 1).toString().padStart(2, "0")}/${date
    .getDate()
    .toString()
    .padStart(2, "0")}/${date.getFullYear()}`;
};

const formatPhoneNumber = (value: string): string => {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  if (digits.length >= 7) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  } else if (digits.length >= 4) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  } else if (digits.length > 0) {
    return `(${digits}`;
  }
  return "";
};

const getDefaultFormData = (client: Client): NEMTRequestFormData => {
  const primaryBroker = client.nemt_broker;
  const address = client.address;
  const fullAddress = address
    ? `${address.street || ""}, ${address.city || ""}, ${address.state || ""} ${
        address.zip || ""
      }`
        .replace(/, ,/g, ",")
        .replace(/^, /, "")
    : "";

  return {
    client_id: client.id,
    broker_name: primaryBroker?.name || "",
    broker_fax: primaryBroker?.fax || "",
    dda_region: primaryBroker?.dda_region || "",
    assessor_name:
      client.case_manager?.user?.name || client.case_manager?.name || "",
    assessor_phone: client.case_manager?.phone || "",
    mobility_status: "Wheelchair",
    pickup_address: fullAddress,
    dropoff_address: "",
    appointment_start_time: "",
    appointment_end_time: "",
    transportation_date: new Date().toISOString().split("T")[0],
    end_date: new Date().toISOString().split("T")[0],
    support_person_rides: false,
    is_recurring: false,
    special_needs: `\n\nCall ${client.owner_name || ""} ${
      client.tenant_phone || ""
    } before no show.`,
    additional_contact_1: client.owner_name || "",
    additional_contact_1_phone: client.tenant_phone || "",
    additional_contact_1_organization: client.tenant_company || "",
    additional_contact_2: "Front Desk",
    additional_contact_2_phone: client.phone || "",
    additional_contact_2_organization: client.facility?.name || "",
    service_checkboxes: {
      medicaid_eligible: true,
      needs_transportation: true,
      assistive_technology: false,
      staff_family_consultation: false,
      community_access: true,
      supported_employment: false,
      community_guide: false,
      transportation: true,
      habilitative_behavior: false,
      habilitative_therapy: false,
      other_habilitative: false,
    },
    recurring_days: {
      sunday: false,
      monday: false,
      tuesday: false,
      wednesday: false,
      thursday: false,
      friday: false,
      saturday: false,
    },
  };
};

export default function NEMTRequestModal({
  isOpen,
  onClose,
  client,
  onSuccess,
}: NEMTRequestModalProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<NEMTRequestFormData>(() =>
    getDefaultFormData(client)
  );
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAdditionalOptions, setShowAdditionalOptions] = useState(false);
  const [timeWarnings, setTimeWarnings] = useState<{
    message: string;
    type: "warning" | "error" | "";
  }>({ message: "", type: "" });

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData(getDefaultFormData(client));
      setErrors({});
      setTimeWarnings({ message: "", type: "" });
    }
  }, [isOpen, client]);

  // Previous requests for quick fill
  const previousRequests = useMemo(() => {
    return client.nemt_requests?.data?.slice(0, 4) || [];
  }, [client.nemt_requests]);

  // Check if client can create requests
  const getMissingClientData = useCallback((): string[] => {
    const missingData: string[] = [];

    if (!formData.additional_contact_2_phone?.trim()) {
      missingData.push("Client phone number");
    }

    const address = formData.pickup_address || "";
    if (!address || address.includes(", ,") || address.endsWith(", ")) {
      missingData.push("Client complete address");
    }

    if (!formData.assessor_name?.trim()) {
      missingData.push("Case manager name");
    }

    if (!formData.assessor_phone?.trim()) {
      missingData.push("Case manager phone");
    }

    if (!formData.additional_contact_2_organization?.trim()) {
      missingData.push("Client facility/organization");
    }

    if (!formData.broker_name?.trim()) {
      missingData.push("NEMT broker assignment");
    }

    return missingData;
  }, [formData]);

  const canCreateRequest = useMemo(() => {
    return (
      (client.available_nemt_brokers?.length ?? 0) > 0 &&
      !client.is_inactive &&
      getMissingClientData().length === 0
    );
  }, [client, getMissingClientData]);

  // Validate time range
  const validateTimeRange = useCallback(() => {
    if (!formData.appointment_start_time || !formData.appointment_end_time) {
      setTimeWarnings({ message: "", type: "" });
      return;
    }

    const start = formData.appointment_start_time;
    const end = formData.appointment_end_time;

    if (start >= end) {
      setTimeWarnings({
        message: "End time must be after start time",
        type: "error",
      });
      return;
    }

    // Check for very long appointments (over 8 hours)
    const startParts = start.split(":").map(Number);
    const endParts = end.split(":").map(Number);
    const startMinutes = startParts[0] * 60 + startParts[1];
    const endMinutes = endParts[0] * 60 + endParts[1];
    const durationMinutes = endMinutes - startMinutes;

    if (durationMinutes > 480) {
      setTimeWarnings({
        message: "Appointment duration exceeds 8 hours. Please verify times.",
        type: "warning",
      });
      return;
    }

    setTimeWarnings({ message: "", type: "" });
  }, [formData.appointment_start_time, formData.appointment_end_time]);

  useEffect(() => {
    validateTimeRange();
  }, [validateTimeRange]);

  // Handle form field changes
  const updateField = <K extends keyof NEMTRequestFormData>(
    field: K,
    value: NEMTRequestFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const updateServiceCheckbox = (
    key: keyof NEMTServiceCheckboxes,
    value: boolean
  ) => {
    setFormData((prev) => ({
      ...prev,
      service_checkboxes: { ...prev.service_checkboxes, [key]: value },
    }));
  };

  const updateRecurringDay = (key: keyof NEMTRecurringDays, value: boolean) => {
    setFormData((prev) => ({
      ...prev,
      recurring_days: { ...prev.recurring_days, [key]: value },
    }));
  };

  // Load previous request into form
  const loadPreviousRequest = (request: NEMTRequest) => {
    setFormData((prev) => ({
      ...prev,
      broker_name: request.broker_name || prev.broker_name,
      broker_fax: request.broker_fax || prev.broker_fax,
      dda_region: request.dda_region || prev.dda_region,
      assessor_name: request.assessor_name || prev.assessor_name,
      assessor_phone: request.assessor_phone || prev.assessor_phone,
      mobility_status: request.mobility_status || prev.mobility_status,
      pickup_address: request.pickup_address || prev.pickup_address,
      dropoff_address: request.dropoff_address || "",
      appointment_start_time: request.appointment_start_time || "",
      appointment_end_time: request.appointment_end_time || "",
      transportation_date: new Date().toISOString().split("T")[0],
      end_date: new Date().toISOString().split("T")[0],
      support_person_rides: request.support_person_rides || false,
      is_recurring: request.is_recurring || false,
      special_needs: request.special_needs || prev.special_needs,
      service_checkboxes: request.service_checkboxes || prev.service_checkboxes,
      recurring_days: request.recurring_days || prev.recurring_days,
    }));
    setErrors({});
  };

  // Form validation
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.broker_name) newErrors.broker_name = "Please select a broker";
    if (!formData.assessor_name)
      newErrors.assessor_name = "Assessor name is required";
    if (!formData.assessor_phone)
      newErrors.assessor_phone = "Assessor phone is required";
    if (!formData.mobility_status)
      newErrors.mobility_status = "Mobility status is required";
    if (!formData.pickup_address)
      newErrors.pickup_address = "Pickup address is required";
    if (!formData.dropoff_address)
      newErrors.dropoff_address = "Dropoff address is required";
    if (!formData.appointment_start_time)
      newErrors.appointment_start_time = "Start time is required";
    if (!formData.appointment_end_time)
      newErrors.appointment_end_time = "End time is required";
    if (
      formData.appointment_start_time &&
      formData.appointment_end_time &&
      formData.appointment_start_time >= formData.appointment_end_time
    ) {
      newErrors.appointment_end_time = "End time must be after start time";
    }
    if (!formData.transportation_date)
      newErrors.transportation_date = "Date is required";

    if (formData.is_recurring) {
      if (!formData.end_date)
        newErrors.end_date = "End date is required for recurring appointments";
      const hasSelectedDays = Object.values(formData.recurring_days).some(
        (day) => day
      );
      if (!hasSelectedDays)
        newErrors.recurring_days = "Please select at least one day of week";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Mutation for creating NEMT request
  const createMutation = useMutation({
    mutationFn: async (data: NEMTRequestFormData) => {
      const response = await api.post<{
        success: boolean;
        pdf_url?: string;
        message?: string;
      }>("/tenant-api/nemt-requests", data);
      return response.data;
    },
    onSuccess: (data) => {
      if (data.pdf_url) {
        window.open(data.pdf_url, "_blank");
      }
      queryClient.invalidateQueries({ queryKey: ["client", client.id] });
      onSuccess?.();
      onClose();
    },
    onError: (
      error: Error & {
        response?: { data?: { errors?: FormErrors; message?: string } };
      }
    ) => {
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      } else {
        setErrors({
          general:
            error.response?.data?.message ||
            error.message ||
            "Failed to create transportation request",
        });
      }
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (client.is_inactive) {
      setErrors({
        general:
          "This client is inactive. Transportation requests cannot be created.",
      });
      return;
    }

    const missingData = getMissingClientData();
    if (missingData.length > 0) {
      setErrors({
        general: `Cannot create transportation request. Missing required information:\n\n• ${missingData.join(
          "\n• "
        )}\n\nPlease update the client profile and broker assignments first.`,
      });
      return;
    }

    if (!validateForm()) {
      return;
    }

    // If not recurring, set end_date equal to transportation_date
    const submitData = {
      ...formData,
      end_date: formData.is_recurring
        ? formData.end_date
        : formData.transportation_date,
    };

    createMutation.mutate(submitData);
  };

  // Update recurring schedule text
  const updateRecurringSchedule = () => {
    const days = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ] as const;
    const selectedDays = days
      .filter((day) => formData.recurring_days[day])
      .map((day) => day.charAt(0).toUpperCase() + day.slice(1))
      .join(", ");

    if (selectedDays && formData.transportation_date && formData.end_date) {
      const start = new Date(formData.transportation_date);
      const end = new Date(formData.end_date);

      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        const months: string[] = [];
        const currentDate = new Date(start.getFullYear(), start.getMonth());
        const endDate = new Date(end.getFullYear(), end.getMonth());

        while (currentDate <= endDate) {
          months.push(currentDate.toLocaleString("default", { month: "long" }));
          currentDate.setMonth(currentDate.getMonth() + 1);
        }

        const monthsList = months.join(", ");
        const year = end.getFullYear();

        // Remove any existing recurring text
        const baseText = formData.special_needs
          .split("***Please schedule every")[0]
          .trim();

        updateField(
          "special_needs",
          `${baseText}\n\n***Please schedule every ${selectedDays} through ${monthsList}, ${year}.***`
        );
      }
    }
  };

  const missingData = getMissingClientData();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New NEMT Request" size="xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Warning for missing data */}
        {!canCreateRequest && !client.is_inactive && missingData.length > 0 && (
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
            <div className="flex items-start">
              <AlertTriangle className="w-5 h-5 mr-3 flex-shrink-0 text-yellow-600 dark:text-yellow-400" />
              <div>
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-400">
                  Cannot create transportation requests
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                  Missing required information:
                </p>
                <ul className="text-sm text-yellow-700 dark:text-yellow-300 mt-1 list-disc list-inside">
                  {missingData.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* General Error */}
        {errors.general && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
            <div className="flex items-start">
              <AlertTriangle className="w-5 h-5 mr-3 flex-shrink-0 text-red-600 dark:text-red-400" />
              <div>
                <p className="text-sm font-medium text-red-800 dark:text-red-400">
                  Unable to Create Transportation Request
                </p>
                <p className="mt-1 text-sm text-red-700 dark:text-red-300 whitespace-pre-line">
                  {errors.general}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Previous Requests Section */}
        {previousRequests.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Recent Requests
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              Click to fill the form with a previous request
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {previousRequests.map((request) => (
                <button
                  key={request.id}
                  type="button"
                  onClick={() => loadPreviousRequest(request)}
                  className="text-left border border-gray-200 dark:border-gray-700 hover:border-violet-300 dark:hover:border-violet-700 rounded-md p-2 bg-white dark:bg-gray-800 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors"
                >
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {formatDate(request.transportation_date)}
                    </span>
                    <span
                      className={cn(
                        "text-xs px-1.5 py-0.5 rounded-full",
                        request.is_recurring
                          ? "bg-violet-100 dark:bg-violet-900/50 text-violet-800 dark:text-violet-300"
                          : "bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300"
                      )}
                    >
                      {request.is_recurring ? "Recurring" : "One-time"}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
                    {request.dropoff_address}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Broker Information */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            NEMT Broker
          </label>
          {client.nemt_broker ? (
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
              <div className="text-sm text-gray-900 dark:text-gray-100">
                {client.nemt_broker.name}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {client.nemt_broker.fax && `Fax: ${client.nemt_broker.fax}`}
                {client.nemt_broker.dda_region &&
                  (client.nemt_broker.fax
                    ? ` • Region: ${client.nemt_broker.dda_region}`
                    : `Region: ${client.nemt_broker.dda_region}`)}
              </div>
            </div>
          ) : (
            <p className="text-sm text-red-600 dark:text-red-400">
              No broker assigned. Please assign a broker in the NEMT Broker
              Management section.
            </p>
          )}
          {errors.broker_name && (
            <p className="mt-1 text-sm text-red-600">{errors.broker_name}</p>
          )}
        </div>

        {/* Basic Information Section */}
        <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
          <h3 className="text-lg font-medium text-gray-500 dark:text-gray-400">
            Basic Information
          </h3>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Assessor Name
            </label>
            <input
              type="text"
              value={formData.assessor_name}
              onChange={(e) => updateField("assessor_name", e.target.value)}
              className={cn(
                "w-full px-3 py-2 border rounded-md shadow-sm focus:ring-violet-500 focus:border-violet-500 dark:bg-gray-700 dark:text-white text-sm",
                errors.assessor_name
                  ? "border-red-300"
                  : "border-gray-300 dark:border-gray-600"
              )}
              required
            />
            {errors.assessor_name && (
              <p className="mt-1 text-sm text-red-600">
                {errors.assessor_name}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Assessor Phone
            </label>
            <input
              type="text"
              value={formData.assessor_phone}
              onChange={(e) =>
                updateField("assessor_phone", formatPhoneNumber(e.target.value))
              }
              placeholder="(555) 555-5555"
              maxLength={14}
              className={cn(
                "w-full px-3 py-2 border rounded-md shadow-sm focus:ring-violet-500 focus:border-violet-500 dark:bg-gray-700 dark:text-white text-sm",
                errors.assessor_phone
                  ? "border-red-300"
                  : "border-gray-300 dark:border-gray-600"
              )}
              required
            />
            {errors.assessor_phone && (
              <p className="mt-1 text-sm text-red-600">
                {errors.assessor_phone}
              </p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Mobility Status
          </label>
          <select
            value={formData.mobility_status}
            onChange={(e) =>
              updateField(
                "mobility_status",
                e.target.value as NEMTRequestFormData["mobility_status"]
              )
            }
            className={cn(
              "w-full px-3 py-2 border rounded-md shadow-sm focus:ring-violet-500 focus:border-violet-500 dark:bg-gray-700 dark:text-white text-sm",
              errors.mobility_status
                ? "border-red-300"
                : "border-gray-300 dark:border-gray-600"
            )}
          >
            <option value="Wheelchair">Wheelchair</option>
            <option value="Walker">Walker</option>
            <option value="Cane">Cane</option>
            <option value="None">None</option>
          </select>
          {errors.mobility_status && (
            <p className="mt-1 text-sm text-red-600">
              {errors.mobility_status}
            </p>
          )}
        </div>

        {/* Address and Times Section */}
        <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
          <h3 className="text-lg font-medium text-gray-500 dark:text-gray-400">
            Address and Times
          </h3>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Pickup Address
            </label>
            <input
              type="text"
              value={formData.pickup_address}
              onChange={(e) => updateField("pickup_address", e.target.value)}
              placeholder="Street, City, State ZIP"
              className={cn(
                "w-full px-3 py-2 border rounded-md shadow-sm focus:ring-violet-500 focus:border-violet-500 dark:bg-gray-700 dark:text-white text-sm",
                errors.pickup_address
                  ? "border-red-300"
                  : "border-gray-300 dark:border-gray-600"
              )}
              required
            />
            {errors.pickup_address && (
              <p className="mt-1 text-sm text-red-600">
                {errors.pickup_address}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Dropoff Address
            </label>
            <input
              type="text"
              value={formData.dropoff_address}
              onChange={(e) => updateField("dropoff_address", e.target.value)}
              placeholder="Street, City, State ZIP"
              className={cn(
                "w-full px-3 py-2 border rounded-md shadow-sm focus:ring-violet-500 focus:border-violet-500 dark:bg-gray-700 dark:text-white text-sm",
                errors.dropoff_address
                  ? "border-red-300"
                  : "border-gray-300 dark:border-gray-600"
              )}
              required
            />
            {errors.dropoff_address && (
              <p className="mt-1 text-sm text-red-600">
                {errors.dropoff_address}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Appointment Start Time
            </label>
            <input
              type="time"
              value={formData.appointment_start_time}
              onChange={(e) =>
                updateField("appointment_start_time", e.target.value)
              }
              className={cn(
                "w-full px-3 py-2 border rounded-md shadow-sm focus:ring-violet-500 focus:border-violet-500 dark:bg-gray-700 dark:text-white text-sm",
                errors.appointment_start_time || timeWarnings.type === "error"
                  ? "border-red-300"
                  : timeWarnings.type === "warning"
                  ? "border-yellow-300"
                  : "border-gray-300 dark:border-gray-600"
              )}
              required
            />
            {errors.appointment_start_time && (
              <p className="mt-1 text-sm text-red-600">
                {errors.appointment_start_time}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Appointment End Time
            </label>
            <input
              type="time"
              value={formData.appointment_end_time}
              onChange={(e) =>
                updateField("appointment_end_time", e.target.value)
              }
              className={cn(
                "w-full px-3 py-2 border rounded-md shadow-sm focus:ring-violet-500 focus:border-violet-500 dark:bg-gray-700 dark:text-white text-sm",
                errors.appointment_end_time || timeWarnings.type === "error"
                  ? "border-red-300"
                  : timeWarnings.type === "warning"
                  ? "border-yellow-300"
                  : "border-gray-300 dark:border-gray-600"
              )}
              required
            />
            {errors.appointment_end_time && (
              <p className="mt-1 text-sm text-red-600">
                {errors.appointment_end_time}
              </p>
            )}
          </div>
        </div>

        {/* Time Warning */}
        {timeWarnings.message && (
          <div
            className={cn(
              "p-3 rounded-md border flex items-start",
              timeWarnings.type === "warning"
                ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700 text-yellow-800 dark:text-yellow-400"
                : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700 text-red-800 dark:text-red-400"
            )}
          >
            <AlertTriangle className="w-5 h-5 mr-2 flex-shrink-0" />
            <p className="text-sm">{timeWarnings.message}</p>
          </div>
        )}

        {/* Transportation Dates Section */}
        <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
          <h3 className="text-lg font-medium text-gray-500 dark:text-gray-400">
            Transportation Dates
          </h3>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={formData.transportation_date}
              onChange={(e) => {
                updateField("transportation_date", e.target.value);
                if (!formData.is_recurring) {
                  updateField("end_date", e.target.value);
                }
              }}
              min={new Date().toISOString().split("T")[0]}
              className={cn(
                "w-full px-3 py-2 border rounded-md shadow-sm focus:ring-violet-500 focus:border-violet-500 dark:bg-gray-700 dark:text-white text-sm",
                errors.transportation_date
                  ? "border-red-300"
                  : "border-gray-300 dark:border-gray-600"
              )}
              required
            />
            {errors.transportation_date && (
              <p className="mt-1 text-sm text-red-600">
                {errors.transportation_date}
              </p>
            )}
          </div>

          <div className="space-y-2 mt-6">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="support_person_rides"
                checked={formData.support_person_rides}
                onChange={(e) =>
                  updateField("support_person_rides", e.target.checked)
                }
                className="h-4 w-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
              />
              <label
                htmlFor="support_person_rides"
                className="ml-2 text-sm text-gray-700 dark:text-gray-300"
              >
                Support Person Rides
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_recurring"
                checked={formData.is_recurring}
                onChange={(e) => updateField("is_recurring", e.target.checked)}
                className="h-4 w-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
              />
              <label
                htmlFor="is_recurring"
                className="ml-2 text-sm text-gray-700 dark:text-gray-300"
              >
                Recurring Appointment
              </label>
            </div>
          </div>
        </div>

        {/* Recurring End Date */}
        {formData.is_recurring && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={formData.end_date}
              onChange={(e) => updateField("end_date", e.target.value)}
              min={formData.transportation_date}
              className={cn(
                "w-full px-3 py-2 border rounded-md shadow-sm focus:ring-violet-500 focus:border-violet-500 dark:bg-gray-700 dark:text-white text-sm",
                errors.end_date
                  ? "border-red-300"
                  : "border-gray-300 dark:border-gray-600"
              )}
              required
            />
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Select the last date for recurring transportation
            </p>
            {errors.end_date && (
              <p className="mt-1 text-sm text-red-600">{errors.end_date}</p>
            )}
          </div>
        )}

        {/* Days of Week Selection */}
        {formData.is_recurring && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Days of Week
            </label>
            <div className="grid grid-cols-4 gap-3">
              {(
                [
                  "sunday",
                  "monday",
                  "tuesday",
                  "wednesday",
                  "thursday",
                  "friday",
                  "saturday",
                ] as const
              ).map((day) => (
                <div key={day} className="flex items-center">
                  <input
                    type="checkbox"
                    id={day}
                    checked={formData.recurring_days[day]}
                    onChange={(e) => updateRecurringDay(day, e.target.checked)}
                    className={cn(
                      "h-4 w-4 text-violet-600 focus:ring-violet-500 rounded",
                      errors.recurring_days
                        ? "border-red-300"
                        : "border-gray-300"
                    )}
                  />
                  <label
                    htmlFor={day}
                    className="ml-2 text-sm text-gray-700 dark:text-gray-300 capitalize"
                  >
                    {day}
                  </label>
                </div>
              ))}
            </div>
            {errors.recurring_days && (
              <p className="mt-1 text-sm text-red-600">
                {errors.recurring_days}
              </p>
            )}
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Select which days of the week this transportation should occur
            </p>
          </div>
        )}

        {/* Special Needs Section */}
        <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
          <h3 className="text-lg font-medium text-gray-500 dark:text-gray-400">
            Special Needs & Comments
          </h3>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Special Needs / Comments
          </label>
          <textarea
            value={formData.special_needs}
            onChange={(e) => updateField("special_needs", e.target.value)}
            rows={6}
            placeholder="i.e. Client has a service dog or needs a wheelchair lift van ..etc"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-violet-500 focus:border-violet-500 dark:bg-gray-700 dark:text-white text-sm"
          />

          {formData.is_recurring && (
            <div className="flex justify-end items-center gap-2 mt-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Automatically add recurring schedule text to comments
              </span>
              <button
                type="button"
                onClick={updateRecurringSchedule}
                className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-violet-700 bg-violet-100 hover:bg-violet-200 rounded-md transition-colors"
              >
                Add Schedule
              </button>
            </div>
          )}
        </div>

        {/* Additional Options Section */}
        <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
          <h3 className="text-lg font-medium text-gray-500 dark:text-gray-400">
            Additional Options
          </h3>
        </div>

        <div>
          <button
            type="button"
            onClick={() => setShowAdditionalOptions(!showAdditionalOptions)}
            className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <ChevronDown
              className={cn(
                "w-5 h-5 mr-2 transition-transform",
                showAdditionalOptions && "rotate-180"
              )}
            />
            Additional Options
          </button>

          {showAdditionalOptions && (
            <div className="mt-4 space-y-4 bg-gray-50 dark:bg-gray-800 p-4 rounded-md">
              {/* Certification */}
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">
                  Certification
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.service_checkboxes.medicaid_eligible}
                      disabled
                      className="h-4 w-4 text-violet-600 border-gray-300 rounded"
                    />
                    <label className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                      Client is Medicaid Eligible
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.service_checkboxes.needs_transportation}
                      disabled
                      className="h-4 w-4 text-violet-600 border-gray-300 rounded"
                    />
                    <label className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                      Client needs transportation to an alternate location to
                      receive PASRR Specialized Add-on Services
                    </label>
                  </div>
                </div>
              </div>

              {/* Specialized Add-on Services */}
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">
                  Specialized add-on services
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    {
                      key: "assistive_technology",
                      label: "Assistive technology",
                    },
                    {
                      key: "staff_family_consultation",
                      label: "Staff / family consultation",
                    },
                    { key: "community_access", label: "Community Access" },
                    {
                      key: "supported_employment",
                      label: "Supported employment services",
                    },
                    { key: "community_guide", label: "Community Guide" },
                    { key: "transportation", label: "Transportation" },
                    {
                      key: "habilitative_behavior",
                      label: "Habilitative behavior support and consultation",
                    },
                    {
                      key: "habilitative_therapy",
                      label: "Habilitative therapy services",
                    },
                  ].map(({ key, label }) => (
                    <div key={key} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={
                          formData.service_checkboxes[
                            key as keyof NEMTServiceCheckboxes
                          ] || false
                        }
                        onChange={(e) =>
                          updateServiceCheckbox(
                            key as keyof NEMTServiceCheckboxes,
                            e.target.checked
                          )
                        }
                        className="h-4 w-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                      />
                      <label className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                        {label}
                      </label>
                    </div>
                  ))}
                  <div className="flex items-center col-span-2">
                    <input
                      type="checkbox"
                      checked={
                        formData.service_checkboxes.other_habilitative || false
                      }
                      onChange={(e) =>
                        updateServiceCheckbox(
                          "other_habilitative",
                          e.target.checked
                        )
                      }
                      className="h-4 w-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                      Other habilitative services and supplies
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createMutation.isPending || !canCreateRequest}
            className={cn(
              "inline-flex items-center px-4 py-2 text-sm font-medium text-white rounded-md shadow-sm",
              createMutation.isPending || !canCreateRequest
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-violet-600 hover:bg-violet-700"
            )}
          >
            {createMutation.isPending && (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            )}
            {createMutation.isPending ? "Creating..." : "Create Request"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
