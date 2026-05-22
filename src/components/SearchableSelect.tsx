import { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, X } from 'lucide-react';
import { cn } from '../utils/cn';

interface Option {
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
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Seleccione una opción...",
  className,
  disabled = false
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find(opt => opt.value === value);

  const filteredOptions = options.filter(opt =>
    opt.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    opt.value.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = () => {
    if (disabled) return;
    setIsOpen(!isOpen);
    if (!isOpen) {
      setSearchTerm('');
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onChange('');
    setSearchTerm('');
  };

  return (
    <div className={cn("relative", className)} ref={containerRef}>
      <div
        onClick={handleToggle}
        className={cn(
          "flex items-center justify-between w-full border border-border-soft rounded-md p-2 text-sm bg-white cursor-pointer transition-all focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-primary-500",
          disabled && "opacity-50 cursor-not-allowed bg-gray-50",
          isOpen && "border-primary-500 ring-2 ring-primary-500/20"
        )}
      >
        <div className="flex-1 truncate">
          {selectedOption ? (
            <span className="text-text-main font-medium">
              <span className="text-primary-600 mr-2 font-mono">{selectedOption.value}</span>
              {selectedOption.label}
            </span>
          ) : (
            <span className="text-text-muted">{placeholder}</span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          {value && !disabled && (
            <button type="button" onClick={handleClear} className="p-1 hover:bg-gray-100 rounded-full text-text-muted relative z-10">
              <X className="w-3 h-3" />
            </button>
          )}
          <ChevronDown className={cn("w-4 h-4 text-text-muted transition-transform", isOpen && "rotate-180")} />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-[100] w-full mt-1 bg-white border border-border-soft rounded-md shadow-lg overflow-hidden flex flex-col max-h-72">
          <div className="p-2 border-b border-border-soft bg-gray-50 flex items-center">
            <Search className="w-4 h-4 text-text-muted mr-2" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Buscar por código o nombre..."
              className="w-full bg-transparent border-none focus:ring-0 text-sm p-1 outline-none"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="overflow-y-auto flex-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map(option => (
                <div
                  key={option.value}
                  onClick={() => handleSelect(option.value)}
                  className={cn(
                    "px-3 py-2 text-sm cursor-pointer hover:bg-primary-50 transition-colors flex flex-col",
                    option.value === value && "bg-primary-50 text-primary-700 font-medium"
                  )}
                >
                  <div className="flex items-center">
                    <span className="text-primary-600 font-mono mr-2 w-16 shrink-0">{option.value}</span>
                    <span className="truncate">{option.label}</span>
                  </div>
                  {option.sublabel && (
                    <span className="text-xs text-text-muted ml-18">{option.sublabel}</span>
                  )}
                </div>
              ))
            ) : (
              <div className="px-3 py-4 text-sm text-center text-text-muted italic">
                No se encontraron resultados
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
