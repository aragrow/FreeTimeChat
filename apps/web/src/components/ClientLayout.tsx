/**
 * Client Layout
 *
 * Client-side wrapper for providers and banners
 */

'use client';

import { ImpersonationBanner } from '@/components/admin/ImpersonationBanner';
import { ToastProvider } from '@/components/ui';
import { ImpersonationProvider } from '@/contexts/ImpersonationContext';

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <ImpersonationProvider>
        <ImpersonationBanner />
        <div className="impersonation-offset">{children}</div>
      </ImpersonationProvider>
    </ToastProvider>
  );
}
