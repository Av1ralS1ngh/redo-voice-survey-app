'use client';

import { useState } from 'react';

interface ParticipantExperienceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBack: () => void;
  onNext: () => void;
  wizardData: any;
  onUpdateData: (data: any) => void;
}

export function ParticipantExperienceModal({
  isOpen,
  onClose,
  onBack,
  onNext,
  wizardData,
  onUpdateData
}: ParticipantExperienceModalProps) {
  const [invitationTitle, setInvitationTitle] = useState(
    wizardData.participants?.invitationTitle || `Invite for: ${wizardData.projectName || 'Untitled Project'}`
  );
  const [invitationDescription, setInvitationDescription] = useState(
    wizardData.participants?.invitationDescription || ''
  );

  const handleSaveChanges = () => {
    onUpdateData({
      participants: {
        ...wizardData.participants,
        invitationTitle,
        invitationDescription
      }
    });
  };

  const handleReset = () => {
    setInvitationTitle(`Invite for: ${wizardData.projectName || 'Untitled Project'}`);
    setInvitationDescription('');
  };

  const handleCopyLink = () => {
    // Generate the public link - this would be dynamic in a real app
    const link = 'https://interview.example.com/survey/abc123';
    navigator.clipboard.writeText(link);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-2xl mx-4 rounded-lg shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="p-8">
          {/* Main Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-black">
              Participant Experience
            </h1>
          </div>

          {/* Invitation Setup Section */}
          <div className="mb-8">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-black mb-2">
                Invitation Title and Description
              </h2>
              <p className="text-sm text-gray-600">
                Customize the title and description that participants will see when they access your survey.
              </p>
            </div>

            {/* Invitation Title Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Invitation Title
              </label>
              <input
                type="text"
                value={invitationTitle}
                onChange={(e) => setInvitationTitle(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                placeholder="Enter invitation title"
              />
            </div>

            {/* Invitation Description Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Invitation Description
              </label>
              <textarea
                value={invitationDescription}
                onChange={(e) => setInvitationDescription(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical text-gray-900 placeholder-gray-500"
                placeholder="Enter invitation description"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleReset}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Reset
              </button>
              <button
                onClick={handleSaveChanges}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>

          {/* Test Experience Section */}
          <div className="mb-8">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-black mb-2">
                Test Participant Experience
              </h2>
              <p className="text-sm text-gray-600">
                Use this link to test how participants will experience your survey before launching it.
              </p>
            </div>

            {/* Link Display Area */}
            <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
              <span className="text-sm text-gray-800 font-mono break-all">
                https://interview.example.com/survey/abc123
              </span>
              <button
                onClick={handleCopyLink}
                className="ml-4 px-3 py-1 border border-gray-300 text-gray-700 rounded hover:bg-gray-100 transition-colors flex items-center space-x-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span>Copy</span>
              </button>
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between items-center pt-6 border-t border-gray-200">
            <button
              onClick={onBack}
              className="px-6 py-2 border border-gray-300 text-black rounded-lg hover:bg-gray-50 transition-colors"
            >
              Back
            </button>
            <button
              onClick={onNext}
              className="px-6 py-2 bg-black text-white rounded-full hover:bg-gray-800 transition-colors"
            >
              Next: Launch
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}