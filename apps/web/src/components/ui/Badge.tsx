import React from 'react';
import { cn } from '@/lib/utils/cn';

export type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info';
export type BadgeSize = 'sm' | 'md' | 'lg';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /**
   * Visual variant of the badge
   */
  variant?: BadgeVariant;
  /**
   * Size of the badge
   */
  size?: BadgeSize;
  /**
   * Show dot indicator
   */
  dot?: boolean;
  /**
   * Makes badge outlined instead of filled
   */
  outline?: boolean;
}

/**
 * Badge component for status indicators and labels
 *
 * @example
 * ```tsx
 * <Badge variant="success">Active</Badge>
 * <Badge variant="error" dot>Offline</Badge>
 * <Badge variant="warning" outline>Pending</Badge>
 * ```
 */
export function Badge({
  variant = 'default',
  size = 'md',
  dot = false,
  outline = false,
  className,
  children,
  ...props
}: BadgeProps) {
  const baseStyles =
    'inline-flex items-center font-medium rounded-full transition-colors whitespace-nowrap';

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  };

  const filledVariantStyles = {
    default: 'bg-gray-100 text-gray-800',
    primary: 'bg-blue-100 text-blue-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    error: 'bg-red-100 text-red-800',
    info: 'bg-cyan-100 text-cyan-800',
  };

  const outlineVariantStyles = {
    default: 'border border-gray-300 text-gray-700 bg-white',
    primary: 'border border-blue-300 text-blue-700 bg-white',
    success: 'border border-green-300 text-green-700 bg-white',
    warning: 'border border-yellow-300 text-yellow-700 bg-white',
    error: 'border border-red-300 text-red-700 bg-white',
    info: 'border border-cyan-300 text-cyan-700 bg-white',
  };

  const dotColorStyles = {
    default: 'bg-gray-400',
    primary: 'bg-blue-500',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    error: 'bg-red-500',
    info: 'bg-cyan-500',
  };

  const variantStyles = outline ? outlineVariantStyles : filledVariantStyles;

  return (
    <span
      className={cn(baseStyles, sizeStyles[size], variantStyles[variant], className)}
      {...props}
    >
      {dot && (
        <span
          className={cn('w-2 h-2 rounded-full mr-1.5', dotColorStyles[variant])}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}

/**
 * StatusBadge - Specialized badge for status indicators
 */
export interface StatusBadgeProps extends Omit<BadgeProps, 'variant'> {
  status: 'active' | 'inactive' | 'pending' | 'draft' | 'completed' | 'cancelled';
}

export function StatusBadge({ status, ...props }: StatusBadgeProps) {
  const statusConfig: Record<StatusBadgeProps['status'], { variant: BadgeVariant; label: string }> =
    {
      active: { variant: 'success', label: 'Active' },
      inactive: { variant: 'default', label: 'Inactive' },
      pending: { variant: 'warning', label: 'Pending' },
      draft: { variant: 'info', label: 'Draft' },
      completed: { variant: 'success', label: 'Completed' },
      cancelled: { variant: 'error', label: 'Cancelled' },
    };

  const config = statusConfig[status];

  return (
    <Badge variant={config.variant} dot {...props}>
      {config.label}
    </Badge>
  );
}
