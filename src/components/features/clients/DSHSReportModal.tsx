'use client';

import { useState, useEffect, useMemo } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Plus, Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMutation, useQuery } from '@tanstack/react-query';
import api from '@/lib/api/client';
import type {
  Client,
  DSHSReport,
  DSHSReportType,
  DSHSGoal,
  DSHSTreatmentStrategy,
  DSHSProgressSummary,
  DSHSGoalScore,
  DSHSCareTeamMember,
  DSHSReportFormData,
} from '@/types';

interface DSHSReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client;
  reportType: DSHSReportType;
  isInitial: boolean;
  isEditing: boolean;
  existingReport: DSHSReport | null;
  isAdmin?: boolean;
  currentUserName?: string;
  onSuccess: () => void;
}

interface FormErrors {
  [key: string]: string | string[];
}

interface TeamMember {
  id: number;
  name: string;
}

const REPORT_TYPE_LABELS: Record<DSHSReportType, { short: string; full: string }> = {
  specialized_habilitation: { short: 'SH', full: 'Specialized Habilitation' },
  community_engagement: { short: 'CE', full: 'Community Engagement' },
  staff_family_consultation: { short: 'SFC', full: 'Staff and Family Consultation' },
};

const SERVICE_CATEGORIES = [
  'Self-Empowerment',
  'Safety Awareness and Self-Advocacy',
  'Interpersonal Effectiveness and Effective Social Communication',
  'Coping Strategies regarding Everyday Life Challenges',
  'Managing Daily Tasks and Acquiring Adaptive Skills',
];

const formatDateForInput = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

const calculateQuarterDates = () => {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentQuarter = Math.floor(currentMonth / 3);

  const currentQuarterStart = new Date(today.getFullYear(), currentQuarter * 3, 1);
  const currentQuarterEnd = new Date(today.getFullYear(), (currentQuarter + 1) * 3, 0);

  const nextQuarterStart = new Date(today.getFullYear(), (currentQuarter + 1) * 3, 1);
  const nextQuarterEnd = new Date(today.getFullYear(), (currentQuarter + 2) * 3, 0);

  const prevQuarter = currentQuarter - 1 < 0 ? 3 : currentQuarter - 1;
  const prevQuarterYear = currentQuarter - 1 < 0 ? today.getFullYear() - 1 : today.getFullYear();
  const prevQuarterStart = new Date(prevQuarterYear, prevQuarter * 3, 1);
  const prevQuarterEnd = new Date(prevQuarterYear, (prevQuarter + 1) * 3, 0);

  return {
    current: { start: formatDateForInput(currentQuarterStart), end: formatDateForInput(currentQuarterEnd) },
    next: { start: formatDateForInput(nextQuarterStart), end: formatDateForInput(nextQuarterEnd) },
    previous: { start: formatDateForInput(prevQuarterStart), end: formatDateForInput(prevQuarterEnd) },
    today: formatDateForInput(today),
  };
};

const createEmptyGoal = (reportType: DSHSReportType): DSHSGoal => {
  const goal: DSHSGoal = {
    description: '',
    frequency: '',
    duration: '',
    progress_measurement: '',
    plan: '',
  };

  if (reportType === 'staff_family_consultation') {
    goal.consultation_strategy = '';
    goal.completion_criteria = '';
  }

  return goal;
};

const createEmptyStrategy = (): DSHSTreatmentStrategy => ({ goal_id: 1, description: '' });
const createEmptyProgress = (): DSHSProgressSummary => ({ goal_id: 1, description: '' });
const createEmptyScore = (): DSHSGoalScore => ({ goal_id: 1, score: 5 });

