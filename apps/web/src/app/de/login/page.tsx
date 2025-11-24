/**
 * German Login Page
 * Redirects to main login with language preference set
 */

'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function GermanLoginRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Set German language preference
    localStorage.setItem('africai-language', 'de');
    // Redirect to main login
    router.replace('/login');
  }, [router]);

  return null;
}
