/**
 * Chat Page
 *
 * Main chat interface for conversing with the AI assistant
 */

'use client';

import { useEffect, useState } from 'react';
import { useChatContext } from './layout';
import type { Message } from '@/components/chat/ChatMessages';
import { ChatInput } from '@/components/chat/ChatInput';
import { ChatMessages } from '@/components/chat/ChatMessages';

export default function ChatPage() {
  const { activeConversationId, setActiveConversationId, refreshConversations } = useChatContext();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  // Fetch messages when active conversation changes
  useEffect(() => {
    if (activeConversationId) {
      fetchMessages(activeConversationId);
    } else {
      setMessages([]);
    }
  }, [activeConversationId]);

  const fetchMessages = async (conversationId: string) => {
    try {
      setIsLoadingMessages(true);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/conversations/${conversationId}/messages`,
        {
          method: 'GET',
          credentials: 'include',
        }
      );

      if (response.ok) {
        const data = await response.json();
        setMessages(data.data.messages || []);
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const handleSendMessage = async (messageContent: string) => {
    try {
      setIsSendingMessage(true);

      // Add user message optimistically
      const tempUserMessage: Message = {
        id: `temp-${Date.now()}`,
        role: 'USER',
        content: messageContent,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, tempUserMessage]);

      // Send message to API
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          message: messageContent,
          conversationId: activeConversationId,
          includeContext: true,
        }),
      });

      if (response.ok) {
        const data = await response.json();

        // If this was a new conversation, update the active conversation ID
        if (!activeConversationId && data.data.conversationId) {
          setActiveConversationId(data.data.conversationId);
          await refreshConversations();
        }

        // Fetch updated messages to get both user and assistant messages from server
        if (data.data.conversationId) {
          await fetchMessages(data.data.conversationId);
        }
      } else {
        // Remove optimistic message on error
        setMessages((prev) => prev.filter((msg) => msg.id !== tempUserMessage.id));

        const errorData = await response.json();
        console.error('Failed to send message:', errorData.message);

        // Add error message
        const errorMessage: Message = {
          id: `error-${Date.now()}`,
          role: 'SYSTEM',
          content: `Error: ${errorData.message || 'Failed to send message. Please try again.'}`,
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('Error sending message:', error);

      // Add error message
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'SYSTEM',
        content: 'An unexpected error occurred. Please try again.',
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsSendingMessage(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Chat Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
        {!activeConversationId && messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-md">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-blue-600"
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
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Welcome to FreeTimeChat</h3>
              <p className="text-gray-600 mb-6">
                Start a conversation by typing a message below. I can help you track time, query
                your hours, and manage your projects using natural language.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
                <p className="text-sm font-medium text-blue-900 mb-2">Try these examples:</p>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• "Log 2 hours on Project X"</li>
                  <li>• "How much time did I log today?"</li>
                  <li>• "Show my hours for this week"</li>
                  <li>• "I worked 3.5 hours yesterday on the client meeting"</li>
                </ul>
              </div>
            </div>
          </div>
        ) : isLoadingMessages ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
              <p className="text-gray-600">Loading messages...</p>
            </div>
          </div>
        ) : (
          <ChatMessages messages={messages} isLoading={isSendingMessage} />
        )}
      </div>

      {/* Chat Input Area */}
      <div className="border-t border-gray-200 bg-white p-4">
        <ChatInput onSendMessage={handleSendMessage} isLoading={isSendingMessage} />
      </div>
    </div>
  );
}
