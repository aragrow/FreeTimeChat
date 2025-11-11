/**
 * ChatMessages Component
 *
 * Displays conversation messages with proper formatting for user and assistant messages
 * Includes text-to-speech for assistant messages
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { useVoiceOutput } from '@/hooks/useVoiceOutput';

export interface Message {
  id: string;
  role: 'USER' | 'ASSISTANT' | 'SYSTEM';
  content: string;
  createdAt: string;
  metadata?: {
    intent?: string;
    confidence?: number;
    entities?: Record<string, unknown>;
  };
}

interface ChatMessagesProps {
  messages: Message[];
  isLoading?: boolean;
}

export function ChatMessages({ messages, isLoading }: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);

  // Voice output hook
  const { isSpeaking, isSupported: isVoiceSupported, speak, stop } = useVoiceOutput();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Reset speaking message when speech ends
  useEffect(() => {
    if (!isSpeaking && speakingMessageId) {
      setSpeakingMessageId(null);
    }
  }, [isSpeaking, speakingMessageId]);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  };

  const handleSpeakMessage = (messageId: string, content: string) => {
    if (speakingMessageId === messageId) {
      // Stop if already speaking this message
      stop();
      setSpeakingMessageId(null);
    } else {
      // Start speaking
      setSpeakingMessageId(messageId);
      speak(content);
    }
  };

  return (
    <div className="space-y-4">
      {messages.map((message) => {
        const isUser = message.role === 'USER';
        const isSystem = message.role === 'SYSTEM';
        const isAssistant = message.role === 'ASSISTANT';
        const isCurrentlySpeaking = speakingMessageId === message.id;

        if (isSystem) {
          return (
            <div key={message.id} className="flex justify-center">
              <div className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full">
                {message.content}
              </div>
            </div>
          );
        }

        return (
          <div key={message.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex gap-3 max-w-3xl ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  isUser ? 'bg-blue-500' : 'bg-gray-300'
                }`}
              >
                {isUser ? (
                  <svg
                    className="w-5 h-5 text-white"
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
                ) : (
                  <svg
                    className="w-5 h-5 text-gray-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                )}
              </div>

              {/* Message Content */}
              <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                <div
                  className={`px-4 py-2 rounded-lg ${
                    isUser
                      ? 'bg-blue-500 text-white rounded-br-none'
                      : 'bg-white text-gray-900 border border-gray-200 rounded-bl-none'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                </div>

                {/* Timestamp, Metadata, and Voice Button */}
                <div
                  className={`flex items-center gap-2 mt-1 text-xs text-gray-500 ${
                    isUser ? 'flex-row-reverse' : 'flex-row'
                  }`}
                >
                  <span>{formatTimestamp(message.createdAt)}</span>
                  {!isUser && message.metadata?.intent && (
                    <span className="text-xs text-gray-400">
                      • {message.metadata.intent}
                      {message.metadata.confidence !== undefined &&
                        ` (${Math.round(message.metadata.confidence * 100)}%)`}
                    </span>
                  )}

                  {/* Voice button for assistant messages */}
                  {isAssistant && isVoiceSupported && (
                    <button
                      onClick={() => handleSpeakMessage(message.id, message.content)}
                      className={`p-1 rounded hover:bg-gray-100 transition-colors ${
                        isCurrentlySpeaking ? 'text-blue-500' : 'text-gray-400'
                      }`}
                      title={isCurrentlySpeaking ? 'Stop speaking' : 'Read aloud'}
                    >
                      {isCurrentlySpeaking ? (
                        <svg
                          className="w-4 h-4 animate-pulse"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M6 6h12v12H6z" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15.536a5 5 0 001.414 1.414m0-7.07a5 5 0 00-1.414 1.414M12 8v8m0 0v.01"
                          />
                        </svg>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Loading Indicator */}
      {isLoading && (
        <div className="flex justify-start">
          <div className="flex gap-3 max-w-3xl">
            <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
              <svg
                className="w-5 h-5 text-gray-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div className="flex flex-col items-start">
              <div className="px-4 py-3 rounded-lg bg-white border border-gray-200 rounded-bl-none">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: '0.1s' }}
                  />
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: '0.2s' }}
                  />
                </div>
              </div>
              <span className="text-xs text-gray-500 mt-1">Thinking...</span>
            </div>
          </div>
        </div>
      )}

      {/* Scroll anchor */}
      <div ref={messagesEndRef} />
    </div>
  );
}
