'use client';

import React, { useState, useRef, useEffect } from 'react';
import { EditableBriefSection } from './EditableBriefSection';

interface GuideSection {
  id: string;
  title: string;
  content: string;
  status: 'complete' | 'generating' | 'pending';
}

interface InterviewGuidePreviewLiveProps {
  interviewGuide?: string;
  sections?: GuideSection[];
  projectName: string;
  interviewType: string;
  onBack?: () => void;
  onNextStep?: () => void;
  onRegenerate?: () => void;
  isGenerating?: boolean;
  onSectionUpdate?: (sectionId: string, newContent: string) => Promise<void>;
}

export function InterviewGuidePreviewLive({ 
  interviewGuide,
  sections: externalSections,
  projectName,
  interviewType,
  onBack,
  onNextStep,
  onRegenerate,
  isGenerating = false,
  onSectionUpdate,
}: InterviewGuidePreviewLiveProps) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [sections, setSections] = useState<GuideSection[]>([]);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [visibleSections, setVisibleSections] = useState<number>(0);

  // Parse interview guide into sections if not provided
  useEffect(() => {
    if (externalSections) {
      setSections(externalSections);
    } else if (interviewGuide) {
      const parsed = parseGuideIntoSections(interviewGuide);
      setSections(parsed);
    }
  }, [interviewGuide, externalSections]);

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

  const handleDownloadPDF = async () => {
    setShowMenu(false);
    
    try {
      const { default: jsPDF } = await import('jspdf');
      
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      const maxWidth = pageWidth - (2 * margin);
      let yPosition = margin;

      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text(projectName || 'Interview Guide', margin, yPosition);
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
            doc.text('• ' + splitText[0], margin + 5, yPosition);
            for (let i = 1; i < splitText.length; i++) {
              yPosition += 5;
              if (yPosition > pageHeight - margin) {
                doc.addPage();
                yPosition = margin;
              }
              doc.text('  ' + splitText[i], margin + 5, yPosition);
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

      const fileName = `${projectName.replace(/[^a-z0-9]/gi, '_')}_Interview_Guide.pdf`;
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

  return (
    <div className="h-full flex flex-col min-h-0">
      {/* Header - Fixed */}
      <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900">Interview Guide</h3>
          <div className="flex items-center space-x-2">
            {onBack && (
              <button
                onClick={onBack}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                ← Back to Brief
              </button>
            )}
            {onRegenerate && (
              <button
                onClick={onRegenerate}
                disabled={isGenerating}
                className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                title="Regenerate guide from latest research brief"
              >
                <svg className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {isGenerating ? 'Regenerating...' : 'Regenerate'}
              </button>
            )}
            {onNextStep && (
              <button
                onClick={onNextStep}
                disabled={isGenerating}
                className={`px-4 py-2 text-blue-800 text-sm font-medium rounded-full border border-blue-300 bg-blue-50 hover:bg-blue-100 transition-colors ${
                  isGenerating ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isGenerating ? 'Generating...' : 'Next Step'}
              </button>
            )}
            
            {/* Three-dot menu with dropdown */}
            <div className="relative" ref={menuRef}>
              <button 
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>
              
              {showMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                  <button
                    onClick={handleDownloadPDF}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
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
        {projectName && (
          <p className="text-sm text-gray-600">{projectName}</p>
        )}
      </div>

      {/* Content - Scrollable with Editable Sections */}
      <div className="flex-1 overflow-y-auto p-6 bg-white min-h-0">
        {sections.length === 0 ? (
          <div className="text-gray-500 italic">Waiting for guide generation...</div>
        ) : (
          <div className="space-y-4">
            {sections.map((section, index) => {
              // Show section if it's within the visible range
              const isVisible = index < visibleSections;
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
    </div>
  );
}

/**
 * Parse markdown interview guide into sections
 */
function parseGuideIntoSections(guide: string): GuideSection[] {
  const sections: GuideSection[] = [];
  const lines = guide.split('\n');
  
  let currentSection: GuideSection | null = null;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    if (trimmed.startsWith('## ') || (trimmed.startsWith('# ') && !trimmed.startsWith('##'))) {
      if (currentSection) {
        sections.push(currentSection);
      }
      
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
  
  if (currentSection) {
    sections.push(currentSection);
  }
  
  return sections;
}

