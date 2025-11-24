/**
 * Otjiherero Login Page
 * Redirects to main login with language preference set
 */

'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function OtjihereroLoginRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Set Otjiherero language preference
    localStorage.setItem('africai-language', 'hz');
    // Redirect to main login
    router.replace('/login');
  }, [router]);

  return null;
}
