import React from 'react';
import { PencilIcon } from '@/components/icons/PencilIcon';

interface ResearchBriefPreviewProps {
  researchBrief: string;
  projectName: string;
  onUse?: () => void;
  onNextStep?: () => void;
  hasInterviewGuide?: boolean; // Whether interview guide already exists
  isGeneratingGuide?: boolean; // Indicates if the guide is being generated
}

interface Section {
  heading: string;
  content: React.ReactElement[];
}

export function ResearchBriefPreview({ researchBrief, projectName, onUse, onNextStep, hasInterviewGuide = false, isGeneratingGuide = false }: ResearchBriefPreviewProps) {



  // Format markdown content into sections with hover effects
  const formatMarkdown = (content: string) => {
    if (!content) return <div className="text-gray-500 italic">No brief generated yet.</div>;

    const lines = content.split('\n');
    const sections: Section[] = [];
    let currentSection: Section | null = null;
    let key = 0;
    let inList = false;
    let listItems: React.ReactElement[] = [];
    let listType: 'ul' | 'ol' | null = null;

    const flushList = () => {
      if (inList && listItems.length > 0 && currentSection) {
        if (listType === 'ul') {
          currentSection.content.push(
            <ul key={key++} className="list-disc ml-6 mb-4 space-y-2">
              {listItems}
            </ul>
          );
        } else if (listType === 'ol') {
          currentSection.content.push(
            <ol key={key++} className="list-decimal ml-6 mb-4 space-y-2">
              {listItems}
            </ol>
          );
        }
        listItems = [];
        inList = false;
        listType = null;
      }
    };

    const finishSection = () => {
      if (currentSection && currentSection.content.length > 0) {
        sections.push(currentSection);
      }
    };

  lines.forEach((line) => {
      const trimmed = line.trim();
      const originalIndent = line.length - line.trimStart().length;
      
      // Main headings (# or ##) - Start new section
      if (trimmed.startsWith('## ')) {
        flushList();
        finishSection();
        const text = trimmed.substring(3);
        currentSection = {
          heading: text,
          content: []
        };
      }
      else if (trimmed.startsWith('# ') && !trimmed.startsWith('##')) {
        // Handle single # headings
        flushList();
        finishSection();
        const text = trimmed.substring(2);
        currentSection = {
          heading: text,
          content: []
        };
      }
      // Subheadings (###)
      else if (trimmed.startsWith('### ')) {
        flushList();
        const text = trimmed.substring(4);
        if (currentSection) {
          currentSection.content.push(
            <h3 key={key++} className="text-sm font-semibold text-gray-900 mt-3 mb-2">
              {text}
            </h3>
          );
        }
      }
      // Agent recommendation marker
      else if (trimmed.startsWith('📌 **Agent\'s Recommendation:**')) {
        flushList();
        if (currentSection) {
          currentSection.content.push(
            <div key={key++} className="bg-blue-50 border-l-4 border-blue-500 px-3 py-2 my-3 rounded text-sm">
              <p className="font-semibold text-blue-900 flex items-center gap-2">
                <span>📌</span>
                <span>Agent’s Recommendation</span>
              </p>
            </div>
          );
        }
      }
      // Numbered list (22. text, 27. text, etc.)
      else if (/^\d+\.\s/.test(trimmed)) {
        const number = trimmed.match(/^(\d+)\.\s/)?.[1];
        const text = trimmed.replace(/^\d+\.\s/, '');
        const formattedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        if (!inList || listType !== 'ol') {
          flushList();
          inList = true;
          listType = 'ol';
        }
        
        listItems.push(
          <li key={key++} className="text-sm text-gray-700 leading-relaxed mb-2" value={parseInt(number || '1')} dangerouslySetInnerHTML={{ __html: formattedText }} />
        );
      }
      // Bullet points (- text or • text)
      else if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
        const text = trimmed.substring(2);
        const formattedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        // Determine nesting level based on indentation
        const isNested = originalIndent >= 2;
        
        if (!inList || listType !== 'ul') {
          flushList();
          inList = true;
          listType = 'ul';
        }
        
        listItems.push(
          <li 
            key={key++} 
            className={`text-sm text-gray-700 leading-relaxed mb-2 ${isNested ? 'ml-6 list-circle' : ''}`}
            dangerouslySetInnerHTML={{ __html: formattedText }} 
          />
        );
      }
      // Empty line
      else if (trimmed === '') {
        flushList();
        if (currentSection) {
          currentSection.content.push(<div key={key++} className="h-1" />);
        }
      }
      // Regular paragraph
      else if (trimmed) {
        flushList();
        // Parse inline bold
        const formattedText = trimmed.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        if (currentSection) {
          currentSection.content.push(
            <p key={key++} className="text-sm text-gray-700 leading-relaxed mb-2" dangerouslySetInnerHTML={{ __html: formattedText }} />
          );
        }
      }
    });

    // Flush any remaining list and section
    flushList();
    finishSection();

    // Render sections with content boxes that have hover effects
    return (
      <div className="space-y-6">
        {sections.map((section, idx) => (
          <div key={idx}>
            {/* Section Title - Plain text, no background */}
            <h2 className="text-base font-semibold text-gray-900 mb-3">
              {section.heading}
            </h2>
            {/* Content Box - Rounded rectangle with hover effect */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 transition-all duration-300 hover:bg-gray-50">
              <div className="space-y-2 [&_strong]:font-bold [&_strong]:text-black [&_p]:text-sm [&_p]:text-gray-700 [&_li]:text-sm [&_li]:text-gray-700">
                {section.content}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div
        className="px-6 py-4 border-b"
        style={{ borderBottomColor: 'var(--card-border)' }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold text-gray-900">{projectName || 'Untitled project'}</span>
            <PencilIcon className="h-4 w-4 text-gray-400" />
          </div>

          {onUse && (
            <button
              onClick={onUse}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors flex items-center gap-2 ${
                hasInterviewGuide
                  ? 'bg-white text-gray-700 border border-gray-300 hover:border-gray-400'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
              disabled={isGeneratingGuide}
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

        <p className="mt-3 text-sm text-gray-500">Research brief</p>
      </div>

      {/* Content - Scrollable */}
      <div className="flex-1 overflow-y-auto p-6 bg-white min-h-0">
        {!researchBrief ? (
          <div className="flex items-center justify-center h-full text-center">
            <div>
              <svg className="w-16 h-16 mx-auto mb-4"
                   style={{ color: 'var(--muted-foreground)' }}
                   fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm"
                 style={{ color: 'var(--muted-foreground)' }}
              >
                Your research brief will appear here as you provide details in the chat.
              </p>
            </div>
          </div>
        ) : (
          formatMarkdown(researchBrief)
        )}
      </div>

      {/* Footer */}
      {researchBrief && (
        <div className="px-6 py-4 border-t flex items-center justify-between"
             style={{
               borderTopColor: 'var(--card-border)',
               backgroundColor: 'var(--card-bg)'
             }}
        >
          <p className="text-xs"
             style={{ color: 'var(--muted-foreground)' }}
          >
            This brief updates automatically as you refine details in the conversation
          </p>
          {onNextStep && (
            <button
              onClick={onNextStep}
              className="px-4 py-2 text-sm font-medium rounded transition-colors"
              style={{
                backgroundColor: 'var(--button-bg)',
                color: 'var(--background)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--button-hover-bg)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--button-bg)';
              }}
            >
              Next: Voice Config
            </button>
          )}
        </div>
      )}
    </div>
  );
}
