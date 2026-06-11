import React from 'react';
import { cn } from '../../utils/cn';
import { Loader2 } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'subtle';
type Size = 'xs' | 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800 shadow-soft hover:shadow-md',
  secondary:
    'bg-secondary-600 text-white hover:bg-secondary-700 active:bg-secondary-700 shadow-soft hover:shadow-md',
  outline:
    'border border-border-strong bg-surface text-text-main hover:bg-surface-soft hover:border-primary-500/40',
  ghost:
    'text-text-main hover:bg-surface-soft',
  subtle:
    'bg-primary-50 text-primary-700 hover:bg-primary-100 dark:text-primary-300',
  danger:
    'bg-error text-white hover:bg-red-700 active:bg-red-800 shadow-soft hover:shadow-md',
  success:
    'bg-success text-white hover:bg-green-700 active:bg-green-800 shadow-soft hover:shadow-md',
};

const sizeClasses: Record<Size, string> = {
  xs: 'h-7 px-2.5 text-xs gap-1.5 rounded-sm',
  sm: 'h-9 px-3 text-sm gap-2 rounded-sm',
  md: 'h-10 px-4 text-sm gap-2 rounded',
  lg: 'h-12 px-6 text-base gap-2.5 rounded',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      loading = false,
      leftIcon,
      rightIcon,
      fullWidth,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center font-medium transition-colors duration-150 select-none whitespace-nowrap',
          'ring-focus disabled:opacity-50 disabled:cursor-not-allowed',
          variantClasses[variant],
          sizeClasses[size],
          fullWidth && 'w-full',
          className
        )}
        {...props}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          leftIcon && <span className="shrink-0 inline-flex">{leftIcon}</span>
        )}
        {children}
        {!loading && rightIcon && <span className="shrink-0 inline-flex">{rightIcon}</span>}
      </button>
    );
  }
);
Button.displayName = 'Button';
