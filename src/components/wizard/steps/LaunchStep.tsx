'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

interface LaunchStepProps {
  wizardData: any;
  onUpdateData: (data: any) => void;
  onNext: () => void;
  onPrev: () => void;
  canProceed: boolean;
  isLastStep: boolean;
  interviewId?: string;
  gotoStepById?: (stepId: string) => void;
}

export function LaunchStep({
  wizardData,
  onUpdateData,
  onNext,
  onPrev,
  canProceed,
  isLastStep,
  interviewId,
  gotoStepById
}: LaunchStepProps) {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const router = useRouter();
  const [isBriefExpanded, setIsBriefExpanded] = useState(false);

  const handleLaunch = async () => {
    if (!interviewId) {
      alert('Interview ID is missing. Please try again.');
      return;
    }

    try {
      const response = await fetch(`/api/interviews/${interviewId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'active'
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to launch interview');
      }

      // Update wizard data to reflect the launched status
      onUpdateData({
        status: 'active',
        launchedAt: new Date().toISOString()
      });

      // Navigate to projects page to show the launched interview
      router.push('/projects');

    } catch (error) {
      console.error('Error launching interview:', error);
      alert('Failed to launch interview. Please try again.');
    }
  };

  // Extract data from wizardData with fallbacks
  const projectName = wizardData.projectName || 'Untitled Project';
  const projectDescription = wizardData.projectDescription || '';
  const researchBrief = wizardData.researchBrief || '';
  const selectedVoice = wizardData.voiceSettings?.selectedVoice;
  const recruitmentMethod = wizardData.participants?.recruitmentMethod || 'public-link';

  return (
    <div className="wizard-typography min-h-screen" style={{ backgroundColor: 'var(--page-bg)' }}>
      {/* Header */}
      <div className="px-8 py-12">
        <h1 className="mb-2 text-4xl font-bold">Ready to Launch</h1>
        <p className="text-lg text-muted">Your study is configured and ready to go live</p>
      </div>

      {/* Information Cards */}
      <div className="px-8 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Project Brief Card */}
          <div className="rounded-lg p-6 shadow-sm" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
            <h3 className="mb-4 text-lg font-semibold">Project Brief</h3>
            <div className={`prose prose-sm max-w-none ${!isBriefExpanded ? 'max-h-32 overflow-hidden' : ''}`}>
              <h2 className="mb-2 text-xl font-bold">{projectName}</h2>
              {researchBrief ? (
                <div dangerouslySetInnerHTML={{ __html: researchBrief.replace(/\n/g, '<br>') }} />
              ) : (
                <p>
                  <strong>Objective:</strong> {projectDescription || 'No description provided'}
                </p>
              )}
            </div>
            {!isBriefExpanded && (
              <div className="mt-2">
                <button
                  onClick={() => setIsBriefExpanded(true)}
                  className="text-sm font-medium transition-colors"
                  style={{ color: '#3b82f6' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#2563eb';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#3b82f6';
                  }}
                >
                  Read more
                </button>
              </div>
            )}
            {isBriefExpanded && (
              <div className="mt-2">
                <button
                  onClick={() => setIsBriefExpanded(false)}
                  className="text-sm font-medium transition-colors"
                  style={{ color: '#3b82f6' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#2563eb';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#3b82f6';
                  }}
                >
                  Show less
                </button>
              </div>
            )}
          </div>

          {/* Voice & Conversation Card */}
          <div className="rounded-lg p-6 shadow-sm" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
            <div className="flex items-center mb-4">
              <svg className="mr-2 h-5 w-5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
              </svg>
              <h3 className="text-lg font-semibold">Voice & Conversation</h3>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted">AI Moderator Voice</p>
                <p className="font-medium">
                  {selectedVoice?.name || 'Ryan'} (Warm & Conversational)
                </p>
              </div>
              
            </div>
          </div>
        </div>

        {/* Audience Settings Card */}
        <div className="max-w-md rounded-lg p-6 shadow-sm" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          <div className="flex items-center mb-4">
            <svg className="mr-2 h-5 w-5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h3 className="text-lg font-semibold">Audience Settings</h3>
          </div>
          <div>
            <p className="text-sm text-muted">Recruitment Method</p>
            <p className="font-medium">
              {recruitmentMethod === 'public-link' ? 'Public Link' : 'Contact List'}
            </p>
          </div>
        </div>
      </div>


      {/* Simple Navigation */}
      <div className="mt-8 flex justify-end gap-4">
        <button
          onClick={() => gotoStepById?.('participant-experience')}
          className={`px-6 py-2 rounded-full font-medium transition-colors ${
            isDarkMode 
              ? 'bg-blue-900 text-blue-200 hover:bg-blue-800' 
              : 'bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-300'
          }`}
        >
          ← Back
        </button>
        <button
          onClick={handleLaunch}
          className={`px-6 py-2 rounded-full font-medium transition-colors ${
            isDarkMode 
              ? 'bg-blue-600 text-white hover:bg-blue-700' 
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          Launch Project
        </button>
      </div>
    </div>
  );
}
