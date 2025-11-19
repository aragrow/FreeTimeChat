'use client';

/**
 * useDebugData Hook
 *
 * Hook for managing debug panel state and data
 */

import { useCallback, useEffect, useState } from 'react';
import type { DebugData } from '../types/debug';

export interface UseDebugDataReturn {
  isOpen: boolean;
  debugData: DebugData | null;
  setDebugData: (data: DebugData | null) => void;
  togglePanel: () => void;
  openPanel: () => void;
  closePanel: () => void;
}

/**
 * Hook for managing debug data and panel state
 */
export function useDebugData(): UseDebugDataReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [debugData, setDebugData] = useState<DebugData | null>(null);

  const togglePanel = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const openPanel = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closePanel = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Keyboard shortcut: Ctrl/Cmd + D
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'd') {
        event.preventDefault();
        togglePanel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [togglePanel]);

  return {
    isOpen,
    debugData,
    setDebugData,
    togglePanel,
    openPanel,
    closePanel,
  };
}
