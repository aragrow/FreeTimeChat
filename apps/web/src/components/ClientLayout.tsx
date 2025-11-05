/**
 * Client Layout
 *
 * Client-side wrapper for providers and banners
 */

'use client';

import { ImpersonationBanner } from '@/components/admin/ImpersonationBanner';
import { ImpersonationProvider } from '@/contexts/ImpersonationContext';

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <ImpersonationProvider>
      <ImpersonationBanner />
      <div className="impersonation-offset">{children}</div>
    </ImpersonationProvider>
  );
}
