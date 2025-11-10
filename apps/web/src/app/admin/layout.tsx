/**
 * Admin Layout
 *
 * Provides the layout structure for the admin panel with sidebar navigation
 */

'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/hooks/useAuth';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();

  // Check if user has admin or tenantadmin role
  const hasAdminAccess = user?.roles?.includes('admin') || user?.roles?.includes('tenantadmin');

  useEffect(() => {
    if (user && !hasAdminAccess) {
      router.push('/chat');
    }
  }, [user, hasAdminAccess, router]);

  // If user doesn't have admin access, don't render
  if (!hasAdminAccess) {
    return null;
  }

  return <AppLayout>{children}</AppLayout>;
}
