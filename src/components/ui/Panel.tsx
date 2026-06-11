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
 * Tonos tinta profundos con hex fijos (no CSS vars que cambian con el tema):
 * el dato en blanco se lee bien y el bloque no "grita" como un banner.
 */
const toneClasses: Record<PanelTone, string> = {
  primary: 'bg-[#1d2d50] text-white border border-[#2a3c66] dark:bg-[#1f2c4e] dark:border-[#33415e]',
  success: 'bg-[#14532d] text-white border border-[#1c7240] dark:bg-[#15482a] dark:border-[#236b41]',
  warning: 'bg-[#92400e] text-white border border-[#b45309] dark:bg-[#7c3a0d] dark:border-[#a14e16]',
  error: 'bg-[#7f1d1d] text-white border border-[#9b2c2c] dark:bg-[#6b1a1a] dark:border-[#8c2727]',
  info: 'bg-[#1e3a5f] text-white border border-[#2c5079] dark:bg-[#1a3354] dark:border-[#2c5079]',
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
