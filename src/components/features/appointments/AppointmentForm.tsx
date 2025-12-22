'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, parseISO, addMinutes } from 'date-fns';
import { cn } from '@/lib/utils';
import { useCreateAppointment, useUpdateAppointment } from '@/hooks/useAppointments';
import { useAuthStore } from '@/stores/auth';
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
} from 'lucide-react';
import type { Appointment, Client, TeamMember, Speciality, Address } from '@/types';

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

export default function AppointmentForm({ appointment, onSuccess, onCancel }: AppointmentFormProps) {
  const router = useRouter();
  const { isFeatureEnabled } = useAuthStore();
  const isEditing = !!appointment;

  const [currentStep, setCurrentStep] = useState<Step>('client');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<TeamMember | null>(null);
  const [selectedSpeciality, setSelectedSpeciality] = useState<Speciality | null>(null);
  const [clientSearch, setClientSearch] = useState('');
  const [teamSearch, setTeamSearch] = useState('');

  // Mock data - replace with API calls
  const [clients] = useState<Client[]>([]);
  const [teamMembers] = useState<TeamMember[]>([]);
  const [specialities] = useState<Speciality[]>([]);

  const createMutation = useCreateAppointment();
  const updateMutation = useUpdateAppointment();

  const form = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      client_id: appointment?.client_id || 0,
      team_id: appointment?.team_id,
      speciality_id: appointment?.speciality_id || 0,
      date: appointment?.date || format(new Date(), 'yyyy-MM-dd'),
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

  const currentStepIndex = steps.findIndex((s) => s.id === currentStep);
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;

  const goToStep = (step: Step) => {
    setCurrentStep(step);
  };

  const goNext = () => {
    if (!isLastStep) {
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
        return true;
      default:
        return false;
    }
  };

  const handleClientSelect = (client: Client) => {
    setSelectedClient(client);
    form.setValue('client_id', client.id);
  };

  const handleTeamSelect = (team: TeamMember | null) => {
    setSelectedTeam(team);
    form.setValue('team_id', team?.id);
  };

  const handleSpecialitySelect = (speciality: Speciality) => {
    setSelectedSpeciality(speciality);
    form.setValue('speciality_id', speciality.id);
  };

  const onSubmit = async (data: AppointmentFormData) => {
    try {
      if (isEditing && appointment) {
        const result = await updateMutation.mutateAsync({
          id: appointment.id,
          data,
        });
        onSuccess?.(result);
      } else {
        const result = await createMutation.mutateAsync(data);
        onSuccess?.(result);
      }
      router.push('/appointments');
    } catch (error) {
      console.error('Failed to save appointment:', error);
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const locationTypes = [
    { value: 'in_home', label: 'In Home', description: "Client's residence" },
    { value: 'facility', label: 'Facility', description: 'Care facility' },
    { value: 'community', label: 'Community', description: 'Community location' },
  ] as const;

  const durationOptions = [
    { value: 30, label: '30 minutes' },
    { value: 45, label: '45 minutes' },
    { value: 60, label: '1 hour' },
    { value: 90, label: '1.5 hours' },
    { value: 120, label: '2 hours' },
    { value: 180, label: '3 hours' },
    { value: 240, label: '4 hours' },
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
                  onChange={(e) => setClientSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                />
              </div>

              {/* Client List */}
              <div className="grid gap-3 max-h-96 overflow-y-auto">
                {clients.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No clients found. Start typing to search.</p>
                  </div>
                ) : (
                  clients.map((client) => (
                    <button
                      key={client.id}
                      type="button"
                      onClick={() => handleClientSelect(client)}
                      className={cn(
                        'flex items-center gap-4 p-4 rounded-lg border-2 transition-all text-left',
                        selectedClient?.id === client.id
                          ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-violet-300 dark:hover:border-violet-700'
                      )}
                    >
                      <div className="w-12 h-12 rounded-full bg-violet-100 dark:bg-violet-900 flex items-center justify-center text-violet-700 dark:text-violet-300 font-medium">
                        {client.full_name?.charAt(0) || client.user?.name?.charAt(0) || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 dark:text-white truncate">
                          {client.full_name || client.user?.name}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {client.address?.city}, {client.address?.state}
                        </p>
                      </div>
                      {selectedClient?.id === client.id && (
                        <Check className="w-5 h-5 text-violet-600" />
                      )}
                    </button>
                  ))
                )}
              </div>
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

              {/* Speciality Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Service Type *
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {specialities.length === 0 ? (
                    <div className="col-span-full text-center py-8 text-gray-500">
                      No services available
                    </div>
                  ) : (
                    specialities.map((spec) => (
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
                    ))
                  )}
                </div>
              </div>

              {/* Coach Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Assign Coach (Optional)
                </label>
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search coaches..."
                    value={teamSearch}
                    onChange={(e) => setTeamSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                </div>

                {selectedTeam && (
                  <div className="mb-3 flex items-center gap-2 p-3 bg-violet-50 dark:bg-violet-900/20 rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center text-white text-sm">
                      {selectedTeam.name.charAt(0)}
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {selectedTeam.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleTeamSelect(null)}
                      className="ml-auto text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <div className="grid gap-2 max-h-48 overflow-y-auto">
                  {teamMembers.map((team) => (
                    <button
                      key={team.id}
                      type="button"
                      onClick={() => handleTeamSelect(team)}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-lg border transition-all text-left',
                        selectedTeam?.id === team.id
                          ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-violet-300'
                      )}
                    >
                      <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-sm font-medium">
                        {team.name.charAt(0)}
                      </div>
                      <span className="text-gray-900 dark:text-white">{team.name}</span>
                    </button>
                  ))}
                </div>
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

                {/* Time */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Start Time *
                  </label>
                  <input
                    type="time"
                    {...form.register('start_time')}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500"
                  />
                </div>

                {/* Duration */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Duration
                  </label>
                  <select
                    {...form.register('duration', { valueAsNumber: true })}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500"
                  >
                    {durationOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Location Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Location Type
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {locationTypes.map((loc) => (
                      <button
                        key={loc.value}
                        type="button"
                        onClick={() => form.setValue('location_type', loc.value)}
                        className={cn(
                          'p-3 rounded-lg border-2 text-center transition-all',
                          form.watch('location_type') === loc.value
                            ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-violet-300'
                        )}
                      >
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {loc.label}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

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

              <div className="space-y-4">
                {/* Client */}
                <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                  <Users className="w-5 h-5 text-violet-600 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Client</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {selectedClient?.full_name || selectedClient?.user?.name || 'Not selected'}
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
                      {selectedTeam?.name || 'Unassigned'}
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

                {/* Location */}
                <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                  <MapPin className="w-5 h-5 text-violet-600 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Location</p>
                    <p className="font-medium text-gray-900 dark:text-white capitalize">
                      {form.getValues('location_type').replace('_', ' ')}
                    </p>
                  </div>
                </div>

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
              disabled={isSubmitting}
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
    </div>
  );
}
