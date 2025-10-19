'use client';

import { useState, useEffect, useCallback, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { VoiceProvider } from '@humeai/voice-react';
import {
  PencilSquareIcon,
  UsersIcon,
  SparklesIcon,
  PlayCircleIcon,
  RocketLaunchIcon,
} from '@heroicons/react/24/outline';
import { ProjectBriefStep } from '@/components/wizard/steps/ProjectBriefStep';
import { VoiceSettingsStep } from '@/components/wizard/steps/VoiceSettingsStep';
import { RecruitParticipantsStep } from '@/components/wizard/steps/RecruitParticipantsStep';
import { ParticipantExperienceStep } from '@/components/wizard/steps/ParticipantExperienceStep';
import { LaunchStep } from '@/components/wizard/steps/LaunchStep';
import { LogoutButton } from '@/components/LogoutButton';
import { SetupLayout } from '@/components/wizard/SetupLayout';

interface WizardData {
  projectName: string;
  projectDescription: string;
  researchBrief: string;
  interviewGuide?: string; // Stakeholder-ready interview guide (markdown)
  humeSystemPrompt?: string; // Generated Hume AI prompt
  chatHistory: Array<{ role: 'user' | 'assistant'; content: string; timestamp: string }>;
  voiceSettings: any;
  participants: any;
  experience: any;
  interviewType?: string; // e.g., 'product_feedback', 'custom', 'nps', 'usability_testing'
  currentView?: 'brief' | 'guide'; // Current view in ProjectBriefStep
  projectId?: string;
  briefMetadata?: any;
}

export default function InterviewWizardPage({ params }: { params: Promise<{ interviewId: string }> }) {
  const [interviewId, setInterviewId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [wizardData, setWizardData] = useState<WizardData>({
    projectName: '',
    projectDescription: '',
    researchBrief: '',
    chatHistory: [],
    voiceSettings: {},
    participants: {},
    experience: {},
    projectId: undefined,
    briefMetadata: undefined,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const [rightColumnContent, setRightColumnContent] = useState<ReactNode | null>(null);

  const steps = [
    { id: 'design', label: 'Design', component: ProjectBriefStep, section: 'setup', icon: PencilSquareIcon },
    { id: 'ai-moderator', label: 'AI Moderator', component: VoiceSettingsStep, section: 'setup', icon: SparklesIcon },
    { id: 'audience', label: 'Audience', component: RecruitParticipantsStep, section: 'setup', icon: UsersIcon },
    { id: 'participant-experience', label: 'Participant Experience', component: ParticipantExperienceStep, section: 'test', icon: PlayCircleIcon },
    { id: 'launch', label: 'Launch', component: LaunchStep, section: 'test', icon: RocketLaunchIcon },
  ] as const;

  useEffect(() => {
    async function getInterviewId() {
      const resolvedParams = await params;
      setInterviewId(resolvedParams.interviewId);
    }
    getInterviewId();
  }, [params]);

  useEffect(() => {
    if (interviewId) {
      loadInterviewData();
    }
  }, [interviewId]);

  const loadInterviewData = async () => {
    if (!interviewId) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/interviews/${interviewId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('Interview not found');
        } else {
          throw new Error('Failed to load interview');
        }
        return;
      }
      
      const data = await response.json();

      const savedWorkflowState = data.interview.workflow_state?.inputData;
      const restoredState: Partial<WizardData> =
        savedWorkflowState && typeof savedWorkflowState === 'object'
          ? { ...savedWorkflowState }
          : {};

      let researchBriefContent =
        typeof restoredState.researchBrief === 'string' && restoredState.researchBrief.trim().length > 0
          ? restoredState.researchBrief
          : data.interview.researchBrief || '';

      let briefMetadata =
        restoredState.briefMetadata !== undefined
          ? restoredState.briefMetadata
          : data.interview.briefMetadata || undefined;

      if (data.interview.projectId) {
        try {
          const query = new URLSearchParams({ projectId: data.interview.projectId });
          if (interviewId) {
            query.set('interviewId', interviewId);
          }
          query.set('limit', '1');

          const researchBriefResponse = await fetch(`/api/research-briefs?${query.toString()}`);
          if (researchBriefResponse.ok) {
            const researchBriefData = await researchBriefResponse.json();
            const latestBrief = researchBriefData.latest;

            if (latestBrief?.content) {
              researchBriefContent = latestBrief.content;
            }

            if (latestBrief?.metadata) {
              briefMetadata = latestBrief.metadata;
            } else if (latestBrief?.version) {
              briefMetadata = {
                ...(briefMetadata || {}),
                version: latestBrief.version,
                saved_at: latestBrief.updated_at || latestBrief.created_at,
              };
            }
          } else {
            console.error('Failed to fetch research briefs:', await researchBriefResponse.text());
          }
        } catch (briefError) {
          console.error('Error loading research brief history:', briefError);
        }
      }

      setWizardData(prev => ({
        ...prev,
        projectName: data.interview.name || '',
        projectDescription: data.interview.description || '',
        interviewType: data.interview.category || 'custom',
        // Restore saved wizard state (includes researchBrief, interviewGuide, chatHistory, currentView, etc.)
        ...(savedWorkflowState || {}),
        projectId: data.interview.projectId || savedWorkflowState?.projectId || prev.projectId,
        // Also restore from direct database columns if not in workflow_state
        researchBrief: savedWorkflowState?.researchBrief || data.interview.research_brief || prev.researchBrief,
        interviewGuide: savedWorkflowState?.interviewGuide || data.interview.interview_guide || prev.interviewGuide,
        humeSystemPrompt: savedWorkflowState?.humeSystemPrompt || data.interview.hume_system_prompt || prev.humeSystemPrompt,
      }));
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load interview');
    } finally {
      setLoading(false);
    }
  };

  const updateWizardData = useCallback((stepData: Partial<WizardData>) => {
    setWizardData(prev => ({ ...prev, ...stepData }));
  }, []);

  // Auto-save wizard data to database
  const saveWizardData = useCallback(async () => {
    if (!interviewId) return;

    try {
      // Helper function to sanitize data for JSON serialization
      const sanitizeForJSON = (obj: any): any => {
        if (obj === null || obj === undefined) return obj;
        if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') return obj;
        if (Array.isArray(obj)) return obj.map(sanitizeForJSON);
        if (typeof obj === 'object') {
          const sanitized: any = {};
          for (const [key, value] of Object.entries(obj)) {
            try {
              // Skip functions, symbols, and other non-serializable types
              if (typeof value === 'function' || typeof value === 'symbol') continue;
              // Skip DOM elements and other complex objects
              if (value && typeof value === 'object' && value.constructor) {
                const constructorName = value.constructor.name;
                if (['HTMLElement', 'Node', 'Event', 'EventTarget', 'CSSStyleDeclaration'].includes(constructorName)) continue;
              }
              sanitized[key] = sanitizeForJSON(value);
            } catch (error) {
              console.warn(`Skipping property ${key} during sanitization:`, error);
            }
          }
          return sanitized;
        }
        return null; // For any other type, return null
      };

      // Create a clean, serializable copy of wizard data
      const serializableWizardData = sanitizeForJSON({
        projectName: wizardData.projectName,
        projectDescription: wizardData.projectDescription,
        researchBrief: wizardData.researchBrief,
        interviewGuide: wizardData.interviewGuide,
        humeSystemPrompt: wizardData.humeSystemPrompt,
        chatHistory: wizardData.chatHistory,
        voiceSettings: wizardData.voiceSettings,
        participants: wizardData.participants,
        experience: wizardData.experience,
        interviewType: wizardData.interviewType,
        currentView: wizardData.currentView,
        briefMetadata: wizardData.briefMetadata,
        projectId: wizardData.projectId,
      });
      
      // Prepare data for database
      const updateData: any = {
        workflow_state: {
          currentStep: steps[currentStep].id,
          completedSteps: steps.slice(0, currentStep).map(s => s.id),
          inputData: serializableWizardData,
        },
      };

      const trimmedProjectName = wizardData.projectName?.trim();
      const trimmedProjectDescription = wizardData.projectDescription?.trim();

      if (trimmedProjectName !== undefined) {
        updateData.name = trimmedProjectName?.length ? trimmedProjectName : null;
      }

      if (trimmedProjectDescription !== undefined) {
        updateData.description = trimmedProjectDescription?.length ? trimmedProjectDescription : null;
      }

      // Save AI-generated artifacts if they exist
      if (wizardData.researchBrief) {
        updateData.research_brief = wizardData.researchBrief;
      }
      if (wizardData.interviewGuide) {
        updateData.interview_guide = wizardData.interviewGuide;
      }
      if (wizardData.humeSystemPrompt) {
        updateData.hume_system_prompt = wizardData.humeSystemPrompt;
      }

      // Validate that data is serializable before sending
      let requestBody: string;
      try {
        requestBody = JSON.stringify(updateData);
      } catch (stringifyError) {
        console.error('❌ Failed to stringify wizard data after sanitization:', stringifyError);
        console.error('   This should not happen with sanitized data. Update data keys:', Object.keys(updateData));
        return; // Don't attempt to save if data is still not serializable
      }

      let response;
      try {
        response = await fetch(`/api/interviews/${interviewId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: requestBody,
        });
      } catch (fetchError) {
        console.error('❌ Network error during auto-save:', fetchError);
        console.error('   This usually means the API server is not responding');
        return;
      }

      if (!response.ok) {
        let errorText;
        try {
          errorText = await response.text();
        } catch (e) {
          errorText = 'Could not read error response';
        }
        console.error('❌ Auto-save failed:', response.status, errorText);
        return;
      }

      console.log('✅ Wizard data auto-saved');
    } catch (error) {
      console.error('❌ Unexpected error in auto-save:', error);
    }
  }, [interviewId, currentStep, steps, wizardData]);

  // Auto-save when wizard data changes (debounced)
  useEffect(() => {
    // Don't auto-save during initial load or if interview hasn't loaded yet
    if (loading || !interviewId) {
      return;
    }

    const timeoutId = setTimeout(() => {
      saveWizardData();
    }, 2000); // Save 2 seconds after last change

    return () => clearTimeout(timeoutId);
  }, [wizardData, saveWizardData, loading, interviewId]);

  const canProceedToStep = (stepIndex: number): boolean => {
    switch (stepIndex) {
      case 0: // Design
        return true;
      case 1: // Audience
        return true;
      case 2: // AI Moderator
        return true;
      case 3: // Participant Experience
        return true;
      case 4: // Launch
        return true;
      default:
        return false;
    }
  };

  const handleNextStep = () => {
    if (currentStep < steps.length - 1 && canProceedToStep(currentStep + 1)) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const navigationSections = [
    {
      title: 'SETUP',
      items: steps
        .filter(step => step.section === 'setup')
        .map(step => ({ id: step.id, label: step.label, icon: step.icon })),
    },
    {
      title: 'TEST',
      items: steps
        .filter(step => step.section === 'test')
        .map(step => ({ id: step.id, label: step.label, icon: step.icon })),
    },
  ];

  const activeStep = steps[currentStep];
  const studyTitle = wizardData.projectName?.trim() ? wizardData.projectName : 'Untitled study';

  useEffect(() => {
    setRightColumnContent(null);
  }, [activeStep.id]);

  const breadcrumbs = [
    { label: 'Home', href: '/projects' },
    { label: activeStep.label },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-800">Loading interview wizard...</p>
        </div>
      </div>
    );
  }

  if (error || !interviewId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-red-600 text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Interview Not Found</h1>
          <p className="text-slate-800 mb-6">{error}</p>
          <button
            onClick={() => router.push('/interviews')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Interviews
          </button>
        </div>
      </div>
    );
  }

  const gotoStepById = (stepId: string) => {
    const targetIndex = steps.findIndex(step => step.id === stepId);
    if (targetIndex === -1) return;

    if (targetIndex <= currentStep || canProceedToStep(targetIndex)) {
      setCurrentStep(targetIndex);
    }
  };

  const renderCurrentStep = () => {
    switch (activeStep.id) {
      case 'design':
        return (
          <ProjectBriefStep
            wizardData={wizardData}
            onUpdateData={updateWizardData}
            onNext={handleNextStep}
            onPrev={handlePrevStep}
            canProceed={canProceedToStep(currentStep + 1)}
            isLastStep={currentStep === steps.length - 1}
            interviewId={interviewId ?? undefined}
            onProvideRightContent={setRightColumnContent}
            gotoStepById={gotoStepById}
          />
        );
      case 'audience':
        return (
          <RecruitParticipantsStep
            wizardData={wizardData}
            onUpdateData={updateWizardData}
            onNext={handleNextStep}
            onPrev={handlePrevStep}
            canProceed={canProceedToStep(currentStep + 1)}
            isLastStep={currentStep === steps.length - 1}
            interviewId={interviewId ?? undefined}
            onProvideRightContent={setRightColumnContent}
            gotoStepById={gotoStepById}
          />
        );
      case 'ai-moderator':
        return (
          <VoiceSettingsStep
            wizardData={wizardData}
            onUpdateData={updateWizardData}
            onNext={handleNextStep}
            onPrev={handlePrevStep}
            canProceed={canProceedToStep(currentStep + 1)}
            isLastStep={currentStep === steps.length - 1}
            interviewId={interviewId ?? undefined}
            gotoStepById={gotoStepById}
          />
        );
      case 'participant-experience':
        return (
          <ParticipantExperienceStep
            wizardData={wizardData}
            onUpdateData={updateWizardData}
            onNext={handleNextStep}
            onPrev={handlePrevStep}
            canProceed={canProceedToStep(currentStep + 1)}
            isLastStep={currentStep === steps.length - 1}
            interviewId={interviewId ?? undefined}
            gotoStepById={gotoStepById}
          />
        );
      case 'launch':
        return (
          <LaunchStep
            wizardData={wizardData}
            onUpdateData={updateWizardData}
            onNext={handleNextStep}
            onPrev={handlePrevStep}
            canProceed={canProceedToStep(currentStep + 1)}
            isLastStep={currentStep === steps.length - 1}
            interviewId={interviewId ?? undefined}
            gotoStepById={gotoStepById}
          />
        );
      default:
        return null;
    }
  };

  return (
    <VoiceProvider
      onError={(error) => {
        console.error('Hume Voice Error (wizard):', error);
      }}
    >
      <SetupLayout
        studyTitle={studyTitle}
        breadcrumbs={breadcrumbs}
        navSections={navigationSections}
        activeNavId={activeStep.id}
        onSelectNav={gotoStepById}
        rightColumn={rightColumnContent}
        headerAction={<LogoutButton variant="primary" label="Log out" />}
      >
        {renderCurrentStep()}
      </SetupLayout>
    </VoiceProvider>
  );
}
