'use client';

import { useEffect, useMemo, useState, ReactNode } from 'react';
import ContactListModal from '../ContactListModal';
import { PublicLinkModal } from '../PublicLinkModal';
import { useTheme } from '@/contexts/ThemeContext';

interface RecruitParticipantsStepProps {
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

export function RecruitParticipantsStep({
  wizardData,
  onUpdateData,
  onProvideRightContent,
  onNext,
  onPrev,
  gotoStepById,
}: RecruitParticipantsStepProps) {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const [showContactListModal, setShowContactListModal] = useState(false);
  const [showPublicLinkModal, setShowPublicLinkModal] = useState(false);
  const [publicLink, setPublicLink] = useState(() => wizardData.participants?.publicLink || '');
  const selectedMethod = wizardData.participants?.recruitmentMethod;

  useEffect(() => {
    if (selectedMethod === 'public-link') {
      setPublicLink(wizardData.participants?.publicLink || '');
    }
  }, [selectedMethod, wizardData.participants?.publicLink]);

  const handleRecruitmentMethodSelect = (method: 'contact-list' | 'public-link') => {
    if (method === 'contact-list') {
      setShowContactListModal(true);
      return;
    }

    setShowContactListModal(false);
    setShowPublicLinkModal(true);
    onUpdateData({
      participants: {
        ...(wizardData.participants ?? {}),
        recruitmentMethod: 'public-link',
        publicLink: wizardData.participants?.publicLink || ''
      }
    });
  };

  const handleContactListClose = () => {
    setShowContactListModal(false);
  };

  const handleContactListBack = () => {
    setShowContactListModal(false);
  };

  const handleContactListNext = (participants: string[]) => {
    onUpdateData({
      participants: {
        recruitmentMethod: 'contact-list',
        contactList: participants
      }
    });
    setShowContactListModal(false);
  };

  const handlePublicLinkModalClose = () => {
    setShowPublicLinkModal(false);
  };

  const handlePublicLinkGenerated = (link: string) => {
    setPublicLink(link);
    onUpdateData({
      participants: {
        ...(wizardData.participants ?? {}),
        recruitmentMethod: 'public-link',
        publicLink: link
      }
    });
  };

  const rightColumnContent = useMemo(() => (
    <div className="wizard-typography space-y-4">
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold">Recruiting tips</h3>
        <ul className="mt-3 space-y-2 text-sm text-muted">
          <li className="flex items-start gap-2">
            <span className="mt-2 inline-flex h-1.5 w-1.5 rounded-full bg-blue-500" />
            <span>Segment your contact list by persona before uploading to keep outreach targeted.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-2 inline-flex h-1.5 w-1.5 rounded-full bg-blue-500" />
            <span>Use the public link for fast social shares or to invite existing panels.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-2 inline-flex h-1.5 w-1.5 rounded-full bg-blue-500" />
            <span>Switch methods at any time—your choice here simply saves progress.</span>
          </li>
        </ul>
      </div>
      {selectedMethod === 'public-link' && publicLink ? (
        <div className={`rounded-xl border p-4 text-sm ${
          isDarkMode 
            ? 'border-blue-800 bg-blue-950/50 text-blue-200' 
            : 'border-blue-200 bg-blue-50 text-blue-700'
        }`}>
          <p className="font-semibold">Your public link</p>
          <p className={`mt-2 break-all font-mono text-xs ${isDarkMode ? 'text-blue-300' : ''}`}>{publicLink}</p>
          <p className={`mt-3 text-xs ${isDarkMode ? 'text-blue-300/80' : 'text-blue-600/80'}`}>Share this URL to let participants self-register.</p>
        </div>
      ) : null}
    </div>
  ), [publicLink, selectedMethod, isDarkMode]);

  useEffect(() => {
    if (onProvideRightContent) {
      onProvideRightContent(rightColumnContent);
      return () => onProvideRightContent(null);
    }
  }, [rightColumnContent, onProvideRightContent]);

  const renderChoiceCard = (
    method: 'contact-list' | 'public-link',
    title: string,
    description: string,
    icon: ReactNode,
  ) => {
    const isSelected = selectedMethod === method;

    return (
      <button
        type="button"
        onClick={() => handleRecruitmentMethodSelect(method)}
        className={`group relative flex h-full w-full flex-col gap-4 rounded-xl border bg-white px-6 py-6 text-left shadow-sm transition-all duration-200 ${
          isSelected
            ? 'border-blue-600 shadow-md ring-2 ring-blue-100'
            : 'border-gray-200 hover:-translate-y-1 hover:border-blue-400 hover:shadow-md'
        }`}
        aria-pressed={isSelected}
      >
        <span
          className={`inline-flex h-12 w-12 items-center justify-center rounded-xl text-lg font-semibold transition-colors ${
            isSelected
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-muted group-hover:bg-blue-50 group-hover:text-blue-600'
          }`}
        >
          {icon}
        </span>
        <div>
            <h3 className="text-lg font-semibold">{title}</h3>
            <p className="mt-1 text-sm text-muted">{description}</p>
        </div>
        <span
          className={`text-xs font-semibold uppercase tracking-wide ${
            isSelected ? 'text-blue-600' : 'text-muted opacity-60'
          }`}
        >
          {isSelected ? 'Selected' : 'Tap to choose'}
        </span>
      </button>
    );
  };

  return (
    <div className="wizard-typography">
      <div className="space-y-6">
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold">Define your audience</h1>
          <p className="mt-2 text-sm text-muted">
            Decide how Pluve should recruit participants for this study.
          </p>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2">
            {renderChoiceCard(
              'contact-list',
              'Contact list',
              'Upload emails or import from CRM to send polished invitations.',
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            )}
            {renderChoiceCard(
              'public-link',
              'Public link',
              'Generate a shareable link so participants can self-register instantly.',
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>
        </section>

        {selectedMethod === 'contact-list' && (
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">What happens next?</h2>
            <p className="mt-2 text-sm text-muted">
              Upload a CSV of contacts or add them manually. We'll send branded invites and track responses automatically.
            </p>
          </section>
        )}

        {selectedMethod === 'public-link' && !publicLink && (
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Generate your link</h2>
            <p className="mt-2 text-sm text-muted">
              We'll create a link that captures sign-ups and routes responses back into this study.
            </p>
            <button
              onClick={() => setShowPublicLinkModal(true)}
              className={`mt-4 px-6 py-2 rounded-full font-medium transition-colors ${
                isDarkMode 
                  ? 'bg-blue-900 text-blue-200 hover:bg-blue-800 border border-blue-700' 
                  : 'bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-300'
              }`}
            >
              Generate public link
            </button>
          </section>
        )}

        {selectedMethod === 'public-link' && publicLink && (
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Your public link is live</h2>
            <p className="mt-2 text-sm text-muted">Share it in newsletters, communities, or with panel partners.</p>
            <div className={`mt-4 rounded-lg border p-4 font-mono text-xs ${
              isDarkMode 
                ? 'border-blue-800 bg-blue-950/50 text-blue-300' 
                : 'border-blue-200 bg-blue-50 text-blue-700'
            }`}>
              {publicLink}
            </div>
          </section>
        )}
      </div>

      {/* Simple Navigation */}
      <div className="mt-8 flex justify-end gap-4">
        <button
          onClick={() => gotoStepById?.('ai-moderator')}
          className={`px-6 py-2 rounded-full font-medium transition-colors ${
            isDarkMode 
              ? 'bg-blue-900 text-blue-200 hover:bg-blue-800' 
              : 'bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-300'
          }`}
        >
          ← Back
        </button>
        <button
          onClick={() => gotoStepById?.('participant-experience')}
          className={`px-6 py-2 rounded-full font-medium transition-colors ${
            isDarkMode 
              ? 'bg-blue-600 text-white hover:bg-blue-700' 
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          Next: Participant Experience →
        </button>
      </div>

      <ContactListModal
        isOpen={showContactListModal}
        onClose={handleContactListClose}
        onBack={handleContactListBack}
        onNext={handleContactListNext}
        initialParticipants={wizardData.participants?.contactList || []}
      />

      <PublicLinkModal
        isOpen={showPublicLinkModal}
        onClose={handlePublicLinkModalClose}
        wizardData={wizardData}
        onGenerate={handlePublicLinkGenerated}
        initialLink={publicLink}
      />
    </div>
  );
}
