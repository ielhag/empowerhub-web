// User & Auth Types
export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  access_level: 0 | 1 | 2; // 0=Super Admin, 1=Admin, 2=Staff
  role: 'admin' | 'staff' | 'client' | 'case_manager';
  status: 'active' | 'inactive' | 'suspended' | 'terminated' | 'on_leave' | number; // Can be string or number (0=Inactive, 1=Active, etc)
  created_at: string;
  updated_at: string;
}

export interface TeamMember extends User {
  specialities?: Speciality[];
  working_hours?: WorkingHours;
  certifications?: Certification[];
  compensation?: Compensation;
}

export interface Compensation {
  rate: number;
  rate_type: 'hourly' | 'salary';
  effective_date: string;
}

export interface WorkingHours {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

export interface DaySchedule {
  enabled: boolean;
  start_time?: string;
  end_time?: string;
}

export interface Certification {
  id: number;
  name: string;
  issued_date?: string;
  expiry_date?: string;
  status: 'valid' | 'expired' | 'pending' | 'expiring_soon';
}

// Speciality Types
export interface Speciality {
  id: number;
  name: string;
  short_name: string;
  status: 'active' | 'inactive';
}

// Client Types
export interface Client {
  id: number;
  user_id: number;
  user?: User;
  client_id?: string; // Format: 9 digits + 2 letters (e.g., 100000009WA)
  full_name?: string; // Computed from user.name or custom accessor
  name?: string; // Alias for full_name
  first_name?: string;
  last_name?: string;
  phone?: string;
  date_of_birth?: string | null;
  gender?: 'male' | 'female' | 'other';
  facility_id?: number;
  facility?: Facility;
  case_manager_id?: number;
  case_manager?: CaseManager;
  status: 'active' | 'inactive' | 'archived';
  is_inactive?: boolean; // Computed flag for archived/inactive clients
  nemt_broker_id?: number;
  nemt_broker?: NEMTBroker;
  available_nemt_brokers?: NEMTBroker[]; // All brokers for selection dropdown
  address?: Address;
  // Unit allocations (how many units allocated per service)
  units?: ClientUnitAllocation[];
  // Unit balances (monthly balance records)
  unit_balances?: UnitBalance[];
  // Balance history for all months
  unit_balances_history?: UnitBalanceHistory[];
  specialities?: ClientSpeciality[];
  preferences?: ClientPreferencesData;
  recent_team_members?: RecentTeamMember[];
  active_appointments?: ActiveAppointment[];
  // All appointments for this client
  appointments?: ClientAppointment[];
  // Recently restored appointments (after client reactivation)
  recently_restored_appointments?: RestoredAppointment[];
  // Usage trends for last 6 months
  trends?: Record<string, Record<number, number>>;
  // NEMT requests (paginated)
  nemt_requests?: PaginatedNEMTRequests;
  // Unit transactions (recent)
  unit_transactions?: UnitTransaction[];
  // Tenant info for NEMT
  owner_name?: string;
  tenant_company?: string;
  tenant_phone?: string;
  birthday_info?: {
    is_upcoming: boolean;
    is_today: boolean;
    days_until?: number;
    age_will_be?: number;
    relative_text?: string;
    last_birthday?: {
      age_was: number;
    };
  };
  created_at: string;
  updated_at: string;
}

// Client appointment (simplified for client profile)
export interface ClientAppointment {
  id: number;
  client_id: number;
  team_id?: number;
  team?: {
    id: number;
    user?: {
      id: number;
      name: string;
    };
  };
  speciality_id: number;
  speciality?: Speciality;
  status: string;
  start_time?: string;
  end_time?: string;
  duration?: number;
  location_type?: string;
  address?: string;
  notes?: string;
}

// Restored appointment info
export interface RestoredAppointment {
  id: number;
  start_time?: string;
  status: string;
}

// NEMT Request
export interface NEMTRequest {
  id: number;
  client_id: number;
  broker_name?: string;
  broker_fax?: string;
  dda_region?: string;
  assessor_name?: string;
  assessor_phone?: string;
  mobility_status?: 'Wheelchair' | 'Walker' | 'Cane' | 'None';
  pickup_address?: string;
  dropoff_address?: string;
  appointment_start_time?: string;
  appointment_end_time?: string;
  transportation_date?: string;
  end_date?: string;
  support_person_rides?: boolean;
  is_recurring?: boolean;
  special_needs?: string;
  additional_contact_1?: string;
  additional_contact_1_phone?: string;
  additional_contact_1_organization?: string;
  additional_contact_2?: string;
  additional_contact_2_phone?: string;
  additional_contact_2_organization?: string;
  service_checkboxes?: NEMTServiceCheckboxes;
  recurring_days?: NEMTRecurringDays;
  creator_info?: {
    id: number;
    name: string;
  };
  deleter_info?: {
    name: string;
    deleted_at_formatted?: string;
  };
  deleted_at?: string;
  created_at?: string;
  updated_at?: string;
}

// NEMT Service Checkboxes
export interface NEMTServiceCheckboxes {
  medicaid_eligible?: boolean;
  needs_transportation?: boolean;
  assistive_technology?: boolean;
  staff_family_consultation?: boolean;
  community_access?: boolean;
  supported_employment?: boolean;
  community_guide?: boolean;
  transportation?: boolean;
  habilitative_behavior?: boolean;
  habilitative_therapy?: boolean;
  other_habilitative?: boolean;
}

// NEMT Recurring Days
export interface NEMTRecurringDays {
  sunday?: boolean;
  monday?: boolean;
  tuesday?: boolean;
  wednesday?: boolean;
  thursday?: boolean;
  friday?: boolean;
  saturday?: boolean;
}

// NEMT Request Form Data
export interface NEMTRequestFormData {
  client_id: number;
  broker_name: string;
  broker_fax: string;
  dda_region: string;
  assessor_name: string;
  assessor_phone: string;
  mobility_status: 'Wheelchair' | 'Walker' | 'Cane' | 'None';
  pickup_address: string;
  dropoff_address: string;
  appointment_start_time: string;
  appointment_end_time: string;
  transportation_date: string;
  end_date: string;
  support_person_rides: boolean;
  is_recurring: boolean;
  special_needs: string;
  additional_contact_1: string;
  additional_contact_1_phone: string;
  additional_contact_1_organization: string;
  additional_contact_2: string;
  additional_contact_2_phone: string;
  additional_contact_2_organization: string;
  service_checkboxes: NEMTServiceCheckboxes;
  recurring_days: NEMTRecurringDays;
}

// Paginated NEMT Requests
export interface PaginatedNEMTRequests {
  data: NEMTRequest[];
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
}

// Unit allocation for a client (how many units per service)
export interface ClientUnitAllocation {
  id: number;
  client_id: number;
  speciality_id: number;
  speciality?: Speciality;
  units: number; // Total allocated units
  current_balance?: number; // Remaining balance on this allocation
  status: number; // 1=active, 0=inactive
  authorization_id?: string;
  start_date?: string;
  end_date?: string;
  is_monthly?: boolean;
  created_at?: string;
  updated_at?: string;
}

// NEMT Broker
export interface NEMTBroker {
  id: number;
  name: string;
  phone?: string;
  email?: string;
  fax?: string;
  dda_region?: string;
}

// Client speciality with pivot data
export interface ClientSpeciality extends Speciality {
  pivot?: {
    status: number; // 1=active, 0=inactive
    created_at?: string;
  };
}

// Unit balance history record
export interface UnitBalanceHistory {
  id: number;
  client_id: number;
  speciality_id: number;
  month_year: string; // Format: YYYY-MM-01
  balance: number;
  used_units: number;
  allocated_units: number;
  status?: 'active' | 'expired';
}

// Client preferences as stored in database
export interface ClientPreferencesData {
  general_preferences?: {
    languages?: string[];
    languages_display?: string[];
    coach_gender?: string;
  };
  schedule_preferences?: {
    in_home?: SchedulePreference;
    transportation?: SchedulePreference;
  };
  notes?: string;
}

// Recent team member for client profile
export interface RecentTeamMember {
  id: number;
  name: string;
  sessions_count?: number;
}

// Active appointment for client profile
export interface ActiveAppointment {
  id: number;
  started_at?: string;
  team?: {
    id: number;
    user?: {
      name: string;
    };
  };
}

// Unit Transaction Types
export type UnitTransactionType = 'allocation' | 'usage' | 'adjustment' | 'cancellation' | 'emergency_usage';
export type UnitTransactionReferenceType = 'appointment' | 'manual' | 'system';

export interface UnitTransaction {
  id: number;
  client_id: number;
  team_id?: number;
  speciality_id: number;
  speciality?: Speciality;
  team?: {
    id: number;
    user?: {
      id: number;
      name: string;
    };
  };
  date: string;
  units: number; // Positive for allocation, negative for usage
  rate?: number;
  type: UnitTransactionType;
  reference_type?: UnitTransactionReferenceType;
  reference_id?: number; // Usually appointment ID
  notes?: string;
  description?: string;
  requires_admin_review?: boolean;
  billing_status?: string;
  created_at?: string;
}

// Monthly unit balance record
export interface UnitBalance {
  id: number;
  client_id: number;
  client_unit_id?: number;
  speciality_id: number;
  speciality?: Speciality;
  month_year?: string; // Format: YYYY-MM-01
  month?: number;
  year?: number;
  balance: number; // Remaining units
  allocated_units: number;
  used_units: number;
  available_units?: number; // Alias for balance
  status?: 'active' | 'expired' | string;
}

export interface Facility {
  id: number;
  name: string;
  address?: Address;
  phone?: string;
  status: 'active' | 'paused' | 'inactive';
  vaccine_required?: boolean;
}

export interface CaseManager {
  id: number;
  user_id?: number;
  user?: User;
  name?: string; // Direct name property or computed from user.name
  email?: string;
  phone?: string;
  clients_count?: number;
}

export interface Address {
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  full_address?: string;
  latitude?: number;
  longitude?: number;
}

// Appointment Types
export interface Appointment {
  id: number;
  client_id: number;
  client?: Client;
  client_name?: string; // Direct from API dashboard response
  team_id?: number;
  team?: TeamMember;
  team_name?: string; // Direct from API dashboard response
  historical_team_member_name?: string; // For completed appointments with terminated team members
  speciality_id: number;
  speciality?: Speciality;
  speciality_name?: string; // Direct from API dashboard response
  title?: string;
  date: string;
  start_time: string;
  end_time?: string;
  scheduled_start?: string; // ISO datetime string
  scheduled_end?: string; // ISO datetime string
  duration: number; // in minutes
  duration_minutes?: number; // alias for duration
  status: AppointmentStatus;
  location_type: 'in_home' | 'facility' | 'community' | 'remote';
  address?: Address;
  notes?: string;
  completion_notes?: string;
  units_required?: number;
  is_recurring: boolean;
  recurrence_rule?: RecurrenceRule;
  nemt_occurrence_id?: number;
  nemt_occurrence?: NEMTOccurrence;
  started_at?: string;
  completed_at?: string;
  cancelled_at?: string;
  cancellation_reason?: string;
  signature_data?: string;
  voice_confirmation_path?: string;
  assignment_history?: AssignmentHistory[];
  location_tracks?: LocationTrack[];
  created_at: string;
  updated_at: string;
}

// Assignment History for appointment timeline
export interface AssignmentHistory {
  id?: number;
  action: string;
  timestamp: string;
  team_name?: string;
  team_id?: number;
  admin_name?: string;
  by_user_name?: string;
  location_verified?: boolean;
  location_distance?: number;
  verification_distance?: number;
  location_latitude?: number;
  location_longitude?: number;
  actual_duration?: number;
  resolution?: string;
  terminated_team_id?: number;
  terminated_team_member?: string;
  reason?: string;
  notes?: string;
  // Time override changes
  changes?: {
    started_at?: {
      from?: string;
      to: string;
    };
    completed_at?: {
      from?: string;
      to?: string;
    };
  };
  // Team switch details
  team_switch?: {
    previous_team_id?: number;
    previous_team_name?: string;
    new_team_id?: number;
    new_team_name?: string;
  };
}

// Location Tracking for appointment
export interface LocationTrack {
  id: number;
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number;
  captured_at: string;
  address?: string;
}

// NEMT Transportation
export interface NEMTOccurrence {
  id: number;
  nemt_request_id: number;
  transportation_date?: string;
  transportation_company?: string;
  confirmed_pickup_time?: string;
  broker_name?: string;
  pickup_window_start?: string;
  pickup_window_end?: string;
  return_window_start?: string;
  return_window_end?: string;
  dropoff_address?: string;
  pickup_address?: string;
  notes?: string;
  is_cancelled?: boolean;
  cancellation_reason?: string;
  status?: 'pending' | 'confirmed' | 'cancelled';
}

export type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'scheduled'
  | 'unassigned'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show'
  | 'late'
  | 'rejected'
  | 'terminated_by_client'
  | 'terminated_by_staff'
  | 'deleted';

export interface RecurrenceRule {
  pattern: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  until?: string;
  days_of_week?: number[];
}

// DSHS Report Types
export type DSHSReportType = 'specialized_habilitation' | 'community_engagement' | 'staff_family_consultation';
export type DSHSReportStatus = 'draft' | 'submitted' | 'approved' | 'rejected';

export interface DSHSGoal {
  description: string;
  frequency?: string;
  duration?: string;
  progress_measurement?: string;
  plan?: string;
  consultation_strategy?: string;
  completion_criteria?: string;
}

export interface DSHSTreatmentStrategy {
  goal_id: number;
  description: string;
}

export interface DSHSProgressSummary {
  goal_id: number;
  description: string;
}

export interface DSHSGoalScore {
  goal_id: number;
  score: number;
}

export interface DSHSCareTeamMember {
  id: number;
  user_id: number;
  name: string;
}

export interface DSHSReport {
  id: number;
  client_id: number;
  case_manager_id?: number;
  type: DSHSReportType;
  status: DSHSReportStatus;
  is_initial: boolean;
  start_date: string;
  end_date: string;
  initial_plan_date?: string;
  waiver_participant_name?: string;
  provider_name?: string;
  submitted_by?: string;
  submitted_by_id?: number;
  goals?: DSHSGoal[];
  treatment_strategies?: DSHSTreatmentStrategy[];
  progress_summary?: DSHSProgressSummary[];
  goal_completion_scores?: DSHSGoalScore[];
  referral_recommendations?: string;
  targeted_service_categories?: string[];
  care_team?: DSHSCareTeamMember[];
  // CE-specific fields
  engagement_goals?: string;
  activities_summary?: string;
  future_plans?: string;
  // SFC-specific fields
  consultation_goal_summary?: string;
  needed_support_types?: string[];
  needed_support_description?: string;
  has_new_therapeutic_needs?: boolean;
  therapeutic_needs_explanation?: string;
  barriers_and_recommendations?: string;
  referrals_provided?: string;
  sf_member_goal?: string;
  has_therapeutic_plan?: boolean;
  therapeutic_plan_component?: string;
  consultation_provided?: string;
  created_at?: string;
  updated_at?: string;
}

export interface DSHSReportFormData extends Omit<DSHSReport, 'id' | 'status' | 'created_at' | 'updated_at'> {}

// Goals & Tasks Types (feature flagged)
export interface ClientGoal {
  id: number;
  client_id: number;
  speciality_id: number;
  speciality: Speciality;
  title: string;
  description?: string;
  target_date?: string;
  status: 'active' | 'completed' | 'archived';
  priority: 'low' | 'medium' | 'high';
  current_progress: number; // 0-100
  tasks: GoalTask[];
}

export interface GoalTask {
  id: number;
  goal_id: number;
  title: string;
  description?: string;
  is_default: boolean;
}

export interface AppointmentTask {
  id: number;
  appointment_id: number;
  goal_task_id: number;
  goal_task: GoalTask;
  status: 'pending' | 'completed' | 'skipped';
  completion_notes?: string;
  skip_reason?: string;
  completed_at?: string;
  completed_via?: 'web' | 'mobile';
}

// Chat Types
export interface ChatRoom {
  id: number;
  name?: string;
  type: 'direct' | 'group';
  participants: User[];
  last_message?: ChatMessage;
  unread_count: number;
  created_at: string;
}

export interface ChatMessage {
  id: number;
  room_id: number;
  sender_id: number;
  sender: User;
  content: string;
  type: 'text' | 'image' | 'file';
  file_url?: string;
  read_at?: string;
  created_at: string;
}

// Report Types
export interface PayrollReport {
  team_member_id: number;
  team_member: TeamMember;
  period_start: string;
  period_end: string;
  total_hours: number;
  regular_hours: number;
  overtime_hours: number;
  total_amount: number;
  appointments_count: number;
}

export interface ClientBillingReport {
  client_id: number;
  client: Client;
  period_start: string;
  period_end: string;
  services: {
    speciality: Speciality;
    units_used: number;
    amount: number;
  }[];
  total_units: number;
  total_amount: number;
}

// Dashboard Types
export interface DashboardStats {
  activeClients: number;
  availableCoaches: number;
  todayAppointments: number;
  weeklyUnits: number;
  unassignedCount?: number;
  pendingRequestsCount?: number;
}

export interface DashboardAppointments {
  current: Appointment[];
  upcoming: Appointment[];
  completed: Appointment[];
}

// Notification Types
export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  read_at?: string;
  created_at: string;
}

