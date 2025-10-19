'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useVoice } from '@humeai/voice-react';
import { VoiceTestSection } from './VoiceTestSection';
import { InterviewOnboardingFlow } from '../InterviewOnboardingFlow';
import { useTheme } from '@/contexts/ThemeContext';

interface VoiceSettingsStepProps {
  wizardData: any;
  onUpdateData: (data: any) => void;
  onNext: () => void;
  onPrev: () => void;
  canProceed: boolean;
  isLastStep: boolean;
  interviewId?: string;
  gotoStepById?: (stepId: string) => void;
}

interface VoiceOption {
  id: string;
  name: string;
  description: string;
  tags: string[];
}

const voiceOptions: VoiceOption[] = [
  {
    id: 'amy',
    name: 'Amy',
    description:
      'Warm and conversational. Great for in-depth interviews and building rapport with participants.',
    tags: ['Friendly', 'Empathetic', 'Natural'],
  },
  {
    id: 'james',
    name: 'James',
    description: 'Confident and clear. Ideal for professional or executive-facing interviews.',
    tags: ['Authoritative', 'Calm', 'Precise'],
  },
  {
    id: 'sarah',
    name: 'Sarah',
    description: 'Upbeat and energetic. Perfect for quick check-ins and product feedback sessions.',
    tags: ['Energetic', 'Engaging', 'Fast-paced'],
  },
];

