/**
 * ChatInput Component
 *
 * Input field for sending chat messages with keyboard shortcuts, validation, and voice input
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { useVoiceInput } from '@/hooks/useVoiceInput';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSendMessage,
  isLoading = false,
  placeholder = 'Type a message... (Shift + Enter for new line)',
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const autoSubmitTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastTranscriptRef = useRef('');

  // Voice input hook
  const {
    isListening,
    transcript,
    isSupported: isVoiceSupported,
    startListening,
    stopListening,
    resetTranscript,
  } = useVoiceInput({
    continuous: true, // Changed to continuous for better silence detection
    onResult: (finalTranscript) => {
      setMessage((prev) => (prev ? `${prev} ${finalTranscript}` : finalTranscript));
      resetTranscript();
    },
    onError: (error) => {
      console.error('Voice input error:', error);
      alert(error);
    },
  });

  // Auto-focus on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Auto-resize textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  // Update message with interim transcript while listening
  useEffect(() => {
    if (isListening && transcript) {
      // Temporarily show interim transcript
      const lastSpaceIndex = message.lastIndexOf(' ');
      const baseMessage = lastSpaceIndex > 0 ? message.substring(0, lastSpaceIndex + 1) : '';
      const displayMessage = baseMessage + transcript;

      // Temporarily update the textarea
      if (textareaRef.current) {
        textareaRef.current.value = displayMessage;
      }
    }
  }, [transcript, isListening, message]);

  // Auto-submit after 1 second of silence when listening
  useEffect(() => {
    // Clear any existing timer
    if (autoSubmitTimerRef.current) {
      clearTimeout(autoSubmitTimerRef.current);
      autoSubmitTimerRef.current = null;
    }

    if (isListening && message.trim()) {
      // Check if transcript has changed (speech detected)
      if (transcript !== lastTranscriptRef.current) {
        lastTranscriptRef.current = transcript;

        // Reset timer - user is still speaking
        if (autoSubmitTimerRef.current) {
          clearTimeout(autoSubmitTimerRef.current);
        }
      }

      // If transcript hasn't changed for a bit, start the 1-second countdown
      if (message.trim().length > 0) {
        autoSubmitTimerRef.current = setTimeout(() => {
          // After 1 second of silence, stop listening and submit
          stopListening();
          sendMessage();
        }, 1000);
      }
    }

    return () => {
      if (autoSubmitTimerRef.current) {
        clearTimeout(autoSubmitTimerRef.current);
      }
    };
  }, [isListening, message, transcript]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (autoSubmitTimerRef.current) {
        clearTimeout(autoSubmitTimerRef.current);
      }
    };
  }, []);

  const toggleVoiceInput = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage();
  };

  const sendMessage = () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || isLoading) return;

    onSendMessage(trimmedMessage);
    setMessage('');

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Send message on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 items-end">
      {/* Text Input */}
      <div className="flex-1 relative">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isListening ? 'Listening...' : placeholder}
          disabled={isLoading}
          rows={1}
          className={`w-full px-4 py-3 pr-12 border rounded-lg focus:ring-2 focus:border-transparent resize-none max-h-32 disabled:bg-gray-100 disabled:text-gray-500 ${
            isListening
              ? 'border-red-500 ring-2 ring-red-200 focus:ring-red-500'
              : 'border-gray-300 focus:ring-blue-500'
          }`}
        />

        {/* Character count */}
        {message.length > 0 && !isListening && (
          <div className="absolute bottom-2 right-2 text-xs text-gray-400">
            {message.length}
            {message.length > 500 && <span className="text-red-500"> / 1000</span>}
          </div>
        )}

        {/* Listening indicator */}
        {isListening && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-xs text-red-500">Listening...</span>
          </div>
        )}
      </div>

      {/* Voice Input Button */}
      {isVoiceSupported && (
        <button
          type="button"
          onClick={toggleVoiceInput}
          disabled={isLoading}
          className={`px-4 h-12 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            isListening
              ? 'bg-red-500 hover:bg-red-600 text-white'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
          }`}
          title={isListening ? 'Stop recording' : 'Start voice input'}
        >
          {isListening ? (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 6h12v12H6z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              />
            </svg>
          )}
          <span className="sr-only">{isListening ? 'Stop recording' : 'Start voice input'}</span>
        </button>
      )}

      {/* Send Button */}
      <Button
        type="submit"
        disabled={!message.trim() || isLoading}
        isLoading={isLoading}
        className="px-6 h-12"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
          />
        </svg>
        <span className="sr-only">Send message</span>
      </Button>
    </form>
  );
}
