/**
 * Impersonation Context
 *
 * Manages admin impersonation state and provides methods to start/end impersonation
 */

'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface ImpersonationContextType {
  isImpersonating: boolean;
  targetUser: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  } | null;
  startImpersonation: (targetUserId: string) => Promise<boolean>;
  endImpersonation: () => Promise<void>;
}

const ImpersonationContext = createContext<ImpersonationContextType | undefined>(undefined);

export function useImpersonation() {
  const context = useContext(ImpersonationContext);
  if (!context) {
    throw new Error('useImpersonation must be used within ImpersonationProvider');
  }
  return context;
}

export function ImpersonationProvider({ children }: { children: React.ReactNode }) {
  const { user, refreshUser, fetchWithAuth, logout } = useAuth();
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [targetUser, setTargetUser] = useState<ImpersonationContextType['targetUser']>(null);

  // Check if currently impersonating
  useEffect(() => {
    if (user?.isImpersonating) {
      setIsImpersonating(true);
      // Extract target user info from user object if available
      setTargetUser({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      });
    } else {
      setIsImpersonating(false);
      setTargetUser(null);
    }
  }, [user]);

  const startImpersonation = async (targetUserId: string): Promise<boolean> => {
    try {
      const response = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/admin/users/${targetUserId}/impersonate`, { method: 'POST' });

      if (response.ok) {
        const data = await response.json();
        // Store the new impersonation token
        localStorage.setItem('accessToken', data.data.accessToken);

        setIsImpersonating(true);
        setTargetUser(data.data.targetUser);

        // Refresh auth context to update user info with the new token
        await refreshUser();

        return true;
      } else {
        const errorData = await response.json();
        console.error('Impersonation failed:', errorData.message);
        return false;
      }
    } catch (error) {
      console.error('Impersonation error:', error);
      return false;
    }
  };

  const endImpersonation = async (): Promise<void> => {
    try {
      const response = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/admin/users/impersonate/stop`, { method: 'POST' });

      if (response.ok) {
        // eslint-disable-next-line no-console
        console.log('Stop impersonation successful');

        setIsImpersonating(false);
        setTargetUser(null);

        // Completely log out the user and redirect to login screen
        await logout();
      } else {
        const errorData = await response.json();
        console.error('Failed to end impersonation:', errorData.message);
        alert(`Failed to end impersonation: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('End impersonation error:', error);
      alert('An error occurred while ending impersonation. Please try again.');
    }
  };

  const value: ImpersonationContextType = {
    isImpersonating,
    targetUser,
    startImpersonation,
    endImpersonation,
  };

  return <ImpersonationContext.Provider value={value}>{children}</ImpersonationContext.Provider>;
}
