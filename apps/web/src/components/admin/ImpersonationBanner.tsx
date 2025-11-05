/**
 * Impersonation Banner
 *
 * Shows a warning banner when admin is impersonating a user
 */

'use client';

import { Button } from '@/components/ui/Button';
import { useImpersonation } from '@/contexts/ImpersonationContext';

export function ImpersonationBanner() {
  const { isImpersonating, targetUser, endImpersonation } = useImpersonation();

  if (!isImpersonating || !targetUser) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-400 border-b-2 border-yellow-600 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-600 rounded-full flex items-center justify-center flex-shrink-0">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-yellow-900">Impersonation Mode Active</p>
              <p className="text-xs text-yellow-800">
                You are currently signed in as{' '}
                <span className="font-semibold">
                  {targetUser.firstName} {targetUser.lastName}
                </span>{' '}
                ({targetUser.email})
              </p>
            </div>
          </div>
          <Button
            onClick={endImpersonation}
            size="sm"
            className="bg-yellow-900 hover:bg-yellow-950 text-white flex-shrink-0"
          >
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
            Exit Impersonation
          </Button>
        </div>
      </div>
    </div>
  );
}
