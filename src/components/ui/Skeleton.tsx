import { cn } from '../../utils/cn';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circle' | 'block';
  width?: string | number;
  height?: string | number;
}

export function Skeleton({ className, variant = 'block', width, height, style, ...props }: SkeletonProps) {
  const variantClass = {
    text: 'rounded h-4',
    circle: 'rounded-full',
    block: 'rounded-sm',
  }[variant];

  return (
    <div
      className={cn('skeleton', variantClass, className)}
      style={{ width, height, ...style }}
      {...props}
    />
  );
}
