/**
 * Dutch Login Page
 * Redirects to main login with language preference set
 */

'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DutchLoginRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Set Dutch language preference
    localStorage.setItem('africai-language', 'nl');
    // Redirect to main login
    router.replace('/login');
  }, [router]);

  return null;
}
