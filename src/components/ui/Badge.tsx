import React from 'react';
import { cn } from '../../utils/cn';

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'default' | 'primary' | 'secondary' | 'outline';
type BadgeSize = 'sm' | 'md';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
}

const variantClasses: Record<BadgeVariant, string> = {
  success: 'bg-success-soft text-success ring-1 ring-inset ring-success/20',
  warning: 'bg-warning-soft text-warning ring-1 ring-inset ring-warning/20',
  error: 'bg-error-soft text-error ring-1 ring-inset ring-error/20',
  info: 'bg-info-soft text-info ring-1 ring-inset ring-info/20',
  primary: 'bg-primary-50 text-primary-700 ring-1 ring-inset ring-primary-500/20 dark:text-primary-300',
  secondary: 'bg-secondary-100 text-secondary-700 ring-1 ring-inset ring-secondary-500/20 dark:bg-secondary-100/10 dark:text-secondary-300',
  default: 'bg-surface-soft text-text-muted ring-1 ring-inset ring-border-soft',
  outline: 'bg-transparent text-text-main ring-1 ring-inset ring-border-strong',
};

const dotColor: Record<BadgeVariant, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  error: 'bg-error',
  info: 'bg-info',
  primary: 'bg-primary-500',
  secondary: 'bg-secondary-500',
  default: 'bg-text-subtle',
  outline: 'bg-text-muted',
};

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'text-[10px] px-1.5 py-0.5 gap-1',
  md: 'text-xs px-2 py-0.5 gap-1.5',
};

export function Badge({ className, variant = 'default', size = 'md', dot, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium tracking-tight transition-colors',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {dot && (
        <span className={cn('w-1.5 h-1.5 rounded-full', dotColor[variant])} aria-hidden />
      )}
      {children}
    </span>
  );
}
