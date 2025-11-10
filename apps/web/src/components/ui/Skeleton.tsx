import React from 'react';
import { cn } from '@/lib/utils/cn';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Width of the skeleton
   */
  width?: string | number;
  /**
   * Height of the skeleton
   */
  height?: string | number;
  /**
   * Shape variant
   */
  variant?: 'text' | 'circular' | 'rectangular';
  /**
   * Number of lines (for text variant)
   */
  lines?: number;
}

/**
 * Skeleton component for loading states
 *
 * @example
 * ```tsx
 * <Skeleton variant="text" lines={3} />
 * <Skeleton variant="circular" width={40} height={40} />
 * <Skeleton variant="rectangular" height={200} />
 * ```
 */
export function Skeleton({
  width,
  height,
  variant = 'rectangular',
  lines = 1,
  className,
  ...props
}: SkeletonProps) {
  const baseStyles = 'bg-gray-200 animate-pulse';

  const variantStyles = {
    text: 'rounded h-4',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  const style: React.CSSProperties = {
    ...(width && { width: typeof width === 'number' ? `${width}px` : width }),
    ...(height && { height: typeof height === 'number' ? `${height}px` : height }),
  };

  // For text variant with multiple lines
  if (variant === 'text' && lines > 1) {
    return (
      <div className={cn('space-y-2', className)} {...props}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn(baseStyles, variantStyles[variant])}
            style={{
              ...style,
              ...(i === lines - 1 && { width: '80%' }), // Last line is 80% width
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className={cn(baseStyles, variantStyles[variant], className)} style={style} {...props} />
  );
}

/**
 * Skeleton card for loading card-based content
 */
export function SkeletonCard() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 space-y-4">
      <div className="flex items-center gap-4">
        <Skeleton variant="circular" width={40} height={40} />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" width="60%" />
          <Skeleton variant="text" width="40%" />
        </div>
      </div>
      <Skeleton variant="rectangular" height={100} />
      <div className="flex gap-2">
        <Skeleton variant="rectangular" width={80} height={32} />
        <Skeleton variant="rectangular" width={80} height={32} />
      </div>
    </div>
  );
}

/**
 * Skeleton table for loading table content
 */
export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex gap-4">
          <Skeleton variant="text" width="20%" />
          <Skeleton variant="text" width="30%" />
          <Skeleton variant="text" width="25%" />
          <Skeleton variant="text" width="25%" />
        </div>
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="border-b border-gray-200 p-4">
          <div className="flex gap-4 items-center">
            <Skeleton variant="text" width="20%" />
            <Skeleton variant="text" width="30%" />
            <Skeleton variant="text" width="25%" />
            <Skeleton variant="text" width="25%" />
          </div>
        </div>
      ))}
    </div>
  );
}
