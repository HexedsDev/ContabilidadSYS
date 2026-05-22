import React from 'react';
import { cn } from '../../utils/cn';

/**
 * Solid Panel — flat colored block with white text.
 * Use for hero summaries, KPI banners, key totals.
 * Variants: primary (brand), success, warning, error, info, dark.
 */

export type PanelTone = 'primary' | 'success' | 'warning' | 'error' | 'info' | 'dark';

interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
  tone?: PanelTone;
  padding?: 'sm' | 'md' | 'lg';
}

/**
 * Brand color is preserved across light/dark modes using fixed hex values
 * (instead of CSS vars that swap), so the panel always feels like brand.
 */
const toneClasses: Record<PanelTone, string> = {
  primary: 'bg-[#2942e6] text-white border border-[#1f33b4] dark:bg-[#3b5fff] dark:border-[#5b7dff]',
  success: 'bg-[#16a34a] text-white border border-[#15803d] dark:bg-[#22c55e] dark:border-[#16a34a]',
  warning: 'bg-[#d97706] text-white border border-[#b45309] dark:bg-[#f59e0b] dark:border-[#d97706]',
  error: 'bg-[#dc2626] text-white border border-[#b91c1c] dark:bg-[#ef4444] dark:border-[#dc2626]',
  info: 'bg-[#2563eb] text-white border border-[#1d4ed8] dark:bg-[#3b82f6] dark:border-[#2563eb]',
  dark: 'bg-slate-900 text-white border border-slate-800 dark:bg-slate-950 dark:border-slate-700',
};

const paddingClasses = {
  sm: 'p-4',
  md: 'p-5 sm:p-6',
  lg: 'p-6 sm:p-8',
};

export function Panel({
  tone = 'primary',
  padding = 'md',
  className,
  ...props
}: PanelProps) {
  return (
    <div
      className={cn(
        'rounded-sm w-full',
        toneClasses[tone],
        paddingClasses[padding],
        className
      )}
      {...props}
    />
  );
}

interface PanelStatProps {
  label: string;
  value: string;
  divider?: boolean;
}

/** Column inside a Panel for stat layouts (label + value) */
export function PanelStat({ label, value, divider }: PanelStatProps) {
  return (
    <div className={cn(divider && 'border-l border-white/15 pl-4')}>
      <p className="text-xs text-white/70 uppercase tracking-wider font-medium">{label}</p>
      <p className="mt-1 text-xl sm:text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}
