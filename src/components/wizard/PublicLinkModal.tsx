'use client';

import { useEffect, useMemo, useState } from 'react';
import { Link2, Copy, Check, Globe, X } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

interface PublicLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  wizardData: any;
  onGenerate: (link: string) => void;
  initialLink?: string;
}

export function PublicLinkModal({
  isOpen,
  onClose,
  wizardData,
  onGenerate,
  initialLink = '',
}: PublicLinkModalProps) {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const [publicLink, setPublicLink] = useState(initialLink);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');

  const projectId = useMemo(() => wizardData?.projectId as string | undefined, [wizardData?.projectId]);
  const projectSlug = useMemo(() => {
    const name = wizardData?.projectName || 'study';
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48);
    return slug || 'study';
  }, [wizardData?.projectName]);

  useEffect(() => {
    setPublicLink(initialLink);
    setCopyStatus('idle');
  }, [initialLink, isOpen]);

  const generatePublicLink = () => {
    const uniqueSuffix = Math.random().toString(36).slice(2, 8);
    const baseSlug = projectId ? `project-${projectId}` : projectSlug;
    if (!projectId) {
      console.info('Generating public link without project ID; using project name fallback.');
    }

    const placeholderLink = `https://pluve.com/interview/${baseSlug}-${uniqueSuffix}`;
    setPublicLink(placeholderLink);
    setCopyStatus('idle');
    onGenerate(placeholderLink);
  };

  const handleCopy = async () => {
    if (!publicLink) return;
    try {
      await navigator.clipboard.writeText(publicLink);
      setCopyStatus('copied');
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 backdrop-blur-sm bg-white/10 z-40 flex justify-center items-center"
      onClick={onClose}
    >
      <div
        className={`rounded-2xl shadow-2xl w-full max-w-lg m-4 overflow-hidden ${
          isDarkMode ? 'bg-gray-800' : 'bg-white'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
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
              <Link2 className={`w-6 h-6 ${
                isDarkMode ? 'text-blue-400' : 'text-blue-600'
              }`} />
            </div>
            <div>
              <h2 className={`text-xl font-bold ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>Public Interview Link</h2>
              <p className={`text-sm ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>Share your study with anyone</p>
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

        {/* Content */}
        <div className="p-6 space-y-6">
          <div className={`rounded-xl p-5 border ${
            isDarkMode 
              ? 'bg-gray-900/30 border-gray-700' 
              : 'bg-blue-50/50 border-blue-100'
          }`}>
            <div className="flex items-start gap-3 mb-4">
              <Globe className={`w-5 h-5 mt-0.5 ${
                isDarkMode ? 'text-blue-400' : 'text-blue-600'
              }`} />
              <div>
                <h3 className={`font-semibold mb-1 ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>Generate a Shareable Link</h3>
                <p className={`text-sm ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Create a unique link that anyone can use to participate in your study
                </p>
              </div>
            </div>

            <button
              onClick={generatePublicLink}
              className={`w-full px-5 py-2.5 rounded-lg font-medium transition-colors ${
                isDarkMode 
                  ? 'bg-blue-600 text-white hover:bg-blue-700' 
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              Generate Public Link
            </button>
          </div>

          {publicLink && (
            <div className={`rounded-xl p-4 border ${
              isDarkMode 
                ? 'bg-gray-900/50 border-gray-700' 
                : 'bg-white border-gray-200'
            }`}>
              <label className={`block text-xs font-medium mb-2 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Your Public Link
              </label>
              <div className={`flex items-center gap-3 p-3 rounded-lg border ${
                isDarkMode 
                  ? 'bg-gray-800 border-gray-700' 
                  : 'bg-gray-50 border-gray-300'
              }`}>
                <input
                  type="text"
                  value={publicLink}
                  readOnly
                  className={`flex-1 bg-transparent font-mono text-sm focus:outline-none ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}
                />
                <button
                  onClick={handleCopy}
                  className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                    copyStatus === 'copied'
                      ? isDarkMode 
                        ? 'bg-green-900/50 text-green-300' 
                        : 'bg-green-100 text-green-700'
                      : isDarkMode 
                        ? 'bg-blue-600 text-white hover:bg-blue-700' 
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {copyStatus === 'copied' ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {publicLink && copyStatus === 'copied' && (
            <div className={`flex items-center gap-2 text-sm ${
              isDarkMode ? 'text-green-400' : 'text-green-600'
            }`}>
              <Check className="w-4 h-4" />
              Link copied to clipboard!
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`px-6 py-4 border-t flex justify-end ${
          isDarkMode 
            ? 'bg-gray-900/50 border-gray-700' 
            : 'bg-gray-50 border-gray-200'
        }`}>
          <button
            onClick={onClose}
            className={`px-6 py-2.5 rounded-lg font-medium transition-colors ${
              isDarkMode 
                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
            }`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
