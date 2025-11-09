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
  tenantId?: string | null; // Tenant this user belongs to (null for system admins)
  role: string;
  roles?: string[]; // Array of role names: ["Admin", "User"]
  isTwoFactorEnabled: boolean;
  isImpersonating?: boolean;
  originalUserId?: string;
  impersonation?: {
    adminUserId: string;
    adminEmail: string;
    sessionId: string;
  };
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (
    email: string,
    password: string,
    tenantKey?: string
  ) => Promise<{ requires2FA?: boolean; requiresPasswordChange?: boolean; error?: string }>;
  logout: () => Promise<void>;
  verify2FA: (code: string) => Promise<{ success: boolean; error?: string }>;
  refreshUser: () => Promise<void>;
  loginWithGoogle: () => void;
  getAuthHeaders: () => Record<string, string>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);

  // Load tokens and check auth on mount
  useEffect(() => {
    const storedAccessToken = localStorage.getItem('accessToken');
    const storedRefreshToken = localStorage.getItem('refreshToken');

    if (storedAccessToken) {
      setAccessToken(storedAccessToken);
      setRefreshToken(storedRefreshToken || null);
      // Check auth with the token we just loaded
      checkAuthWithToken(storedAccessToken);
    } else {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Set up token refresh interval
  useEffect(() => {
    if (user) {
      const interval = setInterval(
        () => {
          refreshTokenFunc();
        },
        14 * 60 * 1000
      ); // Refresh every 14 minutes (before 15-minute expiry)

      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, refreshToken]);

  const getAuthHeaders = (token?: string) => {
    const headers: Record<string, string> = {};
    const tokenToUse = token || accessToken;
    if (tokenToUse) {
      headers['Authorization'] = `Bearer ${tokenToUse}`;
    }
    return headers;
  };

  const checkAuthWithToken = async (token: string) => {
    try {
      if (!token) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/me`, {
        method: 'GET',
        headers: getAuthHeaders(token),
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.data);
      } else {
        setUser(null);
        setAccessToken(null);
        setRefreshToken(null);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
      setAccessToken(null);
      setRefreshToken(null);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    } finally {
      setIsLoading(false);
    }
  };

  const checkAuth = async () => {
    if (accessToken) {
      await checkAuthWithToken(accessToken);
    } else {
      setUser(null);
      setIsLoading(false);
    }
  };

  const refreshTokenFunc = async () => {
    try {
      if (!refreshToken) {
        await logout();
        return;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        setAccessToken(data.data.accessToken);
        localStorage.setItem('accessToken', data.data.accessToken);
        if (data.data.refreshToken) {
          setRefreshToken(data.data.refreshToken);
          localStorage.setItem('refreshToken', data.data.refreshToken);
        }
      } else {
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
    password: string,
    tenantKey?: string
  ): Promise<{ requires2FA?: boolean; requiresPasswordChange?: boolean; error?: string }> => {
    try {
      const body: { email: string; password: string; tenantKey?: string; skipTwoFactor?: boolean } =
        {
          email,
          password,
        };

      if (tenantKey) {
        body.tenantKey = tenantKey;
      }

      // Development only: Check if we should skip 2FA
      if (process.env.NODE_ENV !== 'production') {
        const skipTwoFactor = localStorage.getItem('skipTwoFactorInDev') === 'true';
        if (skipTwoFactor) {
          body.skipTwoFactor = true;
        }
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        return { error: data.message || 'Login failed' };
      }

      // Check if password change is required
      if (data.data?.requiresPasswordChange) {
        return { requiresPasswordChange: true };
      }

      // Check if 2FA is required
      if (data.data?.requires2FA) {
        return { requires2FA: true };
      }

      // Successful login - store tokens in state and localStorage
      setAccessToken(data.data.accessToken);
      setRefreshToken(data.data.refreshToken);
      setUser(data.data.user);
      localStorage.setItem('accessToken', data.data.accessToken);
      localStorage.setItem('refreshToken', data.data.refreshToken);
      return {};
    } catch (error) {
      console.error('Login error:', error);
      return { error: 'An unexpected error occurred' };
    }
  };

  const logout = async () => {
    try {
      if (accessToken) {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/logout`, {
          method: 'POST',
          headers: getAuthHeaders(),
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setAccessToken(null);
      setRefreshToken(null);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
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
        body: JSON.stringify({ code }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.message || 'Verification failed' };
      }

      // Successful verification - store tokens in state and localStorage
      setAccessToken(data.data.accessToken);
      setRefreshToken(data.data.refreshToken);
      setUser(data.data.user);
      localStorage.setItem('accessToken', data.data.accessToken);
      localStorage.setItem('refreshToken', data.data.refreshToken);
      return { success: true };
    } catch (error) {
      console.error('2FA verification error:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  };

  const refreshUser = useCallback(async () => {
    await checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    getAuthHeaders,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
