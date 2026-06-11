import React from 'react';
import { cn } from '../../utils/cn';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  hint?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightAddon?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'h-9 text-sm',
  md: 'h-10 text-sm',
  lg: 'h-12 text-base',
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, hint, error, leftIcon, rightAddon, size = 'md', id, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id ?? generatedId;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-medium text-text-muted mb-1.5 uppercase tracking-wide"
          >
            {label}
          </label>
        )}
        <div
          className={cn(
            'flex items-center w-full bg-surface border rounded-sm transition-all duration-150 overflow-hidden',
            'focus-within:ring-2 focus-within:ring-primary-500/40 focus-within:border-primary-500',
            error
              ? 'border-error focus-within:ring-error/30 focus-within:border-error'
              : 'border-border-strong hover:border-text-subtle',
            sizeClasses[size]
          )}
        >
          {leftIcon && (
            <span className="pl-3 pr-1 text-text-subtle inline-flex items-center">
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'flex-1 bg-transparent outline-none placeholder:text-text-subtle text-text-main px-3 min-w-0',
              leftIcon && 'pl-2',
              rightAddon && 'pr-2',
              className
            )}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
            {...props}
          />
          {rightAddon && (
            <span className="pr-3 pl-1 text-text-subtle inline-flex items-center text-sm">
              {rightAddon}
            </span>
          )}
        </div>
        {error ? (
          <p id={`${inputId}-error`} className="mt-1 text-xs text-error font-medium">
            {error}
          </p>
        ) : hint ? (
          <p id={`${inputId}-hint`} className="mt-1 text-xs text-text-muted">
            {hint}
          </p>
        ) : null}
      </div>
    );
  }
);
Input.displayName = 'Input';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, hint, error, id, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id ?? generatedId;
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-medium text-text-muted mb-1.5 uppercase tracking-wide"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={cn(
            'block w-full bg-surface border rounded-sm px-3 py-2.5 text-sm outline-none transition-all',
            'placeholder:text-text-subtle text-text-main resize-y min-h-[80px]',
            'focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500',
            error
              ? 'border-error focus:ring-error/30 focus:border-error'
              : 'border-border-strong hover:border-text-subtle',
            className
          )}
          aria-invalid={!!error}
          {...props}
        />
        {error ? (
          <p className="mt-1 text-xs text-error font-medium">{error}</p>
        ) : hint ? (
          <p className="mt-1 text-xs text-text-muted">{hint}</p>
        ) : null}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';
