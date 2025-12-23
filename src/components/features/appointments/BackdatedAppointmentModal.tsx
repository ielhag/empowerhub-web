'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useCreateBackdatedAppointment, type BackdatedAppointmentData } from '@/hooks/useAppointments';
import { useSpecialities } from '@/hooks/useScheduleBuilder';
import api from '@/lib/api/client';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import {
  X,
  Search,
  Loader2,
  AlertCircle,
  AlertTriangle,
  Calendar,
  Clock,
  User,
  Users,
  Briefcase,
  FileText,
  CheckCircle,
} from 'lucide-react';

interface BackdatedAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  preselectedDate?: string;
  preselectedTeamId?: number;
}

interface TeamMember {
  id: number;
  name: string;
}

interface Client {
  id: number;
  name: string;
  address?: {
    full_address: string;
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
  geocoded_address?: {
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    latitude?: number;
    longitude?: number;
  };
  specialities?: Array<{
    id: number;
    name: string;
    short_name: string;
  }>;
}

interface UnitBalance {
  speciality_id: number;
  speciality?: {
    id: number;
    name: string;
    short_name: string;
  };
  balances?: Array<{
    month_year: string;
    total_remaining: number;
    total_allocated: number;
    total_used: number;
  }>;
}

interface ConflictInfo {
  type: 'team_conflict' | 'client_conflict';
  appointment_id: number;
  client_name?: string;
  team_name?: string;
  start_time: string;
  end_time: string;
  message: string;
}

interface AvailableTimeSlot {
  start: string;
  end: string;
  duration_minutes: number;
}

interface BusySlot {
  type: 'team_appointment' | 'client_appointment' | 'activity';
  start: string;
  end: string;
  title: string;
  is_same_client?: boolean;
}

interface AvailabilityData {
  available_slots: AvailableTimeSlot[];
  busy_slots: BusySlot[];
  working_hours: { start: string; end: string };
  date: string;
}

interface FormData {
  team_id: number | null;
  client_id: number | null;
  service_type: number | null;
  date: string;
  start_time: string;
  duration: number;
  notes: string;
  reason: string;
}

// Duration options (units are 15 minutes each)
const DURATION_OPTIONS = [
  { value: 2, label: '30 min (2 units)' },
  { value: 4, label: '1hr (4 units)' },
  { value: 6, label: '1.5 hrs (6 units)' },
  { value: 8, label: '2 hrs (8 units)' },
  { value: 10, label: '2.5 hrs (10 units)' },
  { value: 12, label: '3 hrs (12 units)' },
  { value: 14, label: '3.5 hrs (14 units)' },
  { value: 16, label: '4 hrs (16 units)' },
  { value: 18, label: '4.5 hrs (18 units)' },
  { value: 20, label: '5 hrs (20 units)' },
  { value: 22, label: '5.5 hrs (22 units)' },
  { value: 24, label: '6 hrs (24 units)' },
  { value: 26, label: '6.5 hrs (26 units)' },
  { value: 28, label: '7 hrs (28 units)' },
  { value: 30, label: '7.5 hrs (30 units)' },
  { value: 32, label: '8 hrs (32 units)' },
];

export function BackdatedAppointmentModal({
  isOpen,
  onClose,
  onSuccess,
  preselectedDate,
  preselectedTeamId,
}: BackdatedAppointmentModalProps) {
  // Form state
  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      team_id: preselectedTeamId || null,
      client_id: null,
      service_type: null,
      date: preselectedDate || '',
      start_time: '09:00',
      duration: 4,
      notes: '',
      reason: '',
    },
  });

  // Search states
  const [coachSearch, setCoachSearch] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [showCoachResults, setShowCoachResults] = useState(false);
  const [showClientResults, setShowClientResults] = useState(false);
  const [coaches, setCoaches] = useState<TeamMember[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedCoach, setSelectedCoach] = useState<TeamMember | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isSearchingCoaches, setIsSearchingCoaches] = useState(false);
  const [isSearchingClients, setIsSearchingClients] = useState(false);

  // Conflict and balance states
  const [conflicts, setConflicts] = useState<ConflictInfo[]>([]);
  const [isCheckingConflicts, setIsCheckingConflicts] = useState(false);
  const [clientUnits, setClientUnits] = useState<UnitBalance[]>([]);
  const [selectedMonthBalance, setSelectedMonthBalance] = useState<{
    month_year: string;
    total_remaining: number;
    total_allocated: number;
    total_used: number;
  } | null>(null);
  const [clientSpecialities, setClientSpecialities] = useState<Array<{
    id: number;
    name: string;
    short_name: string;
  }>>([]);

  // Availability states
  const [availability, setAvailability] = useState<AvailabilityData | null>(null);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);

  // Mutations and queries
  const createMutation = useCreateBackdatedAppointment();
  const { data: specialities = [] } = useSpecialities();

  // Transportation speciality ID (exclude from service selection)
  const TRANSPORTATION_SPECIALITY_ID = 2;

  // Get today's date for max date
  const today = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  // Search coaches
  useEffect(() => {
    const searchCoaches = async () => {
      if (coachSearch.length < 2) {
        setCoaches([]);
        return;
      }

      setIsSearchingCoaches(true);
      try {
        const response = await api.get<{ success: boolean; data: TeamMember[] }>(
          `/tenant-api/team/search?q=${encodeURIComponent(coachSearch)}`
        );
        setCoaches(response.data.data || []);
      } catch (err) {
        console.error('Failed to search coaches:', err);
        setCoaches([]);
      } finally {
        setIsSearchingCoaches(false);
      }
    };

    const debounce = setTimeout(searchCoaches, 300);
    return () => clearTimeout(debounce);
  }, [coachSearch]);

  // Search clients
  useEffect(() => {
    const searchClients = async () => {
      if (clientSearch.length < 2) {
        setClients([]);
        return;
      }

      setIsSearchingClients(true);
      try {
        const response = await api.get<{ success: boolean; data: Client[] }>(
          `/tenant-api/clients/search?q=${encodeURIComponent(clientSearch)}`
        );
        setClients(response.data.data || []);
      } catch (err) {
        console.error('Failed to search clients:', err);
        setClients([]);
      } finally {
        setIsSearchingClients(false);
      }
    };

    const debounce = setTimeout(searchClients, 300);
    return () => clearTimeout(debounce);
  }, [clientSearch]);

  // Fetch client's specialities and unit balances when client changes
  useEffect(() => {
    const fetchClientUnits = async () => {
      if (!selectedClient?.id) {
        setClientSpecialities([]);
        setClientUnits([]);
        setSelectedMonthBalance(null);
        setValue('service_type', null);
        return;
      }

      try {
        const response = await api.get<{ success: boolean; data: UnitBalance[] }>(
          `/tenant-api/clients/${selectedClient.id}/units`
        );
        const units = response.data.data || [];
        setClientUnits(units);

        // Extract unique specialities from units (excluding transportation)
        const specialityMap = new Map<number, { id: number; name: string; short_name: string }>();
        units.forEach(unit => {
          if (unit.speciality && unit.speciality.id && unit.speciality.id !== TRANSPORTATION_SPECIALITY_ID) {
            specialityMap.set(unit.speciality.id, unit.speciality);
          }
        });
        setClientSpecialities(Array.from(specialityMap.values()));
      } catch (error) {
        console.error('Failed to fetch client units:', error);
        setClientSpecialities([]);
        setClientUnits([]);
      }
    };

    fetchClientUnits();
  }, [selectedClient?.id, setValue]);

  // Update selected month balance when service and date change
  const watchedDate = watch('date');
  const watchedServiceType = watch('service_type');
  const watchedDuration = watch('duration');

  useEffect(() => {
    if (!watchedDate || !watchedServiceType || clientUnits.length === 0) {
      setSelectedMonthBalance(null);
      return;
    }

    const serviceUnit = clientUnits.find(u => u.speciality_id === watchedServiceType);
    if (!serviceUnit?.balances) {
      setSelectedMonthBalance(null);
      return;
    }

    // Find balance for the selected month
    const selectedMonth = format(parseISO(watchedDate), 'yyyy-MM-01');
    const monthBalance = serviceUnit.balances.find(b => b.month_year === selectedMonth);
    setSelectedMonthBalance(monthBalance || null);
  }, [watchedDate, watchedServiceType, clientUnits]);

  // Check for conflicts when date/time/team/client/duration change
  const watchedTeamId = watch('team_id');
  const watchedClientId = watch('client_id');
  const watchedStartTime = watch('start_time');

  useEffect(() => {
    const checkConflicts = async () => {
      // client_id is required by the API
      if (!watchedDate || !watchedStartTime || !watchedDuration || !watchedClientId) {
        setConflicts([]);
        return;
      }

      setIsCheckingConflicts(true);
      try {
        const response = await api.post<{ success: boolean; data: { conflicts: ConflictInfo[] } }>(
          '/tenant-api/appointments/check-conflicts',
          {
            date: watchedDate,
            start_time: watchedStartTime,
            duration: watchedDuration * 15, // Convert units to minutes
            team_id: watchedTeamId || null,
            client_id: watchedClientId,
          }
        );
        setConflicts(response.data.data?.conflicts || []);
      } catch (error) {
        console.error('Failed to check conflicts:', error);
        setConflicts([]);
      } finally {
        setIsCheckingConflicts(false);
      }
    };

    const debounce = setTimeout(checkConflicts, 500);
    return () => clearTimeout(debounce);
  }, [watchedDate, watchedStartTime, watchedDuration, watchedTeamId, watchedClientId]);

  // Fetch availability when team, client, date, and duration change
  useEffect(() => {
    const fetchAvailability = async () => {
      // Need team, client, date, and duration to check availability
      if (!watchedTeamId || !watchedClientId || !watchedDate || !watchedDuration) {
        setAvailability(null);
        return;
      }

      setIsLoadingAvailability(true);
      try {
        const response = await api.post<{ success: boolean; data: AvailabilityData }>(
          '/tenant-api/appointments/backdated/check-availability',
          {
            team_id: watchedTeamId,
            client_id: watchedClientId,
            date: watchedDate,
            duration: watchedDuration,
          }
        );
        setAvailability(response.data.data);
      } catch (error) {
        console.error('Failed to fetch availability:', error);
        setAvailability(null);
      } finally {
        setIsLoadingAvailability(false);
      }
    };

    const debounce = setTimeout(fetchAvailability, 500);
    return () => clearTimeout(debounce);
  }, [watchedTeamId, watchedClientId, watchedDate, watchedDuration]);

  // Handle selecting an available time slot
  const handleSelectTimeSlot = (slot: AvailableTimeSlot) => {
    setValue('start_time', slot.start);
  };

  // Format time for display (e.g., "09:00" -> "9:00 AM")
  const formatTimeForDisplay = (timeStr: string): string => {
    try {
      const [hours, minutes] = timeStr.split(':').map(Number);
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHour = hours % 12 || 12;
      return `${displayHour}:${minutes.toString().padStart(2, '0')} ${period}`;
    } catch {
      return timeStr;
    }
  };

  // Check if selected time conflicts with any busy slot
  const selectedTimeConflict = useMemo(() => {
    if (!availability || !watchedStartTime || !watchedDuration) return null;

    // Calculate end time based on start time and duration
    const [startHours, startMinutes] = watchedStartTime.split(':').map(Number);
    const startTotalMinutes = startHours * 60 + startMinutes;
    const endTotalMinutes = startTotalMinutes + (watchedDuration * 15);
    const endHours = Math.floor(endTotalMinutes / 60);
    const endMinutes = endTotalMinutes % 60;
    const endTime = `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;

    // Check each busy slot for overlap
    for (const busy of availability.busy_slots) {
      // Check for overlap: slot starts before busy ends AND slot ends after busy starts
      if (watchedStartTime < busy.end && endTime > busy.start) {
        return {
          type: busy.type,
          title: busy.title,
          start: busy.start,
          end: busy.end,
        };
      }
    }

    return null;
  }, [availability, watchedStartTime, watchedDuration]);

  // Handle coach selection
  const handleSelectCoach = (coach: TeamMember) => {
    setSelectedCoach(coach);
    setValue('team_id', coach.id);
    setCoachSearch(coach.name);
    setShowCoachResults(false);
  };

  // Handle client selection
  const handleSelectClient = (client: Client) => {
    setSelectedClient(client);
    setValue('client_id', client.id);
    setClientSearch(client.name);
    setShowClientResults(false);
  };

  // Form submission
  const onSubmit = async (data: FormData) => {
    if (!data.team_id || !data.client_id || !data.service_type) {
      return;
    }

    try {
      await createMutation.mutateAsync({
        team_id: data.team_id,
        client_id: data.client_id,
        service_type: data.service_type,
        date: data.date,
        start_time: data.start_time,
        duration: data.duration,
        notes: data.notes,
        reason: data.reason,
      });

      reset();
      setSelectedCoach(null);
      setSelectedClient(null);
      setCoachSearch('');
      setClientSearch('');
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('Failed to create backdated appointment:', err);
    }
  };

  // Fetch preselected coach
  useEffect(() => {
    const fetchPreselectedCoach = async () => {
      if (preselectedTeamId && isOpen && !selectedCoach) {
        try {
          const response = await api.get<{ success: boolean; data: TeamMember }>(
            `/tenant-api/team/${preselectedTeamId}`
          );
          if (response.data.success) {
            const coach = response.data.data;
            setSelectedCoach(coach);
            setValue('team_id', coach.id);
            setCoachSearch(coach.name);
          }
        } catch (err) {
          console.error('Failed to fetch preselected coach:', err);
        }
      }
    };
    fetchPreselectedCoach();
  }, [preselectedTeamId, isOpen, selectedCoach, setValue]);

  // Set preselected date
  useEffect(() => {
    if (preselectedDate && isOpen) {
      setValue('date', preselectedDate);
    }
  }, [preselectedDate, isOpen, setValue]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      reset();
      setSelectedCoach(null);
      setSelectedClient(null);
      setCoachSearch('');
      setClientSearch('');
      setConflicts([]);
      setClientUnits([]);
      setClientSpecialities([]);
      setSelectedMonthBalance(null);
      setAvailability(null);
    }
  }, [isOpen, reset]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="absolute inset-y-0 right-0 flex max-w-full pl-10 sm:pl-16">
        <div className="w-screen max-w-2xl">
          <div className="flex h-full flex-col bg-white dark:bg-gray-800 shadow-xl">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Create Backdated Appointment
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Use this form to record past appointments.
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Error display */}
            {createMutation.error && (
              <div className="mx-6 mt-4 p-4 bg-red-50 dark:bg-red-900/30 rounded-lg border border-red-200 dark:border-red-700">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-red-800 dark:text-red-200">
                      Error creating appointment
                    </h4>
                    <p className="text-sm text-red-700 dark:text-red-300">
                      {(createMutation.error as Error).message}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {/* Coach and Client in grid */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Coach Selection */}
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Coach <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={coachSearch}
                        onChange={(e) => {
                          setCoachSearch(e.target.value);
                          setShowCoachResults(true);
                          if (selectedCoach) {
                            setSelectedCoach(null);
                            setValue('team_id', null);
                          }
                        }}
                        onFocus={() => setShowCoachResults(true)}
                        placeholder="Search coach by name..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                      />
                      {isSearchingCoaches && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
                      )}
                    </div>

                    {/* Coach Results */}
                    {showCoachResults && coaches.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-700 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 max-h-48 overflow-y-auto">
                        {coaches.map((coach) => (
                          <button
                            key={coach.id}
                            type="button"
                            onClick={() => handleSelectCoach(coach)}
                            className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-900 dark:text-white"
                          >
                            {coach.name}
                          </button>
                        ))}
                      </div>
                    )}
                    {errors.team_id && (
                      <p className="mt-1 text-sm text-red-500">Coach is required</p>
                    )}
                  </div>

                  {/* Client Selection */}
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Client <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={clientSearch}
                        onChange={(e) => {
                          setClientSearch(e.target.value);
                          setShowClientResults(true);
                          if (selectedClient) {
                            setSelectedClient(null);
                            setValue('client_id', null);
                          }
                        }}
                        onFocus={() => setShowClientResults(true)}
                        placeholder="Search client by name..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                      />
                      {isSearchingClients && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
                      )}
                    </div>

                    {/* Client Results */}
                    {showClientResults && clients.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-700 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 max-h-48 overflow-y-auto">
                        {clients.map((client) => (
                          <button
                            key={client.id}
                            type="button"
                            onClick={() => handleSelectClient(client)}
                            className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-900 dark:text-white"
                          >
                            {client.name}
                          </button>
                        ))}
                      </div>
                    )}
                    {errors.client_id && (
                      <p className="mt-1 text-sm text-red-500">Client is required</p>
                    )}
                  </div>
                </div>

                {/* Service Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    <Briefcase className="w-4 h-4 inline mr-1" />
                    Service Type <span className="text-red-500">*</span>
                  </label>
                  {!selectedClient ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 py-2">
                      Select a client first to see available services
                    </p>
                  ) : clientSpecialities.length === 0 ? (
                    <p className="text-sm text-amber-600 dark:text-amber-400 py-2">
                      No services available for this client
                    </p>
                  ) : (
                    <select
                      {...register('service_type', { required: true, valueAsNumber: true })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value="">Select a service</option>
                      {clientSpecialities.map((service) => (
                        <option key={service.id} value={service.id}>
                          {service.name}
                        </option>
                      ))}
                    </select>
                  )}
                  {errors.service_type && (
                    <p className="mt-1 text-sm text-red-500">Service type is required</p>
                  )}
                </div>

                {/* Unit Balance Display */}
                {selectedMonthBalance && watchedDate && (
                  <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Unit Balance
                      </h4>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {format(parseISO(watchedDate), 'MMMM yyyy')}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                          {selectedMonthBalance.total_allocated}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Allocated</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                          {selectedMonthBalance.total_used}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Used</p>
                      </div>
                      <div>
                        <p className={cn(
                          'text-2xl font-bold',
                          selectedMonthBalance.total_remaining >= watchedDuration
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                        )}>
                          {selectedMonthBalance.total_remaining}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Remaining</p>
                      </div>
                    </div>
                    {selectedMonthBalance.total_remaining < watchedDuration && (
                      <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
                        <p className="text-xs text-red-700 dark:text-red-300 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Insufficient units! Need {watchedDuration}, only {selectedMonthBalance.total_remaining} available.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Conflicts Display */}
                {isCheckingConflicts && (
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Checking for conflicts...
                  </div>
                )}
                {!isCheckingConflicts && conflicts.length > 0 && (
                  <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-medium text-amber-800 dark:text-amber-200">
                          Scheduling Conflicts Detected
                        </h4>
                        <ul className="mt-2 space-y-1">
                          {conflicts.map((conflict, idx) => (
                            <li key={idx} className="text-xs text-amber-700 dark:text-amber-300">
                              {conflict.message}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
                {!isCheckingConflicts && conflicts.length === 0 && watchedClientId && watchedDate && watchedStartTime && (
                  <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                    <CheckCircle className="w-4 h-4" />
                    No scheduling conflicts found
                  </div>
                )}

                {/* Available Time Slots */}
                {isLoadingAvailability && (
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading availability...
                  </div>
                )}
                {!isLoadingAvailability && availability && (
                  <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700 space-y-4">
                    {/* Working hours info */}
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <Clock className="w-4 h-4" />
                      <span>
                        Working hours: {formatTimeForDisplay(availability.working_hours.start)} - {formatTimeForDisplay(availability.working_hours.end)}
                      </span>
                    </div>

                    {/* Busy slots */}
                    {availability.busy_slots.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                          Existing Schedule
                        </h4>
                        <div className="space-y-2">
                          {availability.busy_slots.map((slot, index) => (
                            <div
                              key={index}
                              className={cn(
                                'flex items-center gap-3 p-2 rounded-md text-sm',
                                slot.type === 'team_appointment'
                                  ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                                  : slot.type === 'client_appointment'
                                  ? 'bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800'
                                  : 'bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800'
                              )}
                            >
                              <div className={cn(
                                'w-2 h-2 rounded-full flex-shrink-0',
                                slot.type === 'team_appointment' ? 'bg-blue-500' :
                                slot.type === 'client_appointment' ? 'bg-orange-500' : 'bg-purple-500'
                              )} />
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-gray-900 dark:text-white truncate">
                                  {slot.title}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  {formatTimeForDisplay(slot.start)} - {formatTimeForDisplay(slot.end)}
                                  {' • '}
                                  {slot.type === 'team_appointment' ? 'Team Appointment' :
                                   slot.type === 'client_appointment' ? 'Client Busy' : 'Activity'}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Available slots */}
                    {availability.available_slots.length > 0 ? (
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                          Available Time Slots (click to select)
                        </h4>
                        <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                          {availability.available_slots.map((slot, index) => (
                            <button
                              key={index}
                              type="button"
                              onClick={() => handleSelectTimeSlot(slot)}
                              className={cn(
                                'px-3 py-1.5 text-sm rounded-md border transition-colors',
                                watchedStartTime === slot.start
                                  ? 'bg-violet-100 dark:bg-violet-900/30 border-violet-500 text-violet-700 dark:text-violet-300'
                                  : 'bg-white dark:bg-gray-800 hover:bg-violet-50 dark:hover:bg-violet-900/20 border-gray-300 dark:border-gray-600 hover:border-violet-500 text-gray-700 dark:text-gray-300'
                              )}
                            >
                              {formatTimeForDisplay(slot.start)}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        No available time slots for this duration on this date
                      </div>
                    )}
                  </div>
                )}

                {/* Date, Time, Duration */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      max={today}
                      {...register('date', { required: true })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    />
                    {errors.date && (
                      <p className="mt-1 text-sm text-red-500">Date is required</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      <Clock className="w-4 h-4 inline mr-1" />
                      Start Time <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="time"
                      {...register('start_time', { required: true })}
                      className={cn(
                        "w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent",
                        selectedTimeConflict
                          ? "border-red-500 dark:border-red-500"
                          : "border-gray-300 dark:border-gray-600"
                      )}
                    />
                    {errors.start_time && (
                      <p className="mt-1 text-sm text-red-500">Start time is required</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Duration <span className="text-red-500">*</span>
                    </label>
                    <select
                      {...register('duration', { required: true, valueAsNumber: true })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      {DURATION_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Time Conflict Warning */}
                {selectedTimeConflict && (
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-medium text-red-800 dark:text-red-200">
                          Time Conflict Detected
                        </h4>
                        <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                          The selected time ({formatTimeForDisplay(watchedStartTime)}) conflicts with: <strong>{selectedTimeConflict.title}</strong>
                        </p>
                        <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                          {formatTimeForDisplay(selectedTimeConflict.start)} - {formatTimeForDisplay(selectedTimeConflict.end)}
                          {' • '}
                          {selectedTimeConflict.type === 'team_appointment' ? 'Team Appointment' :
                           selectedTimeConflict.type === 'client_appointment' ? 'Client Busy' : 'Activity'}
                        </p>
                        <p className="text-sm text-red-700 dark:text-red-300 mt-2">
                          Please select an available time slot from the list above.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Client Address (if selected) */}
                {selectedClient?.address && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Client Address
                    </label>
                    <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-300">
                      {selectedClient.address.full_address}
                    </div>
                  </div>
                )}

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    <FileText className="w-4 h-4 inline mr-1" />
                    Notes
                  </label>
                  <textarea
                    {...register('notes')}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
                    placeholder="Optional notes about the appointment..."
                  />
                </div>

                {/* Reason for Backdating */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Reason for Backdating <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    {...register('reason', { required: true, minLength: 5 })}
                    rows={2}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
                    placeholder="Please provide a reason for creating this backdated appointment..."
                  />
                  {errors.reason && (
                    <p className="mt-1 text-sm text-red-500">
                      Reason is required (minimum 5 characters)
                    </p>
                  )}
                </div>
              </div>
            </form>

            {/* Footer Actions */}
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={handleSubmit(onSubmit)}
                disabled={createMutation.isPending || !!selectedTimeConflict}
                className="px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : selectedTimeConflict ? (
                  'Time Conflict - Select Available Slot'
                ) : (
                  'Create Appointment'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BackdatedAppointmentModal;
