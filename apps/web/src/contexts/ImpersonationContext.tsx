/**
 * Impersonation Context
 *
 * Manages admin impersonation state and provides methods to start/end impersonation
 */

'use client';

import { useRouter } from 'next/navigation';
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
  const router = useRouter();
  const { user, refreshUser } = useAuth();
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
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/impersonate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ targetUserId }),
      });

      if (response.ok) {
        const data = await response.json();
        setIsImpersonating(true);
        setTargetUser(data.data.targetUser);

        // Refresh auth context to update user info
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
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/end-impersonation`, {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        setIsImpersonating(false);
        setTargetUser(null);

        // Refresh auth context to restore admin user
        await refreshUser();

        // Redirect back to admin panel
        router.push('/admin/users');
      } else {
        console.error('Failed to end impersonation');
      }
    } catch (error) {
      console.error('End impersonation error:', error);
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
