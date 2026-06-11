import React from 'react';
import { cn } from '../../utils/cn';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

type Tone = 'primary' | 'success' | 'warning' | 'error' | 'info' | 'neutral';

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ElementType;
  tone?: Tone;
  trend?: { value: number; label?: string };
  hint?: string;
  className?: string;
}

const toneText: Record<Tone, string> = {
  primary: 'text-primary-600 dark:text-primary-300',
  success: 'text-success',
  warning: 'text-warning',
  error: 'text-error',
  info: 'text-info',
  neutral: 'text-text-subtle',
};

export function StatCard({ label, value, icon: Icon, tone = 'neutral', trend, hint, className }: StatCardProps) {
  const trendUp = trend && trend.value >= 0;

  return (
    <div className={cn('bg-surface rounded-sm border border-border-soft p-5', className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium text-text-muted uppercase tracking-wider">{label}</p>
        {Icon && <Icon className={cn('w-4 h-4 shrink-0', toneText[tone])} />}
      </div>
      <p className="mt-3 text-2xl font-bold text-text-main tracking-tight tabular-nums">{value}</p>
      <div className="mt-2 flex items-center gap-2 min-h-[18px]">
        {trend && (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 text-xs font-semibold',
              trendUp ? 'text-success' : 'text-error'
            )}
          >
            {trendUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {Math.abs(trend.value)}%
            {trend.label && <span className="text-text-muted font-normal ml-1">{trend.label}</span>}
          </span>
        )}
        {hint && !trend && <span className="text-xs text-text-muted">{hint}</span>}
      </div>
    </div>
  );
}
