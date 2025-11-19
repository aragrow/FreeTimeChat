'use client';

/**
 * DebugToggle Component
 *
 * Floating button to toggle the debug panel
 */

export interface DebugToggleProps {
  isOpen: boolean;
  hasData: boolean;
  onClick: () => void;
}

export function DebugToggle({ isOpen, hasData, onClick }: DebugToggleProps) {
  return (
    <button
      onClick={onClick}
      className={`
        fixed bottom-20 right-6 z-40
        w-12 h-12 rounded-full shadow-lg
        flex items-center justify-center
        transition-all duration-200
        ${
          isOpen
            ? 'bg-blue-600 hover:bg-blue-700 text-white'
            : hasData
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-gray-600 hover:bg-gray-700 text-white'
        }
      `}
      aria-label={isOpen ? 'Close debug panel' : 'Open debug panel'}
      title={`Debug Panel (Ctrl/Cmd+D)${hasData ? ' - New data available' : ''}`}
    >
      {/* Debug icon */}
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
        />
      </svg>

      {/* Badge indicator for new data */}
      {hasData && !isOpen && (
        <span className="absolute top-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-white animate-pulse" />
      )}
    </button>
  );
}
