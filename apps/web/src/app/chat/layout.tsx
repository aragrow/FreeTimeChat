/**
 * Chat Layout
 *
 * Provides the layout structure for the chat interface with sidebar and main area
 */

'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import type { Conversation } from '@/components/chat/ConversationList';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { ConversationList } from '@/components/chat/ConversationList';
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
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);

  // Fetch conversations on mount
  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      setIsLoadingConversations(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/conversations?take=50`, {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setConversations(data.data.conversations || []);

        // Auto-select first active conversation
        const activeConv = data.data.conversations.find((c: Conversation) => c.isActive);
        if (activeConv) {
          setActiveConversationId(activeConv.id);
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
          credentials: 'include',
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
      <ChatContext.Provider value={contextValue}>
        <div className="flex h-screen bg-gray-100">
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
                <h1 className="text-xl font-bold text-gray-900">FreeTimeChat</h1>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="md:hidden text-gray-500 hover:text-gray-700"
                aria-label="Close sidebar"
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
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-semibold">
                    {user?.firstName?.[0]}
                    {user?.lastName?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => logout()}
                  className="text-gray-400 hover:text-gray-600"
                  aria-label="Logout"
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
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 flex flex-col overflow-hidden">
            {/* Header */}
            <header className="h-16 bg-white border-b border-gray-200 flex items-center px-4 gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="text-gray-500 hover:text-gray-700"
                aria-label="Toggle sidebar"
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
              <h2 className="text-lg font-semibold text-gray-900">Chat</h2>
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
