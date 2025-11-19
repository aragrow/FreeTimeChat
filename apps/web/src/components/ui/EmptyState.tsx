import React from 'react';
import { Button, type ButtonProps } from './Button';
import { cn } from '@/lib/utils/cn';

export interface EmptyStateProps {
  /**
   * Icon to display
   */
  icon?: React.ReactNode;
  /**
   * Title text
   */
  title: string;
  /**
   * Description text
   */
  description?: string;
  /**
   * Primary action button
   */
  action?: {
    label: string;
    onClick: () => void;
  } & Partial<ButtonProps>;
  /**
   * Secondary action button
   */
  secondaryAction?: {
    label: string;
    onClick: () => void;
  } & Partial<ButtonProps>;
  /**
   * Container class name
   */
  className?: string;
}

/**
 * EmptyState component for displaying empty data states
 *
 * @example
 * ```tsx
 * <EmptyState
 *   icon={<InboxIcon />}
 *   title="No messages yet"
 *   description="Start a conversation by sending your first message"
 *   action={{
 *     label: "Send Message",
 *     onClick: handleSendMessage
 *   }}
 * />
 * ```
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  className,
}: EmptyStateProps) {
  const defaultIcon = (
    <svg className="w-16 h-16 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
      />
    </svg>
  );

  return (
    <div
      className={cn('flex flex-col items-center justify-center py-12 px-4 text-center', className)}
    >
      <div className="mb-4">{icon || defaultIcon}</div>

      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>

      {description && <p className="text-sm text-gray-500 mb-6 max-w-md">{description}</p>}

      {(action || secondaryAction) && (
        <div className="flex items-center gap-3">
          {action && (
            <Button {...action} variant={action.variant || 'primary'} size={action.size || 'md'}>
              {action.label}
            </Button>
          )}

          {secondaryAction && (
            <Button
              {...secondaryAction}
              variant={secondaryAction.variant || 'outline'}
              size={secondaryAction.size || 'md'}
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * EmptyTableState - Specialized empty state for tables
 */
export function EmptyTableState({
  title = 'No data available',
  description = 'There are no items to display at this time',
  action,
}: Partial<EmptyStateProps>) {
  const icon = (
    <svg className="w-16 h-16 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
      />
    </svg>
  );

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-12">
      <EmptyState icon={icon} title={title} description={description} action={action} />
    </div>
  );
}

/**
 * EmptySearchState - Specialized empty state for search results
 */
export function EmptySearchState({
  searchQuery,
  onClearSearch,
}: {
  searchQuery: string;
  onClearSearch?: () => void;
}) {
  const icon = (
    <svg className="w-16 h-16 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  );

  return (
    <EmptyState
      icon={icon}
      title="No results found"
      description={
        searchQuery
          ? `No results found for "${searchQuery}". Try adjusting your search terms.`
          : 'Try adjusting your search terms or filters.'
      }
      action={
        onClearSearch
          ? {
              label: 'Clear Search',
              onClick: onClearSearch,
              variant: 'outline',
            }
          : undefined
      }
    />
  );
}
