/**
 * useCapabilities Hook
 *
 * Provides capability-based authorization checks
 */

'use client';

import { useEffect, useState } from 'react';
import { useAuth } from './useAuth';

export function useCapabilities() {
  const { user, getAuthHeaders } = useAuth();
  const [capabilities, setCapabilities] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCapabilities();
  }, [user]);

  const fetchCapabilities = async () => {
    if (!user) {
      setCapabilities([]);
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/me`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        // Extract capabilities from the user data
        // Capabilities might be in data.data.capabilities or similar
        const userCapabilities = data.data.capabilities || [];
        setCapabilities(userCapabilities);
      }
    } catch (error) {
      console.error('Failed to fetch capabilities:', error);
      setCapabilities([]);
    } finally {
      setIsLoading(false);
    }
  };

  const hasCapability = (capability: string): boolean => {
    // Admin role has all capabilities
    if (user?.roles?.includes('admin')) {
      return true;
    }

    return capabilities.includes(capability);
  };

  const hasAnyCapability = (caps: string[]): boolean => {
    return caps.some((cap) => hasCapability(cap));
  };

  const hasAllCapabilities = (caps: string[]): boolean => {
    return caps.every((cap) => hasCapability(cap));
  };

  return {
    capabilities,
    isLoading,
    hasCapability,
    hasAnyCapability,
    hasAllCapabilities,
  };
}