export default function DSHSReportModal({
  isOpen,
  onClose,
  client,
  reportType,
  isInitial,
  isEditing,
  existingReport,
  isAdmin = false,
  currentUserName = '',
  onSuccess,
}: DSHSReportModalProps) {
  const quarterDates = useMemo(() => calculateQuarterDates(), []);

  const getInitialFormData = (): DSHSReportFormData => {
    if (isEditing && existingReport) {
      return {
        client_id: existingReport.client_id,
        case_manager_id: existingReport.case_manager_id,
        type: existingReport.type,
        is_initial: existingReport.is_initial,
        start_date: existingReport.start_date,
        end_date: existingReport.end_date,
        initial_plan_date: existingReport.initial_plan_date || '',
        waiver_participant_name: existingReport.waiver_participant_name || '',
        provider_name: existingReport.provider_name || '',
        submitted_by: existingReport.submitted_by || '',
        goals: existingReport.goals || [],
        treatment_strategies: existingReport.treatment_strategies || [],
        progress_summary: existingReport.progress_summary || [],
        goal_completion_scores: existingReport.goal_completion_scores || [],
        referral_recommendations: existingReport.referral_recommendations || '',
        targeted_service_categories: existingReport.targeted_service_categories || [],
        care_team: existingReport.care_team || [],
        engagement_goals: existingReport.engagement_goals || '',
        activities_summary: existingReport.activities_summary || '',
        future_plans: existingReport.future_plans || '',
        consultation_goal_summary: existingReport.consultation_goal_summary || '',
        needed_support_types: existingReport.needed_support_types || [],
        needed_support_description: existingReport.needed_support_description || '',
        has_new_therapeutic_needs: existingReport.has_new_therapeutic_needs || false,
        therapeutic_needs_explanation: existingReport.therapeutic_needs_explanation || '',
        barriers_and_recommendations: existingReport.barriers_and_recommendations || '',
        referrals_provided: existingReport.referrals_provided || '',
        sf_member_goal: existingReport.sf_member_goal || '',
        has_therapeutic_plan: existingReport.has_therapeutic_plan || false,
        therapeutic_plan_component: existingReport.therapeutic_plan_component || '',
        consultation_provided: existingReport.consultation_provided || '',
      };
    }

    // New report
    const baseData: DSHSReportFormData = {
      client_id: client.id,
      case_manager_id: client.case_manager_id,
      type: reportType,
      is_initial: isInitial,
      start_date: isInitial ? quarterDates.today : quarterDates.current.start,
      end_date: isInitial ? quarterDates.today : quarterDates.current.end,
      initial_plan_date: quarterDates.today,
      waiver_participant_name: client.user?.name || client.name || '',
      provider_name: currentUserName,
      submitted_by: '',
      goals: isInitial ? [createEmptyGoal(reportType)] : [],
      treatment_strategies: [],
      progress_summary: [],
      goal_completion_scores: [],
      referral_recommendations: '',
      targeted_service_categories: [],
      care_team: [],
      engagement_goals: '',
      activities_summary: '',
      future_plans: '',
      consultation_goal_summary: '',
      needed_support_types: [],
      needed_support_description: '',
      has_new_therapeutic_needs: false,
      therapeutic_needs_explanation: '',
      barriers_and_recommendations: '',
      referrals_provided: '',
      sf_member_goal: '',
      has_therapeutic_plan: false,
      therapeutic_plan_component: '',
      consultation_provided: '',
    };

    // Type-specific initialization
    if (reportType === 'specialized_habilitation' && !isInitial) {
      baseData.goals = [createEmptyGoal(reportType)];
      baseData.treatment_strategies = [createEmptyStrategy()];
      baseData.progress_summary = [createEmptyProgress()];
      baseData.goal_completion_scores = [createEmptyScore()];
    }

    if (reportType === 'staff_family_consultation' && !isInitial) {
      baseData.goals = [createEmptyGoal(reportType)];
    }

    return baseData;
  };

  const [formData, setFormData] = useState<DSHSReportFormData>(getInitialFormData);
  const [errors, setErrors] = useState<FormErrors>({});

  // Reset form when modal opens or type changes
  useEffect(() => {
    if (isOpen) {
      setFormData(getInitialFormData());
      setErrors({});
    }
  }, [isOpen, reportType, isInitial, isEditing, existingReport]);

  // Fetch team members
  const { data: teamMembersByType = {} } = useQuery({
    queryKey: ['team-members-by-speciality', client.id],
    queryFn: async () => {
      interface SpecialityGroup {
        speciality_id: number;
        speciality_name: string;
        speciality_short_name: string;
        team_members: TeamMember[];
      }
      const response = await api.get<{ success: boolean; data: SpecialityGroup[] }>(`/tenant-api/clients/${client.id}/team-members-by-speciality`);
      // Transform array to record keyed by report type
      const result: Record<string, TeamMember[]> = {};
      const typeMap: Record<string, string> = {
        'specialized_habilitation': 'SH',
        'community_engagement': 'CE',
        'staff_family_consultation': 'SFC',
      };
      const shortNameToType: Record<string, string> = {
        'SH': 'specialized_habilitation',
        'CE': 'community_engagement',
        'SFC': 'staff_family_consultation',
      };

      (response.data.data || []).forEach((group: SpecialityGroup) => {
        const reportType = shortNameToType[group.speciality_short_name];
        if (reportType) {
          result[reportType] = group.team_members || [];
        }
      });
      return result;
    },
    enabled: isAdmin,
  });

  const availableTeamMembers = useMemo(() => {
    return teamMembersByType[reportType] || [];
  }, [teamMembersByType, reportType]);

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: DSHSReportFormData) => {
      if (isEditing && existingReport) {
        const response = await api.put<{ success: boolean; data: DSHSReport }>(
          `/tenant-api/dshs-reports/${existingReport.id}`,
          data
        );
        return response.data;
      } else {
        const response = await api.post<{ success: boolean; data: DSHSReport }>(
          '/tenant-api/dshs-reports',
          data
        );
        return response.data;
      }
    },
    onSuccess: () => {
      onSuccess();
    },
    onError: (error: Error & { response?: { data?: { errors?: FormErrors; message?: string } } }) => {
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      } else {
        setErrors({ general: error.response?.data?.message || error.message || 'Failed to save report' });
      }
    },
  });

  const updateField = <K extends keyof DSHSReportFormData>(field: K, value: DSHSReportFormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const setQuarterDates = (quarter: 'current' | 'previous' | 'next') => {
    const dates = quarterDates[quarter];
    setFormData(prev => ({
      ...prev,
      start_date: dates.start,
      end_date: dates.end,
    }));
  };

  // Goal management
  const addGoal = () => {
    if ((formData.goals?.length || 0) < 3) {
      setFormData(prev => ({
        ...prev,
        goals: [...(prev.goals || []), createEmptyGoal(reportType)],
      }));
    }
  };

  const removeGoal = (index: number) => {
    setFormData(prev => ({
      ...prev,
      goals: (prev.goals || []).filter((_, i) => i !== index),
    }));
  };

  const updateGoal = (index: number, field: keyof DSHSGoal, value: string) => {
    setFormData(prev => ({
      ...prev,
      goals: (prev.goals || []).map((goal, i) => (i === index ? { ...goal, [field]: value } : goal)),
    }));
  };

  // Treatment strategies management
  const addStrategy = () => {
    setFormData(prev => ({
      ...prev,
      treatment_strategies: [...(prev.treatment_strategies || []), createEmptyStrategy()],
    }));
  };

  const removeStrategy = (index: number) => {
    setFormData(prev => ({
      ...prev,
      treatment_strategies: (prev.treatment_strategies || []).filter((_, i) => i !== index),
    }));
  };

  const updateStrategy = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      treatment_strategies: (prev.treatment_strategies || []).map((s, i) =>
        i === index ? { ...s, description: value } : s
      ),
    }));
  };

  // Progress summary management
  const addProgress = () => {
    setFormData(prev => ({
      ...prev,
      progress_summary: [...(prev.progress_summary || []), createEmptyProgress()],
    }));
  };

  const removeProgress = (index: number) => {
    setFormData(prev => ({
      ...prev,
      progress_summary: (prev.progress_summary || []).filter((_, i) => i !== index),
    }));
  };

  const updateProgress = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      progress_summary: (prev.progress_summary || []).map((p, i) =>
        i === index ? { ...p, description: value } : p
      ),
    }));
  };

  // Service categories toggle
  const toggleServiceCategory = (category: string) => {
    setFormData(prev => {
      const categories = prev.targeted_service_categories || [];
      if (categories.includes(category)) {
        return { ...prev, targeted_service_categories: categories.filter(c => c !== category) };
      } else {
        return { ...prev, targeted_service_categories: [...categories, category] };
      }
    });
  };

  // Care team toggle
  const toggleCareTeamMember = (member: TeamMember) => {
    setFormData(prev => {
      const team = prev.care_team || [];
      const exists = team.some(m => m.id === member.id);
      if (exists) {
        return { ...prev, care_team: team.filter(m => m.id !== member.id) };
      } else {
        return { ...prev, care_team: [...team, { id: member.id, user_id: member.id, name: member.name }] };
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    saveMutation.mutate(formData);
  };

  const hasError = (field: string): boolean => {
    return !!errors[field];
  };

  const getErrorMessage = (field: string): string => {
    const error = errors[field];
    if (Array.isArray(error)) return error[0];
    return error || '';
  };

  const modalTitle = `${isEditing ? 'Edit' : 'New'} ${isInitial ? 'Initial ' : ''}${REPORT_TYPE_LABELS[reportType].full} ${isInitial ? 'Plan' : 'Report'}`;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={modalTitle} size="xl">
      <form onSubmit={handleSubmit} className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
        {/* Error Summary */}
        {Object.keys(errors).length > 0 && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
            <div className="flex items-start">
              <AlertTriangle className="w-5 h-5 mr-3 flex-shrink-0 text-red-600 dark:text-red-400" />
              <div>
                <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                  There {Object.keys(errors).length === 1 ? 'is' : 'are'} {Object.keys(errors).length} error{Object.keys(errors).length > 1 ? 's' : ''} in your form
                </h3>
                {errors.general && (
                  <p className="mt-1 text-sm text-red-700 dark:text-red-300">{String(errors.general)}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Quick Date Selection (non-initial only) */}
        {!isInitial && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Quick 90 Day Select
            </label>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => setQuarterDates('previous')}
                className="px-3 py-1.5 border border-violet-500 text-xs font-medium rounded-md shadow-sm text-violet-700 bg-white hover:bg-violet-50"
              >
                Previous 90 Days
              </button>
              <button
                type="button"
                onClick={() => setQuarterDates('current')}
                className="px-3 py-1.5 border border-violet-500 text-xs font-medium rounded-md shadow-sm text-violet-700 bg-white hover:bg-violet-50"
              >
                Current 90 Days
              </button>
              <button
                type="button"
                onClick={() => setQuarterDates('next')}
                className="px-3 py-1.5 border border-violet-500 text-xs font-medium rounded-md shadow-sm text-violet-700 bg-white hover:bg-violet-50"
              >
                Next 90 Days
              </button>
            </div>
          </div>
        )}

        {/* Date Fields */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {isInitial ? 'Start Date' : '90 Day Start Date'}
            </label>
            <input
              type="date"
              value={formData.start_date}
              onChange={(e) => updateField('start_date', e.target.value)}
              className={cn(
                'mt-1 block w-full rounded-md shadow-sm dark:bg-gray-900 dark:text-gray-300',
                hasError('start_date')
                  ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                  : 'border-gray-300 dark:border-gray-700 focus:border-violet-500 focus:ring-violet-500'
              )}
              required
            />
            {hasError('start_date') && (
              <p className="mt-1 text-sm text-red-600">{getErrorMessage('start_date')}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {isInitial ? 'End Date' : '90 Day End Date'}
            </label>
            <input
              type="date"
              value={formData.end_date}
              onChange={(e) => updateField('end_date', e.target.value)}
              className={cn(
                'mt-1 block w-full rounded-md shadow-sm dark:bg-gray-900 dark:text-gray-300',
                hasError('end_date')
                  ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                  : 'border-gray-300 dark:border-gray-700 focus:border-violet-500 focus:ring-violet-500'
              )}
              required
            />
            {hasError('end_date') && (
              <p className="mt-1 text-sm text-red-600">{getErrorMessage('end_date')}</p>
            )}
          </div>
        </div>

        {/* Initial Plan Date */}
        {isInitial && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Plan Date</label>
            <input
              type="date"
              value={formData.initial_plan_date}
              onChange={(e) => {
                updateField('initial_plan_date', e.target.value);
                updateField('start_date', e.target.value);
                updateField('end_date', e.target.value);
              }}
              className={cn(
                'mt-1 block w-full rounded-md shadow-sm dark:bg-gray-900 dark:text-gray-300',
                hasError('initial_plan_date')
                  ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                  : 'border-gray-300 dark:border-gray-700 focus:border-violet-500 focus:ring-violet-500'
              )}
              required
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              For initial plans, the plan date is used as the default start and end date.
            </p>
          </div>
        )}

        {/* Waiver Participant and Provider Name (Initial Plans) */}
        {isInitial && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Waiver Participant's Name
              </label>
              <input
                type="text"
                value={formData.waiver_participant_name}
                onChange={(e) => updateField('waiver_participant_name', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 shadow-sm focus:border-violet-500 focus:ring-violet-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Provider's Name
              </label>
              <input
                type="text"
                value={formData.provider_name}
                onChange={(e) => updateField('provider_name', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 shadow-sm focus:border-violet-500 focus:ring-violet-500"
                required
              />
            </div>
          </div>
        )}

        {/* Admin Team Selection */}
        {isAdmin && availableTeamMembers.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Select Team Member (as Report Submitter)
              <span className="text-xs text-amber-600 dark:text-amber-500 ml-1">(Admin Only)</span>
            </label>
            <select
              value={formData.submitted_by}
              onChange={(e) => updateField('submitted_by', e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 shadow-sm focus:border-violet-500 focus:ring-violet-500"
            >
              <option value="">Select Team Member</option>
              {availableTeamMembers.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              If left empty, the report will be submitted as you ({currentUserName})
            </p>
          </div>
        )}

        {/* Service Categories (SH only) */}
        {reportType === 'specialized_habilitation' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Targeted Service Categories
            </label>
            <div className="space-y-2">
              {SERVICE_CATEGORIES.map((category) => (
                <div key={category} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`category-${category.replace(/\s+/g, '-').toLowerCase()}`}
                    checked={(formData.targeted_service_categories || []).includes(category)}
                    onChange={() => toggleServiceCategory(category)}
                    className="h-4 w-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                  />
                  <label
                    htmlFor={`category-${category.replace(/\s+/g, '-').toLowerCase()}`}
                    className="ml-2 block text-sm text-gray-900 dark:text-gray-300"
                  >
                    {category}
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CE Fields (non-initial) */}
        {reportType === 'community_engagement' && !isInitial && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                What do you want from Community Engagement?
              </label>
              <textarea
                value={formData.engagement_goals}
                onChange={(e) => updateField('engagement_goals', e.target.value)}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 shadow-sm focus:border-violet-500 focus:ring-violet-500"
                placeholder="Enter engagement goals..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                What have you and your provider done over the last three months?
              </label>
              <textarea
                value={formData.activities_summary}
                onChange={(e) => updateField('activities_summary', e.target.value)}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 shadow-sm focus:border-violet-500 focus:ring-violet-500"
                placeholder="Enter activities summary..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                If continuing, is there anything new or different you want to do?
              </label>
              <textarea
                value={formData.future_plans}
                onChange={(e) => updateField('future_plans', e.target.value)}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 shadow-sm focus:border-violet-500 focus:ring-violet-500"
                placeholder="Enter future plans..."
              />
            </div>
          </>
        )}

        {/* Goals Section */}
        {(reportType === 'specialized_habilitation' ||
          (isInitial && reportType !== 'staff_family_consultation')) && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Goals (Max 3)
              </label>
              {(formData.goals?.length || 0) < 3 && (
                <button
                  type="button"
                  onClick={addGoal}
                  className="inline-flex items-center px-2 py-1 text-xs font-medium text-violet-700 bg-violet-100 rounded-md hover:bg-violet-200"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Add Goal
                </button>
              )}
            </div>
            {(formData.goals || []).map((goal, index) => (
              <div
                key={index}
                className="mb-4 p-4 border border-gray-200 dark:border-gray-700 rounded-md"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Goal {index + 1}
                  </span>
                  {(formData.goals?.length || 0) > 1 && (
                    <button
                      type="button"
                      onClick={() => removeGoal(index)}
                      className="text-red-600 dark:text-red-400 hover:text-red-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <textarea
                  value={goal.description}
                  onChange={(e) => updateGoal(index, 'description', e.target.value)}
                  rows={2}
                  placeholder="Enter goal description..."
                  className="block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 shadow-sm focus:border-violet-500 focus:ring-violet-500"
                  required
                />
              </div>
            ))}
          </div>
        )}

        {/* Treatment Strategies (SH non-initial) */}
        {reportType === 'specialized_habilitation' && !isInitial && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Treatment Strategies
              </label>
              <button
                type="button"
                onClick={addStrategy}
                className="inline-flex items-center px-2 py-1 text-xs font-medium text-violet-700 bg-violet-100 rounded-md hover:bg-violet-200"
              >
                <Plus className="w-3 h-3 mr-1" />
                Add Strategy
              </button>
            </div>
            {(formData.treatment_strategies || []).map((strategy, index) => (
              <div key={index} className="mb-2 flex items-center gap-2">
                <textarea
                  value={strategy.description}
                  onChange={(e) => updateStrategy(index, e.target.value)}
                  rows={2}
                  placeholder="Enter treatment strategy..."
                  className="flex-1 rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 shadow-sm focus:border-violet-500 focus:ring-violet-500"
                />
                {(formData.treatment_strategies || []).length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeStrategy(index)}
                    className="text-red-600 dark:text-red-400 hover:text-red-800"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Progress Summary (SH non-initial) */}
        {reportType === 'specialized_habilitation' && !isInitial && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Progress Summary
              </label>
              <button
                type="button"
                onClick={addProgress}
                className="inline-flex items-center px-2 py-1 text-xs font-medium text-violet-700 bg-violet-100 rounded-md hover:bg-violet-200"
              >
                <Plus className="w-3 h-3 mr-1" />
                Add Progress
              </button>
            </div>
            {(formData.progress_summary || []).map((progress, index) => (
              <div key={index} className="mb-2 flex items-center gap-2">
                <textarea
                  value={progress.description}
                  onChange={(e) => updateProgress(index, e.target.value)}
                  rows={2}
                  placeholder="Enter progress summary..."
                  className="flex-1 rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 shadow-sm focus:border-violet-500 focus:ring-violet-500"
                />
                {(formData.progress_summary || []).length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeProgress(index)}
                    className="text-red-600 dark:text-red-400 hover:text-red-800"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Referral Recommendations */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Referral Recommendations
          </label>
          <textarea
            value={formData.referral_recommendations}
            onChange={(e) => updateField('referral_recommendations', e.target.value)}
            rows={3}
            placeholder="Enter referral recommendations..."
            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 shadow-sm focus:border-violet-500 focus:ring-violet-500"
          />
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
            disabled={saveMutation.isPending}
            className={cn(
              'inline-flex items-center px-4 py-2 text-sm font-medium text-white rounded-md shadow-sm',
              saveMutation.isPending
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-violet-600 hover:bg-violet-700'
            )}
          >
            {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {saveMutation.isPending ? 'Saving...' : isEditing ? 'Update Report' : 'Create Report'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
