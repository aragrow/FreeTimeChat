/**
 * Authentication Context
 *
 * Manages user authentication state and provides auth methods
 */

'use client';

import { useRouter } from 'next/navigation';
import React, { createContext, useCallback, useEffect, useState } from 'react';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isTwoFactorEnabled: boolean;
  isImpersonating?: boolean;
  originalUserId?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ requires2FA?: boolean; error?: string }>;
  logout: () => Promise<void>;
  verify2FA: (code: string) => Promise<{ success: boolean; error?: string }>;
  refreshUser: () => Promise<void>;
  loginWithGoogle: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check authentication status on mount
  useEffect(() => {
    checkAuth();
  }, []);

  // Set up token refresh interval
  useEffect(() => {
    if (user) {
      const interval = setInterval(
        () => {
          refreshToken();
        },
        14 * 60 * 1000
      ); // Refresh every 14 minutes (before 15-minute expiry)

      return () => clearInterval(interval);
    }
  }, [user]);

  const checkAuth = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/me`, {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.data);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshToken = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        // Refresh failed, logout user
        await logout();
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      await logout();
    }
  };

  const login = async (
    email: string,
    password: string
  ): Promise<{ requires2FA?: boolean; error?: string }> => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { error: data.message || 'Login failed' };
      }

      // Check if 2FA is required
      if (data.data?.requires2FA) {
        return { requires2FA: true };
      }

      // Successful login
      setUser(data.data.user);
      return {};
    } catch (error) {
      console.error('Login error:', error);
      return { error: 'An unexpected error occurred' };
    }
  };

  const logout = async () => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      router.push('/login');
    }
  };

  const verify2FA = async (code: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/2fa/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ code }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.message || 'Verification failed' };
      }

      // Successful verification
      setUser(data.data.user);
      return { success: true };
    } catch (error) {
      console.error('2FA verification error:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  };

  const refreshUser = useCallback(async () => {
    await checkAuth();
  }, []);

  const loginWithGoogle = () => {
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/oauth/google`;
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    verify2FA,
    refreshUser,
    loginWithGoogle,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
