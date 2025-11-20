/**
 * ConversationList Component
 *
 * Displays list of conversations in the sidebar with create, select, and delete actions
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useTranslation } from '@/contexts/TranslationContext';

export interface Conversation {
  id: string;
  title: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  messageCount?: number;
  lastMessage?: string;
}

interface ConversationListProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onArchiveConversation?: (id: string) => void;
  isLoading?: boolean;
}

export function ConversationList({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onArchiveConversation,
  isLoading = false,
}: ConversationListProps) {
  const { t } = useTranslation();
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return t('chat.justNow');
    if (diffMins < 60) return t('chat.minutesAgo').replace('{minutes}', String(diffMins));

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return t('chat.hoursAgo').replace('{hours}', String(diffHours));

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return t('chat.yesterday');
    if (diffDays < 7) return t('chat.daysAgo').replace('{days}', String(diffDays));

    return date.toLocaleDateString();
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return `${text.substring(0, maxLength)}...`;
  };

  return (
    <div className="flex flex-col h-full">
      {/* New Conversation Button */}
      <div className="p-4 border-b border-gray-200">
        <Button onClick={onNewConversation} className="w-full" disabled={isLoading}>
          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t('chat.newConversation')}
        </Button>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && conversations.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 px-4 text-center">
            <svg
              className="w-12 h-12 text-gray-300 mb-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
              />
            </svg>
            <p className="text-sm text-gray-500">{t('chat.noConversationsYet')}</p>
            <p className="text-xs text-gray-400 mt-1">{t('chat.startNewToGetStarted')}</p>
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {conversations.map((conversation) => {
              const isActive = conversation.id === activeConversationId;
              const isHovered = conversation.id === hoveredId;

              return (
                <div
                  key={conversation.id}
                  className="relative group"
                  onMouseEnter={() => setHoveredId(conversation.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  <button
                    onClick={() => onSelectConversation(conversation.id)}
                    className={`w-full text-left px-3 py-3 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-blue-50 border border-blue-200'
                        : 'hover:bg-gray-50 border border-transparent'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3
                          className={`text-sm font-medium truncate ${
                            isActive ? 'text-blue-900' : 'text-gray-900'
                          }`}
                        >
                          {truncateText(conversation.title || t('chat.newConversation'), 30)}
                        </h3>
                        {conversation.lastMessage && (
                          <p className="text-xs text-gray-500 truncate mt-1">
                            {truncateText(conversation.lastMessage, 40)}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className="text-xs text-gray-400">
                          {formatTimestamp(conversation.updatedAt)}
                        </span>
                        {conversation.messageCount !== undefined && (
                          <span className="text-xs text-gray-400">
                            {conversation.messageCount}{' '}
                            {conversation.messageCount !== 1
                              ? t('chat.messagesPlural')
                              : t('chat.messages')}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Archive/Delete Button */}
                  {isHovered && onArchiveConversation && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onArchiveConversation(conversation.id);
                      }}
                      className="absolute top-2 right-2 p-1 bg-white border border-gray-200 rounded hover:bg-red-50 hover:border-red-300 transition-colors"
                      title={t('chat.archiveConversation')}
                    >
                      <svg
                        className="w-4 h-4 text-gray-500 hover:text-red-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
