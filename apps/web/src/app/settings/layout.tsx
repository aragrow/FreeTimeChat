/**
 * Settings Layout
 *
 * Provides the layout structure for all settings pages
 */

'use client';

import { AppLayout } from '@/components/layout/AppLayout';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <AppLayout>{children}</AppLayout>;
}
