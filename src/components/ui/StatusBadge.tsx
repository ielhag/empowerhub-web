'use client';

import { cn } from '@/lib/utils';
import {
  getAppointmentStatusStyle,
  getAppointmentStatusLabel,
  getTeamStatusStyle,
  getClientStatusStyle
} from '@/lib/constants';

interface StatusBadgeProps {
  status: string;
  type?: 'appointment' | 'team' | 'client';
  className?: string;
  size?: 'sm' | 'md';
  showBorder?: boolean;
}

export function StatusBadge({
  status,
  type = 'appointment',
  className,
  size = 'sm',
  showBorder = false,
}: StatusBadgeProps) {
  const sizeClasses = {
    sm: 'px-2.5 py-0.5 text-xs',
    md: 'px-3 py-1.5 text-sm',
  };

  if (type === 'appointment') {
    const style = getAppointmentStatusStyle(status);
    const label = getAppointmentStatusLabel(status);

    return (
      <span
        className={cn(
          'inline-flex items-center font-medium rounded-full',
          sizeClasses[size],
          style.bg,
          style.text,
          showBorder && style.border,
          showBorder && 'border',
          className
        )}
      >
        {label}
      </span>
    );
  }

  if (type === 'team') {
    const style = getTeamStatusStyle(status);

    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 font-medium capitalize',
          sizeClasses[size],
          className
        )}
      >
        <span className={cn('w-2 h-2 rounded-full', style.dot)} />
        <span className={style.text}>{status}</span>
      </span>
    );
  }

  if (type === 'client') {
    const style = getClientStatusStyle(status);

    return (
      <span
        className={cn(
          'inline-flex items-center font-medium rounded-full capitalize',
          sizeClasses[size],
          style,
          className
        )}
      >
        {status}
      </span>
    );
  }

  return null;
}

export default StatusBadge;
