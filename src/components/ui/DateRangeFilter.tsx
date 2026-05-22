import { Calendar, X } from 'lucide-react';
import type { DateRange } from '../../types';

interface DateRangeFilterProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
}

export function DateRangeFilter({ value, onChange, className }: DateRangeFilterProps) {
  const clear = () => onChange({ from: null, to: null });
  const hasValue = value.from || value.to;

  return (
    <div className={`flex items-center gap-2 ${className ?? ''}`}>
      <div className="flex items-center gap-1.5 bg-surface border border-border-strong rounded-sm h-9 px-2.5">
        <Calendar className="w-3.5 h-3.5 text-text-subtle shrink-0" />
        <input
          type="date"
          value={value.from ?? ''}
          onChange={e => onChange({ ...value, from: e.target.value || null })}
          className="bg-transparent text-sm outline-none text-text-main w-[125px]"
          aria-label="Desde"
        />
        <span className="text-text-subtle text-xs">a</span>
        <input
          type="date"
          value={value.to ?? ''}
          onChange={e => onChange({ ...value, to: e.target.value || null })}
          className="bg-transparent text-sm outline-none text-text-main w-[125px]"
          aria-label="Hasta"
        />
      </div>
      {hasValue && (
        <button
          onClick={clear}
          className="p-1.5 text-text-subtle hover:text-error hover:bg-error-soft rounded-sm transition-colors"
          aria-label="Limpiar filtro"
          title="Limpiar"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
