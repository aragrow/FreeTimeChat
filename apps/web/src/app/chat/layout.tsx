/**
 * Chat Layout
 *
 * Provides the layout structure for the chat interface with sidebar and main area
 */

'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import type { Conversation } from '@/components/chat/ConversationList';
import { ImpersonationBanner } from '@/components/admin/ImpersonationBanner';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { ConversationList } from '@/components/chat/ConversationList';
import { useTranslation } from '@/contexts/TranslationContext';
import { useAuth } from '@/hooks/useAuth';

interface ChatContextType {
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
  conversations: Conversation[];
  refreshConversations: () => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function useChatContext() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within ChatLayout');
  }
  return context;
}

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, getAuthHeaders } = useAuth();
  const { t } = useTranslation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);

  // Fetch conversations on mount
  useEffect(() => {
    fetchConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchConversations = async () => {
    try {
      setIsLoadingConversations(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/conversations?take=50`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        const conversationsList = data.data || [];
        setConversations(conversationsList);

        // Auto-select the first (most recent) conversation if we don't have one selected
        // and if there are conversations available
        if (!activeConversationId && conversationsList.length > 0) {
          setActiveConversationId(conversationsList[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    } finally {
      setIsLoadingConversations(false);
    }
  };

  const handleNewConversation = () => {
    setActiveConversationId(null);
  };

  const handleArchiveConversation = async (id: string) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/conversations/${id}/archive`,
        {
          method: 'POST',
          headers: getAuthHeaders(),
        }
      );

      if (response.ok) {
        await fetchConversations();
        if (activeConversationId === id) {
          setActiveConversationId(null);
        }
      }
    } catch (error) {
      console.error('Failed to archive conversation:', error);
    }
  };

  const contextValue: ChatContextType = {
    activeConversationId,
    setActiveConversationId,
    conversations,
    refreshConversations: fetchConversations,
  };

  return (
    <ProtectedRoute>
      <ImpersonationBanner />
      <ChatContext.Provider value={contextValue}>
        <div className="flex h-screen bg-gray-100 impersonation-offset">
          {/* Sidebar */}
          <aside
            className={`${
              sidebarOpen ? 'w-80' : 'w-0'
            } transition-all duration-300 bg-white border-r border-gray-200 flex flex-col overflow-hidden md:relative absolute md:translate-x-0 ${
              sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            } z-30 h-full`}
          >
            {/* Sidebar Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-gray-900">AfricAI</h1>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="md:hidden text-gray-500 hover:text-gray-700"
                aria-label={t('nav.closeSidebar')}
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Sidebar Content */}
            <div className="flex-1 overflow-y-auto">
              <ConversationList
                conversations={conversations}
                activeConversationId={activeConversationId}
                onSelectConversation={setActiveConversationId}
                onNewConversation={handleNewConversation}
                onArchiveConversation={handleArchiveConversation}
                isLoading={isLoadingConversations}
              />
            </div>

            {/* Sidebar Footer */}
            <div className="border-t border-gray-200 bg-gray-50">
              {/* Quick Navigation Links - Available to all users */}
              <div className="p-3 border-b border-gray-200 space-y-1">
                <a
                  href="/time-entries"
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  {t('nav.timeEntries')}
                </a>
                <a
                  href="/admin/projects"
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                    />
                  </svg>
                  {t('nav.projects')}
                </a>
                <a
                  href="/admin/reports"
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  {t('nav.reports')}
                </a>
              </div>

              {/* Admin Panel Link - Show for admin and tenantadmin users */}
              {(user?.roles?.some(
                (role) =>
                  role &&
                  typeof role === 'string' &&
                  (role.toLowerCase() === 'admin' || role.toLowerCase() === 'tenantadmin')
              ) ||
                user?.role?.toLowerCase() === 'admin' ||
                user?.role?.toLowerCase() === 'tenantadmin') && (
                <div className="p-3 border-b border-gray-200">
                  <a
                    href="/admin/dashboard"
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    {t('nav.adminPanel')}
                  </a>
                </div>
              )}

              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-semibold">
                      {user?.firstName?.[0]}
                      {user?.lastName?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {user?.isImpersonating && user?.impersonation?.adminEmail
                          ? user.impersonation.adminEmail.split('@')[0]
                          : `${user?.firstName} ${user?.lastName}`}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {user?.isImpersonating ? (
                          <span className="text-orange-600 font-medium">
                            {t('nav.impersonating')} {user?.email}
                          </span>
                        ) : (
                          user?.email
                        )}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => logout()}
                    className="text-gray-400 hover:text-gray-600"
                    aria-label={t('nav.logout')}
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 flex flex-col overflow-hidden">
            {/* Header */}
            <header className="h-16 bg-white border-b border-gray-200 flex items-center px-4 gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="text-gray-500 hover:text-gray-700"
                aria-label={t('nav.toggleSidebar')}
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>
              <h2 className="text-lg font-semibold text-gray-900">{t('nav.chat')}</h2>
            </header>

            {/* Chat Content */}
            <div className="flex-1 overflow-hidden">{children}</div>
          </main>

          {/* Mobile sidebar overlay */}
          {sidebarOpen && (
            <div
              className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}
        </div>
      </ChatContext.Provider>
    </ProtectedRoute>
  );
}
