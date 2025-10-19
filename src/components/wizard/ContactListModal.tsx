import React, { useState } from 'react';
import { X, Users, AlertTriangle, Mail } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

interface ContactListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBack: () => void;
  onNext: (participants: string[]) => void;
  initialParticipants?: string[];
}

export default function ContactListModal({
  isOpen,
  onClose,
  onBack,
  onNext,
  initialParticipants = []
}: ContactListModalProps) {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const [emailInput, setEmailInput] = useState('');
  const [participants, setParticipants] = useState<string[]>(initialParticipants);

  const parseEmails = (input: string): string[] => {
    // Split by commas, tabs, or newlines, then clean up
    return input
      .split(/[,;\t\n]/)
      .map(email => email.trim())
      .filter(email => email.length > 0);
  };

  const handleAddEmails = () => {
    const newEmails = parseEmails(emailInput);
    const validEmails = newEmails.filter(email => {
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email.replace(/.*<([^>]+)>.*/, '$1').trim());
    });

    setParticipants(prev => [...new Set([...prev, ...validEmails])]);
    setEmailInput('');
  };

  const maxParticipants = 50;
  const hasParticipants = participants.length > 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-white/10 flex items-center justify-center z-50">
      <div className={`rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col ${
        isDarkMode ? 'bg-gray-800' : 'bg-white'
      }`}>
        {/* Header */}
        <div className={`px-6 py-5 border-b flex items-center justify-between ${
          isDarkMode 
            ? 'bg-gray-900/50 border-gray-700' 
            : 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100'
        }`}>
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${
              isDarkMode 
                ? 'bg-blue-900/50' 
                : 'bg-blue-100'
            }`}>
              <Mail className={`w-6 h-6 ${
                isDarkMode ? 'text-blue-400' : 'text-blue-600'
              }`} />
            </div>
            <div>
              <h2 className={`text-xl font-bold ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>Contact List</h2>
              <p className={`text-sm ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>Share your study through email invitations</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              isDarkMode 
                ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700' 
                : 'text-gray-400 hover:text-gray-600 hover:bg-white/50'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Participants Section */}
          <div>
            <h3 className={`text-lg font-semibold ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              Participants <span className={`font-normal ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>({participants.length} / {maxParticipants})</span>
            </h3>
            <p className={`mt-2 text-sm ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Add participants to send them a direct invitation through email.
            </p>
          </div>

          {/* Main Input Card */}
          <div className={`rounded-xl p-5 border ${
            isDarkMode 
              ? 'bg-gray-900/50 border-gray-700' 
              : 'bg-blue-50/50 border-blue-100'
          }`}>
            <div className="mb-4">
              <label className={`block text-sm font-medium mb-3 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Enter email addresses
              </label>
              <p className={`text-xs mb-2 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Separate addresses by commas, tabs, or new lines. Supported formats:
              </p>
              <ul className={`text-xs space-y-1 ml-4 ${
                isDarkMode ? 'text-gray-500' : 'text-gray-500'
              }`}>
                <li>• john.q.public@example.com</li>
                <li>• 'John Q. Public' &lt;john.q.public@example.com&gt;</li>
              </ul>
            </div>

            <textarea
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="Enter email addresses..."
              className={`w-full h-32 p-3 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 transition-all ${
                isDarkMode 
                  ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-500 focus:border-blue-400' 
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500'
              } border`}
              rows={4}
            />

            <div className="flex justify-end mt-4">
              <button
                onClick={handleAddEmails}
                disabled={!emailInput.trim()}
                className={`px-5 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  isDarkMode 
                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                Add Emails
              </button>
            </div>
          </div>

          {/* Warning Banner */}
          {!hasParticipants && (
            <div className={`rounded-lg p-4 flex items-start gap-3 border ${
              isDarkMode 
                ? 'bg-yellow-900/20 border-yellow-800/50' 
                : 'bg-yellow-50 border-yellow-200'
            }`}>
              <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                isDarkMode ? 'text-yellow-500' : 'text-yellow-600'
              }`} />
              <p className={`text-sm ${
                isDarkMode ? 'text-yellow-200' : 'text-yellow-800'
              }`}>
                Please add at least one participant to your contact list
              </p>
            </div>
          )}

          {/* Added Participants List */}
          {participants.length > 0 && (
            <div className={`rounded-xl p-4 border ${
              isDarkMode 
                ? 'bg-gray-900/30 border-gray-700' 
                : 'bg-white border-gray-200'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <h4 className={`font-semibold flex items-center gap-2 ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  <Users className="w-4 h-4" />
                  Added Participants
                </h4>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  isDarkMode 
                    ? 'bg-blue-900/50 text-blue-300' 
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  {participants.length}
                </span>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {participants.map((email, index) => (
                  <div key={index} className={`flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors ${
                    isDarkMode 
                      ? 'bg-gray-800 hover:bg-gray-750' 
                      : 'bg-gray-50 hover:bg-gray-100'
                  }`}>
                    <span className={`text-sm ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>{email}</span>
                    <button
                      onClick={() => setParticipants(prev => prev.filter((_, i) => i !== index))}
                      className={`text-xs px-3 py-1 rounded-md transition-colors ${
                        isDarkMode 
                          ? 'text-red-400 hover:text-red-300 hover:bg-red-900/20' 
                          : 'text-red-600 hover:text-red-700 hover:bg-red-50'
                      }`}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className={`px-6 py-4 border-t flex justify-between gap-3 ${
          isDarkMode 
            ? 'bg-gray-900/50 border-gray-700' 
            : 'bg-gray-50 border-gray-200'
        }`}>
          <button
            onClick={onBack}
            className={`px-6 py-2.5 rounded-lg font-medium transition-colors ${
              isDarkMode 
                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
            }`}
          >
            ← Back
          </button>
          <button
            onClick={() => onNext(participants)}
            disabled={!hasParticipants}
            className={`px-6 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              isDarkMode 
                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            Next: Invitation →
          </button>
        </div>
      </div>
    </div>
  );
}