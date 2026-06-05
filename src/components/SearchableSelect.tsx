import { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, X, Check } from 'lucide-react';
import { cn } from '../utils/cn';
import { motion, AnimatePresence } from 'framer-motion';

export interface Option {
  value: string;
  label: string;
  sublabel?: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  size?: 'sm' | 'md';
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Seleccione una opción...',
  className,
  disabled = false,
  size = 'sm',
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightRaw, setHighlight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(o => o.value === value);

  const filteredOptions = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return options;
    return options.filter(
      o => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q)
    );
  }, [options, searchTerm]);

  // Clamp highlight to filtered range without an effect
  const highlight = Math.min(highlightRaw, Math.max(0, filteredOptions.length - 1));

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const id = setTimeout(() => inputRef.current?.focus(), 30);
    return () => clearTimeout(id);
  }, [isOpen]);

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
    setSearchTerm('');
    setHighlight(0);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearchTerm('');
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight(h => Math.min(h + 1, filteredOptions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight(h => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const opt = filteredOptions[highlight];
      if (opt) handleSelect(opt.value);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const sizeClass = size === 'md' ? 'h-10 text-sm' : 'h-9 text-sm';

  return (
    <div className={cn('relative', className)} ref={containerRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(v => !v)}
        disabled={disabled}
        className={cn(
          'group w-full flex items-center justify-between gap-2 px-3 bg-surface border rounded-sm transition-all text-left',
          sizeClass,
          disabled
            ? 'opacity-50 cursor-not-allowed bg-surface-soft border-border-soft'
            : 'border-border-strong hover:border-text-subtle cursor-pointer',
          isOpen && 'border-primary-500 ring-2 ring-primary-500/30'
        )}
      >
        <div className="flex-1 min-w-0 truncate">
          {selectedOption ? (
            <span className="flex items-center gap-2 truncate">
              <span className="font-mono text-xs text-primary-600 bg-primary-50 dark:text-primary-300 px-1.5 py-0.5 rounded shrink-0">
                {selectedOption.value}
              </span>
              <span className="text-text-main truncate">{selectedOption.label.replace(`${selectedOption.value} — `, '').replace(`${selectedOption.value} - `, '')}</span>
            </span>
          ) : (
            <span className="text-text-subtle">{placeholder}</span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {value && !disabled && (
            <span
              role="button"
              tabIndex={-1}
              aria-label="Limpiar"
              onClick={handleClear}
              className="p-1 hover:bg-surface-soft rounded text-text-muted"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown
            className={cn('w-4 h-4 text-text-subtle transition-transform', isOpen && 'rotate-180')}
          />
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            className="absolute z-50 w-full min-w-[280px] mt-1.5 bg-surface border border-border-soft rounded-sm shadow-lg overflow-hidden flex flex-col max-h-72"
          >
            <div className="p-2 border-b border-border-soft bg-surface-soft/50 flex items-center gap-2">
              <Search className="w-4 h-4 text-text-subtle shrink-0" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Buscar por código o nombre..."
                className="flex-1 bg-transparent border-none focus:ring-0 text-sm outline-none placeholder:text-text-subtle"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                onKeyDown={handleKey}
              />
              <span className="text-[10px] text-text-subtle font-mono px-1.5 py-0.5 bg-surface rounded border border-border-soft">
                {filteredOptions.length}
              </span>
            </div>
            <div ref={listRef} className="overflow-y-auto flex-1">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option, idx) => {
                  const isSel = option.value === value;
                  const isHi = idx === highlight;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onMouseEnter={() => setHighlight(idx)}
                      onClick={() => handleSelect(option.value)}
                      className={cn(
                        'w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2.5 border-l-2',
                        isHi ? 'bg-primary-50 dark:bg-primary-100 border-l-primary-500' : 'border-l-transparent',
                        isSel && 'font-medium text-primary-700 dark:text-primary-300'
                      )}
                    >
                      <span className="font-mono text-[11px] text-primary-600 bg-primary-50 dark:bg-primary-100 dark:text-primary-300 px-1.5 py-0.5 rounded shrink-0 w-16 text-center">
                        {option.value}
                      </span>
                      <span className="flex-1 truncate text-text-main">
                        {option.label.replace(`${option.value} — `, '').replace(`${option.value} - `, '')}
                      </span>
                      {option.sublabel && (
                        <span className="text-[10px] text-text-subtle uppercase tracking-wider shrink-0">
                          {option.sublabel}
                        </span>
                      )}
                      {isSel && <Check className="w-4 h-4 text-primary-600 shrink-0" />}
                    </button>
                  );
                })
              ) : (
                <div className="px-4 py-8 text-sm text-center text-text-subtle">
                  Sin resultados para "<span className="font-medium">{searchTerm}</span>"
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
