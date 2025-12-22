// Appointment status configuration
// Shared across the application for consistency

export const APPOINTMENT_STATUS_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  scheduled: {
    bg: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-800 dark:text-green-200',
    border: 'border-green-300 dark:border-green-600',
  },
  in_progress: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-800 dark:text-blue-200',
    border: 'border-blue-300 dark:border-blue-600',
  },
  completed: {
    bg: 'bg-violet-100 dark:bg-violet-900/30',
    text: 'text-violet-800 dark:text-violet-200',
    border: 'border-violet-300 dark:border-violet-600',
  },
  cancelled: {
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-800 dark:text-red-200',
    border: 'border-red-300 dark:border-red-600',
  },
  no_show: {
    bg: 'bg-gray-100 dark:bg-gray-800',
    text: 'text-gray-800 dark:text-gray-200',
    border: 'border-gray-300 dark:border-gray-600',
  },
  unassigned: {
    bg: 'bg-yellow-100 dark:bg-yellow-900/30',
    text: 'text-yellow-800 dark:text-yellow-200',
    border: 'border-yellow-300 dark:border-yellow-600',
  },
  rejected: {
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-800 dark:text-red-200',
    border: 'border-red-300 dark:border-red-600',
  },
  terminated_by_client: {
    bg: 'bg-orange-100 dark:bg-orange-900/30',
    text: 'text-orange-800 dark:text-orange-200',
    border: 'border-orange-300 dark:border-orange-600',
  },
  terminated_by_staff: {
    bg: 'bg-orange-100 dark:bg-orange-900/30',
    text: 'text-orange-800 dark:text-orange-200',
    border: 'border-orange-300 dark:border-orange-600',
  },
  late: {
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    text: 'text-amber-800 dark:text-amber-200',
    border: 'border-amber-300 dark:border-amber-600',
  },
};

export const APPOINTMENT_STATUS_LABELS: Record<string, string> = {
  scheduled: 'Scheduled',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No Show',
  unassigned: 'Unassigned',
  rejected: 'Rejected',
  terminated_by_client: 'Terminated by Client',
  terminated_by_staff: 'Terminated by Staff',
  late: 'Late',
};

// Team member status styles
export const TEAM_STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  active: {
    bg: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-800 dark:text-green-400',
    dot: 'bg-green-500',
  },
  inactive: {
    bg: 'bg-yellow-100 dark:bg-yellow-900/30',
    text: 'text-yellow-800 dark:text-yellow-400',
    dot: 'bg-yellow-500',
  },
  terminated: {
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-800 dark:text-red-400',
    dot: 'bg-red-500',
  },
};

// Client status styles
export const CLIENT_STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  inactive: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  archived: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
};

// Helper functions
export function getAppointmentStatusStyle(status: string) {
  return APPOINTMENT_STATUS_STYLES[status] || APPOINTMENT_STATUS_STYLES.scheduled;
}

export function getAppointmentStatusLabel(status: string) {
  return APPOINTMENT_STATUS_LABELS[status] || status;
}

export function getTeamStatusStyle(status: string) {
  return TEAM_STATUS_STYLES[status] || TEAM_STATUS_STYLES.active;
}

export function getClientStatusStyle(status: string) {
  return CLIENT_STATUS_STYLES[status] || CLIENT_STATUS_STYLES.active;
}
