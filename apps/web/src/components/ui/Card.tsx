import React from 'react';
import { cn } from '@/lib/utils/cn';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Adds hover effect with shadow
   */
  hoverable?: boolean;
  /**
   * Removes padding from card
   */
  noPadding?: boolean;
}

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}
export interface CardBodyProps extends React.HTMLAttributes<HTMLDivElement> {}
export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

/**
 * Card component for containing related content
 *
 * @example
 * ```tsx
 * <Card>
 *   <CardHeader>
 *     <h3>Card Title</h3>
 *   </CardHeader>
 *   <CardBody>
 *     <p>Card content goes here</p>
 *   </CardBody>
 *   <CardFooter>
 *     <Button>Action</Button>
 *   </CardFooter>
 * </Card>
 * ```
 */
export function Card({
  hoverable = false,
  noPadding = false,
  className,
  children,
  ...props
}: CardProps) {
  const baseStyles = 'bg-white rounded-lg border border-gray-200 shadow-sm';
  const hoverStyles = hoverable ? 'hover:shadow-md transition-shadow duration-200' : '';
  const paddingStyles = noPadding ? '' : 'p-6';

  return (
    <div
      className={cn(baseStyles, hoverStyles, paddingStyles, className)}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * CardHeader component for card titles and actions
 */
export function CardHeader({ className, children, ...props }: CardHeaderProps) {
  return (
    <div
      className={cn('border-b border-gray-200 pb-4 mb-4', className)}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * CardBody component for main card content
 */
export function CardBody({ className, children, ...props }: CardBodyProps) {
  return (
    <div className={cn('', className)} {...props}>
      {children}
    </div>
  );
}

/**
 * CardFooter component for card actions
 */
export function CardFooter({ className, children, ...props }: CardFooterProps) {
  return (
    <div
      className={cn('border-t border-gray-200 pt-4 mt-4 flex items-center justify-end gap-2', className)}
      {...props}
    >
      {children}
    </div>
  );
}
