'use client';

import React, { useState, useRef, useEffect } from 'react';
import { PencilIcon } from '@/components/icons/PencilIcon';
import { EditableBriefSection } from './EditableBriefSection';
import { useTheme } from '@/contexts/ThemeContext';

interface BriefSection {
  id: string;
  title: string;
  content: string;
  status: 'complete' | 'generating' | 'pending';
}

interface ResearchBriefPreviewLiveProps {
  researchBrief?: string;
  sections?: BriefSection[];
  projectName: string;
  interviewType: string;
  onUse?: () => void;
  onNextStep?: () => void;
  hasInterviewGuide?: boolean;
  onSectionUpdate?: (sectionId: string, newContent: string) => Promise<void>;
  onProjectNameChange?: (newName: string) => Promise<void> | void;
  isGeneratingGuide?: boolean;
}

export function ResearchBriefPreviewLive({ 
  researchBrief,
  sections: externalSections,
  projectName,
  onUse,
  onNextStep,
  hasInterviewGuide = false,
  onSectionUpdate,
  onProjectNameChange,
  isGeneratingGuide = false,
}: ResearchBriefPreviewLiveProps) {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [visibleSections, setVisibleSections] = useState<number>(0);
  const [editableName, setEditableName] = useState(projectName);
  const [isEditingName, setIsEditingName] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Use external sections directly if provided, otherwise parse the brief
  const sections = React.useMemo(() => {
    if (externalSections && externalSections.length > 0) {
      return externalSections;
    } else if (researchBrief) {
      return parseBriefIntoSections(researchBrief);
    }
    return [];
  }, [externalSections, researchBrief]);

  // Progressive reveal: show sections one by one with animation
  useEffect(() => {
    if (sections.length === 0) {
      setVisibleSections(0);
      return;
    }

    // If all sections are already visible, don't animate
    if (visibleSections >= sections.length) {
      return;
    }

    // Show sections progressively with 250ms delay between each
    const timer = setTimeout(() => {
      setVisibleSections(prev => prev + 1);
    }, 250);

    return () => clearTimeout(timer);
  }, [sections.length, visibleSections]);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setEditableName(projectName);
  }, [projectName]);

  useEffect(() => {
    if (isEditingName) {
      const input = nameInputRef.current;
      if (input) {
        input.focus();
        input.select();
      }
    }
  }, [isEditingName]);

  const handleDownloadPDF = async () => {
    setShowMenu(false);

    try {
      const { default: jsPDF } = await import('jspdf');

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      const maxWidth = pageWidth - 2 * margin;
      let yPosition = margin;

      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text(projectName || 'Research Brief', margin, yPosition);
      yPosition += 10;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');

      for (const section of sections) {
        if (section.status === 'pending') continue;

        const lines = section.content.split('\n');

        for (const line of lines) {
          const trimmed = line.trim();

          if (yPosition > pageHeight - margin) {
            doc.addPage();
            yPosition = margin;
          }

          if (trimmed.startsWith('## ')) {
            yPosition += 5;
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            const text = trimmed.substring(3);
            doc.text(text, margin, yPosition);
            yPosition += 8;
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
          } else if (trimmed.startsWith('# ') && !trimmed.startsWith('##')) {
            yPosition += 5;
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            const text = trimmed.substring(2);
            doc.text(text, margin, yPosition);
            yPosition += 10;
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
          } else if (trimmed.startsWith('### ')) {
            yPosition += 3;
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            const text = trimmed.substring(4);
            doc.text(text, margin, yPosition);
            yPosition += 6;
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
          } else if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
            const text = trimmed.substring(2).replace(/\*\*(.*?)\*\*/g, '$1');
            const splitText = doc.splitTextToSize(text, maxWidth - 10);
            doc.text(`• ${splitText[0]}`, margin + 5, yPosition);
            for (let i = 1; i < splitText.length; i++) {
              yPosition += 5;
              if (yPosition > pageHeight - margin) {
                doc.addPage();
                yPosition = margin;
              }
              doc.text(`  ${splitText[i]}`, margin + 5, yPosition);
            }
            yPosition += 5;
          } else if (trimmed.length > 0) {
            const text = trimmed.replace(/\*\*(.*?)\*\*/g, '$1');
            const splitText = doc.splitTextToSize(text, maxWidth);
            for (const textLine of splitText) {
              if (yPosition > pageHeight - margin) {
                doc.addPage();
                yPosition = margin;
              }
              doc.text(textLine, margin, yPosition);
              yPosition += 5;
            }
          } else {
            yPosition += 3;
          }
        }
      }

      const fileName = `${projectName.replace(/[^a-z0-9]/gi, '_')}_Research_Brief.pdf`;
      doc.save(fileName);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  const handleSectionSave = async (sectionId: string, newContent: string) => {
    if (!onSectionUpdate) {
      console.warn('onSectionUpdate not provided');
      return;
    }
    
    try {
      await onSectionUpdate(sectionId, newContent);
    } catch (error) {
      console.error('Failed to save section:', error);
      throw error;
    }
  };

  const handleStartEditingName = () => {
    if (isSavingName) {
      return;
    }

    setEditableName(projectName);
    setIsEditingName(true);
  };

  const handleCancelEditingName = () => {
    setEditableName(projectName);
    setIsEditingName(false);
  };

  const handleSaveProjectName = async () => {
    if (isSavingName) {
      return;
    }

    const trimmed = editableName.trim();

    if (!trimmed) {
      setEditableName(projectName);
      setIsEditingName(false);
      return;
    }

    if (trimmed === projectName) {
      setIsEditingName(false);
      return;
    }

    try {
      setIsSavingName(true);
      await Promise.resolve(onProjectNameChange?.(trimmed));
      setEditableName(trimmed);
    } catch (error) {
      console.error('Failed to update project name:', error);
      setEditableName(projectName);
    } finally {
      setIsSavingName(false);
      setIsEditingName(false);
    }
  };

  const handleProjectNameKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      void handleSaveProjectName();
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      handleCancelEditingName();
    }
  };

  const handleProjectNameBlur = () => {
    if (!isEditingName || isSavingName) {
      return;
    }

    void handleSaveProjectName();
  };

  return (
    <div className="h-full flex flex-col min-h-0">
      {/* Header - Fixed */}
      <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isEditingName ? (
                <input
                  ref={nameInputRef}
                  type="text"
                  value={editableName}
                  onChange={(event) => setEditableName(event.target.value)}
                  onKeyDown={handleProjectNameKeyDown}
                  onBlur={handleProjectNameBlur}
                  className="text-lg font-semibold leading-tight text-gray-900 bg-transparent border-b border-blue-500 focus:outline-none"
                  aria-label="Project name"
                  spellCheck={false}
                />
              ) : (
                <span className="text-lg font-semibold leading-tight text-gray-900">
                  {projectName || 'Untitled project'}
                </span>
              )}
              <button
                type="button"
                onClick={() => {
                  if (isEditingName) {
                    if (!isSavingName) {
                      nameInputRef.current?.focus();
                    }
                    return;
                  }
                  handleStartEditingName();
                }}
                className="rounded p-1 text-gray-400 transition hover:text-gray-600"
                aria-label="Edit project name"
                disabled={isSavingName}
              >
                <PencilIcon className="h-4 w-4" />
              </button>
            </div>
            {onUse && (
              <button
                onClick={() => {
                  if (isGeneratingGuide) {
                    return;
                  }
                  onUse();
                }}
                className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors flex items-center gap-2 ${
                  hasInterviewGuide
                    ? 'bg-white text-gray-700 border border-gray-300 hover:border-gray-400'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
                disabled={isSavingName || isGeneratingGuide}
              >
                {isGeneratingGuide && (
                  <svg
                    className="h-4 w-4 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                )}
                {isGeneratingGuide
                  ? 'Generating Interview Guide…'
                  : hasInterviewGuide
                    ? 'View Interview Guide'
                    : 'Generate Interview Guide'}
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-600">
            <p className="font-medium">Research Brief</p>

            {/* Three-dot menu with dropdown */}
            <div className="relative" ref={menuRef}>
              <button 
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Research brief options"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>
              
              {/* Dropdown menu */}
              {showMenu && (
                <div className="absolute left-0 mt-2 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                  <button
                    onClick={handleDownloadPDF}
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 transition hover:bg-gray-100"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download as PDF
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content - Scrollable with Editable Sections */}
      <div className="flex-1 overflow-y-auto p-6 bg-white min-h-0">
        {sections.length === 0 ? (
          <div className="text-gray-500 italic">Waiting for brief generation...</div>
        ) : (
          <div className="space-y-4">
            {sections.map((section, index) => {
              // Show section if it's within the visible range
              const isPending = index >= visibleSections;
              
              if (isPending) {
                // Show pending sections with "generating..." status
                return (
                  <div 
                    key={section.id}
                    className="group relative border border-gray-200 rounded-lg p-4 bg-gray-50 animate-pulse"
                  >
                    <div className="flex items-center gap-2 text-gray-400">
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="text-sm font-medium">{section.title} (generating...)</span>
                    </div>
                  </div>
                );
              }
              
              return (
                <EditableBriefSection
                  key={section.id}
                  id={section.id}
                  title={section.title}
                  content={section.content}
                  status={section.status}
                  isEditing={editingSection === section.id}
                  onEditStart={(id) => setEditingSection(id)}
                  onEditCancel={() => setEditingSection(null)}
                  onSave={handleSectionSave}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Footer - Fixed */}
      {onNextStep && sections.every(s => s.status === 'complete') && (
        <div className="px-6 py-4 border-t border-gray-200 flex-shrink-0">
          <button
            onClick={onNextStep}
            className={`w-full px-4 py-2 rounded-full font-medium transition-colors ${
              isDarkMode 
                ? 'bg-blue-900 text-blue-200 hover:bg-blue-800' 
                : 'bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-300'
            }`}
          >
            Next Step
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Parse markdown research brief into sections
 */
function parseBriefIntoSections(brief: string): BriefSection[] {
  const sections: BriefSection[] = [];
  const lines = brief.split('\n');
  
  let currentSection: BriefSection | null = null;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    if (trimmed.startsWith('## ') || (trimmed.startsWith('# ') && !trimmed.startsWith('##'))) {
      // Save previous section
      if (currentSection) {
        sections.push(currentSection);
      }
      
      // Start new section
      const title = trimmed.startsWith('## ') ? trimmed.substring(3) : trimmed.substring(2);
      const id = title.toLowerCase().replace(/[^a-z0-9]+/g, '_');
      
      currentSection = {
        id,
        title,
        content: line + '\n',
        status: 'complete'
      };
    } else if (currentSection) {
      currentSection.content += line + '\n';
    }
  }
  
  // Add final section
  if (currentSection) {
    sections.push(currentSection);
  }
  
  // If no sections were found, create a single section with the entire brief
  if (sections.length === 0 && brief.trim()) {
    sections.push({
      id: 'brief',
      title: 'Research Brief',
      content: brief,
      status: 'complete'
    });
  }
  
  return sections;
}

