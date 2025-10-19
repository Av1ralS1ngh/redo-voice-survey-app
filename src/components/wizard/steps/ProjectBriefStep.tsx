'use client';

import { useState, useEffect, useRef, useCallback, useMemo, ReactNode, KeyboardEvent } from 'react';
import { ChatInterface } from '@/components/wizard/ChatInterface';
import { ResearchBriefPreview } from '@/components/wizard/ResearchBriefPreview';
import { ResearchBriefPreviewLive } from '@/components/wizard/ResearchBriefPreviewLive';
import { InterviewGuidePreviewLive } from '@/components/wizard/InterviewGuidePreviewLive';
import { ExampleCues } from '@/components/wizard/ExampleCues';
import { useTheme } from '@/contexts/ThemeContext';
import { DocumentTextIcon, LightBulbIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

interface ProjectBriefStepProps {
  wizardData: any;
  onUpdateData: (data: any) => void;
  onNext?: () => void;
  onPrev?: () => void;
  canProceed?: boolean;
  isLastStep?: boolean;
  interviewId?: string;
  onProvideRightContent?: (content: ReactNode | null) => void;
  gotoStepById?: (stepId: string) => void;
}

export function ProjectBriefStep({ 
  wizardData, 
  onUpdateData, 
  interviewId,
  onProvideRightContent,
  gotoStepById,
}: ProjectBriefStepProps) {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const [projectName, setProjectName] = useState(wizardData.projectName || 'Untitled');
  const [projectDescription, setProjectDescription] = useState(wizardData.projectDescription || '');
  const [chatStarted, setChatStarted] = useState(false);
  const [showFinalBrief, setShowFinalBrief] = useState(false);
  const [firstMessageSent, setFirstMessageSent] = useState(false);
  const [showBriefModal, setShowBriefModal] = useState(false);
  const [showSurveyModal, setShowSurveyModal] = useState(false);
  const [briefContent, setBriefContent] = useState('');
  const [surveyContent, setSurveyContent] = useState('');
  const [initialPrompt, setInitialPrompt] = useState('');
  
  // View state: 'brief' or 'guide'
  type ViewMode = 'brief' | 'guide';
  const [currentView, setCurrentView] = useState<ViewMode>(wizardData.currentView || 'brief');
  const [interviewGuide, setInterviewGuide] = useState(wizardData.interviewGuide || '');
  const [isGeneratingGuide, setIsGeneratingGuide] = useState(false);
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
  
  
  // Live editing state
  const [useLiveEditing, setUseLiveEditing] = useState(true); // Enable new live editing by default
  const [briefSections, setBriefSections] = useState<Array<{id: string, title: string, content: string, status: 'complete' | 'generating' | 'pending'}>>([]);
  const [guideSections, setGuideSections] = useState<Array<{id: string, title: string, content: string, status: 'complete' | 'generating' | 'pending'}>>([]);
  // Right pane visibility (assistant area)
  // Incoming cue passed to ChatInterface; changing key forces send even if text repeats
  const [incomingCue, setIncomingCue] = useState<string | undefined>(undefined);
  const [incomingCueKey, setIncomingCueKey] = useState<number | undefined>(undefined);
  const projectId = wizardData.projectId;
  const briefVersion = wizardData.briefMetadata?.version;
  const initialMetadataSignature = wizardData.briefMetadata ? JSON.stringify(wizardData.briefMetadata) : undefined;
  const lastSavedBriefRef = useRef<{ content: string; version?: number; metadataSignature?: string }>({
    content: wizardData.researchBrief?.trim() || '',
    version: briefVersion,
    metadataSignature: initialMetadataSignature,
  });
  const hasInitializedSavedRef = useRef(false);
  const briefSaveInFlightRef = useRef<string | null>(null);
  const initialPromptRef = useRef<HTMLTextAreaElement | null>(null);
  const suggestionPrompts = useMemo(
    () => {
      if (wizardData.interviewType === 'concept_testing') {
        return [
          'Test new packaging for our protein powder, want to appeal to younger users',
          'Evaluate 4 new flavor variants for our meal kit service before launch',
          'Validate our new mobile app feature concept with power users, limited budget',
        ];
      }
      if (wizardData.interviewType === 'customer_satisfaction') {
        return [
          'What was the final breaking point to stop coming at Renaissance Hotels',
          'How likely are you to recommend our Bakery\'s Cookies to your friends?',
          'What does Apple IOS system do better which Android should immediately adopt',
        ];
      }
      return [
        'Meal kit subscription service, seeing cancellations after 2-3 months',
        'SaaS product with NPS of 42, need to understand why and improve retention',
        'Restaurant getting negative reviews about service quality and cleanliness',
      ];
    },
    [wizardData.interviewType]
  );

  useEffect(() => {
    if (hasInitializedSavedRef.current) {
      return;
    }

    if (wizardData.researchBrief) {
      lastSavedBriefRef.current = {
        content: wizardData.researchBrief.trim(),
        version: wizardData.briefMetadata?.version,
        metadataSignature: wizardData.briefMetadata
          ? JSON.stringify(wizardData.briefMetadata)
          : undefined,
      };
      hasInitializedSavedRef.current = true;
    }
  }, [wizardData.researchBrief, wizardData.briefMetadata]);

  const persistResearchBrief = useCallback(async (brief: string, metadata?: any) => {
    const trimmedContent = brief?.trim();

    if (!trimmedContent) {
      return;
    }

    if (!projectId) {
      console.warn('Skipping research brief save: missing projectId');
      return;
    }

    const lastSaved = lastSavedBriefRef.current;
    const version = typeof metadata?.version === 'number' ? metadata.version : undefined;
    const versionChanged = version !== undefined && version !== lastSaved.version;
    const contentChanged = trimmedContent !== lastSaved.content;
    const metadataSignature = metadata ? JSON.stringify(metadata) : undefined;
    const metadataChanged = metadataSignature !== lastSaved.metadataSignature;

    if (!versionChanged && !contentChanged && !metadataChanged) {
      return;
    }

    const saveSignature = JSON.stringify({
      content: trimmedContent,
      version: version ?? null,
      metadata: metadataSignature ?? null,
    });

    if (briefSaveInFlightRef.current === saveSignature) {
      return;
    }

    briefSaveInFlightRef.current = saveSignature;

    try {
      const response = await fetch('/api/research-briefs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          project_id: projectId,
          interview_id: interviewId,
          content: trimmedContent,
          version,
          metadata,
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.success) {
        const errorDetail = result?.error || `${response.status} ${response.statusText}`;
        console.error('Failed to persist research brief:', errorDetail);
        return;
      }

      lastSavedBriefRef.current = {
        content: trimmedContent,
        version: result.brief?.version ?? version,
        metadataSignature:
          result.brief?.metadata !== undefined
            ? JSON.stringify(result.brief.metadata)
            : metadataSignature,
      };
      hasInitializedSavedRef.current = true;
    } catch (error) {
      console.error('Error persisting research brief:', error);
    } finally {
      if (briefSaveInFlightRef.current === saveSignature) {
        briefSaveInFlightRef.current = null;
      }
    }
  }, [projectId, interviewId]);

  useEffect(() => {
    if (!projectId) {
      return;
    }

    const trimmedBrief = wizardData.researchBrief?.trim();
    if (!trimmedBrief) {
      return;
    }

    void persistResearchBrief(wizardData.researchBrief, wizardData.briefMetadata);
  }, [projectId, wizardData.researchBrief, wizardData.briefMetadata, persistResearchBrief]);

  // Helper to parse brief into sections
  const parseBriefIntoSections = useCallback((brief: string) => {
    const sections: Array<{id: string, title: string, content: string, status: 'complete' | 'generating' | 'pending'}> = [];
    const lines = brief.split('\n');
    
    let currentSection: {id: string, title: string, content: string, status: 'complete' | 'generating' | 'pending'} | null = null;
    
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
  }, []);

  // Initialize sections from existing brief
  useEffect(() => {
    if (wizardData.researchBrief && wizardData.researchBrief.trim()) {
      const parsed = parseBriefIntoSections(wizardData.researchBrief);
      setBriefSections(parsed);
    }
  }, [wizardData.researchBrief, parseBriefIntoSections]);

  // Initialize guide sections from existing guide
  useEffect(() => {
    if (interviewGuide && guideSections.length === 0) {
      const parsed = parseBriefIntoSections(interviewGuide); // Same parser works for guides
      setGuideSections(parsed);
    }
  }, [interviewGuide, parseBriefIntoSections, guideSections.length])

  // Format markdown content into sections with hover effects (same as ResearchBriefPreview)
  const formatMarkdown = (content: string) => {
    if (!content) return <div className="text-gray-500 italic">No guide generated yet.</div>;

    interface Section {
      heading: string;
      content: React.ReactElement[];
    }

    const lines = content.split('\n');
    const sections: Section[] = [];
    let currentSection: Section | null = null;
    let key = 0;
    let inList = false;
    let listItems: React.ReactElement[] = [];
    let listType: 'ul' | 'ol' | null = null;

    const flushList = () => {
      if (inList && listItems.length > 0 && currentSection) {
        if (listType === 'ul') {
          currentSection.content.push(
            <ul key={key++} className="list-disc ml-6 mb-4 space-y-2">
              {listItems}
            </ul>
          );
        } else if (listType === 'ol') {
          currentSection.content.push(
            <ol key={key++} className="list-decimal ml-6 mb-4 space-y-2">
              {listItems}
            </ol>
          );
        }
        listItems = [];
        inList = false;
        listType = null;
      }
    };

    const finishSection = () => {
      if (currentSection && currentSection.content.length > 0) {
        sections.push(currentSection);
      }
    };

    lines.forEach((line) => {
      const trimmed = line.trim();
      const originalIndent = line.length - line.trimStart().length;
      
      // Main headings (##) - Start new section
      if (trimmed.startsWith('## ')) {
        flushList();
        finishSection();
        const text = trimmed.substring(3);
        // Convert all-caps titles to proper case like Research Brief
        const properCaseTitle = text.replace(/\b\w/g, (char, index) => {
          // Keep numbers and dots at the beginning, but convert the rest to proper case
          if (index === 0 || text.charAt(index - 1) === ' ') {
            return char.toUpperCase();
          }
          return char.toLowerCase();
        });
        currentSection = {
          heading: properCaseTitle,
          content: []
        };
      }
      // Subheadings (###)
      else if (trimmed.startsWith('### ')) {
        flushList();
        const text = trimmed.substring(4);
        if (currentSection) {
          currentSection.content.push(
            <h3 key={key++} className="text-sm font-semibold text-gray-900 mt-3 mb-2">
              {text}
            </h3>
          );
        }
      }
      // Bold subsections (**text**)
      else if (/^\*\*(.+?)\*\*/.test(trimmed)) {
        flushList();
        const text = trimmed.replace(/\*\*(.*?)\*\*/g, '$1');
        if (currentSection) {
          currentSection.content.push(
            <h4 key={key++} className="text-sm font-semibold text-gray-800 mt-3 mb-2">
              {text}
            </h4>
          );
        }
      }
      // Numbered list
      else if (/^\d+\.\s/.test(trimmed)) {
        const number = trimmed.match(/^(\d+)\.\s/)?.[1];
        const text = trimmed.replace(/^\d+\.\s/, '');
        const formattedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        if (!inList || listType !== 'ol') {
          flushList();
          inList = true;
          listType = 'ol';
        }
        
        listItems.push(
          <li key={key++} className="text-sm text-gray-700 leading-relaxed mb-2" value={parseInt(number || '1')} dangerouslySetInnerHTML={{ __html: formattedText }} />
        );
      }
      // Bullet points (- text or • text)
      else if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
        const text = trimmed.substring(2);
        const formattedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        // Determine nesting level based on indentation
        const isNested = originalIndent >= 2;
        
        if (!inList || listType !== 'ul') {
          flushList();
          inList = true;
          listType = 'ul';
        }
        
        listItems.push(
          <li 
            key={key++} 
            className={`text-sm text-gray-700 leading-relaxed mb-2 ${isNested ? 'ml-6 list-circle' : ''}`}
            dangerouslySetInnerHTML={{ __html: formattedText }} 
          />
        );
      }
      // Empty line
      else if (trimmed === '') {
        flushList();
        if (currentSection) {
          currentSection.content.push(<div key={key++} className="h-1" />);
        }
      }
      // Regular paragraph
      else if (trimmed) {
        flushList();
        const formattedText = trimmed.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        if (currentSection) {
          currentSection.content.push(
            <p key={key++} className="text-sm text-gray-700 leading-relaxed mb-2" dangerouslySetInnerHTML={{ __html: formattedText }} />
          );
        }
      }
    });

    // Flush any remaining list and section
    flushList();
    finishSection();

    // Render sections with content boxes that have hover effects (matching Research Brief)
    return (
      <div className="space-y-6">
        {sections.map((section, idx) => (
          <div key={idx}>
            {/* Section Title - Plain text, no background */}
            <h2 className="text-base font-semibold text-gray-900 mb-3">
              {section.heading}
            </h2>
            {/* Content Box - Rounded rectangle with hover effect */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 transition-all duration-300 hover:bg-gray-50">
              <div className="space-y-2 [&_strong]:font-bold [&_strong]:text-black [&_p]:text-sm [&_p]:text-gray-700 [&_li]:text-sm [&_li]:text-gray-700 [&_h3]:text-sm [&_h3]:font-semibold [&_h4]:text-sm [&_h4]:font-semibold">
                {section.content}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Auto-save project details with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      onUpdateData({
        projectName: projectName.trim(),
        projectDescription: projectDescription.trim(),
      });
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [projectName, projectDescription]);

  // Start chat automatically only when chat history exists (not just project name)
  useEffect(() => {
    if (wizardData.chatHistory?.length > 0 && !chatStarted) {
      setChatStarted(true);
    }
    // Note: removed auto-start on projectName to show initial input screen
  }, [chatStarted, wizardData.chatHistory]);


  // Always show research brief if we have existing data
  const hasExistingBrief = wizardData.researchBrief && wizardData.researchBrief.trim().length > 0;
  const hasExistingChat = wizardData.chatHistory && wizardData.chatHistory.length > 0;
  const isBrandNewExperience = !chatStarted && !hasExistingChat && !hasExistingBrief;
  const canSubmitInitialPrompt = initialPrompt.trim().length > 0;

  // Handler to start chat with initial message
  // Handler for using existing brief
  const handleUseBrief = () => {
    if (!briefContent.trim()) return;
    
    const initialMessage = {
      role: 'user' as const,
      content: `Here's my existing research brief:\n\n${briefContent.trim()}`,
      timestamp: new Date().toISOString(),
    };
    
    onUpdateData({
      chatHistory: [initialMessage],
    });
    
    setChatStarted(true);
    setFirstMessageSent(true);
    setShowBriefModal(false);
    setBriefContent('');
  };

  // Handler for importing survey
  const handleImportSurvey = () => {
    if (!surveyContent.trim()) return;
    
    const initialMessage = {
      role: 'user' as const,
      content: `Here's my survey content to analyze:\n\n${surveyContent.trim()}`,
      timestamp: new Date().toISOString(),
    };
    
    onUpdateData({
      chatHistory: [initialMessage],
    });
    
    setChatStarted(true);
    setFirstMessageSent(true);
    setShowSurveyModal(false);
    setSurveyContent('');
  };

  const handleChatUpdate = useCallback((
    chatHistory: any[],
    researchBrief: string,
    briefMetadata?: any,
    interviewGuide?: string,
    projectDescriptionOverride?: string
  ) => {
    // Auto-update title from first message if still "Untitled"
    if (!firstMessageSent && chatHistory.length > 0 && projectName === 'Untitled') {
      const firstUserMessage = chatHistory.find((msg: any) => msg.role === 'user');
      if (firstUserMessage) {
        const autoTitle = firstUserMessage.content.slice(0, 60) + (firstUserMessage.content.length > 60 ? '...' : '');
        setProjectName(autoTitle);
        setFirstMessageSent(true);
      }
    }
    
    // Show right pane when research brief is generated
    // Only include interviewGuide in update if it's explicitly provided (not undefined or empty)
    // This prevents accidentally overwriting an existing guide with undefined or empty string
    const updateData: any = {
      projectName,
      projectDescription: projectDescriptionOverride ?? projectDescription,
      chatHistory,
      researchBrief,
      briefMetadata,
    };
    
    // Only include interviewGuide if it's a non-empty string
    if (interviewGuide !== undefined && interviewGuide.trim().length > 0) {
      updateData.interviewGuide = interviewGuide;
      // Update local state too
      setInterviewGuide(interviewGuide);
    }
    
    onUpdateData(updateData);

    if (researchBrief?.trim()) {
      void persistResearchBrief(researchBrief, briefMetadata);
    }
  }, [firstMessageSent, projectDescription, projectName, onUpdateData, persistResearchBrief]);

  const handleCueClick = (cueText: string) => {
    // This will be passed to ChatInterface to auto-fill the input
    // For now, just start the chat if not started
    if (!chatStarted) {
      setChatStarted(true);
    }
    // Set incoming cue for ChatInterface to pick up and send
    setIncomingCue(cueText);
    setIncomingCueKey((k) => (typeof k === 'number' ? k + 1 : 1));
  };
  
  const handleSuggestionSelect = useCallback((prompt: string) => {
    setInitialPrompt(prompt);
    if (typeof window !== 'undefined') {
      requestAnimationFrame(() => {
        initialPromptRef.current?.focus();
      });
    }
  }, []);

  const handleProjectNameChange = useCallback((newName: string) => {
    const trimmedName = newName.trim();
    setProjectName(trimmedName);
    onUpdateData({
      projectName: trimmedName,
      projectDescription: projectDescription.trim(),
    });
  }, [onUpdateData, projectDescription]);

  const handleInitialPromptSubmit = useCallback(() => {
    const trimmedPrompt = initialPrompt.trim();
    if (!trimmedPrompt) {
      return;
    }

    const initialMessage = {
      role: 'user' as const,
      content: trimmedPrompt,
      timestamp: new Date().toISOString(),
    };

    const updatedHistory = [...(wizardData.chatHistory || []), initialMessage];

    setChatStarted(true);
    setFirstMessageSent(true);
    setProjectDescription(trimmedPrompt);

    handleChatUpdate(
      updatedHistory,
      wizardData.researchBrief || '',
      wizardData.briefMetadata,
      wizardData.interviewGuide,
      trimmedPrompt
    );

    setInitialPrompt('');
  }, [handleChatUpdate, initialPrompt, wizardData.chatHistory, wizardData.researchBrief, wizardData.briefMetadata, wizardData.interviewGuide]);

  const handleInitialPromptKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault();
        handleInitialPromptSubmit();
      }
    },
    [handleInitialPromptSubmit]
  );

  // Handle section updates from streaming
  const handleSectionsUpdate = useCallback((sections: Array<{id: string, title: string, content: string, status: 'complete' | 'generating' | 'pending'}>) => {
    console.log('🎯 [ProjectBriefStep] handleSectionsUpdate called:', {
      currentView,
      sectionCount: sections.length,
      sections: sections.map(s => ({ id: s.id, title: s.title, status: s.status })),
    });
    
    if (currentView === 'guide') {
      console.log('📘 [ProjectBriefStep] Updating guideSections');
      setGuideSections(sections);
    } else {
      console.log('📗 [ProjectBriefStep] Updating briefSections');
      setBriefSections(sections);
    }
  }, [currentView]);

  // Handle section edit save
  const handleSectionUpdate = async (sectionId: string, newContent: string) => {
    try {
      const response = await fetch('/api/chat/update-section', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sectionId,
          sectionContent: newContent,
          fullBrief: wizardData.researchBrief,
          interviewType: wizardData.interviewType || 'usability_testing',
          projectName: projectName,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update section');
      }
      
      const data = await response.json();
      
      // Update wizard data with new brief
      onUpdateData({
        researchBrief: data.updatedBrief,
      });

      if (data.updatedBrief?.trim()) {
        void persistResearchBrief(data.updatedBrief, wizardData.briefMetadata);
      }
      
      // Parse updated brief into sections
      const updatedSections = parseBriefIntoSections(data.updatedBrief);
      setBriefSections(updatedSections);
      
    } catch (error) {
      console.error('Section update error:', error);
      throw error; // Re-throw for component to handle
    }
  };

  // Handle guide section edit save
  const handleGuideSectionUpdate = async (sectionId: string, newContent: string) => {
    try {
      const response = await fetch('/api/chat/update-section', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sectionId,
          sectionContent: newContent,
          fullBrief: interviewGuide,
          interviewType: wizardData.interviewType || 'usability_testing',
          projectName: projectName,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update section');
      }
      
      const data = await response.json();
      
      // Update interview guide
      setInterviewGuide(data.updatedBrief);
      onUpdateData({
        interviewGuide: data.updatedBrief,
      });
      
      // Parse updated guide into sections
      const updatedSections = parseBriefIntoSections(data.updatedBrief);
      setGuideSections(updatedSections);
      
    } catch (error) {
      console.error('Guide section update error:', error);
      throw error;
    }
  };

  const handleGenerateGuide = async () => {
    // If guide already exists, just switch to guide view (don't regenerate)
    if (interviewGuide) {
      setCurrentView('guide');
      onUpdateData({ currentView: 'guide', interviewGuide });  // Save guide to wizardData too!
      return;
    }
    
    // Switch to guide view and start generating with streaming
    setCurrentView('guide');
    setIsGeneratingGuide(true);
    onUpdateData({ currentView: 'guide' });
    
    if (!useLiveEditing || !wizardData.researchBrief) {
      setIsGeneratingGuide(false);
      return;
    }
    
    console.log('🎯 Generating interview guide with streaming...');
    
    let generationSucceeded = false;

    try {
      const response = await fetch('/api/chat/research-brief-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName,
          projectDescription,
          chatHistory: [{
            role: 'user',
            content: 'Please generate the interview guide from the research brief.',
            timestamp: new Date().toISOString(),
          }],
          interviewType: wizardData.interviewType || 'usability_testing',
          currentView: 'guide',
          researchBrief: wizardData.researchBrief,
          projectId,
          interviewId,
        }),
      });

      if (!response.ok) throw new Error('Streaming request failed');

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      const decoder = new TextDecoder();
      let accumulatedGuide = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.substring(6));

              if (data.type === 'sections') {
                // Update sections in real-time
                setGuideSections(data.sections);
              } else if (data.type === 'complete') {
                accumulatedGuide = data.interviewGuide || accumulatedGuide;
                setInterviewGuide(accumulatedGuide);
                onUpdateData({ interviewGuide: accumulatedGuide });
                generationSucceeded = Boolean(accumulatedGuide?.trim());
                
                // Add the guide generation message to chat
                if (data.message) {
                  const assistantMessage = {
                    role: 'assistant' as const,
                    content: data.message,
                    timestamp: new Date().toISOString(),
                  };
                  const currentChatHistory = wizardData.chatHistory || [];
                  const updatedMessages = [...currentChatHistory, assistantMessage];
                  handleChatUpdate(
                    updatedMessages,
                    wizardData.researchBrief || '',
                    undefined,
                    accumulatedGuide
                  );
                }
              }
            } catch (e) {
              console.error('Error parsing SSE:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error generating guide:', error);
    } finally {
      setIsGeneratingGuide(false);
      if (!generationSucceeded) {
        setCurrentView('brief');
        onUpdateData({ currentView: 'brief' });
      }
    }
  };

  const handleRegenerateGuide = async () => {
    if (!confirm('This will replace your current interview guide with a new one based on the latest research brief. Continue?')) {
      return;
    }
    
    console.log('🔄 Regenerating interview guide with streaming...');
    
    setCurrentView('guide');
    onUpdateData({ currentView: 'guide' });
    setInterviewGuide('');
    setGuideSections([]);
    setIsGeneratingGuide(true);
    
  let regenerationSucceeded = false;

  try {
      const response = await fetch('/api/chat/research-brief-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName,
          projectDescription,
          chatHistory: [{
            role: 'user',
            content: 'Please regenerate the interview guide from the research brief.',
            timestamp: new Date().toISOString(),
          }],
          interviewType: wizardData.interviewType || 'usability_testing',
          currentView: 'guide',
          researchBrief: wizardData.researchBrief,
          projectId,
          interviewId,
        }),
      });

      if (!response.ok) throw new Error('Streaming request failed');

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      const decoder = new TextDecoder();
      let accumulatedGuide = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.substring(6));

              if (data.type === 'sections') {
                setGuideSections(data.sections);
              } else if (data.type === 'complete') {
                accumulatedGuide = data.interviewGuide || accumulatedGuide;
                setInterviewGuide(accumulatedGuide);
                onUpdateData({ interviewGuide: accumulatedGuide });
                regenerationSucceeded = Boolean(accumulatedGuide?.trim());
                
                // Add the guide regeneration message to chat
                if (data.message) {
                  const assistantMessage = {
                    role: 'assistant' as const,
                    content: data.message,
                    timestamp: new Date().toISOString(),
                  };
                  const currentChatHistory = wizardData.chatHistory || [];
                  const updatedMessages = [...currentChatHistory, assistantMessage];
                  handleChatUpdate(
                    updatedMessages,
                    wizardData.researchBrief || '',
                    undefined,
                    accumulatedGuide
                  );
                }
              }
            } catch (e) {
              console.error('Error parsing SSE:', e);
            }
          }
        }
      }
      
      console.log('✅ Interview guide regenerated successfully');
    } catch (error) {
      console.error('❌ Error regenerating interview guide:', error);
      alert('Failed to regenerate interview guide. Please try again.');
    } finally {
      setIsGeneratingGuide(false);
      if (!regenerationSucceeded) {
        setCurrentView('brief');
        onUpdateData({ currentView: 'brief' });
      }
    }
  };

  const canShowAssistant = projectName.trim() && (chatStarted || hasExistingChat);

  const researchBriefContent = useMemo(() => {
    if (!projectName.trim() && !hasExistingBrief && briefSections.length === 0) {
      return (
        <div className="rounded-lg border border-dashed border-gray-200 bg-white px-6 py-8 text-sm text-gray-500">
          Start a conversation with the assistant or add more context to see your research brief appear here.
        </div>
      );
    }

    if (useLiveEditing) {
      return (
        <ResearchBriefPreviewLive
          sections={briefSections}
          researchBrief={wizardData.researchBrief || ''}
          projectName={projectName}
          interviewType={wizardData.interviewType || 'usability_testing'}
          onUse={handleGenerateGuide}
          onNextStep={() => gotoStepById?.('ai-moderator')}
          hasInterviewGuide={!!interviewGuide}
          onSectionUpdate={handleSectionUpdate}
          onProjectNameChange={handleProjectNameChange}
          isGeneratingGuide={isGeneratingGuide}
        />
      );
    }

    return (
      <ResearchBriefPreview
        researchBrief={wizardData.researchBrief || ''}
        projectName={projectName}
        onUse={handleGenerateGuide}
        hasInterviewGuide={!!interviewGuide}
        isGeneratingGuide={isGeneratingGuide}
      />
    );
  }, [
    projectName,
    hasExistingBrief,
    briefSections,
    useLiveEditing,
    wizardData.researchBrief,
    wizardData.interviewType,
    handleGenerateGuide,
    interviewGuide,
    handleSectionUpdate,
    handleProjectNameChange,
    isGeneratingGuide,
  ]);

  const interviewGuideContent = useMemo(() => {
    if (isGeneratingGuide) {
      return (
        <div className={`rounded-lg border border-dashed px-6 py-8 text-sm ${
          isDarkMode 
            ? 'border-blue-800 bg-blue-950/60 text-blue-300' 
            : 'border-blue-200 bg-blue-50/60 text-blue-700'
        }`}>
          Generating your interview guide… this usually takes a few moments.
        </div>
      );
    }

    if (!interviewGuide) {
      return (
        <div className="rounded-lg border border-dashed border-gray-200 bg-white px-6 py-8 text-sm text-gray-500">
          <p className="text-sm text-gray-600">
            Generate an interview guide when your research brief feels ready. We’ll keep it synced if you make edits later.
          </p>
          <button
            onClick={handleGenerateGuide}
            className={`mt-4 rounded-lg px-6 py-2 text-sm font-semibold transition-colors ${
              isDarkMode 
                ? 'bg-blue-900 text-blue-200 hover:bg-blue-800' 
                : 'bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-300'
            }`}
          >
            Generate Interview Guide
          </button>
        </div>
      );
    }

    return (
      <InterviewGuidePreviewLive
        sections={guideSections}
        interviewGuide={interviewGuide}
        projectName={projectName}
        interviewType={wizardData.interviewType || 'usability_testing'}
        onRegenerate={handleRegenerateGuide}
        onNextStep={() => gotoStepById?.('ai-moderator')}
        isGenerating={isGeneratingGuide}
        onSectionUpdate={handleGuideSectionUpdate}
      />
    );
  }, [
    guideSections,
    handleGenerateGuide,
    handleRegenerateGuide,
    handleGuideSectionUpdate,
    interviewGuide,
    isGeneratingGuide,
    projectName,
    wizardData.interviewType,
  ]);

  const assistantPanel = useMemo(() => (
    <div className="wizard-typography flex h-full flex-col bg-gray-50 overflow-hidden">
      <div className="border-b border-gray-200 bg-white px-4 py-3 flex-shrink-0">
        <h2 className="text-sm font-semibold text-gray-900">Study Design Assistant</h2>
      </div>
      <div className="flex-1 overflow-hidden min-h-0">
        {canShowAssistant ? (
          <ChatInterface
            projectName={projectName}
            projectDescription={projectDescription}
            chatHistory={wizardData.chatHistory || []}
            onChatUpdate={handleChatUpdate}
            existingResearchBrief={wizardData.researchBrief || ''}
            existingInterviewGuide={interviewGuide}
            interviewType={wizardData.interviewType || 'custom'}
            currentView={currentView}
            onSectionsUpdate={handleSectionsUpdate}
            useStreaming={useLiveEditing}
            incomingCue={incomingCue}
            incomingCueKey={incomingCueKey}
            projectId={projectId}
            interviewId={interviewId}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-400">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 8h10M7 12h4m-4 4h6" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Your assistant is standing by</p>
              <p className="mt-1 text-sm text-gray-500">
                Add background or tap a cue to unlock the chat and start briefing Pluve.
              </p>
            </div>
            <button
              onClick={() => setChatStarted(true)}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:border-blue-300 hover:text-blue-600"
            >
              Open Assistant
            </button>
          </div>
        )}
      </div>
    </div>
  ), [
    canShowAssistant,
    projectName,
    projectDescription,
    wizardData.chatHistory,
    handleChatUpdate,
    wizardData.researchBrief,
    interviewGuide,
    wizardData.interviewType,
    currentView,
    handleSectionsUpdate,
    useLiveEditing,
    incomingCue,
    incomingCueKey,
    projectId,
    interviewId,
  ]);

  useEffect(() => {
    if (!onProvideRightContent) {
      return;
    }

    if (isBrandNewExperience) {
      onProvideRightContent(null);
      return () => onProvideRightContent(null);
    }

    onProvideRightContent(assistantPanel);
    return () => onProvideRightContent(null);
  }, [assistantPanel, onProvideRightContent, isBrandNewExperience]);

  const canViewGuideTab = isGeneratingGuide || Boolean(interviewGuide) || guideSections.length > 0;

  useEffect(() => {
    if (!canViewGuideTab && currentView === 'guide') {
      setCurrentView('brief');
      onUpdateData({ currentView: 'brief' });
    }
  }, [canViewGuideTab, currentView, onUpdateData]);

  const standardLayout = (
    <div className="wizard-typography mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between gap-3 border-b border-gray-200 pb-3">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => {
              if (currentView !== 'brief') {
                setCurrentView('brief');
                onUpdateData({ currentView: 'brief' });
              }
            }}
            className={`border-b-2 pb-2 text-sm font-semibold transition-colors ${
              currentView === 'brief'
                ? 'border-[var(--foreground)] text-[var(--foreground)]'
                : 'border-transparent text-muted hover:border-[var(--foreground)]/40 hover:text-[var(--foreground)]'
            }`}
          >
            Research Brief
          </button>
          <button
            type="button"
            disabled={!canViewGuideTab}
            onClick={() => {
              if (!canViewGuideTab || currentView === 'guide') {
                return;
              }
              setCurrentView('guide');
              onUpdateData({ currentView: 'guide' });
            }}
            className={`inline-flex items-center gap-2 border-b-2 pb-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              currentView === 'guide'
                ? 'border-[var(--foreground)] text-[var(--foreground)]'
                : 'border-transparent text-muted hover:border-[var(--foreground)]/40 hover:text-[var(--foreground)]'
            }`}
          >
            {isGeneratingGuide && currentView !== 'guide' && (
              <svg
                className="h-3.5 w-3.5 animate-spin text-muted"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            )}
            Interview Guide
            {interviewGuide && !isGeneratingGuide && (
              <span className="ml-1 inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" aria-hidden="true" />
            )}
          </button>
        </div>

        {currentView === 'brief' && (
          <button
            onClick={() => setShowFinalBrief(true)}
            className={`rounded-lg px-6 py-2 text-sm font-semibold transition-colors ${
              isDarkMode 
                ? 'bg-blue-900 text-blue-200 hover:bg-blue-800' 
                : 'bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-300'
            }`}
          >
            Present Mode
          </button>
        )}
      </div>

      <div>
        <div className={currentView === 'brief' ? 'block' : 'hidden'}>
          {researchBriefContent}
        </div>
        <div className={currentView === 'guide' ? 'block' : 'hidden'}>
          {interviewGuideContent}
        </div>
      </div>
    </div>
  );

  const introLayout = (
    <div className="wizard-typography relative flex min-h-[calc(100vh-128px)] flex-col bg-white py-20">
      <div className="pointer-events-none fixed left-12 top-8 z-10 flex items-center gap-2 text-sm font-semibold text-muted">

      </div>
      <div className="flex flex-1 flex-col items-center px-6">
        <div className="w-full max-w-2xl text-center">
          <h1 className="text-3xl font-bold">What can I help you research?</h1>
          <textarea
            ref={initialPromptRef}
            value={initialPrompt}
            onChange={(e) => setInitialPrompt(e.target.value)}
            onKeyDown={handleInitialPromptKeyDown}
            placeholder="Start with a question..."
            className="mt-10 w-full max-w-2xl min-h-[120px] rounded-xl border border-gray-200 bg-gray-100 p-4 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="mt-4 flex w-full max-w-2xl items-center justify-between">
          <button
            onClick={() => setShowBriefModal(true)}
            className="flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-muted transition-colors hover:bg-gray-200"
          >
            <DocumentTextIcon className="h-5 w-5 text-muted" aria-hidden="true" />
            Use existing brief
          </button>
          <button
            onClick={handleInitialPromptSubmit}
            disabled={!canSubmitInitialPrompt}
            className={`rounded-lg px-5 py-2 text-sm font-semibold text-white transition-colors ${
              canSubmitInitialPrompt
                ? 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                : 'bg-blue-300 cursor-not-allowed'
            }`}
          >
            Create research
          </button>
        </div>

        <div className="mt-10 w-full">
          <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-4">
            {suggestionPrompts.map(prompt => (
              <button
                key={prompt}
                type="button"
                onClick={() => handleSuggestionSelect(prompt)}
                className={`flex w-full max-w-xl flex-row items-center gap-3 rounded-xl px-5 py-4 text-sm transition-colors ${
                  isDarkMode
                    ? 'border border-slate-700 bg-slate-900 text-gray-300 hover:bg-slate-800 hover:border-slate-500'
                    : 'bg-gray-100 text-muted hover:bg-gray-200'
                }`}
              >
                <LightBulbIcon
                  className={`h-6 w-6 ${isDarkMode ? 'text-gray-400' : 'text-muted'}`}
                  aria-hidden="true"
                />
                <span>{prompt}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {isBrandNewExperience ? introLayout : standardLayout}

      {showFinalBrief && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
          <div className="wizard-typography flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Research Brief Presentation</h3>
                <p className="text-sm text-gray-500">Share this view live with stakeholders or copy for your deck.</p>
              </div>
              <button
                onClick={() => setShowFinalBrief(false)}
                className="rounded-full border border-gray-200 p-2 text-gray-500 transition-colors hover:border-gray-300 hover:text-gray-700"
                aria-label="Close"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto bg-gray-50 px-6 py-6">
              <ResearchBriefPreview
                researchBrief={wizardData.researchBrief || ''}
                projectName={projectName}
              />
            </div>
          </div>
        </div>
      )}

      {showBriefModal && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowBriefModal(false)} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="flex max-h-[80vh] w-full max-w-2xl flex-col rounded-xl bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                <h3 className="text-lg font-semibold text-gray-900">Use Existing Brief</h3>
                <button
                  onClick={() => setShowBriefModal(false)}
                  className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-4">
                <p className="text-sm text-gray-600">
                  Paste your existing research brief below. The assistant will analyze it and help you refine or expand it.
                </p>
                <textarea
                  value={briefContent}
                  onChange={(e) => setBriefContent(e.target.value)}
                  placeholder="Paste your research brief here..."
                  className="mt-4 h-64 w-full resize-none rounded-lg border border-gray-300 p-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
                <button
                  onClick={() => setShowBriefModal(false)}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:border-gray-300 hover:text-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUseBrief}
                  disabled={!briefContent.trim()}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Use Brief
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSurveyModal && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowSurveyModal(false)} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="flex max-h-[80vh] w-full max-w-2xl flex-col rounded-xl bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                <h3 className="text-lg font-semibold text-gray-900">Import Survey</h3>
                <button
                  onClick={() => setShowSurveyModal(false)}
                  className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-4">
                <p className="text-sm text-gray-600">
                  Paste your survey content below. The assistant will analyze it and help you create a research brief based on your survey responses.
                </p>
                <textarea
                  value={surveyContent}
                  onChange={(e) => setSurveyContent(e.target.value)}
                  placeholder="Paste your survey content here..."
                  className="mt-4 h-64 w-full resize-none rounded-lg border border-gray-300 p-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
                <button
                  onClick={() => setShowSurveyModal(false)}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:border-gray-300 hover:text-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImportSurvey}
                  disabled={!surveyContent.trim()}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Import Survey
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );

      {/* Simple Navigation */}
      <div className="mt-8 flex justify-end gap-4">
        <button
          className={`px-6 py-2 rounded-full font-medium transition-colors opacity-50 cursor-not-allowed ${
            isDarkMode 
              ? 'bg-blue-900 text-blue-200 hover:bg-blue-800' 
              : 'bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-300'
          }`}
          disabled
        >
          ← Back
        </button>
        <button
          onClick={() => gotoStepById?.('ai-moderator')}
          className={`px-6 py-2 rounded-full font-medium transition-colors ${
            isDarkMode 
              ? 'bg-blue-600 text-white hover:bg-blue-700' 
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          Next: AI Moderator →
        </button>
      </div>
}
