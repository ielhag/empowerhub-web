'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn } from '@/lib/utils';
import { useCreateClient, useUpdateClient, type CreateClientResult } from '@/hooks/useClients';
import { useFacilities, useCreateFacility } from '@/hooks/useFacilities';
import { useSpecialitiesForClients, type SpecialityWithRate } from '@/hooks/useSpecialities';
import { useCaseManagers, useCreateCaseManager } from '@/hooks/useCaseManagers';
import {
  Loader2, User, MapPin, Phone, Mail, Building, Calendar, FileText,
  ChevronRight, ChevronLeft, Check, Plus, Search, X, AlertCircle
} from 'lucide-react';
import type { Client, CaseManager, Facility } from '@/types';

// US States for dropdown
const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

// Helper function to build units record from existing client
function buildUnitsFromClient(client: Client): Record<string, number> {
  const units: Record<string, number> = {};
  if (client.units && Array.isArray(client.units)) {
    client.units.forEach((unit) => {
      if (unit.speciality_id) {
        units[String(unit.speciality_id)] = unit.units || 0;
      }
    });
  }
  return units;
}

// Helper to get first active unit's data for authorization, dates
function getFirstUnitData(client: Client): { authorization_id: string; start_date: string; end_date: string } {
  const defaultStartDate = new Date().toISOString().split('T')[0];
  const defaultEndDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  if (client.units && client.units.length > 0) {
    const firstUnit = client.units[0];
    return {
      authorization_id: firstUnit.authorization_id || '',
      start_date: firstUnit.start_date || defaultStartDate,
      end_date: firstUnit.end_date || defaultEndDate,
    };
  }
  return { authorization_id: '', start_date: defaultStartDate, end_date: defaultEndDate };
}

// Common preferences schema
const preferencesSchema = z.object({
  in_home: z.object({
    days: z.array(z.string()).optional(),
    start_time: z.string().optional(),
    end_time: z.string().optional(),
  }).optional(),
  transportation: z.object({
    days: z.array(z.string()).optional(),
    start_time: z.string().optional(),
    end_time: z.string().optional(),
  }).optional(),
  general_preferences: z.object({
    languages: z.array(z.string()).optional(),
    coach_gender: z.enum(['any', 'male', 'female']).optional(),
  }).optional(),
  notes: z.string().optional(),
}).optional();

// Single unified schema that works for both create and edit
const clientSchema = z.object({
  // Step 1: Personal Info
  client_id: z.string(),
  name: z.string().min(1, 'Full name is required'),
  email: z.string(),
  generate_email: z.boolean(),
  gender: z.enum(['male', 'female', 'other'], { message: 'Gender is required' }),
  date_of_birth: z.string().min(1, 'Date of birth is required'),
  phone: z.string(),
  facility_id: z.number({ message: 'Facility is required' }),
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(2, 'State is required').max(2),
  zip: z.string().min(5, 'ZIP code is required').max(10),
  status: z.number(),

  // Step 2: Case Manager
  case_manager_new: z.boolean(),
  case_manager_id: z.number().optional(),
  case_manager_name: z.string(),
  case_manager_email: z.string(),
  case_manager_phone: z.string(),

  // Step 3: Services & Units
  specialities: z.array(z.number()),
  units: z.record(z.string(), z.number().min(0)),
  authorization_id: z.string(),
  start_date: z.string(),
  end_date: z.string(),

  // Step 4: Preferences (optional)
  preferences: preferencesSchema,
});

type ClientFormData = z.infer<typeof clientSchema>;

interface ClientFormProps {
  client?: Client;
  onSuccess?: (client: Client) => void;
  onCancel?: () => void;
}

const STEPS = [
  { id: 1, title: 'Personal Info', icon: User },
  { id: 2, title: 'Case Manager', icon: Building },
  { id: 3, title: 'Services', icon: FileText },
  { id: 4, title: 'Preferences', icon: Calendar },
];

