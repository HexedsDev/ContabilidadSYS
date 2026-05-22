import React from 'react';
import { cn } from '../../utils/cn';
import { motion } from 'framer-motion';
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
  delay?: number;
}

const toneClasses: Record<Tone, { bg: string; text: string; ring: string }> = {
  primary: { bg: 'bg-primary-50', text: 'text-primary-600', ring: 'ring-primary-500/20' },
  success: { bg: 'bg-success-soft', text: 'text-success', ring: 'ring-success/20' },
  warning: { bg: 'bg-warning-soft', text: 'text-warning', ring: 'ring-warning/20' },
  error: { bg: 'bg-error-soft', text: 'text-error', ring: 'ring-error/20' },
  info: { bg: 'bg-info-soft', text: 'text-info', ring: 'ring-info/20' },
  neutral: { bg: 'bg-surface-soft', text: 'text-text-muted', ring: 'ring-border-soft' },
};

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = 'neutral',
  trend,
  hint,
  className,
  delay = 0,
}: StatCardProps) {
  const t = toneClasses[tone];
  const trendUp = trend && trend.value >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'group bg-surface rounded-sm border border-border-soft p-5',
        'shadow-soft hover:shadow-md transition-shadow duration-150',
        className
      )}
    >
      <div>
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-medium text-text-muted uppercase tracking-wider">{label}</p>
          {Icon && (
            <div className={cn('w-9 h-9 rounded-sm flex items-center justify-center', t.bg, t.text)}>
              <Icon className="w-4 h-4" />
            </div>
          )}
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
    </motion.div>
  );
}