// Tenant Types
export interface Tenant {
  id: string;
  name: string;
  company: string;
  domain: string;
  branding?: TenantBranding;
  settings?: TenantSettings;
}

export interface TenantBranding {
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
}

export interface TenantSettings {
  client_goals_enabled?: boolean;
  recruitment_enabled?: boolean;
  timezone?: string;
}

// Pagination Types
export interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
  from?: number;
  to?: number;
}

// Client Form Data Types (matching Blade modal workflow)
export interface ClientFormData {
  id?: number;
  client_id: string; // Format: 9 digits + 2 letters (e.g., 100000009WA)
  name: string;
  email: string;
  generate_email: boolean;
  phone: string;
  gender: 'male' | 'female' | 'other' | '';
  date_of_birth: string;
  facility_id: number | '';
  address: string;
  city: string;
  state: string;
  zip: string;
  status: '1' | '0';
  case_manager_id: number | '';
  case_manager_new: boolean;
  case_manager_name: string;
  case_manager_email: string;
  case_manager_phone: string;
  specialities: number[];
  units: Record<number, number>;
  current_balance?: Record<number, number>;
  authorization_id: string;
  start_date: string;
  end_date: string;
  is_new_units: 'update' | 'new';
  correction_type: 'update' | 'correction';
  units_notes: string;
  reset_balance: boolean;
  is_monthly: boolean;
  preferences: ClientPreferences;
}

export interface ClientPreferences {
  general_preferences: {
    languages: string[];
    coach_gender: 'male' | 'female' | 'any' | null;
  };
  schedule_preferences: {
    in_home: SchedulePreference;
    transportation: SchedulePreference;
  };
  notes: string;
}

export interface SchedulePreference {
  days: string[];
  times: {
    start_time: string;
    end_time: string;
  };
}

// Extended Client with units (uses inherited preferences from Client)
export interface ClientWithDetails extends Client {
  units?: ClientUnit[];
  // Note: specialities is already inherited from Client
}

export interface ClientUnit {
  id: number;
  client_id: number;
  speciality_id: number;
  speciality?: Speciality;
  units: number;
  current_balance: number;
  authorization_id: string;
  start_date: string;
  end_date: string;
  status: number;
  is_monthly: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClientPreferencesRecord {
  id: number;
  client_id: number;
  general_preferences?: {
    languages?: string[];
    coach_gender?: string;
  };
  schedule_preferences?: {
    in_home?: SchedulePreference;
    transportation?: SchedulePreference;
  };
  notes?: string;
}
