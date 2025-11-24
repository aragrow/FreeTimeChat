/**
 * French Login Page
 * Redirects to main login with language preference set
 */

'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function FrenchLoginRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Set French language preference
    localStorage.setItem('africai-language', 'fr');
    // Redirect to main login
    router.replace('/login');
  }, [router]);

  return null;
}
