'use client';

import { useMemo, useState } from 'react';
import {
  ChatBubbleLeftRightIcon,
  MicrophoneIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

interface InterviewOnboardingFlowProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => Promise<void> | void;
  projectName?: string;
}

const wizardSteps = [
  {
    id: 2,
    title: 'What to expect',
    description:
      'You will have a short, natural conversation with our AI moderator. Speak freely—the AI is trained to adapt to your responses.',
    Icon: ChatBubbleLeftRightIcon,
  },
  {
    id: 3,
    title: 'How it works',
    description:
      'Your microphone will activate after the countdown. The AI will guide you through the interview just like a real moderator.',
    Icon: MicrophoneIcon,
  },
  {
    id: 4,
    title: 'Tips for success',
    description:
      'Find a quiet space, speak clearly, and answer as honestly as you can. This helps us gather authentic insights.',
    Icon: SparklesIcon,
  },
];

export function InterviewOnboardingFlow({ isOpen, onClose, onComplete, projectName }: InterviewOnboardingFlowProps) {
  const [step, setStep] = useState(1);
  const [language, setLanguage] = useState('English');
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  const currentWizardIndex = useMemo(() => {
    if (step < 2) return 0;
    const index = step - 2;
    return Math.min(index, wizardSteps.length - 1);
  }, [step]);

  if (!isOpen) {
    return null;
  }

  const handleStart = () => {
    if (!consentAccepted) return;
    setStep(2);
  };

  const handleNext = async () => {
    if (step < 4) {
      setStep((prev) => prev + 1);
      return;
    }

    try {
      setIsCompleting(true);
      await onComplete();
      setIsCompleting(false);
      setStep(1);
      setConsentAccepted(false);
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
      setIsCompleting(false);
    }
  };

  const handlePrevious = () => {
    if (step <= 1) return;
    setStep((prev) => prev - 1);
  };

  const handleClose = () => {
    setStep(1);
    setConsentAccepted(false);
    setIsCompleting(false);
    onClose();
  };

  const wizardStep = wizardSteps[currentWizardIndex];
  const WizardIcon = wizardStep?.Icon;

  return (
    <div className="fixed inset-0 z-50 flex flex-col backdrop-blur-sm bg-white/10 transition-colors duration-500">
      <div className="flex flex-1 items-center justify-center px-4 py-6">
        <div className="relative w-full max-w-3xl surface-card rounded-2xl p-10 shadow-lg">
        {step === 1 ? (
          <div className="space-y-8">
            <div className="flex flex-col items-center text-center text-foreground">
              <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-lg font-semibold text-white">
                P
              </span>
              <h1 className="text-2xl font-bold">You've been invited to an interview</h1>
            </div>

            <div>
              <label htmlFor="language" className="text-sm font-medium text-muted">
                Select your preferred language
              </label>
              <div className="relative mt-2">
                <select
                  id="language"
                  value={language}
                  onChange={(event) => setLanguage(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-surface px-3 py-2 pr-10 text-sm text-foreground focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option>English</option>
                  <option>Spanish</option>
                  <option>French</option>
                  <option>German</option>
                </select>
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-muted">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="h-5 w-5"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.23 7.21a.75.75 0 011.06.02L10 10.585l3.71-3.354a.75.75 0 011.04 1.08l-4.23 3.827a.75.75 0 01-1.04 0l-4.23-3.827a.75.75 0 01.02-1.06z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
              </div>
            </div>

            <div className="space-y-4 text-sm text-muted">
              <h2 className="text-xl font-bold text-foreground">Welcome to {projectName || 'this'} study!</h2>
              <p>
                Thank you for taking the time to participate. In this short interview, you'll speak with our AI
                moderator who will guide you through a series of questions.
              </p>
              <p>
                Your honest feedback helps our team understand how people experience and engage with new
                advertising concepts. This should take around 8 minutes.
              </p>
            </div>

            <div className="flex items-start gap-3 rounded-lg border border-gray-200 dark:border-surface p-4 bg-gray-50 dark:bg-white/5">
              <input
                id="consent"
                type="checkbox"
                checked={consentAccepted}
                onChange={(event) => setConsentAccepted(event.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="consent" className="text-sm text-muted">
                By continuing, I accept the terms and conditions and privacy policy.
              </label>
            </div>

            <button
              type="button"
              onClick={handleStart}
              disabled={!consentAccepted}
              className={`w-full rounded-lg py-3 text-sm font-semibold text-white transition-colors ${
                consentAccepted
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'cursor-not-allowed bg-blue-200 text-white/70'
              }`}
            >
              Start
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center text-foreground">
            <div className="mb-8 flex gap-2">
              {wizardSteps.map((stepData, index) => (
                <span
                  key={stepData.id}
                  className={`h-2 w-2 rounded-full ${index === currentWizardIndex ? 'bg-blue-600' : 'bg-gray-300'}`}
                />
              ))}
            </div>

            {WizardIcon && <WizardIcon className="h-16 w-16 text-blue-600 dark:text-blue-400" />}
            <h2 className="mt-6 text-xl font-bold">{wizardStep.title}</h2>
            <p className="mt-2 max-w-xl text-sm text-muted">{wizardStep.description}</p>

            <div className="mt-10 flex w-full items-center justify-between">
              {step > 2 ? (
                <button type="button" onClick={handlePrevious} className="flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    className="h-4 w-4"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                  </svg>
                  Previous
                </button>
              ) : (
                <span />
              )}

              <button
                type="button"
                onClick={handleNext}
                disabled={isCompleting}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-blue-500 dark:hover:bg-blue-400"
              >
                {isCompleting ? 'Starting...' : 'Next'}
                {!isCompleting && (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    className="h-4 w-4"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={handleClose}
          className="absolute right-6 top-6 text-muted transition-colors hover:text-foreground"
        >
          <span className="sr-only">Close</span>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        </div>
      </div>

      <p className="pb-6 text-center text-sm text-muted">Powered by Pluve</p>

      <button
        type="button"
        className="fixed bottom-6 left-6 rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-white shadow-lg dark:bg-gray-700"
      >
        Manage cookies or opt out
      </button>
    </div>
  );
}
