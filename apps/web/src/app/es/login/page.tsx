/**
 * Spanish Login Page
 * Redirects to main login with language preference set
 */

'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function SpanishLoginRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Set Spanish language preference
    localStorage.setItem('africai-language', 'es');
    // Redirect to main login
    router.replace('/login');
  }, [router]);

  return null;
}
