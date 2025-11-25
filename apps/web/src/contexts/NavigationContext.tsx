/**
 * Navigation Context
 *
 * Provides navigation configuration (enabled/disabled features) based on tenant settings
 */

'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface NavigationConfig {
  enabledItems: string[];
}

interface NavigationContextType {
  isNavItemEnabled: (itemId: string) => boolean;
  navConfig: NavigationConfig | null;
  isLoading: boolean;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const { user, fetchWithAuth } = useAuth();
  const [navConfig, setNavConfig] = useState<NavigationConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch navigation config on mount
  useEffect(() => {
    const fetchNavConfig = async () => {
      try {
        setIsLoading(true);
        const response = await fetchWithAuth(
          `${process.env.NEXT_PUBLIC_API_URL}/admin/tenant-settings`
        );
        if (response.ok) {
          const data = await response.json();
          if (data.data?.navigationConfig) {
            setNavConfig(data.data.navigationConfig);
          }
        }
      } catch (error) {
        console.error('Failed to fetch navigation config:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchNavConfig();
    } else {
      setIsLoading(false);
    }
  }, [user, fetchWithAuth]);

  // Check if a navigation item is enabled
  const isNavItemEnabled = (itemId: string) => {
    // If no config or no enabledItems, show all (default behavior)
    if (!navConfig || !navConfig.enabledItems) {
      return true;
    }
    return navConfig.enabledItems.includes(itemId);
  };

  return (
    <NavigationContext.Provider value={{ isNavItemEnabled, navConfig, isLoading }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
}
