/**
 * Protected Route Component
 *
 * Wraps pages that require authentication
 * Redirects to login if user is not authenticated
 */

'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Store the intended destination
      const currentPath = window.location.pathname;
      sessionStorage.setItem('redirectAfterLogin', currentPath);

      // Redirect to login
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    // Check role requirement
    if (!isLoading && isAuthenticated && requiredRole) {
      if (user?.role !== requiredRole && !user?.role.includes('ADMIN')) {
        // User doesn't have required role
        router.push('/unauthorized');
      }
    }
  }, [isAuthenticated, isLoading, requiredRole, user, router]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render children if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  // Don't render if role check fails
  if (requiredRole && user?.role !== requiredRole && !user?.role.includes('ADMIN')) {
    return null;
  }

  return <>{children}</>;
}
