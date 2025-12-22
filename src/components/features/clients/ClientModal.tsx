"use client";

import { useState, useEffect, useCallback } from "react";
import {
  X,
  Loader2,
  ChevronDown,
  Plus,
  Check,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCreateClient, useUpdateClient } from "@/hooks/useClients";
import { useCaseManagers, useCreateCaseManager } from "@/hooks/useCaseManagers";
import { useFacilities, useCreateFacility } from "@/hooks/useFacilities";
import {
  useSpecialitiesForClients,
  isTransportationService,
} from "@/hooks/useSpecialities";
import { useAuthStore } from "@/stores/auth";
import type {
  ClientFormData,
  ClientWithDetails,
  CaseManager,
  Facility,
  Speciality,
} from "@/types";
import type { SpecialityWithRate } from "@/hooks/useSpecialities";

// US States list
const US_STATES = [
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
];

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  client?: ClientWithDetails | null;
  onSuccess?: () => void;
}

const getInitialFormData = (
  client?: ClientWithDetails | null
): ClientFormData => {
  if (client) {
    // Get the most recent active unit
    const currentUnit =
      client.units?.find((u) => u.status === 1) || client.units?.[0];

    // Build units map
    const units: Record<number, number> = {};
    const currentBalance: Record<number, number> = {};
    client.specialities?.forEach((s) => {
      const unit = client.units?.find(
        (u) => u.speciality_id === s.id && u.status === 1
      );
      units[s.id] = unit?.units || 0;
      currentBalance[s.id] = unit?.current_balance || 0;
    });

    return {
      id: client.id,
      client_id: (client as unknown as { client_id?: string }).client_id || "",
      name: client.user?.name || client.full_name || "",
      email: client.user?.email || "",
      generate_email: client.user?.email?.endsWith("@empowerhub.io") || false,
      phone: client.phone || client.user?.phone || "",
      gender:
        ((client as unknown as { gender?: string }).gender as
          | "male"
          | "female"
          | "other") || "",
      date_of_birth:
        (client as unknown as { date_of_birth?: string }).date_of_birth || "",
      facility_id: client.facility_id || "",
      address: client.address?.street || "",
      city: client.address?.city || "",
      state: client.address?.state || "",
      zip: client.address?.zip || "",
      status: client.status === "active" ? "1" : "0",
      case_manager_id: client.case_manager_id || "",
      case_manager_new: false,
      case_manager_name: "",
      case_manager_email: "",
      case_manager_phone: "",
      specialities: client.specialities?.map((s) => s.id) || [],
      units,
      current_balance: currentBalance,
      authorization_id: currentUnit?.authorization_id || "",
      start_date: currentUnit?.start_date?.split("T")[0] || "",
      end_date: currentUnit?.end_date?.split("T")[0] || "",
      is_new_units: "update",
      correction_type: "update",
      units_notes: "",
      reset_balance: false,
      is_monthly: currentUnit?.is_monthly || false,
      preferences: {
        general_preferences: { languages: [], coach_gender: null },
        schedule_preferences: {
          in_home: { days: [], times: { start_time: "", end_time: "" } },
          transportation: { days: [], times: { start_time: "", end_time: "" } },
        },
        notes: "",
      },
    };
  }

  return {
    client_id: "",
    name: "",
    email: "",
    generate_email: false,
    phone: "",
    gender: "",
    date_of_birth: "",
    facility_id: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    status: "1",
    case_manager_id: "",
    case_manager_new: false,
    case_manager_name: "",
    case_manager_email: "",
    case_manager_phone: "",
    specialities: [],
    units: {},
    authorization_id: "",
    start_date: "",
    end_date: "",
    is_new_units: "update",
    correction_type: "update",
    units_notes: "",
    reset_balance: false,
    is_monthly: false,
    preferences: {
      general_preferences: { languages: [], coach_gender: null },
      schedule_preferences: {
        in_home: { days: [], times: { start_time: "", end_time: "" } },
        transportation: { days: [], times: { start_time: "", end_time: "" } },
      },
      notes: "",
    },
  };
};

