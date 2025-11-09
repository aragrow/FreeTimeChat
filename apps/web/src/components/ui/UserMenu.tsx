/**
 * UserMenu Component
 *
 * Displays user information with a dropdown menu on hover
 * Contains Profile and Security options
 */

'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

interface UserMenuProps {
  user: {
    firstName?: string;
    lastName?: string;
    email?: string;
  };
  onLogout: () => void;
}

export function UserMenu({ user, onLogout }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const initials = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`;

  const handleMouseEnter = () => {
    // Clear any pending close timeout
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    // Delay closing the menu to give user time to move cursor to menu items
    closeTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 300); // 300ms delay
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="relative" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      {/* User Info Trigger */}
      <div className="flex items-center gap-3 cursor-pointer">
        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-semibold">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {user?.firstName} {user?.lastName}
          </p>
          <p className="text-xs text-gray-500 truncate">{user?.email}</p>
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50 min-w-[240px]">
          {/* Profile */}
          <Link
            href="/settings/profile"
            className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <svg
              className="w-5 h-5 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            <div className="flex-1">
              <div className="font-medium">Profile</div>
              <div className="text-xs text-gray-500">Communication & notifications</div>
            </div>
          </Link>

          {/* Security */}
          <Link
            href="/settings/security"
            className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <svg
              className="w-5 h-5 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            <div className="flex-1">
              <div className="font-medium">Security</div>
              <div className="text-xs text-gray-500">Password & 2FA settings</div>
            </div>
          </Link>

          {/* Divider */}
          <div className="border-t border-gray-200 my-2"></div>

          {/* Logout */}
          <button
            onClick={onLogout}
            className="flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors w-full"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            <div className="font-medium">Logout</div>
          </button>
        </div>
      )}
    </div>
  );
}