const DAYS_OF_WEEK = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export default function ClientForm({ client, onSuccess, onCancel }: ClientFormProps) {
  const router = useRouter();
  const isEditing = !!client;
  const [currentStep, setCurrentStep] = useState(1);
  const [facilitySearch, setFacilitySearch] = useState('');
  const [caseManagerSearch, setCaseManagerSearch] = useState('');
  const [showFacilityDropdown, setShowFacilityDropdown] = useState(false);
  const [showCaseManagerDropdown, setShowCaseManagerDropdown] = useState(false);
  const [showNewFacilityForm, setShowNewFacilityForm] = useState(false);
  const [createdPassword, setCreatedPassword] = useState<string | null>(null);

  // Hooks for data
  const { data: facilities = [] } = useFacilities();
  const { data: specialities = [] } = useSpecialitiesForClients();
  const { data: caseManagers = [] } = useCaseManagers();

  const createClientMutation = useCreateClient();
  const updateClientMutation = useUpdateClient();
  const createFacilityMutation = useCreateFacility();
  const createCaseManagerMutation = useCreateCaseManager();

  // Filter facilities based on search
  const filteredFacilities = useMemo(() => {
    if (!facilitySearch) return facilities.slice(0, 10);
    return facilities.filter(f =>
      f.name.toLowerCase().includes(facilitySearch.toLowerCase())
    ).slice(0, 10);
  }, [facilities, facilitySearch]);

  // Filter case managers based on search
  const filteredCaseManagers = useMemo(() => {
    if (!caseManagerSearch) return [];
    return caseManagers.filter(cm =>
      cm.name?.toLowerCase().includes(caseManagerSearch.toLowerCase()) ||
      cm.email?.toLowerCase().includes(caseManagerSearch.toLowerCase())
    ).slice(0, 10);
  }, [caseManagers, caseManagerSearch]);

  // Default start/end dates
  const defaultStartDate = new Date().toISOString().split('T')[0];
  const defaultEndDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Get existing unit data for editing
  const existingUnitData = client ? getFirstUnitData(client) : {
    authorization_id: '',
    start_date: defaultStartDate,
    end_date: defaultEndDate
  };
  const existingUnits = client ? buildUnitsFromClient(client) : {};
  const existingSpecialities = client?.units?.map(u => u.speciality_id).filter(Boolean) as number[] || [];

  // Extract address fields safely
  const getAddressField = (field: 'street' | 'city' | 'state' | 'zip'): string => {
    if (!client?.address) return field === 'state' ? 'WA' : '';
    if (typeof client.address === 'object') {
      return client.address[field] || (field === 'state' ? 'WA' : '');
    }
    return field === 'street' ? String(client.address) : (field === 'state' ? 'WA' : '');
  };

  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      client_id: client?.client_id || '',
      name: client?.full_name || client?.user?.name || '',
      email: client?.user?.email || '',
      generate_email: !isEditing, // Only generate email for new clients
      gender: (client?.gender as 'male' | 'female' | 'other') || 'male',
      date_of_birth: client?.date_of_birth || '',
      phone: client?.phone || client?.user?.phone || '',
      facility_id: client?.facility_id || 0,
      address: getAddressField('street'),
      city: getAddressField('city'),
      state: getAddressField('state'),
      zip: getAddressField('zip'),
      status: 1,
      case_manager_new: false,
      case_manager_id: client?.case_manager_id,
      case_manager_name: '',
      case_manager_email: '',
      case_manager_phone: '',
      specialities: existingSpecialities,
      units: existingUnits,
      authorization_id: existingUnitData.authorization_id,
      start_date: existingUnitData.start_date,
      end_date: existingUnitData.end_date,
      preferences: {},
    },
  });

  // Set facility search text when data loads
  useEffect(() => {
    if (client?.facility && facilities.length > 0) {
      const facility = facilities.find(f => f.id === client.facility_id);
      if (facility) {
        setFacilitySearch(facility.name);
      } else if (typeof client.facility === 'object' && client.facility.name) {
        setFacilitySearch(client.facility.name);
      }
    }
  }, [client, facilities]);

  // Set case manager search text when data loads
  useEffect(() => {
    if (client?.case_manager_id && caseManagers.length > 0) {
      const cm = caseManagers.find(c => c.id === client.case_manager_id);
      if (cm) {
        setCaseManagerSearch(cm.name || cm.email || '');
      }
    }
  }, [client, caseManagers]);

  const { watch, setValue, control, formState: { errors } } = form;
  const watchedValues = watch();
  const selectedSpecialities = watchedValues.specialities || [];
  const isNewCaseManager = watchedValues.case_manager_new;

  // Format phone number
  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '').slice(0, 10);
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 6) return `(${numbers.slice(0, 3)}) ${numbers.slice(3)}`;
    return `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6)}`;
  };

  // Capitalize city name (each word)
  const capitalizeCity = (city: string): string => {
    return city
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Format client ID
  const formatClientId = (value: string) => {
    let formatted = value.replace(/[^0-9A-Za-z]/g, '').toUpperCase().slice(0, 11);
    // Auto-append WA after 9 digits if not already letters
    if (formatted.length === 9 && !/[A-Z]{2}$/.test(formatted)) {
      formatted += 'WA';
    }
    return formatted;
  };

  // Handle step navigation
  const canProceedToNextStep = () => {
    if (currentStep === 1) {
      return !!(
        watchedValues.client_id &&
        watchedValues.name &&
        watchedValues.gender &&
        watchedValues.date_of_birth &&
        watchedValues.facility_id &&
        watchedValues.address &&
        watchedValues.city &&
        watchedValues.state &&
        watchedValues.zip
      );
    }
    if (currentStep === 2) {
      if (isNewCaseManager) {
        return !!(watchedValues.case_manager_name && watchedValues.case_manager_email);
      }
      return !!watchedValues.case_manager_id;
    }
    if (currentStep === 3) {
      return !!(
        selectedSpecialities.length > 0 &&
        watchedValues.authorization_id &&
        watchedValues.start_date &&
        watchedValues.end_date
      );
    }
    return true;
  };

  const nextStep = () => {
    if (currentStep < 4 && canProceedToNextStep()) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  // Handle form submission
  const onSubmit = async (data: ClientFormData) => {
    try {
      // Build the payload matching what backend expects
      const payload: Record<string, unknown> = {
        // Personal info
        name: data.name,
        email: data.email || undefined,
        generate_email: data.generate_email,
        gender: data.gender,
        date_of_birth: data.date_of_birth,
        phone: data.phone || undefined,
        facility_id: data.facility_id,
        address: data.address,
        city: data.city,
        state: data.state,
        zip: data.zip,
        status: data.status || 1,

        // Case manager
        case_manager_new: data.case_manager_new,
      };

      // Only include client_id for new clients
      if (!isEditing) {
        payload.client_id = data.client_id;
      }

      // Case manager - either existing or new
      if (data.case_manager_new) {
        payload.case_manager_name = data.case_manager_name;
        payload.case_manager_email = data.case_manager_email;
        payload.case_manager_phone = data.case_manager_phone;
      } else if (data.case_manager_id) {
        payload.case_manager_id = data.case_manager_id;
      }

      // Specialities and units - convert units record to proper format
      if (data.specialities && data.specialities.length > 0) {
        payload.specialities = data.specialities;

        // Units should be keyed by speciality_id (as integers in the object)
        const unitsPayload: Record<number, number> = {};
        data.specialities.forEach((specId) => {
          unitsPayload[specId] = data.units?.[String(specId)] || 0;
        });
        payload.units = unitsPayload;
      }

      // Authorization and dates
      if (data.authorization_id) {
        payload.authorization_id = data.authorization_id;
      }
      if (data.start_date) {
        payload.start_date = data.start_date;
      }
      if (data.end_date) {
        payload.end_date = data.end_date;
      }

      // Preferences - only include if set
      if (data.preferences) {
        payload.preferences = data.preferences;
      }

      if (isEditing && client) {
        // For edit, we use the update endpoint
        const result = await updateClientMutation.mutateAsync({
          id: client.id,
          data: payload as unknown as Partial<Client>,
        });
        onSuccess?.(result);
        router.push(`/clients/${client.id}`);
      } else {
        // For create, we need to handle the password response
        const result = await createClientMutation.mutateAsync(payload as unknown as Partial<Client>);

        // The create response includes the password - show it to the user
        const createResult = result as CreateClientResult;
        if (createResult.password) {
          setCreatedPassword(createResult.password);
        } else {
          onSuccess?.(createResult.client || result as unknown as Client);
          router.push('/clients');
        }
      }
    } catch (error) {
      console.error('Failed to save client:', error);
    }
  };

  const isSubmitting = createClientMutation.isPending || updateClientMutation.isPending;

  // Handle facility selection - prefill address from facility
  const selectFacility = (facility: Facility) => {
    setValue('facility_id', facility.id);
    setFacilitySearch(facility.name);
    setShowFacilityDropdown(false);

    // Check if user wants to update address (if fields already have values)
    const currentAddress = watchedValues.address;
    const currentCity = watchedValues.city;
    const hasExistingAddress = currentAddress || currentCity;

    // Prefill address fields from facility
    const hasAddressData = facility.address && (
      facility.address.street ||
      facility.address.city ||
      facility.address.state ||
      facility.address.zip
    );

    if (hasAddressData) {
      // If there's existing data and it's edit mode, ask for confirmation
      if (hasExistingAddress && isEditing) {
        const confirmUpdate = window.confirm('Do you want to update the contact details with the new facility information?');
        if (!confirmUpdate) return;
      }

      // Set all address fields (use empty string as fallback)
      setValue('address', facility.address?.street || '');
      setValue('city', facility.address?.city ? capitalizeCity(facility.address.city) : '');
      setValue('state', facility.address?.state?.toUpperCase() || 'WA');
      setValue('zip', facility.address?.zip || '');
    }
  };

  // Handle case manager selection
  const selectCaseManager = (cm: CaseManager) => {
    setValue('case_manager_id', cm.id);
    setValue('case_manager_new', false);
    setCaseManagerSearch(cm.name || cm.email || '');
    setShowCaseManagerDropdown(false);
  };

  // Toggle speciality selection
  const toggleSpeciality = (specialityId: number) => {
    const current = watchedValues.specialities || [];
    if (current.includes(specialityId)) {
      setValue('specialities', current.filter(id => id !== specialityId));
      const newUnits = { ...watchedValues.units };
      delete newUnits[String(specialityId)];
      setValue('units', newUnits);
    } else {
      setValue('specialities', [...current, specialityId]);
      setValue('units', { ...watchedValues.units, [String(specialityId)]: 0 });
    }
  };

  // If password was created, show success message
  if (createdPassword) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 max-w-md mx-auto">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
            <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Client Created Successfully
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Please save the temporary password below. It will not be shown again.
          </p>

          <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Temporary Password</p>
            <p className="text-lg font-mono font-bold text-gray-900 dark:text-white">
              {createdPassword}
            </p>
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-yellow-500 mr-2 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                Make sure to share this password securely with the client. They should change it after their first login.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => router.push('/clients')}
            className="w-full px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium transition-colors"
          >
            Go to Clients List
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {/* Error display */}
      {(createClientMutation.error || updateClientMutation.error) && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-700 dark:text-red-300">
                Failed to {isEditing ? 'update' : 'create'} client
              </p>
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                {(createClientMutation.error as Error)?.message ||
                 (updateClientMutation.error as Error)?.message ||
                 'An error occurred. Please check your input and try again.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Progress Steps */}
      <div className="flex items-center justify-center mb-8">
        {STEPS.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <button
              type="button"
              onClick={() => step.id <= currentStep && setCurrentStep(step.id)}
              className={cn(
                'flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors',
                currentStep === step.id
                  ? 'border-violet-600 bg-violet-600 text-white'
                  : currentStep > step.id
                  ? 'border-green-500 bg-green-500 text-white'
                  : 'border-gray-300 dark:border-gray-600 text-gray-400'
              )}
            >
              {currentStep > step.id ? (
                <Check className="w-5 h-5" />
              ) : (
                <step.icon className="w-5 h-5" />
              )}
            </button>
            {index < STEPS.length - 1 && (
              <div
                className={cn(
                  'w-16 h-0.5 mx-2',
                  currentStep > step.id ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        {/* Step 1: Personal Information */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Personal Information
            </h2>

            {/* Client ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Client ID {!isEditing && '*'}
              </label>
              <Controller
                name="client_id"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="text"
                    maxLength={11}
                    disabled={isEditing}
                    onChange={(e) => !isEditing && field.onChange(formatClientId(e.target.value))}
                    placeholder="100000009WA"
                    className={cn(
                      'w-full px-4 py-2.5 rounded-lg border bg-white dark:bg-gray-900',
                      'text-gray-900 dark:text-white font-mono',
                      'focus:ring-2 focus:ring-violet-500 focus:border-violet-500',
                      isEditing && 'bg-gray-100 dark:bg-gray-700 cursor-not-allowed',
                      errors.client_id ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    )}
                  />
                )}
              />
              {isEditing ? (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Client ID cannot be changed after creation
                </p>
              ) : (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Format: 9 digits followed by 2 uppercase letters (e.g., 100000009WA)
                </p>
              )}
              {errors.client_id && (
                <p className="mt-1 text-sm text-red-500">{errors.client_id.message}</p>
              )}
            </div>

            {/* Name and Email */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Full Name *
                </label>
                <input
                  {...form.register('name')}
                  type="text"
                  placeholder="John Doe or Doe, John"
                  className={cn(
                    'w-full px-4 py-2.5 rounded-lg border bg-white dark:bg-gray-900',
                    'text-gray-900 dark:text-white',
                    'focus:ring-2 focus:ring-violet-500 focus:border-violet-500',
                    errors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  )}
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <input
                  {...form.register('email')}
                  type="email"
                  disabled={!isEditing && watchedValues.generate_email}
                  placeholder="email@example.com"
                  className={cn(
                    'w-full px-4 py-2.5 rounded-lg border bg-white dark:bg-gray-900',
                    'text-gray-900 dark:text-white',
                    'focus:ring-2 focus:ring-violet-500 focus:border-violet-500',
                    !isEditing && watchedValues.generate_email && 'bg-gray-100 dark:bg-gray-700',
                    errors.email ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  )}
                />
                {!isEditing && (
                  <label className="flex items-center mt-2 text-sm text-gray-600 dark:text-gray-400">
                    <input
                      type="checkbox"
                      {...form.register('generate_email')}
                      className="mr-2 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                    />
                    Generate email automatically
                  </label>
                )}
              </div>
            </div>

            {/* Gender and DOB */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Gender *
                </label>
                <select
                  {...form.register('gender')}
                  className={cn(
                    'w-full px-4 py-2.5 rounded-lg border bg-white dark:bg-gray-900',
                    'text-gray-900 dark:text-white',
                    'focus:ring-2 focus:ring-violet-500 focus:border-violet-500',
                    errors.gender ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  )}
                >
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
                {errors.gender && (
                  <p className="mt-1 text-sm text-red-500">{errors.gender.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Date of Birth *
                </label>
                <input
                  {...form.register('date_of_birth')}
                  type="date"
                  className={cn(
                    'w-full px-4 py-2.5 rounded-lg border bg-white dark:bg-gray-900',
                    'text-gray-900 dark:text-white',
                    'focus:ring-2 focus:ring-violet-500 focus:border-violet-500',
                    errors.date_of_birth ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  )}
                />
                {errors.date_of_birth && (
                  <p className="mt-1 text-sm text-red-500">{errors.date_of_birth.message}</p>
                )}
              </div>
            </div>

            {/* Phone and Facility */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Phone
                </label>
                <Controller
                  name="phone"
                  control={control}
                  render={({ field }) => (
                    <input
                      {...field}
                      type="tel"
                      maxLength={14}
                      onChange={(e) => field.onChange(formatPhone(e.target.value))}
                      placeholder="(XXX) XXX-XXXX"
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500"
                    />
                  )}
                />
              </div>

              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Facility *
                </label>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={facilitySearch}
                      onChange={(e) => {
                        setFacilitySearch(e.target.value);
                        setShowFacilityDropdown(true);
                      }}
                      onFocus={() => setShowFacilityDropdown(true)}
                      placeholder="Search facility..."
                      className={cn(
                        'w-full px-4 py-2.5 rounded-lg border bg-white dark:bg-gray-900',
                        'text-gray-900 dark:text-white',
                        'focus:ring-2 focus:ring-violet-500 focus:border-violet-500',
                        errors.facility_id ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                      )}
                    />
                    {showFacilityDropdown && filteredFacilities.length > 0 && (
                      <div className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-800 shadow-lg rounded-md border border-gray-200 dark:border-gray-700 max-h-48 overflow-y-auto">
                        {filteredFacilities.map((facility) => (
                          <button
                            key={facility.id}
                            type="button"
                            onClick={() => selectFacility(facility)}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-violet-50 dark:hover:bg-violet-900/30 text-gray-900 dark:text-gray-200"
                          >
                            {facility.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowNewFacilityForm(true)}
                    className="px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <Plus className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  </button>
                </div>
                {errors.facility_id && (
                  <p className="mt-1 text-sm text-red-500">{errors.facility_id.message}</p>
                )}
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Address *
              </label>
              <textarea
                {...form.register('address')}
                rows={2}
                placeholder="Street address"
                className={cn(
                  'w-full px-4 py-2.5 rounded-lg border bg-white dark:bg-gray-900',
                  'text-gray-900 dark:text-white',
                  'focus:ring-2 focus:ring-violet-500 focus:border-violet-500',
                  errors.address ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                )}
              />
              {errors.address && (
                <p className="mt-1 text-sm text-red-500">{errors.address.message}</p>
              )}
            </div>

            {/* City, State, ZIP */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  City *
                </label>
                <input
                  type="text"
                  value={watchedValues.city || ''}
                  onChange={(e) => {
                    // Capitalize city as user types
                    const capitalized = capitalizeCity(e.target.value);
                    setValue('city', capitalized);
                  }}
                  className={cn(
                    'w-full px-4 py-2.5 rounded-lg border bg-white dark:bg-gray-900',
                    'text-gray-900 dark:text-white',
                    'focus:ring-2 focus:ring-violet-500 focus:border-violet-500',
                    errors.city ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  )}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  State *
                </label>
                <select
                  {...form.register('state')}
                  className={cn(
                    'w-full px-4 py-2.5 rounded-lg border bg-white dark:bg-gray-900',
                    'text-gray-900 dark:text-white',
                    'focus:ring-2 focus:ring-violet-500 focus:border-violet-500',
                    errors.state ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  )}
                >
                  {US_STATES.map((state) => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  ZIP *
                </label>
                <input
                  {...form.register('zip')}
                  type="text"
                  maxLength={5}
                  placeholder="98000"
                  className={cn(
                    'w-full px-4 py-2.5 rounded-lg border bg-white dark:bg-gray-900',
                    'text-gray-900 dark:text-white',
                    'focus:ring-2 focus:ring-violet-500 focus:border-violet-500',
                    errors.zip ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  )}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Case Manager */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Case Manager
            </h2>

            {!isNewCaseManager && (
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Search Case Manager
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={caseManagerSearch}
                    onChange={(e) => {
                      setCaseManagerSearch(e.target.value);
                      setShowCaseManagerDropdown(true);
                    }}
                    onFocus={() => setShowCaseManagerDropdown(true)}
                    placeholder="Search by name or email..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500"
                  />
                  {showCaseManagerDropdown && filteredCaseManagers.length > 0 && (
                    <div className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-800 shadow-lg rounded-md border border-gray-200 dark:border-gray-700 max-h-48 overflow-y-auto">
                      {filteredCaseManagers.map((cm) => (
                        <button
                          key={cm.id}
                          type="button"
                          onClick={() => selectCaseManager(cm)}
                          className="w-full px-4 py-2 text-left hover:bg-violet-50 dark:hover:bg-violet-900/30"
                        >
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-200">{cm.name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{cm.email}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center justify-center">
              <button
                type="button"
                onClick={() => {
                  setValue('case_manager_new', !isNewCaseManager);
                  if (!isNewCaseManager) {
                    setValue('case_manager_id', undefined);
                  }
                }}
                className="text-sm text-violet-600 hover:text-violet-700 dark:text-violet-400"
              >
                {isNewCaseManager ? 'Use existing case manager' : 'Create new case manager'}
              </button>
            </div>

            {isNewCaseManager && (
              <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                  New Case Manager
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Name *
                    </label>
                    <input
                      {...form.register('case_manager_name')}
                      type="text"
                      placeholder="Case manager name"
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Email *
                    </label>
                    <input
                      {...form.register('case_manager_email')}
                      type="email"
                      placeholder="email@example.com"
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Phone
                  </label>
                  <Controller
                    name="case_manager_phone"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="tel"
                        maxLength={14}
                        onChange={(e) => field.onChange(formatPhone(e.target.value))}
                        placeholder="(XXX) XXX-XXXX"
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500"
                      />
                    )}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Services & Units */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Services & Unit Allocation
            </h2>

            {/* Specialities Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Services *
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-4 border border-gray-200 dark:border-gray-700 rounded-lg max-h-48 overflow-y-auto">
                {specialities.map((speciality: SpecialityWithRate) => (
                  <label
                    key={speciality.id}
                    className={cn(
                      'flex items-center gap-2 p-2 rounded cursor-pointer transition-colors',
                      selectedSpecialities.includes(speciality.id)
                        ? 'bg-violet-100 dark:bg-violet-900/30'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={selectedSpecialities.includes(speciality.id)}
                      onChange={() => toggleSpeciality(speciality.id)}
                      className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                    />
                    <span className="text-sm text-gray-900 dark:text-gray-200">
                      {speciality.name}
                    </span>
                  </label>
                ))}
              </div>
              {errors.specialities && (
                <p className="mt-1 text-sm text-red-500">{errors.specialities.message}</p>
              )}
            </div>

            {/* Units per Service */}
            {selectedSpecialities.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Units per Service
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedSpecialities.map((specialityId) => {
                    const speciality = specialities.find((s: SpecialityWithRate) => s.id === specialityId);
                    if (!speciality) return null;

                    return (
                      <div key={specialityId} className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {speciality.name}
                          {speciality.rate_description && (
                            <span className="text-xs text-gray-500 ml-1">
                              ({speciality.rate_description})
                            </span>
                          )}
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={watchedValues.units[String(specialityId)] || 0}
                          onChange={(e) => {
                            setValue('units', {
                              ...watchedValues.units,
                              [String(specialityId)]: parseInt(e.target.value) || 0,
                            });
                          }}
                          className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Authorization ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Authorization ID *
              </label>
              <input
                {...form.register('authorization_id')}
                type="text"
                placeholder="Enter authorization ID"
                className={cn(
                  'w-full px-4 py-2.5 rounded-lg border bg-white dark:bg-gray-900',
                  'text-gray-900 dark:text-white',
                  'focus:ring-2 focus:ring-violet-500 focus:border-violet-500',
                  errors.authorization_id ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                )}
              />
              {errors.authorization_id && (
                <p className="mt-1 text-sm text-red-500">{errors.authorization_id.message}</p>
              )}
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Start Date *
                </label>
                <input
                  {...form.register('start_date')}
                  type="date"
                  className={cn(
                    'w-full px-4 py-2.5 rounded-lg border bg-white dark:bg-gray-900',
                    'text-gray-900 dark:text-white',
                    'focus:ring-2 focus:ring-violet-500 focus:border-violet-500',
                    errors.start_date ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  )}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  End Date *
                </label>
                <input
                  {...form.register('end_date')}
                  type="date"
                  className={cn(
                    'w-full px-4 py-2.5 rounded-lg border bg-white dark:bg-gray-900',
                    'text-gray-900 dark:text-white',
                    'focus:ring-2 focus:ring-violet-500 focus:border-violet-500',
                    errors.end_date ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  )}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Preferences (Optional) */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Preferences <span className="text-sm text-gray-500 font-normal">(Optional)</span>
            </h2>

            <p className="text-sm text-gray-600 dark:text-gray-400">
              You can set client preferences for scheduling. These settings help match clients with the right staff members.
            </p>

            {/* Languages */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Preferred Languages
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 'en', label: 'English' },
                  { value: 'es', label: 'Spanish' },
                  { value: 'fr', label: 'French' },
                  { value: 'ar', label: 'Arabic' },
                ].map((lang) => {
                  const currentLanguages = watchedValues.preferences?.general_preferences?.languages || [];
                  const isSelected = currentLanguages.includes(lang.value);

                  return (
                    <button
                      key={lang.value}
                      type="button"
                      onClick={() => {
                        const newLanguages = isSelected
                          ? currentLanguages.filter(l => l !== lang.value)
                          : [...currentLanguages, lang.value];
                        setValue('preferences.general_preferences.languages', newLanguages);
                      }}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                        isSelected
                          ? 'bg-violet-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      )}
                    >
                      {lang.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Coach Gender Preference */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Preferred Coach Gender
              </label>
              <div className="flex gap-4">
                {[
                  { value: 'any', label: 'Any' },
                  { value: 'male', label: 'Male' },
                  { value: 'female', label: 'Female' },
                ].map((option) => (
                  <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      {...form.register('preferences.general_preferences.coach_gender')}
                      value={option.value}
                      className="text-violet-600 focus:ring-violet-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Additional Notes
              </label>
              <textarea
                {...form.register('preferences.notes')}
                rows={3}
                placeholder="Any special preferences or notes..."
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={currentStep === 1 ? (onCancel || (() => router.push('/clients'))) : prevStep}
          className="flex items-center gap-2 px-4 py-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          {currentStep === 1 ? 'Cancel' : 'Previous'}
        </button>

        {currentStep < 4 ? (
          <button
            type="button"
            onClick={nextStep}
            disabled={!canProceedToNextStep()}
            className="flex items-center gap-2 px-6 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors disabled:cursor-not-allowed"
          >
            Next
            <ChevronRight className="w-5 h-5" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {isEditing ? 'Updating...' : 'Creating...'}
              </>
            ) : isEditing ? (
              'Update Client'
            ) : (
              'Create Client'
            )}
          </button>
        )}
      </div>
    </form>
  );
}
