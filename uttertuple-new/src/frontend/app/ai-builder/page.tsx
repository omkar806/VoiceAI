'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Sparkles,
  Send,
  Bot,
  User,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Wrench,
  ExternalLink,
  ChevronDown,
  Brain,
  RefreshCcw,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import MainLayout from '../../components/layout/MainLayout';
import { useTheme } from '../../contexts/ThemeContext';
import { streamChat, ChatMessage, SSEEvent } from '../../services/aiBuilder';
import { getUserLLMProviders } from '../../services/llm';
import Link from 'next/link';

// ─── Types ───────────────────────────────────────────────────────────────────

interface DisplayMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: {
    name: string;
    status: 'running' | 'done';
  }[];
  agentCreated?: {
    agent_id: string;
    agent_name: string;
  };
  isStreaming?: boolean;
}

interface LLMProvider {
  id: string;
  provider_name: string;
  model_name: string | null;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function AIBuilderPage() {
  const { darkMode } = useTheme();

  // State
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [llmProviders, setLLMProviders] = useState<LLMProvider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [providerDropdownOpen, setProviderDropdownOpen] = useState(false);
  const [loadingProviders, setLoadingProviders] = useState(true);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // ─── Load LLM Providers ─────────────────────────────────────────────────

  useEffect(() => {
    const loadProviders = async () => {
      try {
        setLoadingProviders(true);
        const providers = await getUserLLMProviders();
        setLLMProviders(providers);
        if (providers.length > 0) {
          setSelectedProvider(providers[0].id);
        }
      } catch (error) {
        console.error('Failed to load LLM providers:', error);
      } finally {
        setLoadingProviders(false);
      }
    };
    loadProviders();
  }, []);

  // ─── Auto-scroll ────────────────────────────────────────────────────────

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ─── Send Message ───────────────────────────────────────────────────────

  const sendMessage = useCallback(async () => {
    const trimmed = inputValue.trim();
    if (!trimmed || isLoading || !selectedProvider) return;

    // Add user message to display
    const userMsgId = `user-${Date.now()}`;
    const userDisplayMsg: DisplayMessage = {
      id: userMsgId,
      role: 'user',
      content: trimmed,
    };

    const updatedHistory: ChatMessage[] = [
      ...chatHistory,
      { role: 'user', content: trimmed },
    ];

    setMessages(prev => [...prev, userDisplayMsg]);
    setChatHistory(updatedHistory);
    setInputValue('');
    setIsLoading(true);

    // Prepare assistant message placeholder
    const assistantMsgId = `assistant-${Date.now()}`;
    const assistantMsg: DisplayMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      toolCalls: [],
      isStreaming: true,
    };
    setMessages(prev => [...prev, assistantMsg]);

    // Start streaming
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      await streamChat(
        updatedHistory,
        selectedProvider,
        (event: SSEEvent) => {
          switch (event.type) {
            case 'tool_call':
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantMsgId
                    ? {
                        ...m,
                        toolCalls: [
                          ...(m.toolCalls || []),
                          { name: event.tool_name || '', status: 'running' as const },
                        ],
                      }
                    : m
                )
              );
              break;

            case 'tool_result':
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantMsgId
                    ? {
                        ...m,
                        toolCalls: (m.toolCalls || []).map(tc =>
                          tc.name === event.tool_name
                            ? { ...tc, status: 'done' as const }
                            : tc
                        ),
                      }
                    : m
                )
              );
              break;

            case 'agent_created':
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantMsgId
                    ? {
                        ...m,
                        agentCreated: {
                          agent_id: event.agent_id || '',
                          agent_name: event.agent_name || '',
                        },
                      }
                    : m
                )
              );
              break;

            case 'message':
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantMsgId
                    ? { ...m, content: event.content || '' }
                    : m
                )
              );
              // Add to chat history
              setChatHistory(prev => [
                ...prev,
                { role: 'assistant', content: event.content || '' },
              ]);
              break;

            case 'error':
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantMsgId
                    ? { ...m, content: event.content || 'An error occurred.', isStreaming: false }
                    : m
                )
              );
              break;

            case 'done':
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantMsgId ? { ...m, isStreaming: false } : m
                )
              );
              break;
          }
        },
        controller.signal
      );
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Chat error:', error);
        setMessages(prev =>
          prev.map(m =>
            m.id === assistantMsgId
              ? {
                  ...m,
                  content: `Error: ${error.message || 'Something went wrong. Please try again.'}`,
                  isStreaming: false,
                }
              : m
          )
        );
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [inputValue, isLoading, selectedProvider, chatHistory]);

  // ─── Handle key press ───────────────────────────────────────────────────

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    },
    [sendMessage]
  );

  // ─── Reset conversation ─────────────────────────────────────────────────

  const resetConversation = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setMessages([]);
    setChatHistory([]);
    setIsLoading(false);
  }, []);

  // ─── Tool display name helper ───────────────────────────────────────────

  const getToolDisplayName = (name: string) => {
    const map: Record<string, string> = {
      list_llm_providers: 'Fetching LLM providers',
      list_tts_providers: 'Fetching TTS providers',
      list_rag_databases: 'Fetching knowledge bases',
      list_existing_agents: 'Checking existing agents',
      create_agent: 'Creating agent',
    };
    return map[name] || name;
  };

  // ─── Get selected provider info ─────────────────────────────────────────

  const selectedProviderInfo = llmProviders.find(p => p.id === selectedProvider);

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <MainLayout>
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        {/* Header */}
        <div
          className={`flex items-center justify-between px-6 py-4 border-b ${
            darkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-white'
          }`}
        >
          <div className="flex items-center space-x-3">
            <div
              className={`p-2 rounded-xl ${
                darkMode
                  ? 'bg-gradient-to-br from-purple-600 to-blue-600'
                  : 'bg-gradient-to-br from-purple-500 to-blue-500'
              }`}
            >
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1
                className={`text-lg font-semibold ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}
              >
                AI Builder
              </h1>
              <p
                className={`text-xs ${
                  darkMode ? 'text-gray-400' : 'text-gray-500'
                }`}
              >
                Create agents through conversation
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* LLM Provider Selector */}
            <div className="relative">
              <button
                onClick={() => setProviderDropdownOpen(!providerDropdownOpen)}
                disabled={loadingProviders}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm border transition-colors ${
                  darkMode
                    ? 'border-gray-600 bg-gray-800 text-gray-300 hover:bg-gray-700'
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Brain className="w-4 h-4" />
                <span>
                  {loadingProviders
                    ? 'Loading...'
                    : selectedProviderInfo
                    ? `${selectedProviderInfo.provider_name}${
                        selectedProviderInfo.model_name
                          ? ` (${selectedProviderInfo.model_name})`
                          : ''
                      }`
                    : 'Select LLM Provider'}
                </span>
                <ChevronDown className="w-3 h-3" />
              </button>

              {providerDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setProviderDropdownOpen(false)}
                  />
                  <div
                    className={`absolute right-0 mt-1 w-64 rounded-lg shadow-xl border z-20 ${
                      darkMode
                        ? 'bg-gray-800 border-gray-700'
                        : 'bg-white border-gray-200'
                    }`}
                  >
                    {llmProviders.length === 0 ? (
                      <div className="p-3 text-sm text-center">
                        <p
                          className={
                            darkMode ? 'text-gray-400' : 'text-gray-500'
                          }
                        >
                          No LLM providers configured.
                        </p>
                        <Link
                          href="/settings"
                          className="text-blue-500 hover:underline text-xs mt-1 block"
                        >
                          Add one in Settings
                        </Link>
                      </div>
                    ) : (
                      llmProviders.map(provider => (
                        <button
                          key={provider.id}
                          onClick={() => {
                            setSelectedProvider(provider.id);
                            setProviderDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                            provider.id === selectedProvider
                              ? darkMode
                                ? 'bg-blue-600/20 text-blue-400'
                                : 'bg-blue-50 text-blue-600'
                              : darkMode
                              ? 'text-gray-300 hover:bg-gray-700'
                              : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <div className="font-medium">{provider.provider_name}</div>
                          {provider.model_name && (
                            <div
                              className={`text-xs ${
                                darkMode ? 'text-gray-500' : 'text-gray-400'
                              }`}
                            >
                              {provider.model_name}
                            </div>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Reset button */}
            <button
              onClick={resetConversation}
              className={`p-2 rounded-lg transition-colors ${
                darkMode
                  ? 'text-gray-400 hover:text-white hover:bg-gray-700'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
              title="New conversation"
            >
              <RefreshCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Welcome message when empty */}
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full min-h-[400px] space-y-4">
                <div
                  className={`p-4 rounded-2xl ${
                    darkMode
                      ? 'bg-gradient-to-br from-purple-600/20 to-blue-600/20 border border-purple-500/30'
                      : 'bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200'
                  }`}
                >
                  <Sparkles
                    className={`w-10 h-10 ${
                      darkMode ? 'text-purple-400' : 'text-purple-500'
                    }`}
                  />
                </div>
                <h2
                  className={`text-xl font-semibold ${
                    darkMode ? 'text-white' : 'text-gray-900'
                  }`}
                >
                  What agent would you like to create?
                </h2>
                <p
                  className={`text-sm text-center max-w-md ${
                    darkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}
                >
                  Describe the agent you want to build and I'll guide you through
                  setting up its name, instructions, voice, knowledge base, and
                  more.
                </p>

                {/* Suggestion chips */}
                <div className="flex flex-wrap gap-2 mt-4 justify-center max-w-lg">
                  {[
                    'Create a customer support agent',
                    'Build a sales qualification agent',
                    'Make an appointment booking agent',
                    'Design a FAQ answering agent',
                  ].map(suggestion => (
                    <button
                      key={suggestion}
                      onClick={() => {
                        setInputValue(suggestion);
                        inputRef.current?.focus();
                      }}
                      className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                        darkMode
                          ? 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700 hover:border-gray-600'
                          : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`flex ${
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`flex space-x-3 max-w-[85%] ${
                    msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                  }`}
                >
                  {/* Avatar */}
                  <div
                    className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      msg.role === 'user'
                        ? darkMode
                          ? 'bg-blue-600'
                          : 'bg-blue-500'
                        : darkMode
                        ? 'bg-gradient-to-br from-purple-600 to-blue-600'
                        : 'bg-gradient-to-br from-purple-500 to-blue-500'
                    }`}
                  >
                    {msg.role === 'user' ? (
                      <User className="w-4 h-4 text-white" />
                    ) : (
                      <Bot className="w-4 h-4 text-white" />
                    )}
                  </div>

                  {/* Message content */}
                  <div className="flex flex-col space-y-2">
                    {/* Tool calls */}
                    {msg.toolCalls && msg.toolCalls.length > 0 && (
                      <div className="space-y-1">
                        {msg.toolCalls.map((tc, idx) => (
                          <div
                            key={idx}
                            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs ${
                              darkMode
                                ? 'bg-gray-800 text-gray-400 border border-gray-700'
                                : 'bg-gray-100 text-gray-500 border border-gray-200'
                            }`}
                          >
                            {tc.status === 'running' ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-3 h-3 text-green-500" />
                            )}
                            <Wrench className="w-3 h-3" />
                            <span>{getToolDisplayName(tc.name)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Text content */}
                    {msg.content && (
                      <div
                        className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                          msg.role === 'user'
                            ? darkMode
                              ? 'bg-blue-600 text-white'
                              : 'bg-blue-500 text-white'
                            : darkMode
                            ? 'bg-gray-800 text-gray-200 border border-gray-700'
                            : 'bg-white text-gray-800 border border-gray-200 shadow-sm'
                        }`}
                      >
                        {msg.role === 'assistant' ? (
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                              h1: ({ children }) => <h1 className="text-base font-bold mb-2 mt-3 first:mt-0">{children}</h1>,
                              h2: ({ children }) => <h2 className="text-sm font-bold mb-2 mt-3 first:mt-0">{children}</h2>,
                              h3: ({ children }) => <h3 className="text-sm font-semibold mb-1.5 mt-2 first:mt-0">{children}</h3>,
                              ul: ({ children }) => <ul className="list-disc pl-5 mb-2 space-y-0.5">{children}</ul>,
                              ol: ({ children }) => <ol className="list-decimal pl-5 mb-2 space-y-0.5">{children}</ol>,
                              li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                              strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                              a: ({ href, children }) => (
                                <a href={href} target="_blank" rel="noopener noreferrer" className="underline hover:opacity-80">
                                  {children}
                                </a>
                              ),
                              pre: ({ children }) => (
                                <pre className={`overflow-x-auto rounded p-2 my-2 text-xs ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>{children}</pre>
                              ),
                              code: ({ className, children, ...props }) =>
                                className ? (
                                  <code className="text-xs" {...props}>{children}</code>
                                ) : (
                                  <code className={`px-1 py-0.5 rounded text-xs ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`} {...props}>{children}</code>
                                ),
                            }}
                          >
                            {msg.content}
                          </ReactMarkdown>
                        ) : (
                          <span className="whitespace-pre-wrap">{msg.content}</span>
                        )}
                        {msg.isStreaming && !msg.content && (
                          <span className="inline-flex space-x-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: '300ms' }} />
                          </span>
                        )}
                      </div>
                    )}

                    {/* Streaming indicator (when no content yet) */}
                    {msg.isStreaming && !msg.content && (!msg.toolCalls || msg.toolCalls.length === 0) && (
                      <div
                        className={`px-4 py-3 rounded-2xl text-sm ${
                          darkMode
                            ? 'bg-gray-800 text-gray-400 border border-gray-700'
                            : 'bg-white text-gray-500 border border-gray-200'
                        }`}
                      >
                        <span className="inline-flex space-x-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: '300ms' }} />
                        </span>
                      </div>
                    )}

                    {/* Agent Created Card */}
                    {msg.agentCreated && (
                      <div
                        className={`flex items-center space-x-3 px-4 py-3 rounded-xl border ${
                          darkMode
                            ? 'bg-green-900/20 border-green-700/50 text-green-400'
                            : 'bg-green-50 border-green-200 text-green-700'
                        }`}
                      >
                        <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                        <div className="flex-1">
                          <div className="font-medium text-sm">
                            Agent "{msg.agentCreated.agent_name}" created!
                          </div>
                          <Link
                            href={`/agents`}
                            className={`text-xs flex items-center space-x-1 mt-1 hover:underline ${
                              darkMode ? 'text-green-300' : 'text-green-600'
                            }`}
                          >
                            <span>View in Agents</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div
          className={`px-4 py-4 border-t ${
            darkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-white'
          }`}
        >
          <div className="max-w-3xl mx-auto">
            {!selectedProvider && !loadingProviders && (
              <div
                className={`flex items-center space-x-2 mb-3 px-3 py-2 rounded-lg text-xs ${
                  darkMode
                    ? 'bg-yellow-900/20 text-yellow-400 border border-yellow-700/50'
                    : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                }`}
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>
                  No LLM provider configured.{' '}
                  <Link href="/settings" className="underline font-medium">
                    Add one in Settings
                  </Link>{' '}
                  to start using AI Builder.
                </span>
              </div>
            )}

            <div
              className={`flex items-end space-x-3 rounded-2xl border p-2 ${
                darkMode
                  ? 'bg-gray-800 border-gray-700 focus-within:border-blue-500'
                  : 'bg-white border-gray-300 focus-within:border-blue-500'
              } transition-colors`}
            >
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  selectedProvider
                    ? 'Describe the agent you want to create...'
                    : 'Select an LLM provider to start'
                }
                disabled={!selectedProvider || isLoading}
                rows={1}
                className={`flex-1 resize-none bg-transparent border-none outline-none text-sm px-2 py-2 max-h-32 ${
                  darkMode
                    ? 'text-white placeholder-gray-500'
                    : 'text-gray-900 placeholder-gray-400'
                }`}
                style={{
                  minHeight: '40px',
                  height: 'auto',
                }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = Math.min(target.scrollHeight, 128) + 'px';
                }}
              />

              <button
                onClick={sendMessage}
                disabled={!inputValue.trim() || isLoading || !selectedProvider}
                className={`flex-shrink-0 p-2 rounded-xl transition-all ${
                  inputValue.trim() && !isLoading && selectedProvider
                    ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg'
                    : darkMode
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>

            <p
              className={`text-xs mt-2 text-center ${
                darkMode ? 'text-gray-600' : 'text-gray-400'
              }`}
            >
              AI Builder uses your configured LLM provider. Press Enter to send,
              Shift+Enter for new line.
            </p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
