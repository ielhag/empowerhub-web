'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, parseISO, addMinutes, isAfter, isBefore, parse } from 'date-fns';
import { cn } from '@/lib/utils';
import { useCreateAppointment, useUpdateAppointment } from '@/hooks/useAppointments';
import { useTeamMember } from '@/hooks/useTeam';
import { useAuthStore } from '@/stores/auth';
import api from '@/lib/api/client';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Calendar,
  Clock,
  MapPin,
  User,
  Users,
  Briefcase,
  Loader2,
  Search,
  X,
  AlertTriangle,
  AlertCircle,
  ChevronDown,
  Bus,
} from 'lucide-react';
import type { Appointment, Client, TeamMember, Speciality, NEMTOccurrence } from '@/types';
import { NEMTSelectorModal } from './NEMTSelectorModal';

// Form validation schema
const appointmentSchema = z.object({
  client_id: z.number().min(1, 'Please select a client'),
  team_id: z.number().optional(),
  speciality_id: z.number().min(1, 'Please select a service'),
  date: z.string().min(1, 'Please select a date'),
  start_time: z.string().min(1, 'Please select a start time'),
  duration: z.number().min(15, 'Duration must be at least 15 minutes'),
  location_type: z.enum(['in_home', 'facility', 'community', 'remote']),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
  }).optional(),
  notes: z.string().optional(),
  is_recurring: z.boolean().optional(),
  recurrence_pattern: z.enum(['daily', 'weekly', 'biweekly', 'monthly']).optional(),
  recurrence_until: z.string().optional(),
});

type AppointmentFormData = z.infer<typeof appointmentSchema>;

interface AppointmentFormProps {
  appointment?: Appointment;
  onSuccess?: (appointment: Appointment) => void;
  onCancel?: () => void;
}

type Step = 'client' | 'service' | 'datetime' | 'review';

const steps: { id: Step; label: string; icon: React.ElementType }[] = [
  { id: 'client', label: 'Select Client', icon: Users },
  { id: 'service', label: 'Service & Coach', icon: Briefcase },
  { id: 'datetime', label: 'Date & Time', icon: Calendar },
  { id: 'review', label: 'Review', icon: Check },
];

// Validation warning/error type
interface ValidationIssue {
  type: 'error' | 'warning';
  message: string;
}

