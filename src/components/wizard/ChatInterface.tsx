'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface BriefMetadata {
  sections_with_user_input: string[];
  sections_with_recommendations: string[];
  version: number;
  generated_at: string;
}

interface BriefSection {
  id: string;
  title: string;
  content: string;
  status: 'complete' | 'generating' | 'pending';
}

interface ChatInterfaceProps {
  projectName: string;
  projectDescription: string;
  chatHistory: ChatMessage[];
  onChatUpdate: (chatHistory: ChatMessage[], researchBrief: string, briefMetadata?: BriefMetadata, interviewGuide?: string) => void;
  existingResearchBrief?: string;
  interviewType?: string; // e.g., 'product_feedback', 'custom'
  currentView?: 'brief' | 'guide'; // Current view context
  existingInterviewGuide?: string; // Existing guide if any
  onSectionsUpdate?: (sections: BriefSection[]) => void; // For streaming section updates
  useStreaming?: boolean; // Enable streaming mode
  projectId?: string;
  interviewId?: string;
}

export function ChatInterface({
  projectName,
  projectDescription,
  chatHistory,
  onChatUpdate,
  existingResearchBrief = '',
  interviewType = 'custom',
  currentView = 'brief',
  existingInterviewGuide = '',
  onSectionsUpdate,
  useStreaming = true,
  projectId,
  interviewId,
  // New props: incomingCue and incomingCueKey allow parent to push a cue into the chat
  incomingCue,
  incomingCueKey,
}: ChatInterfaceProps & { incomingCue?: string; incomingCueKey?: number }) {
  const [messages, setMessages] = useState<ChatMessage[]>(chatHistory);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [researchBrief, setResearchBrief] = useState(existingResearchBrief);
  const [interviewGuide, setInterviewGuide] = useState(existingInterviewGuide);
  const [briefMetadata, setBriefMetadata] = useState<BriefMetadata | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [hasAutoSent, setHasAutoSent] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastProcessedCueKeyRef = useRef<number | null>(null);

  // Initialize from chatHistory and existing research brief if provided
  useEffect(() => {
    if ((chatHistory.length > 0 || existingResearchBrief) && !initialized) {
      if (chatHistory.length > 0) {
        setMessages(chatHistory);
        // If there's only one user message (new conversation), auto-send it
        if (chatHistory.length === 1 && chatHistory[0].role === 'user' && !hasAutoSent) {
          setHasAutoSent(true);
          setTimeout(() => {
            sendMessageToAPI(chatHistory[0].content, chatHistory);
          }, 100);
        }
      }
      if (existingResearchBrief) {
        setResearchBrief(existingResearchBrief);
      }
      setInitialized(true);
    }
  }, [chatHistory, existingResearchBrief, initialized]);

  // Mark as initialized when chat history or research brief exists
  useEffect(() => {
    if ((chatHistory.length > 0 || existingResearchBrief) && !initialized) {
      setInitialized(true);
    }
  }, [chatHistory, existingResearchBrief, initialized]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    // Use setTimeout to ensure DOM has updated
    const scrollTimer = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 100);
    
    return () => clearTimeout(scrollTimer);
  }, [messages, isLoading, isRegenerating]);

  // If parent pushes an incoming cue, send it as a user message
  useEffect(() => {
    // Only act when incomingCueKey changes to a new number
    if (typeof incomingCueKey !== 'number' || incomingCueKey === null) return;
    if (lastProcessedCueKeyRef.current === incomingCueKey) return;
    if (!incomingCue || incomingCue.trim().length === 0) return;

    lastProcessedCueKeyRef.current = incomingCueKey;

    // Ensure chat is started first
    // sendMessage accepts optional content param
    sendMessage(incomingCue.trim());
  }, [incomingCueKey, incomingCue]);

  // Update parent when messages change (debounced)
  const debouncedUpdate = useCallback((msgs: ChatMessage[], brief: string, metadata: BriefMetadata | null | undefined, guide: string) => {
    const timeoutId = setTimeout(() => {
      onChatUpdate(msgs, brief, metadata || undefined, guide);
    }, 100);
    return () => clearTimeout(timeoutId);
  }, [onChatUpdate]);

  useEffect(() => {
    if (initialized) {
      const cleanup = debouncedUpdate(messages, researchBrief, briefMetadata, interviewGuide);
      return cleanup;
    }
  }, [messages, researchBrief, briefMetadata, interviewGuide, initialized, debouncedUpdate]);

  const sendMessageToAPI = async (messageContent: string, existingMessages: ChatMessage[]) => {
    if (!messageContent || isLoading) return;

    setIsLoading(true);
    
    // Use streaming if enabled
    if (useStreaming) {
      await sendMessageStreaming(messageContent, existingMessages);
      return;
    }

    try{
      // Check for URLs in the message and scrape automatically
      const urlPattern = /(https?:\/\/[^\s]+)/g;
      const urls = messageContent.match(urlPattern);
      let scrapedData = null;

      if (urls && urls.length > 0) {
        console.log('🔍 Detected URL in message:', urls[0]);
        
        try {
          const scrapeResponse = await fetch('/api/scrape-product', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url: urls[0] }),
          });

          if (scrapeResponse.ok) {
            const scrapeResult = await scrapeResponse.json();
            scrapedData = scrapeResult.data;
            console.log('✅ Successfully scraped URL:', scrapedData.title);
          }
        } catch (scrapeError) {
          console.error('❌ Error scraping URL:', scrapeError);
          // Continue without scraped data - AI will just use the URL
        }
      }

      const payload: Record<string, any> = {
        projectName,
        projectDescription,
        chatHistory: existingMessages,
        interviewType,
        currentBriefVersion: briefMetadata?.version || 0,
        currentView, // Pass current view context (brief or guide)
        researchBrief, // Pass existing brief when generating guide
        productContext: scrapedData
          ? {
              url: scrapedData.url,
              title: scrapedData.title,
              description: scrapedData.description,
              features: scrapedData.features,
              keywords: scrapedData.keywords,
            }
          : undefined,
      };

      if (projectId) payload.projectId = projectId;
      if (interviewId) payload.interviewId = interviewId;

      const response = await fetch('/api/chat/research-brief', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Add assistant response to messages
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.message || data.response || 'No response received',
        timestamp: new Date().toISOString(),
      };
      
      const updatedMessages = [...existingMessages, assistantMessage];
      setMessages(updatedMessages);
      
      // Update research brief and metadata if provided
      if (data.researchBrief) {
        setResearchBrief(data.researchBrief);
      }
      if (data.briefMetadata) {
        setBriefMetadata(data.briefMetadata);
      }
      if (data.interviewGuide) {
        setInterviewGuide(data.interviewGuide);
      }
      
      // Notify parent component
      onChatUpdate(
        updatedMessages,
        data.researchBrief || researchBrief,
        data.briefMetadata || briefMetadata,
        data.interviewGuide || interviewGuide
      );

    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: 'I apologize, but I encountered an error. Please try your message again.',
        timestamp: new Date().toISOString(),
      };
      
      setMessages([...existingMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // New streaming message handler
  const sendMessageStreaming = async (messageContent: string, existingMessages: ChatMessage[]) => {
    try {
      // Determine if this is initial generation or refinement
      const hasExistingContent = !!(researchBrief || interviewGuide);
      const isInitialGeneration = existingMessages.length <= 2 && !hasExistingContent;
      
      // Route to conversation agent for post-generation refinement
      if (hasExistingContent && !isInitialGeneration) {
        console.log('💬 [ChatInterface] Routing to CONVERSATION agent (post-generation)');
        await sendToConversationAgent(messageContent, existingMessages);
        return;
      }
      
      // Check for URLs and scrape (only for initial generation)
      const urlPattern = /(https?:\/\/[^\s]+)/g;
      const urls = messageContent.match(urlPattern);
      let scrapedData = null;

      if (urls && urls.length > 0) {
        try {
          const scrapeResponse = await fetch('/api/scrape-product', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: urls[0] }),
          });
          if (scrapeResponse.ok) {
            scrapedData = (await scrapeResponse.json()).data;
          }
        } catch (scrapeError) {
          console.error('URL scraping error:', scrapeError);
        }
      }

      console.log('🚀 [ChatInterface] Calling STREAMING API: /api/chat/research-brief-stream (initial generation)');
      console.log('📊 [ChatInterface] Request params:', {
        projectName,
        interviewType,
        currentView,
        hasResearchBrief: !!researchBrief,
        messageCount: existingMessages.length,
      });

      const streamPayload: Record<string, any> = {
        projectName,
        projectDescription,
        chatHistory: existingMessages,
        interviewType,
        currentView,
        researchBrief,
        productContext: scrapedData,
      };

      if (projectId) streamPayload.projectId = projectId;
      if (interviewId) streamPayload.interviewId = interviewId;

      const response = await fetch('/api/chat/research-brief-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(streamPayload),
      });

      console.log('✅ [ChatInterface] Streaming API response status:', response.status);

      if (!response.ok) {
        throw new Error('Streaming request failed');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      const decoder = new TextDecoder();
      let accumulatedMessage = '';
      let currentSections: BriefSection[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.substring(6));

              if (data.type === 'message') {
                console.log('💬 [ChatInterface] Received message chunk:', data.content?.substring(0, 50));
                accumulatedMessage += data.content;
                // Update assistant message in real-time
                const assistantMessage: ChatMessage = {
                  role: 'assistant',
                  content: accumulatedMessage,
                  timestamp: new Date().toISOString(),
                };
                setMessages([...existingMessages, assistantMessage]);
              } else if (data.type === 'sections') {
                console.log('📑 [ChatInterface] Received sections update:', {
                  sectionCount: data.sections?.length,
                  sections: data.sections?.map((s: any) => ({ id: s.id, title: s.title, status: s.status })),
                });
                currentSections = data.sections;
                if (onSectionsUpdate) {
                  console.log('🔄 [ChatInterface] Calling onSectionsUpdate with', currentSections.length, 'sections');
                  onSectionsUpdate(currentSections);
                } else {
                  console.warn('⚠️ [ChatInterface] onSectionsUpdate callback is NOT defined!');
                }
              } else if (data.type === 'complete') {
                console.log('✅ [ChatInterface] Received complete event');
                const finalMessage = data.message || accumulatedMessage;
                const assistantMessage: ChatMessage = {
                  role: 'assistant',
                  content: finalMessage,
                  timestamp: new Date().toISOString(),
                };
                const finalMessages = [...existingMessages, assistantMessage];
                setMessages(finalMessages);

                // Update brief/guide
                if (data.researchBrief) {
                  setResearchBrief(data.researchBrief);
                }
                if (data.interviewGuide) {
                  setInterviewGuide(data.interviewGuide);
                }
                if (data.metadata) {
                  setBriefMetadata(data.metadata);
                }

                // Notify parent
                onChatUpdate(
                  finalMessages,
                  data.researchBrief || researchBrief,
                  data.metadata || briefMetadata || undefined,
                  data.interviewGuide || interviewGuide
                );
              } else if (data.type === 'error') {
                throw new Error(data.error);
              }
            } catch (parseError) {
              console.error('Error parsing SSE data:', parseError);
            }
          }
        }
      }
    } catch (error) {
      console.error('Streaming error:', error);
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: 'I encountered an error while processing your request. Please try again.',
        timestamp: new Date().toISOString(),
      };
      setMessages([...existingMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Conversation agent handler for post-generation refinement
  const sendToConversationAgent = async (messageContent: string, existingMessages: ChatMessage[]) => {
    try {
      console.log('💬 [ChatInterface] Calling conversation agent');
      
      const response = await fetch('/api/chat/conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userMessage: messageContent,
          briefContent: researchBrief,
          guideContent: interviewGuide,
          chatHistory: existingMessages,
          interviewType,
          currentView,
          projectName,
        }),
      });

      if (!response.ok) {
        throw new Error('Conversation request failed');
      }

      const data = await response.json();
      
      console.log('✅ [ChatInterface] Conversation response:', {
        hasResponse: !!data.response,
        requiresRegeneration: data.requiresRegeneration,
        hasUpdate: !!(data.updatedBrief || data.updatedGuide),
      });

      // Only show regenerating indicator if brief/guide is actually being updated
      if (data.requiresRegeneration && (data.updatedBrief || data.updatedGuide)) {
        setIsRegenerating(true);
      }

      // Add assistant response to messages
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.response || 'No response received',
        timestamp: new Date().toISOString(),
      };
      
      const updatedMessages = [...existingMessages, assistantMessage];
      setMessages(updatedMessages);

      // Update brief/guide if regeneration happened
      if (data.updatedBrief) {
        setResearchBrief(data.updatedBrief);
        
        // Parse into sections for live preview
        if (onSectionsUpdate) {
          const sections = parseBriefIntoSections(data.updatedBrief);
          onSectionsUpdate(sections);
        }
        
        // Clear regenerating state after a brief delay to show completion
        setTimeout(() => setIsRegenerating(false), 500);
      }
      
      if (data.updatedGuide) {
        setInterviewGuide(data.updatedGuide);
        
        // Parse into sections for live preview
        if (onSectionsUpdate) {
          const sections = parseBriefIntoSections(data.updatedGuide);
          onSectionsUpdate(sections);
        }
        
        // Clear regenerating state after a brief delay to show completion
        setTimeout(() => setIsRegenerating(false), 500);
      }

      if (data.metadata) {
        setBriefMetadata(data.metadata);
      }

      // Notify parent component
      onChatUpdate(
        updatedMessages,
        data.updatedBrief || researchBrief,
        data.metadata || briefMetadata,
        data.updatedGuide || interviewGuide
      );

    } catch (error) {
      console.error('❌ [ChatInterface] Conversation error:', error);
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: 'I encountered an error. Could you rephrase that or try again?',
        timestamp: new Date().toISOString(),
      };
      setMessages([...existingMessages, errorMessage]);
      setIsRegenerating(false); // Clear on error
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to parse brief into sections (for live preview updates)
  const parseBriefIntoSections = (brief: string) => {
    const sections: BriefSection[] = [];
    const lines = brief.split('\n');
    let currentSection: BriefSection | null = null;
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed.startsWith('## ') || (trimmed.startsWith('# ') && !trimmed.startsWith('##'))) {
        if (currentSection) {
          sections.push(currentSection);
        }
        
        const title = trimmed.startsWith('## ') ? trimmed.substring(3) : trimmed.substring(2);
        const id = title.toLowerCase().replace(/[^a-z0-9]+/g, '_');
        
        currentSection = {
          id,
          title,
          content: line + '\n',
          status: 'complete'
        };
      } else if (currentSection) {
        currentSection.content += line + '\n';
      }
    }
    
    if (currentSection) {
      sections.push(currentSection);
    }
    
    return sections;
  };

  const sendMessage = async (messageContent?: string) => {
    const messageToSend = messageContent || inputMessage.trim();
    if (!messageToSend || isLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: messageToSend,
      timestamp: new Date().toISOString(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    if (!messageContent) setInputMessage(''); // Only clear input if not auto-sending
    setIsLoading(true);
    
    // Scroll to bottom after sending message
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 100);
    
    // Use streaming if enabled
    if (useStreaming) {
      await sendMessageStreaming(messageToSend, newMessages);
      return;
    }

    try {
      // Check for URLs in the message and scrape automatically
      const urlPattern = /(https?:\/\/[^\s]+)/g;
      const urls = messageToSend.match(urlPattern);
      let scrapedData = null;

      if (urls && urls.length > 0) {
        console.log('🔍 Detected URL in message:', urls[0]);
        
        try {
          const scrapeResponse = await fetch('/api/scrape-product', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url: urls[0] }),
          });

          if (scrapeResponse.ok) {
            const scrapeResult = await scrapeResponse.json();
            scrapedData = scrapeResult.data;
            console.log('✅ Successfully scraped URL:', scrapedData.title);
          }
        } catch (scrapeError) {
          console.error('❌ Error scraping URL:', scrapeError);
          // Continue without scraped data - AI will just use the URL
        }
      }

      const payload: Record<string, any> = {
        projectName,
        projectDescription,
        chatHistory: newMessages,
        interviewType,
        currentBriefVersion: briefMetadata?.version || 0,
        currentView, // Pass current view context (brief or guide)
        researchBrief, // Pass existing brief when generating guide
        productContext: scrapedData
          ? {
              url: scrapedData.url,
              title: scrapedData.title,
              description: scrapedData.description,
              features: scrapedData.features,
              keywords: scrapedData.keywords,
            }
          : undefined,
      };

      if (projectId) payload.projectId = projectId;
      if (interviewId) payload.interviewId = interviewId;

      const response = await fetch('/api/chat/research-brief', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();
      
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.message,
        timestamp: new Date().toISOString(),
      };

      const updatedMessages = [...newMessages, assistantMessage];
      setMessages(updatedMessages);
      
      // Update research brief if provided
      if (data.researchBrief) {
        console.log('✅ RESEARCH BRIEF RECEIVED FROM API:', {
          length: data.researchBrief.length,
          preview: data.researchBrief.substring(0, 100),
          hasMetadata: !!data.briefMetadata,
        });
        setResearchBrief(data.researchBrief);
        
        if (data.briefMetadata) {
          setBriefMetadata(data.briefMetadata);
          console.log('📊 Brief metadata updated:', {
            version: data.briefMetadata.version,
            userSections: data.briefMetadata.sections_with_user_input.length,
            recommendationSections: data.briefMetadata.sections_with_recommendations.length,
          });
        }
      } else {
        console.log('❌ NO RESEARCH BRIEF IN API RESPONSE');
      }
      
      // Update interview guide if provided
      if (data.interviewGuide) {
        setInterviewGuide(data.interviewGuide);
        
        if (data.guideMetadata) {
          console.log('📋 Guide metadata updated:', {
            version: data.guideMetadata.version,
            wordCount: data.guideMetadata.word_count,
          });
        }
      }
      
      // Always update parent with latest messages, brief, metadata, and guide
      onChatUpdate(
        updatedMessages, 
        data.researchBrief || researchBrief, 
        data.briefMetadata || briefMetadata,
        data.interviewGuide || interviewGuide
      );

    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: 'I apologize, but I encountered an error. Please try your message again.',
        timestamp: new Date().toISOString(),
      };
      
      setMessages([...newMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
    // Shift+Enter allows new line (default textarea behavior)
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="wizard-typography flex h-full flex-col overflow-hidden" style={{ backgroundColor: 'var(--card-bg)' }}>
      {/* Chat Messages - Scrollable Area */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="p-6 space-y-4">
        {messages.map((message, index) => {
          const isUser = message.role === 'user';
          const bubbleClasses = isUser
            ? 'bg-white text-gray-900 border border-gray-200'
            : 'bg-gray-900 text-white shadow-sm';

          return (
            <div
              key={index}
              className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-3xl rounded-2xl px-4 py-3 text-sm leading-relaxed transition-colors ${bubbleClasses}`}
              >
                <div className="whitespace-pre-wrap">{message.content}</div>
                <div className={`mt-2 flex items-center justify-between text-xs ${isUser ? 'text-gray-400' : 'text-gray-300/80'}`}>
                  <span>{formatTime(message.timestamp)}</span>
                  {!isUser && (
                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={() => navigator.clipboard.writeText(message.content)}
                        className="rounded px-1 py-0.5 text-gray-200 transition hover:bg-gray-700/50 hover:text-white"
                        title="Copy message"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                      <button
                        className="rounded px-1 py-0.5 text-gray-200 transition hover:bg-gray-700/50 hover:text-white"
                        title="Regenerate response"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600 shadow-sm">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="h-2 w-2 animate-bounce rounded-full bg-gray-300"></div>
                  <div className="h-2 w-2 animate-bounce rounded-full bg-gray-300" style={{ animationDelay: '0.1s' }}></div>
                  <div className="h-2 w-2 animate-bounce rounded-full bg-gray-300" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-sm text-gray-500">Thinking...</span>
              </div>
            </div>
          </div>
        )}
        
        {isRegenerating && (
          <div className="flex justify-start">
            <div className="bg-blue-50 border border-blue-200 text-blue-900 px-4 py-3 rounded-lg">
              <div className="flex items-center space-x-2">
                <svg className="animate-spin h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-sm font-medium">Updating {currentView === 'guide' ? 'interview guide' : 'research brief'}...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
        
        </div>
      </div>

      {/* Chat Input - Fixed at Bottom */}
      <div className="border-t p-6"
         style={{
           borderTop: '1px solid var(--card-border)',
           backgroundColor: 'var(--card-bg)'
         }}
      >
        <div className="flex items-center space-x-3">
          <button
            className="p-2 transition-colors"
            style={{ color: '#2563eb' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--foreground)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#2563eb';
            }}
            title="Add attachment"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </button>
          
          <div className="flex-1">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask a question..."
              className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{
                backgroundColor: 'var(--card-bg)',
                borderColor: 'var(--card-border)',
                color: 'var(--foreground)',
                height: '44px',
                minHeight: '44px',
                maxHeight: '120px',
                overflowY: 'auto',
                resize: 'none'
              }}
              disabled={isLoading}
              rows={1}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = '44px';
                const newHeight = Math.min(target.scrollHeight, 120);
                target.style.height = Math.max(newHeight, 44) + 'px';
              }}
            />
          </div>
          
          <button
            onClick={() => sendMessage()}
            disabled={!inputMessage.trim() || isLoading}
            className="p-3 rounded-xl transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl"
            style={{
              background: !isLoading 
                ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                : 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)',
              color: 'white',
              cursor: inputMessage.trim() && !isLoading ? 'pointer' : 'not-allowed',
              border: 'none',
              boxShadow: !isLoading 
                ? '0 4px 15px rgba(102, 126, 234, 0.4)' 
                : '0 2px 8px rgba(156, 163, 175, 0.3)'
            }}
            onMouseEnter={(e) => {
              if (!isLoading) {
                e.currentTarget.style.background = 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.6)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isLoading) {
                e.currentTarget.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)';
              }
            }}
          >
            <svg 
              className="w-5 h-5" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
              strokeWidth={2.5}
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                strokeDasharray="0 1"
                strokeDashoffset="0"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
