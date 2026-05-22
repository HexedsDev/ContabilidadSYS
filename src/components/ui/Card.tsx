import React from 'react';
import { cn } from '../../utils/cn';

type CardVariant = 'default' | 'elevated' | 'flat' | 'glass' | 'gradient';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  hoverable?: boolean;
}

const variantClasses: Record<CardVariant, string> = {
  default: 'bg-surface border border-border-soft shadow-soft',
  elevated: 'bg-surface border border-border-soft shadow-md',
  flat: 'bg-surface-soft border border-transparent',
  glass: 'glass border border-border-soft',
  gradient: 'gradient-primary text-white border-0 shadow-lg',
};

export function Card({ className, variant = 'default', hoverable, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-sm overflow-hidden transition-shadow duration-150',
        variantClasses[variant],
        hoverable && 'hover:shadow-md',
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-6 pt-6 pb-3 flex items-start justify-between gap-4', className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn('text-base font-semibold leading-tight tracking-tight text-text-main', className)}
      {...props}
    />
  );
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm text-text-muted mt-1', className)} {...props} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-6 pb-6', className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('px-6 py-4 border-t border-border-soft bg-surface-soft/50 flex items-center justify-between gap-3', className)}
      {...props}
    />
  );
}
