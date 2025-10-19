'use client';

import { useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

interface ParticipantExperienceStepProps {
  wizardData: any;
  onUpdateData: (data: any) => void;
  onNext: () => void;
  onPrev: () => void;
  canProceed: boolean;
  isLastStep: boolean;
  interviewId?: string;
  gotoStepById?: (stepId: string) => void;
}

export function ParticipantExperienceStep({ 
  wizardData, 
  onUpdateData, 
  gotoStepById
}: ParticipantExperienceStepProps) {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const [invitationTitle, setInvitationTitle] = useState(
    wizardData?.invitationTitle || `Invite for: ${wizardData?.projectName || 'Untitled Project'}`
  );
  const [invitationDescription, setInvitationDescription] = useState(
    wizardData?.invitationDescription || ''
  );
  const publicLink = wizardData?.participants?.publicLink || '';
  const contactList = (wizardData?.participants?.contactList as string[] | undefined) || [];
  const hasGeneratedLink = Boolean(publicLink);
  const shouldShowLock = contactList.length === 0 || !hasGeneratedLink;
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');
  const [sendingInvites, setSendingInvites] = useState(false);
  const [sendFeedback, setSendFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const displayLink = hasGeneratedLink
    ? publicLink
    : 'Generate a public link in the Recruit Participants step to enable testing.';
  const canSendInvites = hasGeneratedLink && contactList.length > 0;

  const handleReset = () => {
    setInvitationTitle(`Invite for: ${wizardData?.projectName || 'Untitled Project'}`);
    setInvitationDescription('');
  };

  const handleSave = () => {
    onUpdateData?.({
      ...wizardData,
      invitationTitle,
      invitationDescription
    });
  };

  const handleCopy = async () => {
    if (!hasGeneratedLink || typeof navigator === 'undefined') return;

    try {
      await navigator.clipboard.writeText(publicLink);
      setCopyStatus('copied');
      setTimeout(() => setCopyStatus('idle'), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  const handleSendInvitations = async () => {
    if (!canSendInvites || sendingInvites) return;

    setSendingInvites(true);
    setSendFeedback(null);

    try {
      const response = await fetch('/api/recipients/send-invitations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          emails: contactList,
          link: publicLink,
          title: invitationTitle,
          description: invitationDescription
        })
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || data?.success === false) {
        const failed = Array.isArray(data?.failedRecipients) ? data.failedRecipients : [];
        const errorMessage =
          (typeof data?.error === 'string' && data.error) ||
          (typeof data?.message === 'string' && data.message) ||
          'Failed to send invitations.';

        throw new Error(
          failed.length
            ? `${errorMessage} (${failed.join(', ')})`
            : errorMessage
        );
      }

      const sentCount = typeof data?.sentCount === 'number' ? data.sentCount : contactList.length;
      setSendFeedback({
        type: 'success',
        message: `Invitations sent to ${sentCount} contact${sentCount === 1 ? '' : 's'}.`,
      });
    } catch (error) {
      console.error('Failed to send invitations:', error);
      setSendFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to send invitations.'
      });
    } finally {
      setSendingInvites(false);
    }
  };

  return (
    <div className="wizard-typography flex flex-1 flex-col">
      <div className="border-b px-8 py-6" style={{ backgroundColor: 'var(--card-bg)', borderBottom: '1px solid var(--card-border)' }}>
        <h2 className="text-2xl font-bold">Participant Experience</h2>
        <p className="mt-2 text-muted">Design the interview experience and flow for participants</p>
      </div>

      <div className="flex-1 p-8" style={{ backgroundColor: 'var(--card-bg)' }}>
        {shouldShowLock ? (
          <div className="flex h-full flex-col items-center justify-center space-y-6">
            <div className={`flex h-64 w-64 items-center justify-center rounded-full border ${
              isDarkMode 
                ? 'border-blue-800 bg-blue-950/50' 
                : 'border-blue-200 bg-blue-50'
            }`}>
              <svg
                className={`h-32 w-32 ${isDarkMode ? 'text-blue-400' : 'text-blue-500'}`}
                viewBox="0 0 48 48"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M16 21v-4a8 8 0 0116 0v4" />
                <rect x="12" y="21" width="24" height="20" rx="6" />
                <path d="M24 28v7" />
                <circle cx="24" cy="27" r="2.5" fill="currentColor" stroke="none" />
                <path d="M12 33c2.5 3 6.5 5 12 5s9.5-2 12-5" opacity={0.3} />
              </svg>
            </div>
            <p className="max-w-md text-center text-sm text-muted">
              Add participants in the previous step and generate a link to unlock the invitation customization controls.
            </p>
          </div>
        ) : (
          <div className="flex h-full flex-col gap-10">
            <section>
              <h3 className="mb-2 text-lg font-bold">Invitation Title and Description</h3>
              <p className="mb-6 text-sm text-muted">
                Customize the title and description that participants will see when invited to your interview.
              </p>

              <div className="mb-4">
                <label className="mb-2 block text-sm text-muted">Invitation Title</label>
                <input
                  type="text"
                  value={invitationTitle}
                  onChange={(e) => setInvitationTitle(e.target.value)}
                  placeholder="Enter invitation title..."
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                  style={{
                    backgroundColor: 'var(--card-bg)',
                    borderColor: 'var(--card-border)'
                  }}
                />
              </div>

              <div className="mb-4">
                <label className="mb-2 block text-sm text-muted">Invitation Description</label>
                <textarea
                  value={invitationDescription}
                  onChange={(e) => setInvitationDescription(e.target.value)}
                  placeholder="Enter invitation description..."
                  rows={4}
                  className="w-full resize-none rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                  style={{
                    backgroundColor: 'var(--card-bg)',
                    borderColor: 'var(--card-border)'
                  }}
                />
              </div>

              <div className="flex flex-wrap justify-end gap-3">
                <button
                  onClick={handleReset}
                  className="rounded-lg border px-4 py-2 text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: 'var(--card-bg)',
                    borderColor: 'var(--card-border)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--button-hover-bg)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--card-bg)';
                  }}
                >
                  Reset
                </button>
                <button
                  onClick={handleSave}
                  className="rounded-lg border px-4 py-2 text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: 'var(--background)',
                    borderColor: 'var(--card-border)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--button-hover-bg)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--background)';
                  }}
                >
                  Save Changes
                </button>
              </div>
            </section>

            <section>
              <h3 className="mb-2 text-lg font-bold">Test Participant Experience</h3>
              <p className="mb-4 text-sm text-muted">Use this link to test the participant experience before launching your interview.</p>
              <div className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center" style={{ backgroundColor: 'var(--background)', borderColor: 'var(--card-border)' }}>
                <span className="flex-1 font-mono text-xs sm:text-sm" style={{ opacity: hasGeneratedLink ? 1 : 0.6 }}>{displayLink}</span>
                <button
                  onClick={handleCopy}
                  disabled={!hasGeneratedLink}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                  style={{
                    backgroundColor: hasGeneratedLink ? 'var(--card-bg)' : 'var(--button-bg)',
                    borderColor: 'var(--card-border)',
                    color: hasGeneratedLink ? 'var(--foreground)' : 'var(--muted-foreground)'
                  }}
                  onMouseEnter={(e) => {
                    if (hasGeneratedLink) {
                      e.currentTarget.style.backgroundColor = 'var(--button-hover-bg)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = hasGeneratedLink ? 'var(--card-bg)' : 'var(--button-bg)';
                  }}
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy
                </button>
              </div>
              {copyStatus === 'copied' && (
                <p className="mt-2 text-xs" style={{ color: '#16a34a' }}>
                  Link copied to clipboard!
                </p>
              )}
            </section>

            <section>
              <h3 className="mb-2 text-lg font-bold">Invite Saved Contacts</h3>
              <p className="mb-4 text-sm text-muted">
                These contacts were added in the Recruit Participants step. We'll email them the same public link when you're ready.
              </p>

              {contactList.length === 0 ? (
                <div
                  className="rounded-lg border px-4 py-3 text-sm"
                  style={{
                    backgroundColor: 'var(--background)',
                    borderColor: 'var(--card-border)'
                  }}
                >
                  <span className="text-muted">No contacts have been added yet. Go back to the previous step to upload or select a contact list.</span>
                </div>
              ) : (
                <div
                  className="rounded-lg border p-4"
                  style={{ backgroundColor: 'var(--background)', borderColor: 'var(--card-border)' }}
                >
                  <ul className="space-y-2 text-sm">
                    {contactList.map((email: string) => (
                      <li
                        key={email}
                        className="flex items-center justify-between rounded-md px-3 py-2"
                        style={{ backgroundColor: 'var(--card-bg)' }}
                      >
                        <span>{email}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  onClick={handleSendInvitations}
                  disabled={!canSendInvites || sendingInvites}
                  className="rounded-full border px-6 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                  style={{
                    backgroundColor: canSendInvites ? '#3b82f6' : 'var(--button-bg)',
                    borderColor: 'var(--card-border)',
                    color: canSendInvites ? 'white' : 'var(--muted-foreground)'
                  }}
                  onMouseEnter={(e) => {
                    if (canSendInvites) {
                      e.currentTarget.style.backgroundColor = '#1d4ed8';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (canSendInvites) {
                      e.currentTarget.style.backgroundColor = '#3b82f6';
                    }
                  }}
                >
                  {sendingInvites ? 'Sending…' : `Email ${contactList.length} contact${contactList.length === 1 ? '' : 's'}`}
                </button>

                <div className="text-xs text-muted">
                  {hasGeneratedLink ? `Link to send: ${publicLink}` : 'Generate a public link to send invitations.'}
                </div>
              </div>

              {sendFeedback && (
                <p
                  className="mt-2 text-xs"
                  style={{
                    color: sendFeedback.type === 'success' ? '#16a34a' : '#dc2626'
                  }}
                >
                  {sendFeedback.message}
                </p>
              )}
            </section>
          </div>
        )}
      </div>

      {/* Simple Navigation */}
      <div className="mt-8 flex justify-end gap-4">
        <button
          onClick={() => gotoStepById?.('audience')}
          className={`px-6 py-2 rounded-full font-medium transition-colors ${
            isDarkMode 
              ? 'bg-blue-900 text-blue-200 hover:bg-blue-800' 
              : 'bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-300'
          }`}
        >
          ← Back
        </button>
        <button
          onClick={() => gotoStepById?.('launch')}
          className={`px-6 py-2 rounded-full font-medium transition-colors ${
            isDarkMode 
              ? 'bg-blue-600 text-white hover:bg-blue-700' 
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          Next: Launch →
        </button>
      </div>
    </div>
  );
}
