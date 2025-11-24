/**
 * Afrikaans Login Page
 * Redirects to main login with language preference set
 */

'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AfrikaansLoginRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Set Afrikaans language preference
    localStorage.setItem('africai-language', 'af');
    // Redirect to main login
    router.replace('/login');
  }, [router]);

  return null;
}