export default function AppointmentForm({ appointment, onSuccess, onCancel }: AppointmentFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isFeatureEnabled } = useAuthStore();
  const isEditing = !!appointment;

  // State
  const [currentStep, setCurrentStep] = useState<Step>('client');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<TeamMember | null>(null);
  const [selectedSpeciality, setSelectedSpeciality] = useState<Speciality | null>(null);
  const [clientSearch, setClientSearch] = useState('');
  const [teamSearch, setTeamSearch] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [showTeamDropdown, setShowTeamDropdown] = useState(false);
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [clientSpecialities, setClientSpecialities] = useState<Speciality[]>([]);

  // Search results state (manual search like BackdatedAppointmentModal)
  const [clientResults, setClientResults] = useState<Client[]>([]);
  const [teamResults, setTeamResults] = useState<TeamMember[]>([]);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [teamLoading, setTeamLoading] = useState(false);

  // Unit balance state (like Blade forms)
  interface UnitBalance {
    speciality_id: number;
    speciality?: Speciality;
    balances?: Array<{
      month_year: string;
      total_remaining: number;
      total_allocated: number;
      total_used: number;
    }>;
  }
  const [clientUnits, setClientUnits] = useState<UnitBalance[]>([]);
  const [selectedMonthBalance, setSelectedMonthBalance] = useState<{
    month_year: string;
    total_remaining: number;
    total_allocated: number;
    total_used: number;
  } | null>(null);

  // Time slot availability state
  const [availableTimeSlots, setAvailableTimeSlots] = useState<Array<{ value: string; label: string }>>([]);
  const [timeSlotsLoading, setTimeSlotsLoading] = useState(false);
  const [availabilityMessage, setAvailabilityMessage] = useState('');

  // NEMT state
  const [nemtOccurrences, setNemtOccurrences] = useState<NEMTOccurrence[]>([]);
  const [selectedNemtOccurrence, setSelectedNemtOccurrence] = useState<NEMTOccurrence | null>(null);
  const [showNemtSelector, setShowNemtSelector] = useState(false);
  const [nemtLoading, setNemtLoading] = useState(false);

  // Search clients with debouncing
  useEffect(() => {
    const searchClients = async () => {
      if (clientSearch.length < 2) {
        setClientResults([]);
        return;
      }

      setClientsLoading(true);
      try {
        const response = await api.get<{ success: boolean; data: Client[] }>(
          `/tenant-api/clients/search?q=${encodeURIComponent(clientSearch)}`
        );
        setClientResults(response.data.data || []);
      } catch (err) {
        console.error('Failed to search clients:', err);
        setClientResults([]);
      } finally {
        setClientsLoading(false);
      }
    };

    const debounce = setTimeout(searchClients, 300);
    return () => clearTimeout(debounce);
  }, [clientSearch]);

  // Search team members with debouncing
  useEffect(() => {
    const searchTeam = async () => {
      if (teamSearch.length < 2) {
        setTeamResults([]);
        return;
      }

      setTeamLoading(true);
      try {
        const response = await api.get<{ success: boolean; data: TeamMember[] }>(
          `/tenant-api/team/search?q=${encodeURIComponent(teamSearch)}`
        );
        setTeamResults(response.data.data || []);
      } catch (err) {
        console.error('Failed to search team:', err);
        setTeamResults([]);
      } finally {
        setTeamLoading(false);
      }
    };

    const debounce = setTimeout(searchTeam, 300);
    return () => clearTimeout(debounce);
  }, [teamSearch]);

  // URL params for pre-filling
  const preselectedTeamId = searchParams.get('team_id');
  const preselectedDate = searchParams.get('date');

  // Fetch preselected team member
  const { data: preselectedTeamData } = useTeamMember(
    preselectedTeamId ? parseInt(preselectedTeamId) : 0
  );

  const createMutation = useCreateAppointment();
  const updateMutation = useUpdateAppointment();

  const form = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      client_id: appointment?.client_id || 0,
      team_id: appointment?.team_id,
      speciality_id: appointment?.speciality_id || 0,
      date: appointment?.date || preselectedDate || format(new Date(), 'yyyy-MM-dd'),
      start_time: appointment?.start_time || '09:00',
      duration: appointment?.duration || 60,
      location_type: appointment?.location_type || 'in_home',
      address: appointment?.address || {},
      notes: appointment?.notes || '',
      is_recurring: appointment?.is_recurring || false,
    },
  });

  // Prefill form when editing
  useEffect(() => {
    if (appointment) {
      setSelectedClient(appointment.client || null);
      setSelectedTeam(appointment.team || null);
      setSelectedSpeciality(appointment.speciality || null);
    }
  }, [appointment]);

  // Pre-fill from URL params
  useEffect(() => {
    if (preselectedTeamData && !selectedTeam) {
      // Cast to TeamMember - we only need id, name, and specialities for the form
      const teamMember: TeamMember = {
        id: preselectedTeamData.id,
        name: preselectedTeamData.name,
        email: preselectedTeamData.email,
        access_level: preselectedTeamData.access_level,
        role: preselectedTeamData.role,
        status: preselectedTeamData.status,
        specialities: preselectedTeamData.specialities,
        created_at: preselectedTeamData.created_at,
        updated_at: preselectedTeamData.updated_at,
      };
      setSelectedTeam(teamMember);
      form.setValue('team_id', preselectedTeamData.id);
    }
  }, [preselectedTeamData, selectedTeam, form]);

  useEffect(() => {
    if (preselectedDate) {
      form.setValue('date', preselectedDate);
    }
  }, [preselectedDate, form]);

  // Fetch client's specialities and unit balances when client changes
  // We use the client units endpoint which includes speciality info and balances
  useEffect(() => {
    const fetchClientSpecialities = async () => {
      if (!selectedClient?.id) {
        setClientSpecialities([]);
        setClientUnits([]);
        setSelectedMonthBalance(null);
        return;
      }

      try {
        // Get client's units which include speciality info and balances
        const response = await api.get<{ success: boolean; data: UnitBalance[] }>(
          `/tenant-api/clients/${selectedClient.id}/units`
        );
        // Store full unit data for balance lookups
        const units = response.data.data || [];
        setClientUnits(units);

        // Extract unique specialities from units
        const specialityMap = new Map<number, Speciality>();
        units.forEach(unit => {
          if (unit.speciality && unit.speciality.id) {
            specialityMap.set(unit.speciality.id, unit.speciality);
          }
        });
        const services = Array.from(specialityMap.values());
        setClientSpecialities(services);
      } catch (error) {
        console.error('Failed to fetch client specialities:', error);
        setClientSpecialities([]);
        setClientUnits([]);
      }
    };

    fetchClientSpecialities();
  }, [selectedClient?.id]);

  // Update available units for selected date and service
  useEffect(() => {
    const date = form.getValues('date');
    const specialityId = form.getValues('speciality_id');

    if (!date || !specialityId || clientUnits.length === 0) {
      setSelectedMonthBalance(null);
      return;
    }

    // Find the unit balance for the selected service
    const serviceUnit = clientUnits.find(u => u.speciality_id === specialityId);
    if (!serviceUnit?.balances) {
      setSelectedMonthBalance(null);
      return;
    }

    // Find balance for the selected month (format: YYYY-MM-01)
    const selectedMonth = format(parseISO(date), 'yyyy-MM-01');
    const monthBalance = serviceUnit.balances.find(b => b.month_year === selectedMonth);
    setSelectedMonthBalance(monthBalance || null);
  }, [form, clientUnits, form.watch('date'), form.watch('speciality_id')]);

  // Load available time slots when team, date, and speciality change
  useEffect(() => {
    const loadTimeSlots = async () => {
      const teamId = form.getValues('team_id');
      const date = form.getValues('date');
      const specialityId = form.getValues('speciality_id');

      // If no coach selected, use default time slots
      if (!teamId || !date) {
        setAvailableTimeSlots(generateDefaultTimeSlots());
        setAvailabilityMessage('');
        return;
      }

      setTimeSlotsLoading(true);
      try {
        const response = await api.get<{
          success: boolean;
          data: {
            hasAvailability: boolean;
            timeSlots?: string[];
            message?: string;
          };
        }>(`/tenant-api/team/${teamId}/availability`, {
          params: {
            date,
            speciality_id: specialityId || undefined,
            exclude_appointment_id: appointment?.id,
          },
        });

        if (response.data.data?.hasAvailability && response.data.data.timeSlots) {
          setAvailableTimeSlots(
            response.data.data.timeSlots.map(time => ({
              value: time,
              label: formatTimeSlot(time),
            }))
          );
          setAvailabilityMessage(response.data.data.message || '');
        } else {
          setAvailableTimeSlots([]);
          setAvailabilityMessage(response.data.data?.message || 'Coach is not available on this day');
        }
      } catch (error) {
        console.error('Failed to load time slots:', error);
        // Fallback to default time slots on error
        setAvailableTimeSlots(generateDefaultTimeSlots());
        setAvailabilityMessage('');
      } finally {
        setTimeSlotsLoading(false);
      }
    };

    loadTimeSlots();
  }, [form, form.watch('team_id'), form.watch('date'), form.watch('speciality_id'), appointment?.id]);

  // Fetch NEMT occurrences when client and date change
  useEffect(() => {
    const fetchNemtOccurrences = async () => {
      const clientId = form.getValues('client_id');
      const date = form.getValues('date');

      if (!clientId || !date) {
        setNemtOccurrences([]);
        return;
      }

      setNemtLoading(true);
      try {
        const response = await api.get<{ success: boolean; data: NEMTOccurrence[] }>(
          `/tenant-api/nemt-requests/occurrences/${clientId}/${date}`
        );
        setNemtOccurrences(response.data.data || []);

        // If editing and appointment has NEMT, set the selected occurrence
        if (appointment?.nemt_occurrence_id) {
          const existing = response.data.data?.find(o => o.id === appointment.nemt_occurrence_id);
          if (existing) {
            setSelectedNemtOccurrence(existing);
          }
        }
      } catch (error) {
        console.error('Failed to fetch NEMT occurrences:', error);
        setNemtOccurrences([]);
      } finally {
        setNemtLoading(false);
      }
    };

    fetchNemtOccurrences();
  }, [form, form.watch('client_id'), form.watch('date'), appointment?.nemt_occurrence_id]);

  // Generate default time slots (7 AM - 8 PM, 15-min increments)
  const generateDefaultTimeSlots = () => {
    const slots: Array<{ value: string; label: string }> = [];
    for (let hour = 7; hour < 20; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push({ value: time, label: formatTimeSlot(time) });
      }
    }
    return slots;
  };

  // Format time to 12-hour format
  const formatTimeSlot = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  // Calculate projected balance after appointment
  const projectedBalance = useMemo(() => {
    if (!selectedMonthBalance) return null;
    const duration = form.getValues('duration');
    const requiredUnits = Math.ceil(duration / 15);
    return selectedMonthBalance.total_remaining - requiredUnits;
  }, [selectedMonthBalance, form.watch('duration')]);

  // Compatible specialities: intersection of client's and coach's specialities
  // If no coach selected, show all client specialities
  // Transportation (id=2) is excluded - it's tracked via mileage on appointment details, not as a service
  const TRANSPORTATION_SPECIALITY_ID = 2;
  const compatibleSpecialities = useMemo(() => {
    let specialities: Speciality[];
    if (!selectedTeam?.specialities || selectedTeam.specialities.length === 0) {
      // No coach selected or coach has no specialities - show all client specialities
      specialities = clientSpecialities;
    } else {
      // Filter client specialities to only those the coach also has
      const coachSpecialityIds = new Set(selectedTeam.specialities.map(s => s.id));
      specialities = clientSpecialities.filter(s => coachSpecialityIds.has(s.id));
    }
    // Exclude Transportation - mileage is added to appointments via the details page, not as a service type
    return specialities.filter(s => s.id !== TRANSPORTATION_SPECIALITY_ID);
  }, [clientSpecialities, selectedTeam?.specialities]);

  // Validation function for time conflicts
  // Checks both team member conflicts and client double-booking
  const validateTimeConflict = useCallback(async (): Promise<ValidationIssue[]> => {
    const issues: ValidationIssue[] = [];
    const date = form.getValues('date');
    const startTime = form.getValues('start_time');
    const duration = form.getValues('duration');
    const teamId = form.getValues('team_id');
    const clientId = form.getValues('client_id');

    if (!date || !startTime || !clientId) return issues;

    try {
      const response = await api.post<{
        success: boolean;
        data: {
          has_conflicts: boolean;
          conflicts: Array<{
            type: 'team_conflict' | 'client_conflict';
            appointment_id: number;
            client_name?: string;
            team_name?: string;
            start_time: string;
            end_time: string;
            message: string;
          }>;
        };
      }>('/tenant-api/appointments/check-conflicts', {
        date,
        start_time: startTime,
        duration,
        team_id: teamId || null,
        client_id: clientId,
        exclude_appointment_id: appointment?.id,
      });

      if (response.data.data?.has_conflicts) {
        for (const conflict of response.data.data.conflicts) {
          issues.push({
            type: 'error',
            message: conflict.message,
          });
        }
      }
    } catch (error) {
      console.error('Failed to check conflicts:', error);
    }

    return issues;
  }, [form, appointment?.id]);

  // Validation function for speciality matching
  // Since the compatible services API already returns the intersection,
  // this validates that the selected speciality is still in the compatible list
  const validateSpecialityMatch = useCallback((): ValidationIssue[] => {
    const issues: ValidationIssue[] = [];

    if (selectedSpeciality) {
      // Check if selected speciality is in the compatible list
      const isCompatible = clientSpecialities.some(s => s.id === selectedSpeciality.id);
      if (!isCompatible && clientSpecialities.length > 0) {
        // Speciality was selected but is no longer in the compatible list
        // This can happen if coach was changed after selecting a speciality
        const message = selectedTeam
          ? `${selectedTeam.name} is not qualified to provide ${selectedSpeciality.name} service`
          : `${selectedSpeciality.name} is not available for this client`;
        issues.push({
          type: 'error',
          message,
        });
      }
    }

    return issues;
  }, [selectedTeam, selectedSpeciality, clientSpecialities]);

  // Helper to get client address from geocoded_address or build from individual fields
  const getClientAddress = useCallback(() => {
    if (!selectedClient) return null;

    // Cast to include all possible address fields from search and detail endpoints
    const client = selectedClient as unknown as {
      geocoded_address?: { address?: string; city?: string; state?: string; zip?: string; latitude?: number; longitude?: number };
      // Individual fields from search endpoint (flat)
      address?: string | { street?: string; address?: string; city?: string; state?: string; zip?: string; latitude?: number; longitude?: number };
      city?: string;
      state?: string;
      zip?: string;
    };

    // First check for geocoded_address (preferred - has coordinates for EVV)
    if (client.geocoded_address && (client.geocoded_address.address || client.geocoded_address.city)) {
      return {
        street: client.geocoded_address.address,
        city: client.geocoded_address.city,
        state: client.geocoded_address.state,
        zip: client.geocoded_address.zip,
        latitude: client.geocoded_address.latitude,
        longitude: client.geocoded_address.longitude,
        hasCoordinates: !!(client.geocoded_address.latitude && client.geocoded_address.longitude),
      };
    }

    // Check if address is an object (from detail endpoint) or string (from search endpoint)
    const addr = client.address;

    if (typeof addr === 'object' && addr !== null) {
      // Address is an object (from detail endpoint)
      return {
        street: addr.street || addr.address,
        city: addr.city,
        state: addr.state,
        zip: addr.zip,
        latitude: addr.latitude,
        longitude: addr.longitude,
        hasCoordinates: !!(addr.latitude && addr.longitude),
      };
    }

    // Address is a string or we have individual fields (from search endpoint)
    const street = typeof addr === 'string' ? addr : undefined;
    const city = client.city;
    const state = client.state;
    const zip = client.zip;

    if (street || city || state) {
      return {
        street,
        city,
        state,
        zip,
        latitude: undefined,
        longitude: undefined,
        hasCoordinates: false,
      };
    }

    return null;
  }, [selectedClient]);

  // Validation function for EVV address requirement (all appointments are client visits)
  const validateAddress = useCallback((): ValidationIssue[] => {
    const issues: ValidationIssue[] = [];

    // All appointments require client's address for EVV
    const clientAddress = getClientAddress();
    const hasClientAddress = clientAddress?.street?.trim() && clientAddress?.city?.trim();

    if (!hasClientAddress) {
      issues.push({
        type: 'warning',
        message: 'Client does not have an address on file. EVV verification will not be possible without a geocoded address.',
      });
    } else if (!clientAddress?.hasCoordinates) {
      issues.push({
        type: 'warning',
        message: 'Client address does not have GPS coordinates. Address will be geocoded when the appointment is created.',
      });
    }

    return issues;
  }, [getClientAddress]);

  // Validation function for unit balance
  const validateUnitBalance = useCallback(async (): Promise<ValidationIssue[]> => {
    const issues: ValidationIssue[] = [];
    const clientId = form.getValues('client_id');
    const specialityId = form.getValues('speciality_id');
    const date = form.getValues('date');
    const duration = form.getValues('duration');

    if (!clientId || !specialityId || !date) return issues;

    try {
      const requiredUnits = Math.ceil(duration / 15); // 15-minute units
      const response = await api.get<{
        success: boolean;
        data: {
          available_units: number;
          required_units: number;
          has_enough_units: boolean;
          message: string | null;
        };
      }>(`/tenant-api/clients/${clientId}/unit-balance`, {
        params: {
          speciality_id: specialityId,
          date,
          required_units: requiredUnits,
        },
      });

      if (response.data.data && !response.data.data.has_enough_units) {
        issues.push({
          type: 'warning',
          message: response.data.data.message || `Client has insufficient units (${response.data.data.available_units} available, ${requiredUnits} required)`,
        });
      }
    } catch (error) {
      // Unit balance check is optional, don't fail on error
      console.error('Failed to check unit balance:', error);
    }

    return issues;
  }, [form]);

  // Run all validations
  const runValidations = useCallback(async () => {
    setIsValidating(true);
    const issues: ValidationIssue[] = [];

    // Speciality match validation
    issues.push(...validateSpecialityMatch());

    // Address validation (for in-home appointments)
    issues.push(...validateAddress());

    // Only run async validations if we have necessary data
    const [timeConflictIssues, unitBalanceIssues] = await Promise.all([
      validateTimeConflict(),
      validateUnitBalance(),
    ]);
    issues.push(...timeConflictIssues, ...unitBalanceIssues);

    setValidationIssues(issues);
    setIsValidating(false);
    return issues;
  }, [validateSpecialityMatch, validateAddress, validateTimeConflict, validateUnitBalance]);

  // Validate when relevant fields change
  useEffect(() => {
    if (currentStep === 'review') {
      runValidations();
    }
  }, [currentStep, runValidations]);

  const currentStepIndex = steps.findIndex((s) => s.id === currentStep);
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;

  const goToStep = (step: Step) => {
    setCurrentStep(step);
  };

  const goNext = async () => {
    if (!isLastStep) {
      // Run validations when moving to review step
      if (steps[currentStepIndex + 1].id === 'review') {
        await runValidations();
      }
      const nextStep = steps[currentStepIndex + 1];
      setCurrentStep(nextStep.id);
    }
  };

  const goBack = () => {
    if (!isFirstStep) {
      const prevStep = steps[currentStepIndex - 1];
      setCurrentStep(prevStep.id);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 'client':
        return !!selectedClient;
      case 'service':
        return !!selectedSpeciality;
      case 'datetime':
        return form.getValues('date') && form.getValues('start_time');
      case 'review':
        // Can proceed if no errors (warnings are ok)
        return !validationIssues.some(i => i.type === 'error');
      default:
        return false;
    }
  };

  const handleClientSelect = (client: Client) => {
    setSelectedClient(client);
    form.setValue('client_id', client.id);
    setClientSearch('');
    setShowClientDropdown(false);
    // Reset speciality when client changes
    setSelectedSpeciality(null);
    form.setValue('speciality_id', 0);
  };

  const handleTeamSelect = (team: TeamMember | null) => {
    setSelectedTeam(team);
    form.setValue('team_id', team?.id);
    setTeamSearch('');
    setShowTeamDropdown(false);
    // Clear speciality - services will be re-fetched with new coach filter
    // The useEffect will fetch compatible services for this coach/client combo
    setSelectedSpeciality(null);
    form.setValue('speciality_id', 0);
  };

  const handleSpecialitySelect = (speciality: Speciality) => {
    setSelectedSpeciality(speciality);
    form.setValue('speciality_id', speciality.id);
  };

  const onSubmit = async (data: AppointmentFormData) => {
    // Check for errors before submitting
    const hasErrors = validationIssues.some(i => i.type === 'error');
    if (hasErrors) {
      return;
    }

    try {
      // Transform form data to API format
      // Combine date + start_time into full datetime
      const startDateTime = parse(
        `${data.date} ${data.start_time}`,
        'yyyy-MM-dd HH:mm',
        new Date()
      );
      const endDateTime = addMinutes(startDateTime, data.duration);

      // Generate title in the same format as Blade UI: "ServiceInitials for FirstName LastInitial."
      const generateAppointmentTitle = () => {
        if (!selectedClient || !selectedSpeciality) {
          return 'Appointment';
        }

        // Get service initials by splitting on spaces and &, taking first letter of each word
        const serviceInitials = selectedSpeciality.name
          .split(/[\s&]+/)
          .map((word: string) => word.charAt(0))
          .join('')
          .toUpperCase();

        // Clean and normalize the client name
        const cleanName = (selectedClient.name || '')
          .trim()
          .replace(/\s+/g, ' ')
          .replace(/[^\w\s]/g, '');

        const nameParts = cleanName.split(' ').filter((part: string) => part.length > 0);

        if (nameParts.length === 0) {
          return `${serviceInitials} for Unknown`;
        }

        const firstName = nameParts[0];
        const lastInitial = nameParts.length > 1
          ? nameParts[nameParts.length - 1].charAt(0).toUpperCase() + '.'
          : '';

        const formattedName = `${firstName} ${lastInitial}`.trim();
        return `${serviceInitials} for ${formattedName}`;
      };

      const title = generateAppointmentTitle();

      const apiData = {
        client_id: data.client_id,
        team_id: data.team_id || null,
        speciality_id: data.speciality_id,
        start_time: format(startDateTime, "yyyy-MM-dd'T'HH:mm:ss"),
        end_time: format(endDateTime, "yyyy-MM-dd'T'HH:mm:ss"),
        units_required: Math.ceil(data.duration / 15), // 15-min units
        location_type: data.location_type,
        notes: data.notes || null,
        title,
        // NEMT Transportation
        nemt_occurrence_id: selectedNemtOccurrence?.id || null,
      };

      if (isEditing && appointment) {
        const result = await updateMutation.mutateAsync({
          id: appointment.id,
          data: apiData as Partial<Appointment>,
        });
        onSuccess?.(result);
      } else {
        const result = await createMutation.mutateAsync(apiData as Partial<Appointment>);
        onSuccess?.(result);
      }
      // Only navigate if no onSuccess callback was provided
      if (!onSuccess) {
        router.push('/appointments');
      }
    } catch (error) {
      console.error('Failed to save appointment:', error);
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;


  // Duration options in units (1 unit = 15 minutes, like Blade)
  const durationOptions = [
    { value: 15, label: '1 unit (15 min)', units: 1 },
    { value: 30, label: '2 units (30 min)', units: 2 },
    { value: 45, label: '3 units (45 min)', units: 3 },
    { value: 60, label: '4 units (1 hr)', units: 4 },
    { value: 75, label: '5 units (1 hr 15 min)', units: 5 },
    { value: 90, label: '6 units (1.5 hr)', units: 6 },
    { value: 105, label: '7 units (1 hr 45 min)', units: 7 },
    { value: 120, label: '8 units (2 hr)', units: 8 },
    { value: 150, label: '10 units (2.5 hr)', units: 10 },
    { value: 180, label: '12 units (3 hr)', units: 12 },
    { value: 240, label: '16 units (4 hr)', units: 16 },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Steps */}
      <div className="mb-8">
        <nav aria-label="Progress">
          <ol className="flex items-center">
            {steps.map((step, index) => {
              const isActive = step.id === currentStep;
              const isCompleted = index < currentStepIndex;
              return (
                <li
                  key={step.id}
                  className={cn('flex items-center', index < steps.length - 1 && 'flex-1')}
                >
                  <button
                    onClick={() => isCompleted && goToStep(step.id)}
                    disabled={!isCompleted && !isActive}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 rounded-lg transition-colors',
                      isActive && 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300',
                      isCompleted && 'text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20',
                      !isActive && !isCompleted && 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
                    )}
                  >
                    <div
                      className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                        isActive && 'bg-violet-600 text-white',
                        isCompleted && 'bg-violet-100 dark:bg-violet-900 text-violet-600 dark:text-violet-400',
                        !isActive && !isCompleted && 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                      )}
                    >
                      {isCompleted ? <Check className="w-4 h-4" /> : index + 1}
                    </div>
                    <span className="hidden sm:inline font-medium">{step.label}</span>
                  </button>
                  {index < steps.length - 1 && (
                    <div
                      className={cn(
                        'flex-1 h-0.5 mx-4',
                        isCompleted ? 'bg-violet-500' : 'bg-gray-200 dark:bg-gray-700'
                      )}
                    />
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      </div>

      {/* Step Content */}
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
          {/* Step 1: Client Selection */}
          {currentStep === 'client' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Select Client
                </h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Choose the client for this appointment
                </p>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search clients by name..."
                  value={clientSearch}
                  onChange={(e) => {
                    setClientSearch(e.target.value);
                    setShowClientDropdown(true);
                  }}
                  onFocus={() => setShowClientDropdown(true)}
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                />
                {clientsLoading && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 animate-spin" />
                )}

                {/* Search Results Dropdown */}
                {showClientDropdown && clientSearch.length >= 2 && (
                  <div className="absolute z-50 w-full mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 max-h-64 overflow-y-auto">
                    {clientResults.length === 0 && !clientsLoading ? (
                      <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                        No clients found
                      </div>
                    ) : (
                      clientResults.map((client) => {
                        // Get client name - API returns 'name' directly from search endpoint
                        const clientName = (client as unknown as { name?: string }).name || client.full_name || client.user?.name || 'Unknown';
                        const clientAddress = (client as unknown as { address?: { full_address?: string } }).address?.full_address ||
                          (client.address?.city && client.address?.state ? `${client.address.city}, ${client.address.state}` : '');

                        return (
                          <button
                            key={client.id}
                            type="button"
                            onClick={() => handleClientSelect(client)}
                            className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 text-left transition-colors"
                          >
                            <div className="w-10 h-10 rounded-full bg-violet-100 dark:bg-violet-900 flex items-center justify-center text-violet-700 dark:text-violet-300 font-medium">
                              {clientName.charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">
                                {clientName}
                              </p>
                              {clientAddress && (
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  {clientAddress}
                                </p>
                              )}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Selected Client Display */}
              {selectedClient && (() => {
                const clientName = (selectedClient as unknown as { name?: string }).name || selectedClient.full_name || selectedClient.user?.name || 'Unknown';
                const clientAddress = (selectedClient as unknown as { address?: { full_address?: string } }).address?.full_address ||
                  (selectedClient.address?.city && selectedClient.address?.state ? `${selectedClient.address.city}, ${selectedClient.address.state}` : '');

                return (
                  <div className="mt-4 p-4 bg-violet-50 dark:bg-violet-900/20 rounded-lg border-2 border-violet-500">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-violet-100 dark:bg-violet-900 flex items-center justify-center text-violet-700 dark:text-violet-300 font-medium">
                          {clientName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {clientName}
                          </p>
                          {clientAddress && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {clientAddress}
                            </p>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedClient(null);
                          form.setValue('client_id', 0);
                          setSelectedSpeciality(null);
                          form.setValue('speciality_id', 0);
                        }}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* Help Text */}
              {!selectedClient && clientSearch.length < 2 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Type at least 2 characters to search for clients</p>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Service & Coach */}
          {currentStep === 'service' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Service & Coach
                </h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Select the service type and optionally assign a coach
                </p>
              </div>

              {/* Coach Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Assign Coach (Optional)
                </label>

                {/* Selected Coach Display */}
                {selectedTeam && (
                  <div className="mb-3 flex items-center gap-2 p-3 bg-violet-50 dark:bg-violet-900/20 rounded-lg border border-violet-300 dark:border-violet-700">
                    <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center text-white text-sm">
                      {selectedTeam.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {selectedTeam.name}
                      </span>
                      {selectedTeam.specialities && selectedTeam.specialities.length > 0 && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {selectedTeam.specialities.map(s => s.short_name || s.name).join(', ')}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleTeamSelect(null)}
                      className="ml-auto p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                      title="Unassign coach"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Coach Search */}
                {!selectedTeam && (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search coaches..."
                      value={teamSearch}
                      onChange={(e) => {
                        setTeamSearch(e.target.value);
                        setShowTeamDropdown(true);
                      }}
                      onFocus={() => setShowTeamDropdown(true)}
                      className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    />
                    {teamLoading && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 animate-spin" />
                    )}

                    {/* Team Search Results Dropdown */}
                    {showTeamDropdown && teamSearch.length >= 2 && (
                      <div className="absolute z-50 w-full mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 max-h-48 overflow-y-auto">
                        {teamResults.length === 0 && !teamLoading ? (
                          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                            No coaches found
                          </div>
                        ) : (
                          teamResults.map((team) => (
                            <button
                              key={team.id}
                              type="button"
                              onClick={() => handleTeamSelect(team)}
                              className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 text-left transition-colors"
                            >
                              <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-sm font-medium">
                                {team.name.charAt(0)}
                              </div>
                              <div className="flex-1">
                                <span className="text-gray-900 dark:text-white">{team.name}</span>
                                {team.specialities && team.specialities.length > 0 && (
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    {team.specialities.map(s => s.short_name || s.name).join(', ')}
                                  </div>
                                )}
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}

                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  {selectedTeam
                    ? 'Click the X to unassign the coach and create an open shift'
                    : 'Leave unassigned to create an open shift'
                  }
                </p>
              </div>

              {/* Speciality Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Service Type *
                </label>

                {compatibleSpecialities.length === 0 ? (
                  <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                          No compatible services available
                        </p>
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                          {selectedTeam
                            ? `${selectedTeam.name} doesn't have any services that match the client's needs. Try selecting a different coach or leaving it unassigned.`
                            : 'This client has no services configured. Please add services to the client profile first.'
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {compatibleSpecialities.map((spec) => (
                      <button
                        key={spec.id}
                        type="button"
                        onClick={() => handleSpecialitySelect(spec)}
                        className={cn(
                          'p-4 rounded-lg border-2 text-center transition-all',
                          selectedSpeciality?.id === spec.id
                            ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-violet-300'
                        )}
                      >
                        <p className="font-medium text-gray-900 dark:text-white">
                          {spec.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {spec.short_name}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Date & Time */}
          {currentStep === 'datetime' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Date & Time
                </h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Schedule the appointment date, time, and location
                </p>
              </div>

              {/* Unit Balance Display - like Blade */}
              {selectedMonthBalance && (
                <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Unit Balance for {selectedSpeciality?.name || 'Service'}
                    </h3>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {format(parseISO(form.getValues('date') || new Date().toISOString().split('T')[0]), 'MMMM yyyy')}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {selectedMonthBalance.total_remaining}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Available</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-violet-600 dark:text-violet-400">
                        {Math.ceil(form.getValues('duration') / 15)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Required</p>
                    </div>
                    <div>
                      <p className={cn(
                        'text-2xl font-bold',
                        projectedBalance !== null && projectedBalance < 0
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-green-600 dark:text-green-400'
                      )}>
                        {projectedBalance !== null ? projectedBalance : '-'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Projected</p>
                    </div>
                  </div>
                  {projectedBalance !== null && projectedBalance < 0 && (
                    <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
                      <p className="text-xs text-red-700 dark:text-red-300 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Insufficient units. Client will be {Math.abs(projectedBalance)} units over.
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-6">
                {/* Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Date *
                  </label>
                  <input
                    type="date"
                    {...form.register('date')}
                    min={format(new Date(), 'yyyy-MM-dd')}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500"
                  />
                </div>

                {/* Time - Use dropdown when time slots available */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Start Time *
                    {timeSlotsLoading && (
                      <Loader2 className="inline w-4 h-4 ml-2 animate-spin text-gray-400" />
                    )}
                  </label>
                  {availableTimeSlots.length > 0 ? (
                    <select
                      value={form.watch('start_time')}
                      onChange={(e) => form.setValue('start_time', e.target.value)}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500"
                    >
                      <option value="">Select a time...</option>
                      {availableTimeSlots.map((slot) => (
                        <option key={slot.value} value={slot.value}>
                          {slot.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="time"
                      {...form.register('start_time')}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500"
                    />
                  )}
                  {availabilityMessage && (
                    <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                      {availabilityMessage}
                    </p>
                  )}
                </div>

                {/* Duration */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Duration (Units)
                  </label>
                  <select
                    {...form.register('duration', { valueAsNumber: true })}
                    className={cn(
                      'w-full px-4 py-3 rounded-lg border bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500',
                      projectedBalance !== null && projectedBalance < 0
                        ? 'border-amber-400 dark:border-amber-600'
                        : 'border-gray-300 dark:border-gray-600'
                    )}
                  >
                    {durationOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    1 unit = 15 minutes
                  </p>
                </div>

              </div>

              {/* Visit Location - Client's address for EVV */}
              <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="w-4 h-4 text-violet-600" />
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Visit Location
                  </h4>
                </div>
                {(() => {
                  const clientAddress = getClientAddress();
                  const hasClientAddress = clientAddress?.street?.trim() && clientAddress?.city?.trim();

                  if (hasClientAddress && clientAddress) {
                    return (
                      <div className="p-3 bg-violet-50 dark:bg-violet-900/20 rounded-lg border border-violet-200 dark:border-violet-800">
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          {`${clientAddress.street || ''}, ${clientAddress.city || ''}, ${clientAddress.state || ''} ${clientAddress.zip || ''}`.replace(/^,\s*/, '').trim()}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Client&apos;s home address (EVV location)
                          </p>
                          {clientAddress.hasCoordinates && (
                            <span className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 rounded">
                              GPS Ready
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded border border-amber-200 dark:border-amber-800">
                      <p className="text-xs text-amber-700 dark:text-amber-300 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Client does not have a home address on file. Please add one to the client profile for EVV verification.
                      </p>
                    </div>
                  );
                })()}
              </div>

              {/* NEMT Transportation Section */}
              {(nemtOccurrences.length > 0 || selectedNemtOccurrence) && (
                <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Bus className="w-4 h-4 text-violet-600" />
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Transportation (NEMT)
                      </h4>
                      {nemtLoading && (
                        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                      )}
                    </div>
                    {!selectedNemtOccurrence && nemtOccurrences.length > 0 && (
                      <span className="text-xs bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300 px-2 py-0.5 rounded-full">
                        {nemtOccurrences.length} available
                      </span>
                    )}
                  </div>

                  {selectedNemtOccurrence ? (
                    // Selected NEMT Display
                    <div className="flex items-center justify-between p-3 bg-violet-50 dark:bg-violet-900/20 rounded-lg border border-violet-200 dark:border-violet-700">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-800 flex items-center justify-center">
                          <Bus className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {selectedNemtOccurrence.nemt_request?.broker_name || selectedNemtOccurrence.broker_name || 'Transportation'}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                            {selectedNemtOccurrence.transportation_company && (
                              <span>{selectedNemtOccurrence.transportation_company}</span>
                            )}
                            {selectedNemtOccurrence.pickup_time_from && (
                              <span>
                                Pickup: {formatTimeSlot(selectedNemtOccurrence.pickup_time_from)}
                                {selectedNemtOccurrence.pickup_time_to && ` - ${formatTimeSlot(selectedNemtOccurrence.pickup_time_to)}`}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedNemtOccurrence(null)}
                        className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                        title="Unlink transportation"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    // Link NEMT Button
                    <button
                      type="button"
                      onClick={() => setShowNemtSelector(true)}
                      className="w-full p-3 border-2 border-dashed border-violet-300 dark:border-violet-600 rounded-lg text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors flex items-center justify-center gap-2"
                    >
                      <Bus className="w-4 h-4" />
                      <span className="text-sm font-medium">Link Transportation Request</span>
                    </button>
                  )}
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Notes
                </label>
                <textarea
                  {...form.register('notes')}
                  rows={3}
                  placeholder="Add any notes about this appointment..."
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500"
                />
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {currentStep === 'review' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Review Appointment
                </h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Confirm the appointment details before creating
                </p>
              </div>

              {/* Validation Issues */}
              {validationIssues.length > 0 && (
                <div className="space-y-2">
                  {validationIssues.map((issue, index) => (
                    <div
                      key={index}
                      className={cn(
                        'p-3 rounded-lg flex items-start gap-3',
                        issue.type === 'error'
                          ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                          : 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'
                      )}
                    >
                      {issue.type === 'error' ? (
                        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                      )}
                      <p className={cn(
                        'text-sm',
                        issue.type === 'error'
                          ? 'text-red-700 dark:text-red-300'
                          : 'text-amber-700 dark:text-amber-300'
                      )}>
                        {issue.message}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {isValidating && (
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Validating appointment...
                </div>
              )}

              <div className="space-y-4">
                {/* Client */}
                <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                  <Users className="w-5 h-5 text-violet-600 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Client</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {selectedClient
                        ? (selectedClient as unknown as { name?: string }).name || selectedClient.full_name || selectedClient.user?.name || 'Unknown'
                        : 'Not selected'}
                    </p>
                  </div>
                </div>

                {/* Service */}
                <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                  <Briefcase className="w-5 h-5 text-violet-600 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Service</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {selectedSpeciality?.name || 'Not selected'}
                    </p>
                  </div>
                </div>

                {/* Coach */}
                <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                  <User className="w-5 h-5 text-violet-600 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Coach</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {selectedTeam?.name || 'Unassigned (Open Shift)'}
                    </p>
                  </div>
                </div>

                {/* Date & Time */}
                <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                  <Calendar className="w-5 h-5 text-violet-600 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Date & Time</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {form.getValues('date')
                        ? format(parseISO(form.getValues('date')), 'EEEE, MMMM d, yyyy')
                        : 'Not selected'}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {form.getValues('start_time')} • {form.getValues('duration')} minutes
                    </p>
                  </div>
                </div>

                {/* Visit Location */}
                <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                  <MapPin className="w-5 h-5 text-violet-600 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Visit Location</p>
                    {(() => {
                      const clientAddress = getClientAddress();
                      const hasAddress = clientAddress?.street?.trim() && clientAddress?.city?.trim();

                      return hasAddress && clientAddress ? (
                        <>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {`${clientAddress.street || ''}, ${clientAddress.city || ''}, ${clientAddress.state || ''} ${clientAddress.zip || ''}`.replace(/^,\s*/, '').trim()}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              EVV verification required at start time
                            </p>
                            {clientAddress.hasCoordinates && (
                              <span className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 rounded">
                                GPS Ready
                              </span>
                            )}
                          </div>
                        </>
                      ) : (
                        <p className="font-medium text-amber-600 dark:text-amber-400">
                          No address on file
                        </p>
                      );
                    })()}
                  </div>
                </div>

                {/* NEMT Transportation */}
                {selectedNemtOccurrence && (
                  <div className="flex items-start gap-4 p-4 bg-violet-50 dark:bg-violet-900/20 rounded-lg border border-violet-200 dark:border-violet-700">
                    <Bus className="w-5 h-5 text-violet-600 mt-0.5" />
                    <div>
                      <p className="text-sm text-violet-600 dark:text-violet-400">Transportation (NEMT)</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {selectedNemtOccurrence.nemt_request?.broker_name || selectedNemtOccurrence.broker_name || 'Transportation Linked'}
                      </p>
                      {selectedNemtOccurrence.transportation_company && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {selectedNemtOccurrence.transportation_company}
                        </p>
                      )}
                      {selectedNemtOccurrence.pickup_time_from && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Pickup: {formatTimeSlot(selectedNemtOccurrence.pickup_time_from)}
                          {selectedNemtOccurrence.pickup_time_to && ` - ${formatTimeSlot(selectedNemtOccurrence.pickup_time_to)}`}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {form.getValues('notes') && (
                  <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Notes</p>
                    <p className="text-gray-900 dark:text-white">{form.getValues('notes')}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mt-6">
          <button
            type="button"
            onClick={isFirstStep ? onCancel : goBack}
            className="flex items-center gap-2 px-6 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {isFirstStep ? 'Cancel' : 'Back'}
          </button>

          {isLastStep ? (
            <button
              type="submit"
              disabled={isSubmitting || !canProceed()}
              className="flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {isEditing ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  {isEditing ? 'Update Appointment' : 'Create Appointment'}
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={goNext}
              disabled={!canProceed()}
              className="flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </form>

      {/* NEMT Selector Modal */}
      <NEMTSelectorModal
        isOpen={showNemtSelector}
        onClose={() => setShowNemtSelector(false)}
        occurrences={nemtOccurrences}
        selectedOccurrenceId={selectedNemtOccurrence?.id}
        appointmentDate={form.getValues('date')}
        appointmentTime={form.getValues('start_time')}
        onSelect={(occurrence) => setSelectedNemtOccurrence(occurrence)}
        onUnselect={() => setSelectedNemtOccurrence(null)}
      />
    </div>
  );
}
