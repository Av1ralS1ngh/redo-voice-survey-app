'use client';

import { useState, useEffect } from 'react';
import SimpleOrb from '@/components/SimpleOrb';
import AIDemoOrchestrator from '@/components/ai-demo/AIDemoOrchestrator';
import { useTheme } from '@/contexts/ThemeContext';

interface VoiceTestSectionProps {
  isActive: boolean;
  status: any;
  messages: any[];
  onStart: () => void;
  onStop: () => Promise<void>;
  projectName?: string;
  estimatedTime?: string;
  // AI Demo props
  projectId?: string;
  briefContent?: string;
  interviewGuideContent?: string;
  estimatedDuration?: number;
  selectedVoice?: any;
}

export function VoiceTestSection({
  isActive,
  status,
  messages,
  onStart,
  onStop,
  projectName = 'Interview Study',
  estimatedTime = '10 mins',
  projectId = '',
  briefContent = '',
  interviewGuideContent = '',
  estimatedDuration = 15,
  selectedVoice,
}: VoiceTestSectionProps) {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const [transcript, setTranscript] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [orbState, setOrbState] = useState<'idle' | 'listening' | 'speaking' | 'connecting'>('idle');
  const [isStarting, setIsStarting] = useState(false);
  const [activeMode, setActiveMode] = useState<'interactive' | 'ai-demo'>('interactive');
  
  // Persist AI Demo results across mode switches
  const [aiDemoResults, setAiDemoResults] = useState<any>(null);
  const [aiDemoEvaluation, setAiDemoEvaluation] = useState<any>(null);


  // Update orb state based on connection status
  useEffect(() => {
    const currentStatus = typeof status === 'object' ? status?.value : status;
    
    if (currentStatus === 'connecting') {
      setOrbState('connecting');
    } else if (currentStatus === 'connected') {
      setOrbState('idle');
    }
  }, [status]);

  // Process messages for transcript
  useEffect(() => {
    if (!messages || messages.length === 0) return;

    const newTranscript: Array<{ role: 'user' | 'assistant'; content: string }> = [];

    messages.forEach((message: any) => {
      if (message.type === 'user_message') {
        const content = message.message?.content || '';
        if (content) {
          newTranscript.push({ role: 'user', content });
        }
      } else if (message.type === 'assistant_message') {
        const content = message.message?.content || '';
        if (content) {
          newTranscript.push({ role: 'assistant', content });
        }
      }
    });

    setTranscript(newTranscript);
  }, [messages]);

  // Update orb state based on latest message
  useEffect(() => {
    if (messages && messages.length > 0) {
      const latestMessage = messages[messages.length - 1] as any;
      
      if (latestMessage.type === 'user_message') {
        setOrbState('listening');
      } else if (latestMessage.type === 'assistant_message') {
        setOrbState('speaking');
      } else if (latestMessage.type === 'user_interruption') {
        setOrbState('listening');
      }
    }
  }, [messages]);

  const handleStart = () => {
    onStart();
  };

  const handleStop = async () => {
    await onStop();
    setTranscript([]);
  };

  const currentStatus = typeof status === 'object' ? status?.value : status;

  return (
    <div className="wizard-typography overflow-hidden rounded-xl border-2 border-gray-200 bg-white shadow-lg">
      {/* Demo Preview Header - Black/Grey theme */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 px-6 py-5 text-white">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center backdrop-blur-sm border border-white/20">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">{projectName}</h3>
          </div>
        </div>
      </div>

      {/* Toggle Buttons */}
      <div className="px-6 py-4 bg-white border-b border-gray-200">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveMode('interactive')}
            className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeMode === 'interactive'
                ? 'bg-white border border-gray-300'
                : 'bg-gray-50 border border-gray-200 text-muted hover:bg-gray-100'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Launch interactive demo
          </button>
          <button
            onClick={() => setActiveMode('ai-demo')}
            disabled={!briefContent || !interviewGuideContent}
            className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              activeMode === 'ai-demo'
                ? 'bg-white border border-gray-300'
                : 'bg-gray-50 border border-gray-200 text-muted hover:bg-gray-100'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Generate AI demo
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-8 bg-gray-50">
        {activeMode === 'ai-demo' ? (
          // AI Demo Mode - Show AI Demo Orchestrator
          <div className="bg-white rounded-lg border border-gray-200 p-8">
            <div className="text-center max-w-2xl mx-auto">
              <div className="mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-purple-100 to-indigo-100 mb-4">
                  <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <h4 className="mb-3 text-lg font-bold">AI Demo Simulations</h4>
                <p className="mb-6 text-muted">
                  Test your interview guide with 3 AI personas — simulate, refine, and get instant feedback on clarity, coverage, and issues before going live.
                </p>
              </div>

              <AIDemoOrchestrator
                projectId={projectId}
                briefContent={briefContent}
                interviewGuideContent={interviewGuideContent}
                estimatedDuration={estimatedDuration}
                persistedResults={aiDemoResults}
                persistedEvaluation={aiDemoEvaluation}
                onResultsChange={setAiDemoResults}
                onEvaluationChange={setAiDemoEvaluation}
              />

             
            </div>
          </div>
        ) : !isActive ? (
          // Not Active - Show Ready to Test State
          <div className="bg-white rounded-lg border border-gray-200 p-8">
            <div className="text-center">
            <div className="mb-6">
                <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                  <svg className="h-6 w-6 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
                <h4 className="mb-2 text-lg font-semibold">Ready to Test</h4>
                
            </div>
              
              {/* Voice Display */}
              <div className="mb-6 text-center">
                <label className="mb-2 block text-sm font-medium text-muted">
                  Selected AI interviewer:
                </label>
                <div className="text-lg font-bold text-gray-900">
                  {selectedVoice?.name || 'No voice selected'}
                </div>
                <p className="mt-2 flex items-center justify-center gap-1 text-xs text-muted">
                  <svg className="h-4 w-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  The interview will be done verbally, using a microphone.
                </p>
              </div>
            
            <button
              onClick={handleStart}
              disabled={isStarting}
                className="inline-flex items-center px-6 py-3 bg-gray-900 text-white text-base font-semibold rounded-lg hover:bg-black transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isStarting ? (
                <>
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Starting...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Start Test Interview
                </>
              )}
            </button>

              {/* Footer Info */}
              <div className="mt-8 max-w-lg space-y-3 border-t border-gray-200 pt-6 text-left">
                <p className="flex items-start gap-2 text-sm text-muted">
                  <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span>All collected data is confidential, following GDPR and CCPA regulations.</span>
                </p>
              </div>
            </div>
          </div>
        ) : (
          // Active - Show Orb and Transcript
          <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
            {/* Status and Stop Button */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className={`h-3 w-3 rounded-full ${
                  currentStatus === 'connected' ? 'bg-green-500 animate-pulse' : 
                  currentStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' : 
                  'bg-gray-300'
                }`} />
                <span className="text-sm font-semibold">
                  {currentStatus === 'connected' ? 'Connected - Speak now' : 
                   currentStatus === 'connecting' ? 'Connecting...' : 
                   'Disconnected'}
                </span>
              </div>
              <button
                onClick={handleStop}
                className="px-5 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition-colors shadow-sm"
              >
                Stop Test
              </button>
            </div>

            {/* Voice Orb */}
            <div className="flex justify-center py-12 bg-gradient-to-b from-gray-50 to-white rounded-lg">
              <SimpleOrb state={orbState} />
            </div>

            {/* Transcript */}
            {transcript.length > 0 && (
              <div className="max-h-72 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-5">
                <h4 className="mb-4 flex items-center gap-2 text-sm font-semibold">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                  Conversation
                </h4>
                <div className="space-y-3">
                  {transcript.map((entry, index) => (
                    <div key={index} className="text-sm">
                      <span className={`font-semibold ${
                        entry.role === 'user' ? 'text-muted' : ''
                      }`}>
                        {entry.role === 'user' ? 'You: ' : 'AI: '}
                      </span>
                      <span>{entry.content}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Instructions */}
            {transcript.length === 0 && currentStatus === 'connected' && (
              <div className={`rounded-lg border p-5 text-center text-sm ${
                isDarkMode 
                  ? 'border-blue-800 bg-blue-950/50 text-blue-200' 
                  : 'border-blue-200 bg-blue-50 text-muted'
              }`}>
                <p className={`mb-2 font-semibold ${
                  isDarkMode ? 'text-blue-300' : 'text-blue-900'
                }`}>💡 This is a test of your actual interview</p>
                <p>Speak naturally as if you were a participant. The AI will respond using your research brief.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

