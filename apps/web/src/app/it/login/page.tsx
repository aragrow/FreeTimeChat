/**
 * Italian Login Page
 * Redirects to main login with language preference set
 */

'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ItalianLoginRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Set Italian language preference
    localStorage.setItem('africai-language', 'it');
    // Redirect to main login
    router.replace('/login');
  }, [router]);

  return null;
}