export default function ClientModal({
  isOpen,
  onClose,
  client,
  onSuccess,
}: ClientModalProps) {
  const isEditing = !!client;
  const { tenant } = useAuthStore();
  const clientGoalsEnabled = tenant?.settings?.client_goals_enabled || false;

  // Form state
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<ClientFormData>(() =>
    getInitialFormData(client)
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Search states
  const [caseManagerSearch, setCaseManagerSearch] = useState("");
  const [facilitySearch, setFacilitySearch] = useState("");
  const [stateSearch, setStateSearch] = useState("");
  const [showFacilityForm, setShowFacilityForm] = useState(false);
  const [newFacility, setNewFacility] = useState({
    name: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zip: "",
  });

  // Dropdown states
  const [showCaseManagerDropdown, setShowCaseManagerDropdown] = useState(false);
  const [showFacilityDropdown, setShowFacilityDropdown] = useState(false);
  const [showStateDropdown, setShowStateDropdown] = useState(false);

  // Data hooks
  const { data: caseManagers = [], isLoading: caseManagersLoading } =
    useCaseManagers();
  const { data: facilities = [], isLoading: facilitiesLoading } =
    useFacilities();
  const { data: specialities = [], isLoading: specialitiesLoading } =
    useSpecialitiesForClients();

  // Mutation hooks
  const createClientMutation = useCreateClient();
  const updateClientMutation = useUpdateClient();
  const createCaseManagerMutation = useCreateCaseManager();
  const createFacilityMutation = useCreateFacility();

  // Reset form when modal opens - only trigger on isOpen change
  useEffect(() => {
    if (isOpen) {
      setFormData(getInitialFormData(client));
      setStep(1);
      setErrors({});
      setShowError(false);
      setCaseManagerSearch(
        client?.case_manager?.user?.name || client?.case_manager?.name || ""
      );
      setFacilitySearch(
        facilities.find((f) => f.id === client?.facility_id)?.name || ""
      );
      setStateSearch(client?.address?.state || "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Check if transportation service is selected
  const hasTransportationService = useCallback(() => {
    return formData.specialities.some((id) => {
      const spec = specialities.find((s) => s.id === id);
      return spec && isTransportationService(spec);
    });
  }, [formData.specialities, specialities]);

  // Calculate total steps
  const getTotalSteps = () => {
    let steps = 3; // Basic Info, Case Manager, Units & Services
    if (hasTransportationService()) steps++; // Preferences
    if (clientGoalsEnabled) steps++; // Goals
    return steps;
  };

  const getFinalStep = () => getTotalSteps();

  // Update form data
  const updateFormData = (updates: Partial<ClientFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  // Format phone number
  const formatPhone = (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 6)
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(
      6,
      10
    )}`;
  };

  // Format client ID
  const formatClientId = (value: string) => {
    const cleaned = value.replace(/[^0-9A-Za-z]/g, "").toUpperCase();
    if (cleaned.length === 9 && !/[A-Z]{2}$/.test(cleaned)) {
      return cleaned + "WA";
    }
    return cleaned.slice(0, 11);
  };

  // Validate email
  const isValidEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  // Validate Step 1
  const validateStep1 = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.client_id) newErrors.client_id = "Client ID is required";
    else if (!/^\d{9}[A-Z]{2}$/.test(formData.client_id)) {
      newErrors.client_id =
        "Client ID must be 9 digits followed by 2 uppercase letters";
    }

    if (!formData.name) newErrors.name = "Name is required";
    if (!formData.generate_email && !formData.email)
      newErrors.email = "Email is required";
    else if (formData.email && !isValidEmail(formData.email))
      newErrors.email = "Invalid email";
    if (!formData.gender) newErrors.gender = "Gender is required";
    if (!formData.date_of_birth)
      newErrors.date_of_birth = "Date of birth is required";
    if (!formData.facility_id) newErrors.facility_id = "Facility is required";
    if (!formData.address) newErrors.address = "Address is required";
    if (!formData.city) newErrors.city = "City is required";
    if (!formData.state) newErrors.state = "State is required";
    if (!formData.zip || formData.zip.length !== 5)
      newErrors.zip = "Valid 5-digit ZIP required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Validate Step 2
  const validateStep2 = () => {
    const newErrors: Record<string, string> = {};

    if (formData.case_manager_new) {
      if (!formData.case_manager_name)
        newErrors.case_manager_name = "Name is required";
      if (!formData.case_manager_email)
        newErrors.case_manager_email = "Email is required";
      else if (!isValidEmail(formData.case_manager_email)) {
        newErrors.case_manager_email = "Invalid email";
      }
    } else if (!formData.case_manager_id) {
      newErrors.case_manager_id = "Please select a case manager";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Validate Step 3
  const validateStep3 = () => {
    const newErrors: Record<string, string> = {};

    if (formData.specialities.length === 0) {
      newErrors.specialities = "Select at least one service";
    }

    for (const specId of formData.specialities) {
      if (!formData.units[specId] || formData.units[specId] <= 0) {
        newErrors[`units_${specId}`] = "Units must be greater than 0";
      }
    }

    if (!formData.authorization_id)
      newErrors.authorization_id = "Authorization ID is required";
    if (!formData.start_date) newErrors.start_date = "Start date is required";
    if (!formData.end_date) newErrors.end_date = "End date is required";
    if (
      formData.start_date &&
      formData.end_date &&
      new Date(formData.end_date) <= new Date(formData.start_date)
    ) {
      newErrors.end_date = "End date must be after start date";
    }

    if (
      (formData.reset_balance || formData.correction_type === "correction") &&
      !formData.units_notes
    ) {
      newErrors.units_notes = "Notes required for corrections/balance reset";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle next step
  const nextStep = async () => {
    let isValid = false;

    switch (step) {
      case 1:
        isValid = validateStep1();
        break;
      case 2:
        isValid = validateStep2();
        if (isValid && formData.case_manager_new) {
          // Create case manager first
          try {
            const newCM = await createCaseManagerMutation.mutateAsync({
              name: formData.case_manager_name,
              email: formData.case_manager_email,
              phone: formData.case_manager_phone,
            });
            updateFormData({
              case_manager_id: newCM.id,
              case_manager_new: false,
              case_manager_name: "",
              case_manager_email: "",
              case_manager_phone: "",
            });
            setCaseManagerSearch(
              newCM.user?.name || formData.case_manager_name
            );
          } catch (error) {
            setErrorMessage("Failed to create case manager");
            setShowError(true);
            return;
          }
        }
        break;
      case 3:
        isValid = validateStep3();
        break;
      default:
        isValid = true;
    }

    if (isValid) {
      setStep((prev) => prev + 1);
    }
  };

  // Handle previous step
  const prevStep = () => {
    if (step > 1) setStep((prev) => prev - 1);
    else onClose();
  };

  // Split full name into first and last name
  const splitName = (fullName: string) => {
    const trimmed = fullName.trim();
    const parts = trimmed.split(/\s+/);

    if (parts.length === 0) {
      return { first_name: "", last_name: "" };
    } else if (parts.length === 1) {
      return { first_name: parts[0], last_name: "" };
    } else {
      // First word is first name, rest is last name
      const first_name = parts[0];
      const last_name = parts.slice(1).join(" ");
      return { first_name, last_name };
    }
  };

  // Handle save
  const handleSave = async () => {
    try {
      // Split the name into first_name and last_name
      const { first_name, last_name } = splitName(formData.name);

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { name, ...formDataWithoutName } = formData;

      const payload = {
        ...formDataWithoutName,
        first_name,
        last_name,
        specialities: formData.specialities.map((id) => Number(id)),
      };

      if (isEditing && client) {
        await updateClientMutation.mutateAsync({
          id: client.id,
          data: payload as unknown as Partial<ClientWithDetails>,
        });
      } else {
        await createClientMutation.mutateAsync(
          payload as unknown as Partial<ClientWithDetails>
        );
      }

      onSuccess?.();
      onClose();
    } catch (error: unknown) {
      // Handle validation errors from backend
      if (error && typeof error === "object" && "response" in error) {
        const response = (
          error as {
            response?: {
              data?: { message?: string; errors?: Record<string, string[]> };
            };
          }
        ).response;
        if (response?.data?.errors) {
          const backendErrors: Record<string, string> = {};
          Object.entries(response.data.errors).forEach(([key, messages]) => {
            if (Array.isArray(messages) && messages.length > 0) {
              // Map first_name and last_name errors to 'name' field
              if (key === "first_name" || key === "last_name") {
                backendErrors.name = messages[0];
              } else {
                backendErrors[key] = messages[0];
              }
            }
          });
          setErrors(backendErrors);
          setErrorMessage(
            response.data.message || "Please check the form for errors"
          );
        } else {
          const errorMsg =
            response?.data?.message ||
            (error instanceof Error ? error.message : "Failed to save client");
          setErrorMessage(errorMsg);
        }
      } else {
        const errorMsg =
          error instanceof Error ? error.message : "Failed to save client";
        setErrorMessage(errorMsg);
      }
      setShowError(true);
      // Go back to step 1 if there are errors with basic info
      if (
        Object.keys(errors).some((key) =>
          [
            "client_id",
            "name",
            "email",
            "gender",
            "date_of_birth",
            "facility_id",
            "address",
            "city",
            "state",
            "zip",
          ].includes(key)
        )
      ) {
        setStep(1);
      }
    }
  };

  // Filter functions
  const filteredCaseManagers = caseManagerSearch
    ? caseManagers.filter(
        (cm) =>
          cm.user?.name
            ?.toLowerCase()
            .includes(caseManagerSearch.toLowerCase()) ||
          cm.user?.email
            ?.toLowerCase()
            .includes(caseManagerSearch.toLowerCase())
      )
    : [];

  const filteredFacilities = facilitySearch
    ? facilities.filter((f) =>
        f.name.toLowerCase().includes(facilitySearch.toLowerCase())
      )
    : [];

  const filteredStates = stateSearch
    ? US_STATES.filter((s) =>
        s.toLowerCase().includes(stateSearch.toLowerCase())
      )
    : [];

  const isLoading =
    createClientMutation.isPending || updateClientMutation.isPending;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-xl shadow-xl max-h-[90vh] overflow-hidden">
        {/* Header with Steps */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {isEditing ? "Edit Client" : "Add New Client"}
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Step Indicators */}
          <div className="flex items-center justify-between relative">
            {[
              { num: 1, label: "Basic Info" },
              { num: 2, label: "Case Manager" },
              { num: 3, label: "Units & Services" },
              ...(hasTransportationService()
                ? [{ num: 4, label: "Preferences" }]
                : []),
              ...(clientGoalsEnabled
                ? [{ num: hasTransportationService() ? 5 : 4, label: "Goals" }]
                : []),
            ].map((s, idx, arr) => (
              <div
                key={s.num}
                className="flex items-center flex-col relative z-10"
              >
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-white font-bold",
                    step >= s.num
                      ? "bg-violet-600"
                      : "bg-gray-300 dark:bg-gray-600"
                  )}
                >
                  {step > s.num ? <Check className="w-5 h-5" /> : s.num}
                </div>
                <span className="text-xs mt-1 text-gray-600 dark:text-gray-400">
                  {s.label}
                </span>
              </div>
            ))}
            {/* Progress bar */}
            <div className="absolute top-5 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-600 -z-0 mx-10">
              <div
                className="h-1 bg-violet-600 transition-all duration-300"
                style={{
                  width: `${((step - 1) / (getTotalSteps() - 1)) * 100}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {showError && (
          <div className="mx-6 mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-red-700 dark:text-red-300">
                {errorMessage}
              </p>
            </div>
            <button
              onClick={() => setShowError(false)}
              className="text-red-600 dark:text-red-400 hover:text-red-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="px-6 py-4 overflow-y-auto max-h-[50vh]">
          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div className="space-y-4">
              {/* Client ID */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Client ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.client_id}
                  onChange={(e) =>
                    updateFormData({
                      client_id: formatClientId(e.target.value),
                    })
                  }
                  placeholder="100000009WA"
                  maxLength={11}
                  readOnly={isEditing && !!formData.client_id}
                  className={cn(
                    "w-full px-4 py-2.5 rounded-lg border",
                    "focus:ring-2 focus:ring-violet-500",
                    errors.client_id
                      ? "border-red-500"
                      : "border-gray-300 dark:border-gray-600",
                    "bg-white dark:bg-gray-900 text-gray-900 dark:text-white",
                    isEditing &&
                      formData.client_id &&
                      "bg-gray-100 dark:bg-gray-700"
                  )}
                />
                {errors.client_id && (
                  <p className="mt-1 text-sm text-red-500">
                    {errors.client_id}
                  </p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Format: 9 digits + 2 letters (e.g., 100000009WA)
                </p>
              </div>

              {/* Name & Email */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => updateFormData({ name: e.target.value })}
                    className={cn(
                      "w-full px-4 py-2.5 rounded-lg border",
                      errors.name
                        ? "border-red-500"
                        : "border-gray-300 dark:border-gray-600",
                      "bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    )}
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-500">{errors.name}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => updateFormData({ email: e.target.value })}
                    disabled={formData.generate_email}
                    className={cn(
                      "w-full px-4 py-2.5 rounded-lg border",
                      errors.email
                        ? "border-red-500"
                        : "border-gray-300 dark:border-gray-600",
                      "bg-white dark:bg-gray-900 text-gray-900 dark:text-white",
                      formData.generate_email && "bg-gray-100 dark:bg-gray-700"
                    )}
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-500">{errors.email}</p>
                  )}
                  <label className="flex items-center gap-2 mt-2">
                    <input
                      type="checkbox"
                      checked={formData.generate_email}
                      onChange={(e) =>
                        updateFormData({
                          generate_email: e.target.checked,
                          email: "",
                        })
                      }
                      className="w-4 h-4 text-violet-600 rounded"
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      No email address
                    </span>
                  </label>
                </div>
              </div>

              {/* Gender & DOB */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Gender <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) =>
                      updateFormData({
                        gender: e.target.value as ClientFormData["gender"],
                      })
                    }
                    className={cn(
                      "w-full px-4 py-2.5 rounded-lg border",
                      errors.gender
                        ? "border-red-500"
                        : "border-gray-300 dark:border-gray-600",
                      "bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    )}
                  >
                    <option value="">Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                  {errors.gender && (
                    <p className="mt-1 text-sm text-red-500">{errors.gender}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Date of Birth <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.date_of_birth}
                    onChange={(e) =>
                      updateFormData({ date_of_birth: e.target.value })
                    }
                    className={cn(
                      "w-full px-4 py-2.5 rounded-lg border",
                      errors.date_of_birth
                        ? "border-red-500"
                        : "border-gray-300 dark:border-gray-600",
                      "bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    )}
                  />
                  {errors.date_of_birth && (
                    <p className="mt-1 text-sm text-red-500">
                      {errors.date_of_birth}
                    </p>
                  )}
                </div>
              </div>

              {/* Phone & Facility */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) =>
                      updateFormData({ phone: formatPhone(e.target.value) })
                    }
                    placeholder="(XXX) XXX-XXXX"
                    maxLength={14}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                </div>
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Facility <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={facilitySearch}
                        onChange={(e) => {
                          setFacilitySearch(e.target.value);
                          setShowFacilityDropdown(true);
                        }}
                        onFocus={() => setShowFacilityDropdown(true)}
                        placeholder="Search..."
                        className={cn(
                          "w-full px-4 py-2.5 rounded-lg border",
                          errors.facility_id
                            ? "border-red-500"
                            : "border-gray-300 dark:border-gray-600",
                          "bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                        )}
                      />
                      {showFacilityDropdown &&
                        filteredFacilities.length > 0 && (
                          <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-40 overflow-auto">
                            {filteredFacilities.map((f) => (
                              <div
                                key={f.id}
                                onClick={() => {
                                  updateFormData({ facility_id: f.id });
                                  setFacilitySearch(f.name);
                                  setShowFacilityDropdown(false);
                                }}
                                className="px-4 py-2 cursor-pointer hover:bg-violet-50 dark:hover:bg-violet-900/30 text-gray-900 dark:text-white"
                              >
                                {f.name}
                              </div>
                            ))}
                          </div>
                        )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowFacilityForm(true)}
                      className="px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  {errors.facility_id && (
                    <p className="mt-1 text-sm text-red-500">
                      {errors.facility_id}
                    </p>
                  )}
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Address <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) => updateFormData({ address: e.target.value })}
                  rows={2}
                  className={cn(
                    "w-full px-4 py-2.5 rounded-lg border",
                    errors.address
                      ? "border-red-500"
                      : "border-gray-300 dark:border-gray-600",
                    "bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  )}
                />
                {errors.address && (
                  <p className="mt-1 text-sm text-red-500">{errors.address}</p>
                )}
              </div>

              {/* City, State, ZIP */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => updateFormData({ city: e.target.value })}
                    className={cn(
                      "w-full px-4 py-2.5 rounded-lg border",
                      errors.city
                        ? "border-red-500"
                        : "border-gray-300 dark:border-gray-600",
                      "bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    )}
                  />
                  {errors.city && (
                    <p className="mt-1 text-sm text-red-500">{errors.city}</p>
                  )}
                </div>
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    State <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={stateSearch}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase();
                      setStateSearch(val);
                      if (val.length === 2 && US_STATES.includes(val)) {
                        updateFormData({ state: val });
                        setShowStateDropdown(false);
                      } else {
                        setShowStateDropdown(true);
                      }
                    }}
                    onFocus={() => setShowStateDropdown(true)}
                    placeholder="WA"
                    maxLength={2}
                    className={cn(
                      "w-full px-4 py-2.5 rounded-lg border",
                      errors.state
                        ? "border-red-500"
                        : "border-gray-300 dark:border-gray-600",
                      "bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    )}
                  />
                  {showStateDropdown && filteredStates.length > 0 && (
                    <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-32 overflow-auto">
                      {filteredStates.map((s) => (
                        <div
                          key={s}
                          onClick={() => {
                            updateFormData({ state: s });
                            setStateSearch(s);
                            setShowStateDropdown(false);
                          }}
                          className="px-4 py-2 cursor-pointer hover:bg-violet-50 dark:hover:bg-violet-900/30 text-gray-900 dark:text-white"
                        >
                          {s}
                        </div>
                      ))}
                    </div>
                  )}
                  {errors.state && (
                    <p className="mt-1 text-sm text-red-500">{errors.state}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    ZIP <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.zip}
                    onChange={(e) =>
                      updateFormData({
                        zip: e.target.value.replace(/\D/g, "").slice(0, 5),
                      })
                    }
                    maxLength={5}
                    className={cn(
                      "w-full px-4 py-2.5 rounded-lg border",
                      errors.zip
                        ? "border-red-500"
                        : "border-gray-300 dark:border-gray-600",
                      "bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    )}
                  />
                  {errors.zip && (
                    <p className="mt-1 text-sm text-red-500">{errors.zip}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Case Manager */}
          {step === 2 && (
            <div className="space-y-4">
              {/* Current Case Manager */}
              {formData.case_manager_id && !formData.case_manager_new && (
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-medium">Current Case Manager: </span>
                    {caseManagers.find(
                      (cm) => cm.id === Number(formData.case_manager_id)
                    )?.user?.name || "Unknown"}
                  </p>
                </div>
              )}

              {/* Search Case Manager */}
              {!formData.case_manager_new && (
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {formData.case_manager_id
                      ? "Change Case Manager"
                      : "Search Case Manager"}
                  </label>
                  <input
                    type="text"
                    value={caseManagerSearch}
                    onChange={(e) => {
                      setCaseManagerSearch(e.target.value);
                      setShowCaseManagerDropdown(true);
                    }}
                    onFocus={() => setShowCaseManagerDropdown(true)}
                    placeholder="Search by name or email..."
                    className={cn(
                      "w-full px-4 py-2.5 rounded-lg border",
                      errors.case_manager_id
                        ? "border-red-500"
                        : "border-gray-300 dark:border-gray-600",
                      "bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    )}
                  />
                  {showCaseManagerDropdown &&
                    filteredCaseManagers.length > 0 && (
                      <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-48 overflow-auto">
                        {filteredCaseManagers.map((cm) => (
                          <div
                            key={cm.id}
                            onClick={() => {
                              updateFormData({ case_manager_id: cm.id });
                              setCaseManagerSearch(cm.user?.name || "");
                              setShowCaseManagerDropdown(false);
                            }}
                            className="px-4 py-2 cursor-pointer hover:bg-violet-50 dark:hover:bg-violet-900/30"
                          >
                            <p className="text-gray-900 dark:text-white font-medium">
                              {cm.user?.name}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {cm.user?.email}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  {errors.case_manager_id && (
                    <p className="mt-1 text-sm text-red-500">
                      {errors.case_manager_id}
                    </p>
                  )}
                </div>
              )}

              {/* Toggle New Case Manager */}
              <button
                type="button"
                onClick={() =>
                  updateFormData({
                    case_manager_new: !formData.case_manager_new,
                  })
                }
                className="text-sm text-violet-600 hover:text-violet-700 dark:text-violet-400"
              >
                {formData.case_manager_new
                  ? "Cancel new case manager"
                  : "Create new case manager"}
              </button>

              {/* New Case Manager Form */}
              {formData.case_manager_new && (
                <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.case_manager_name}
                        onChange={(e) =>
                          updateFormData({ case_manager_name: e.target.value })
                        }
                        className={cn(
                          "w-full px-4 py-2.5 rounded-lg border",
                          errors.case_manager_name
                            ? "border-red-500"
                            : "border-gray-300 dark:border-gray-600",
                          "bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                        )}
                      />
                      {errors.case_manager_name && (
                        <p className="mt-1 text-sm text-red-500">
                          {errors.case_manager_name}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        value={formData.case_manager_email}
                        onChange={(e) =>
                          updateFormData({ case_manager_email: e.target.value })
                        }
                        className={cn(
                          "w-full px-4 py-2.5 rounded-lg border",
                          errors.case_manager_email
                            ? "border-red-500"
                            : "border-gray-300 dark:border-gray-600",
                          "bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                        )}
                      />
                      {errors.case_manager_email && (
                        <p className="mt-1 text-sm text-red-500">
                          {errors.case_manager_email}
                        </p>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.case_manager_phone}
                      onChange={(e) =>
                        updateFormData({
                          case_manager_phone: formatPhone(e.target.value),
                        })
                      }
                      placeholder="(XXX) XXX-XXXX"
                      maxLength={14}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Units & Services */}
          {step === 3 && (
            <div className="space-y-4">
              {/* Current Units Info (when editing) */}
              {isEditing && formData.specialities.length > 0 && (
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Current Units Status
                  </h4>
                  {formData.specialities.map((specId) => {
                    const spec = specialities.find((s) => s.id === specId);
                    return (
                      <div
                        key={specId}
                        className="flex justify-between text-sm py-1"
                      >
                        <span className="text-gray-600 dark:text-gray-400">
                          {spec?.name}
                        </span>
                        <span className="text-gray-900 dark:text-white">
                          {formData.current_balance?.[specId] || 0} /{" "}
                          {formData.units[specId] || 0} units
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Services Selection */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Select Services <span className="text-red-500">*</span>
                </h4>
                <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                  {specialitiesLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="w-5 h-5 animate-spin text-violet-600" />
                    </div>
                  ) : (
                    specialities.map((spec) => (
                      <label
                        key={spec.id}
                        className="flex items-center gap-2 py-1"
                      >
                        <input
                          type="checkbox"
                          checked={formData.specialities.includes(spec.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              updateFormData({
                                specialities: [
                                  ...formData.specialities,
                                  spec.id,
                                ],
                                units: { ...formData.units, [spec.id]: 0 },
                              });
                            } else {
                              const newSpecs = formData.specialities.filter(
                                (id) => id !== spec.id
                              );
                              const newUnits = { ...formData.units };
                              delete newUnits[spec.id];
                              updateFormData({
                                specialities: newSpecs,
                                units: newUnits,
                              });
                            }
                          }}
                          className="w-4 h-4 text-violet-600 rounded"
                        />
                        <span className="text-sm text-gray-900 dark:text-white">
                          {spec.name}
                        </span>
                        {isTransportationService(spec) && (
                          <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded">
                            Transport
                          </span>
                        )}
                      </label>
                    ))
                  )}
                </div>
                {errors.specialities && (
                  <p className="mt-1 text-sm text-red-500">
                    {errors.specialities}
                  </p>
                )}
              </div>

              {/* Unit Allocation Type (editing) */}
              {isEditing && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Unit Allocation Type
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="units_type"
                        value="update"
                        checked={formData.is_new_units === "update"}
                        onChange={() =>
                          updateFormData({ is_new_units: "update" })
                        }
                        className="w-4 h-4 text-violet-600"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        Update existing units
                      </span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="units_type"
                        value="new"
                        checked={formData.is_new_units === "new"}
                        onChange={() => updateFormData({ is_new_units: "new" })}
                        className="w-4 h-4 text-violet-600"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        Create new unit allocation
                      </span>
                    </label>
                  </div>
                </div>
              )}

              {/* Authorization ID */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Authorization ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.authorization_id}
                  onChange={(e) =>
                    updateFormData({ authorization_id: e.target.value })
                  }
                  readOnly={isEditing && formData.is_new_units === "update"}
                  className={cn(
                    "w-full px-4 py-2.5 rounded-lg border",
                    errors.authorization_id
                      ? "border-red-500"
                      : "border-gray-300 dark:border-gray-600",
                    "bg-white dark:bg-gray-900 text-gray-900 dark:text-white",
                    isEditing &&
                      formData.is_new_units === "update" &&
                      "bg-gray-100 dark:bg-gray-700"
                  )}
                />
                {errors.authorization_id && (
                  <p className="mt-1 text-sm text-red-500">
                    {errors.authorization_id}
                  </p>
                )}
              </div>

              {/* Units per Service */}
              {formData.specialities.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Units per Service
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    {formData.specialities.map((specId) => {
                      const spec = specialities.find((s) => s.id === specId);
                      return (
                        <div key={specId}>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {spec?.short_name || spec?.name}
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={formData.units[specId] || ""}
                            onChange={(e) =>
                              updateFormData({
                                units: {
                                  ...formData.units,
                                  [specId]: Number(e.target.value),
                                },
                              })
                            }
                            className={cn(
                              "w-full px-4 py-2.5 rounded-lg border",
                              errors[`units_${specId}`]
                                ? "border-red-500"
                                : "border-gray-300 dark:border-gray-600",
                              "bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                            )}
                          />
                          {errors[`units_${specId}`] && (
                            <p className="mt-1 text-sm text-red-500">
                              {errors[`units_${specId}`]}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) =>
                      updateFormData({ start_date: e.target.value })
                    }
                    readOnly={isEditing && formData.is_new_units === "update"}
                    className={cn(
                      "w-full px-4 py-2.5 rounded-lg border",
                      errors.start_date
                        ? "border-red-500"
                        : "border-gray-300 dark:border-gray-600",
                      "bg-white dark:bg-gray-900 text-gray-900 dark:text-white",
                      isEditing &&
                        formData.is_new_units === "update" &&
                        "bg-gray-100 dark:bg-gray-700"
                    )}
                  />
                  {errors.start_date && (
                    <p className="mt-1 text-sm text-red-500">
                      {errors.start_date}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    End Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) =>
                      updateFormData({ end_date: e.target.value })
                    }
                    className={cn(
                      "w-full px-4 py-2.5 rounded-lg border",
                      errors.end_date
                        ? "border-red-500"
                        : "border-gray-300 dark:border-gray-600",
                      "bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    )}
                  />
                  {errors.end_date && (
                    <p className="mt-1 text-sm text-red-500">
                      {errors.end_date}
                    </p>
                  )}
                </div>
              </div>

              {/* Monthly Toggle */}
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_monthly}
                  onChange={(e) =>
                    updateFormData({ is_monthly: e.target.checked })
                  }
                  className="w-4 h-4 text-violet-600 rounded"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Monthly Units Allocation
                </span>
              </label>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notes
                  {(formData.reset_balance ||
                    formData.correction_type === "correction") && (
                    <span className="text-red-500">*</span>
                  )}
                </label>
                <textarea
                  value={formData.units_notes}
                  onChange={(e) =>
                    updateFormData({ units_notes: e.target.value })
                  }
                  rows={2}
                  placeholder="Additional notes..."
                  className={cn(
                    "w-full px-4 py-2.5 rounded-lg border",
                    errors.units_notes
                      ? "border-red-500"
                      : "border-gray-300 dark:border-gray-600",
                    "bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  )}
                />
                {errors.units_notes && (
                  <p className="mt-1 text-sm text-red-500">
                    {errors.units_notes}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Preferences (if transportation selected) */}
          {step === 4 && hasTransportationService() && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Configure schedule preferences for transportation services.
              </p>

              {/* In-Home Schedule */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                  In-Home Service Days
                </h4>
                <div className="flex flex-wrap gap-2">
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
                    (day) => (
                      <label
                        key={day}
                        className={cn(
                          "px-3 py-1.5 rounded-lg border cursor-pointer transition-colors",
                          formData.preferences.schedule_preferences.in_home.days.includes(
                            day
                          )
                            ? "bg-violet-100 border-violet-500 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400"
                            : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
                        )}
                      >
                        <input
                          type="checkbox"
                          className="hidden"
                          checked={formData.preferences.schedule_preferences.in_home.days.includes(
                            day
                          )}
                          onChange={(e) => {
                            const days = e.target.checked
                              ? [
                                  ...formData.preferences.schedule_preferences
                                    .in_home.days,
                                  day,
                                ]
                              : formData.preferences.schedule_preferences.in_home.days.filter(
                                  (d) => d !== day
                                );
                            updateFormData({
                              preferences: {
                                ...formData.preferences,
                                schedule_preferences: {
                                  ...formData.preferences.schedule_preferences,
                                  in_home: {
                                    ...formData.preferences.schedule_preferences
                                      .in_home,
                                    days,
                                  },
                                },
                              },
                            });
                          }}
                        />
                        {day}
                      </label>
                    )
                  )}
                </div>
              </div>

              {/* Transportation Schedule */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Transportation Days
                </h4>
                <div className="flex flex-wrap gap-2">
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
                    (day) => (
                      <label
                        key={day}
                        className={cn(
                          "px-3 py-1.5 rounded-lg border cursor-pointer transition-colors",
                          formData.preferences.schedule_preferences.transportation.days.includes(
                            day
                          )
                            ? "bg-violet-100 border-violet-500 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400"
                            : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
                        )}
                      >
                        <input
                          type="checkbox"
                          className="hidden"
                          checked={formData.preferences.schedule_preferences.transportation.days.includes(
                            day
                          )}
                          onChange={(e) => {
                            const days = e.target.checked
                              ? [
                                  ...formData.preferences.schedule_preferences
                                    .transportation.days,
                                  day,
                                ]
                              : formData.preferences.schedule_preferences.transportation.days.filter(
                                  (d) => d !== day
                                );
                            updateFormData({
                              preferences: {
                                ...formData.preferences,
                                schedule_preferences: {
                                  ...formData.preferences.schedule_preferences,
                                  transportation: {
                                    ...formData.preferences.schedule_preferences
                                      .transportation,
                                    days,
                                  },
                                },
                              },
                            });
                          }}
                        />
                        {day}
                      </label>
                    )
                  )}
                </div>
              </div>

              {/* Preference Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Preference Notes
                </label>
                <textarea
                  value={formData.preferences.notes}
                  onChange={(e) =>
                    updateFormData({
                      preferences: {
                        ...formData.preferences,
                        notes: e.target.value,
                      },
                    })
                  }
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          )}

          {/* Goals Step (placeholder) */}
          {((step === 4 && !hasTransportationService() && clientGoalsEnabled) ||
            (step === 5 &&
              hasTransportationService() &&
              clientGoalsEnabled)) && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Client goals will be available after the client is created.
              </p>
              <div className="p-8 text-center bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-gray-500 dark:text-gray-400">
                  Goals management coming soon
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-between">
          <button
            type="button"
            onClick={prevStep}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            {step > 1 ? "Back" : "Cancel"}
          </button>
          <button
            type="button"
            onClick={step === getFinalStep() ? handleSave : nextStep}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : step === getFinalStep() ? (
              isEditing ? (
                "Save Changes"
              ) : (
                "Create Client"
              )
            ) : (
              "Next"
            )}
          </button>
        </div>

        {/* Facility Form Slide-over */}
        {showFacilityForm && (
          <div className="absolute inset-0 bg-white dark:bg-gray-800 z-30 flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                New Facility
              </h3>
              <button
                onClick={() => setShowFacilityForm(false)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Facility Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newFacility.name}
                  onChange={(e) =>
                    setNewFacility((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={newFacility.phone}
                  onChange={(e) =>
                    setNewFacility((prev) => ({
                      ...prev,
                      phone: formatPhone(e.target.value),
                    }))
                  }
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  value={newFacility.address}
                  onChange={(e) =>
                    setNewFacility((prev) => ({
                      ...prev,
                      address: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={newFacility.city}
                    onChange={(e) =>
                      setNewFacility((prev) => ({
                        ...prev,
                        city: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    State
                  </label>
                  <input
                    type="text"
                    value={newFacility.state}
                    onChange={(e) =>
                      setNewFacility((prev) => ({
                        ...prev,
                        state: e.target.value.toUpperCase(),
                      }))
                    }
                    maxLength={2}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    ZIP
                  </label>
                  <input
                    type="text"
                    value={newFacility.zip}
                    onChange={(e) =>
                      setNewFacility((prev) => ({
                        ...prev,
                        zip: e.target.value.replace(/\D/g, "").slice(0, 5),
                      }))
                    }
                    maxLength={5}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => setShowFacilityForm(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!newFacility.name) return;
                  try {
                    const facility = await createFacilityMutation.mutateAsync(
                      newFacility
                    );
                    updateFormData({ facility_id: facility.id });
                    setFacilitySearch(facility.name);
                    setShowFacilityForm(false);
                    setNewFacility({
                      name: "",
                      phone: "",
                      address: "",
                      city: "",
                      state: "",
                      zip: "",
                    });
                  } catch (error) {
                    console.error("Failed to create facility:", error);
                  }
                }}
                disabled={createFacilityMutation.isPending || !newFacility.name}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg disabled:opacity-50"
              >
                {createFacilityMutation.isPending
                  ? "Creating..."
                  : "Create & Select"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