export function VoiceSettingsStep({ 
  wizardData, 
  onUpdateData, 
  onNext, 
  onPrev, 
  canProceed,
  isLastStep,
  gotoStepById
}: VoiceSettingsStepProps) {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const [selectedVoiceId, setSelectedVoiceId] = useState<string | null>(() => {
    return wizardData.voiceSettings?.selectedVoiceId || null;
  });
  const [isLeftPanelMinimized, setIsLeftPanelMinimized] = useState(false);

  useEffect(() => {
    const currentId = wizardData.voiceSettings?.selectedVoiceId;
    if (!currentId) {
      return;
    }
    setSelectedVoiceId((prev) => (prev === currentId ? prev : currentId));
  }, [wizardData.voiceSettings?.selectedVoiceId]);

  const selectedVoice = useMemo(
    () => selectedVoiceId ? voiceOptions.find((voice) => voice.id === selectedVoiceId) || null : null,
    [selectedVoiceId]
  );

  // Remove auto-selection logic - let user choose manually

  const handleVoiceSelect = (voiceId: string) => {
    setSelectedVoiceId(voiceId);

    const voice = voiceOptions.find((option) => option.id === voiceId) || voiceOptions[0];
    onUpdateData({
      voiceSettings: {
        ...wizardData.voiceSettings,
        selectedVoiceId: voice.id,
        selectedVoice: voice,
      },
    });

    // Auto-minimize panel after selection with slow animation
    setTimeout(() => {
      setIsLeftPanelMinimized(true);
    }, 300);
  };

  const { status, connect, disconnect, messages } = useVoice();
  const [isTestActive, setIsTestActive] = useState(false);
  const connectionInitiatedRef = useRef(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);


  const handleStartTest = async (): Promise<boolean> => {
    if (!wizardData.researchBrief) {
      alert('Please complete the research brief first');
      return false;
    }

    // Only connect once - prevent duplicates
    if (connectionInitiatedRef.current) {
      console.log('🎤 [VoiceSettings] Connection already initiated, skipping');
      return true;
    }

    const briefContent = wizardData.interviewGuide || wizardData.researchBrief;

    console.log('🎤 [VoiceSettings] Starting test interview...');
    console.log('🎤 [VoiceSettings] Interview Type:', wizardData.interviewType);

    try {
      // Get config and access token
      const response = await fetch('/api/hume/test-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          researchBrief: briefContent,
          interviewType: wizardData.interviewType || 'custom',
          interviewName: wizardData.projectName || 'Test Interview',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create test config');
      }

      const data = await response.json();
      console.log('🎤 [VoiceSettings] Config created:', data.configId);

      // Mark as initiated
      connectionInitiatedRef.current = true;
      setIsTestActive(true);

      // Connect to Hume
      await connect({
        auth: { type: 'accessToken', value: data.accessToken },
        configId: data.configId,
      });

      console.log('🎤 [VoiceSettings] Connected successfully');
      return true;
    } catch (error) {
      console.error('🎤 [VoiceSettings] Error starting test:', error);
      alert(error instanceof Error ? error.message : 'Failed to start test interview');
      connectionInitiatedRef.current = false;
      setIsTestActive(false);
      return false;
    }
  };

  const handleStopTest = async () => {
    console.log('🎤 [VoiceSettings] Stopping test interview...');
    const currentStatus = typeof status === 'object' ? status?.value : status;
    
    if (currentStatus === 'connected' || currentStatus === 'connecting') {
      await disconnect();
    }
    
    connectionInitiatedRef.current = false;
    setIsTestActive(false);
    console.log('🎤 [VoiceSettings] Test stopped');
  };

  const handleOpenOnboarding = () => {
    if (isTestActive) {
      return;
    }
    setIsOnboardingOpen(true);
  };

  const handleCloseOnboarding = () => {
    setIsOnboardingOpen(false);
  };

  const handleCompleteOnboarding = async () => {
    const started = await handleStartTest();
    if (started) {
      setIsOnboardingOpen(false);
    }
  };

  return (
    <>
    <div className="wizard-typography flex flex-1 flex-col">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-8 py-6">
        <h2 className="text-2xl font-bold">Voice Settings</h2>
        <p className="mt-2 text-muted">Configure the voice for your study.</p>
      </div>

      {/* Two-Column Layout */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Toggle Button - Border Notch - Positioned on parent container */}
        <button
          onClick={() => setIsLeftPanelMinimized(!isLeftPanelMinimized)}
          className={`absolute left-0 top-8 z-50 w-6 h-12 bg-white rounded-sm flex items-center justify-center shadow-sm hover:shadow-md transition-all duration-700 ${
            isLeftPanelMinimized ? 'rotate-180' : ''
          }`}
          style={{
            left: isLeftPanelMinimized ? '32px' : 'calc(40% - 24px)' // 32px = w-8, 40% = w-2/5 minus button width
          }}
          title={isLeftPanelMinimized ? 'Expand voice options' : 'Minimize voice options'}
        >
          <svg
            className="w-3 h-3 text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Left Column - Voice Options */}
        <div className={`${
          isLeftPanelMinimized ? 'w-8' : 'w-2/5'
        } transition-all duration-700 border-r border-gray-200 bg-gray-50 overflow-hidden relative`}>

          {/* Panel Content - Only show when not minimized */}
          {!isLeftPanelMinimized && (
            <div className="p-8 space-y-6">
              {voiceOptions.map((voice) => {
                const isSelected = voice.id === selectedVoiceId;
                const cardClasses = isDarkMode
                  ? isSelected
                    ? 'border border-slate-600 bg-slate-900 hover:bg-slate-800'
                    : 'border border-slate-800 bg-slate-950 hover:border-slate-600 hover:bg-slate-900'
                  : isSelected
                    ? 'border border-blue-500 bg-blue-50 shadow-sm'
                    : 'border border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm';

                const iconClasses = isDarkMode
                  ? isSelected
                    ? 'w-9 h-9 rounded-full flex items-center justify-center bg-blue-500'
                    : 'w-9 h-9 rounded-full flex items-center justify-center bg-slate-700'
                  : isSelected
                    ? 'w-9 h-9 rounded-full flex items-center justify-center bg-blue-600'
                    : 'w-9 h-9 rounded-full flex items-center justify-center bg-gray-300';

                const voiceNameClasses = isDarkMode
                  ? isSelected
                    ? 'text-base font-semibold text-blue-300'
                    : 'text-base font-semibold text-gray-100'
                  : isSelected
                    ? 'text-base font-semibold'
                    : 'text-base font-medium text-gray-900';

                const descriptionClasses = isDarkMode
                  ? isSelected
                    ? 'mt-2 text-sm text-blue-200'
                    : 'mt-2 text-sm text-gray-400'
                  : isSelected
                    ? 'mt-2 text-sm text-gray-800'
                    : 'mt-2 text-sm text-muted';

                const tagClasses = isDarkMode
                  ? isSelected
                    ? 'bg-blue-900/40 text-blue-200'
                    : 'bg-slate-800 text-gray-300'
                  : isSelected
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-muted';

                return (
                  <div
                    key={voice.name}
                    className={`rounded-lg p-5 transition-all ${cardClasses}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleVoiceSelect(voice.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        handleVoiceSelect(voice.id);
                      }
                    }}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <div className={iconClasses}>
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                          </svg>
                        </div>
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className={voiceNameClasses}>{voice.name}</h3>
                          {isSelected && (
                            <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center">
                              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          )}
                        </div>
                        
                        <p className={descriptionClasses}>{voice.description}</p>
                        
                        <div className="flex flex-wrap gap-2 mt-2">
                          {voice.tags.map((tag) => (
                            <span
                              key={tag}
                              className={`rounded-full px-2 py-0.5 text-xs ${tagClasses}`}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column - Interactive Demo */}
        <div className="flex-1 p-8 bg-white overflow-y-auto border-t border-r border-b border-gray-200 rounded-tl-none">
          <VoiceTestSection
            isActive={isTestActive}
            status={status}
            messages={messages}
            onStart={handleOpenOnboarding}
            onStop={handleStopTest}
            projectName={wizardData.projectName || 'Interview Study'}
            estimatedTime="10 mins"
            projectId={wizardData.projectName?.replace(/\s+/g, '-').toLowerCase() || 'test-project'}
            briefContent={wizardData.researchBrief || ''}
            interviewGuideContent={wizardData.interviewGuide || ''}
            estimatedDuration={15}
            selectedVoice={selectedVoice}
          />
        </div>
      </div>

      <InterviewOnboardingFlow
        isOpen={isOnboardingOpen}
        onClose={handleCloseOnboarding}
        onComplete={handleCompleteOnboarding}
        projectName={wizardData.projectName}
      />
    </div>

      {/* Simple Navigation */}
      <div className="mt-8 flex justify-end gap-4">
        <button
          onClick={() => gotoStepById?.('design')}
          className={`px-6 py-2 rounded-full font-medium transition-colors ${
            isDarkMode 
              ? 'bg-blue-900 text-blue-200 hover:bg-blue-800' 
              : 'bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-300'
          }`}
        >
          ← Back
        </button>
        <button
          onClick={() => gotoStepById?.('audience')}
          className={`px-6 py-2 rounded-full font-medium transition-colors ${
            isDarkMode 
              ? 'bg-blue-600 text-white hover:bg-blue-700' 
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          Next: Audience →
        </button>
      </div>
  </>
  );
}