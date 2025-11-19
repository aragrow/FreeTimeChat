'use client';

/**
 * DebugPanel Component
 *
 * Right sidebar panel displaying LLM debug information
 */

import { useState } from 'react';
import type { DebugData } from '../../types/debug';

export interface DebugPanelProps {
  debugData: DebugData | null;
  isOpen: boolean;
  onToggle: () => void;
}

export function DebugPanel({ debugData, isOpen, onToggle }: DebugPanelProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['intent', 'timing'])
  );

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  return (
    <div
      className={`flex-shrink-0 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-300 ${
        isOpen ? 'w-96' : 'w-12'
      }`}
    >
      {/* Collapsed State - Toggle Bar */}
      {!isOpen && (
        <div className="h-full flex flex-col items-center bg-gray-50 dark:bg-gray-800">
          <button
            onClick={onToggle}
            className="p-3 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Open debug panel"
            title="Open debug panel (Ctrl/Cmd+D)"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Vertical "Debug" text */}
          <div className="flex-1 flex items-center justify-center">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 transform -rotate-90 whitespace-nowrap">
              Debug
            </span>
          </div>

          {/* Badge indicator for new data */}
          {debugData && (
            <div className="mb-4">
              <span className="w-2 h-2 bg-green-500 rounded-full block animate-pulse" />
            </div>
          )}
        </div>
      )}

      {/* Expanded State - Full Panel */}
      {isOpen && (
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between flex-shrink-0">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">LLM Debug</h2>
            <button
              onClick={onToggle}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              aria-label="Collapse debug panel"
              title="Collapse debug panel (Ctrl/Cmd+D)"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 5l-7 7 7 7"
                />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {!debugData ? (
              <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                <p>No debug data available.</p>
                <p className="text-sm mt-2">Send a message to see debug information.</p>
              </div>
            ) : (
              <>
                {/* Intent Section */}
                <DebugSection
                  title="Intent Analysis"
                  isExpanded={expandedSections.has('intent')}
                  onToggle={() => toggleSection('intent')}
                >
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">Type:</span>
                      <span className="ml-2 text-gray-900 dark:text-gray-100">
                        {debugData.intent.type}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        Confidence:
                      </span>
                      <span className="ml-2 text-gray-900 dark:text-gray-100">
                        {(debugData.intent.confidence * 100).toFixed(1)}%
                      </span>
                    </div>
                    {Object.keys(debugData.intent.entities).length > 0 && (
                      <div>
                        <span className="font-medium text-gray-700 dark:text-gray-300">
                          Entities:
                        </span>
                        <pre className="mt-1 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-x-auto">
                          {JSON.stringify(debugData.intent.entities, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </DebugSection>

                {/* System Context Section */}
                <DebugSection
                  title="System Context"
                  isExpanded={expandedSections.has('context')}
                  onToggle={() => toggleSection('context')}
                >
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        System Prompt:
                      </span>
                      <pre className="mt-1 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-x-auto whitespace-pre-wrap">
                        {debugData.systemContext.systemPrompt}
                      </pre>
                    </div>
                    {debugData.systemContext.userFacts.length > 0 && (
                      <div>
                        <span className="font-medium text-gray-700 dark:text-gray-300">
                          User Facts ({debugData.systemContext.userFacts.length}):
                        </span>
                        <ul className="mt-1 space-y-1">
                          {debugData.systemContext.userFacts.map((fact, i) => (
                            <li key={i} className="text-xs text-gray-700 dark:text-gray-300">
                              • {fact}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {debugData.systemContext.conversationHistory.length > 0 && (
                      <div>
                        <span className="font-medium text-gray-700 dark:text-gray-300">
                          Conversation History ({debugData.systemContext.conversationHistory.length}
                          ):
                        </span>
                        <div className="mt-1 space-y-1 max-h-48 overflow-y-auto">
                          {debugData.systemContext.conversationHistory.map((msg, i) => (
                            <div
                              key={i}
                              className="text-xs p-2 bg-gray-100 dark:bg-gray-800 rounded"
                            >
                              <div className="font-medium text-gray-600 dark:text-gray-400">
                                {msg.role}
                              </div>
                              <div className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                                {msg.content}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </DebugSection>

                {/* LLM Request Section */}
                <DebugSection
                  title="LLM Request"
                  isExpanded={expandedSections.has('request')}
                  onToggle={() => toggleSection('request')}
                >
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        Provider:
                      </span>
                      <span className="ml-2 text-gray-900 dark:text-gray-100">
                        {debugData.llmRequest.provider}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">Model:</span>
                      <span className="ml-2 text-gray-900 dark:text-gray-100">
                        {debugData.llmRequest.model}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        Temperature:
                      </span>
                      <span className="ml-2 text-gray-900 dark:text-gray-100">
                        {debugData.llmRequest.temperature}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        Max Tokens:
                      </span>
                      <span className="ml-2 text-gray-900 dark:text-gray-100">
                        {debugData.llmRequest.maxTokens}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        Messages ({debugData.llmRequest.messages.length}):
                      </span>
                      <div className="mt-1 space-y-1 max-h-48 overflow-y-auto">
                        {debugData.llmRequest.messages.map((msg, i) => (
                          <div key={i} className="text-xs p-2 bg-gray-100 dark:bg-gray-800 rounded">
                            <div className="font-medium text-gray-600 dark:text-gray-400">
                              {msg.role}
                            </div>
                            <div className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                              {msg.content}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </DebugSection>

                {/* LLM Response Section */}
                <DebugSection
                  title="LLM Response"
                  isExpanded={expandedSections.has('response')}
                  onToggle={() => toggleSection('response')}
                >
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">Model:</span>
                      <span className="ml-2 text-gray-900 dark:text-gray-100">
                        {debugData.llmResponse.model}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        Finish Reason:
                      </span>
                      <span className="ml-2 text-gray-900 dark:text-gray-100">
                        {debugData.llmResponse.finishReason}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        Token Usage:
                      </span>
                      <div className="mt-1 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs">
                        <div>Prompt: {debugData.llmResponse.usage.promptTokens}</div>
                        <div>Completion: {debugData.llmResponse.usage.completionTokens}</div>
                        <div className="font-medium">
                          Total: {debugData.llmResponse.usage.totalTokens}
                        </div>
                      </div>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">Content:</span>
                      <pre className="mt-1 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-x-auto whitespace-pre-wrap">
                        {debugData.llmResponse.content}
                      </pre>
                    </div>
                  </div>
                </DebugSection>

                {/* Timing Section */}
                <DebugSection
                  title="Timing"
                  isExpanded={expandedSections.has('timing')}
                  onToggle={() => toggleSection('timing')}
                >
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        Intent Parsing:
                      </span>
                      <span className="text-gray-900 dark:text-gray-100">
                        {debugData.timing.intentParsing}ms
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        Context Building:
                      </span>
                      <span className="text-gray-900 dark:text-gray-100">
                        {debugData.timing.contextBuilding}ms
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        LLM Call:
                      </span>
                      <span className="text-gray-900 dark:text-gray-100">
                        {debugData.timing.llmCall}ms
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-2">
                      <span className="font-bold text-gray-900 dark:text-gray-100">Total:</span>
                      <span className="font-bold text-gray-900 dark:text-gray-100">
                        {debugData.timing.total}ms
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Timestamp: {new Date(debugData.timestamp).toLocaleString()}
                    </div>
                  </div>
                </DebugSection>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex-shrink-0 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 py-2 text-xs text-gray-500 dark:text-gray-400">
            <p>Keyboard shortcut: Ctrl/Cmd + D</p>
          </div>
        </div>
      )}
    </div>
  );
}

interface DebugSectionProps {
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function DebugSection({ title, isExpanded, onToggle, children }: DebugSectionProps) {
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-750 flex items-center justify-between text-left"
      >
        <span className="font-medium text-gray-900 dark:text-gray-100">{title}</span>
        <svg
          className={`w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform ${
            isExpanded ? 'transform rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isExpanded && <div className="px-4 py-3 bg-white dark:bg-gray-900">{children}</div>}
    </div>
  );
}
