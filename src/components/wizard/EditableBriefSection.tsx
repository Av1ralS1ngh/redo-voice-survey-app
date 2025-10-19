'use client';

import React, { useState, useRef, useEffect } from 'react';

interface EditableBriefSectionProps {
  id: string;
  title: string;
  content: string;
  status: 'complete' | 'generating' | 'pending';
  onSave?: (id: string, newContent: string) => Promise<void>;
  isEditing?: boolean;
  onEditStart?: (id: string) => void;
  onEditCancel?: () => void;
}

export function EditableBriefSection({
  id,
  title,
  content,
  status,
  onSave,
  isEditing = false,
  onEditStart,
  onEditCancel,
}: EditableBriefSectionProps) {
  const [editedContent, setEditedContent] = useState(content);
  const [isSaving, setIsSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setEditedContent(content);
  }, [content]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      // Auto-resize textarea
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [isEditing]);

  const handleSave = async () => {
    if (!onSave) return;
    
    setIsSaving(true);
    try {
      await onSave(id, editedContent);
      if (onEditCancel) onEditCancel();
    } catch (error) {
      console.error('Failed to save section:', error);
      alert('Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedContent(content);
    if (onEditCancel) onEditCancel();
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditedContent(e.target.value);
    // Auto-resize
    e.target.style.height = 'auto';
    e.target.style.height = e.target.scrollHeight + 'px';
  };

  // Render content with markdown formatting
  const renderContent = (text: string) => {
    const lines = text.split('\n');
    const elements: React.ReactElement[] = [];
    let key = 0;
    let currentList: React.ReactElement[] = [];
    let inList = false;

    const flushList = () => {
      if (currentList.length > 0) {
        elements.push(
          <ul key={key++} className="list-disc ml-6 space-y-1 mb-3">
            {currentList}
          </ul>
        );
        currentList = [];
        inList = false;
      }
    };

    lines.forEach((line) => {
      const trimmed = line.trim();
      
      // Skip section headers (## or #) since they're shown in the title
      if (trimmed.startsWith('## ') || (trimmed.startsWith('# ') && !trimmed.startsWith('###'))) {
        return; // Skip this line
      }
      
      // Handle ### subsection headers
      if (trimmed.startsWith('### ')) {
        flushList();
        elements.push(
          <h3 key={key++} className="text-sm font-semibold text-gray-900 mt-4 mb-2">
            {trimmed.substring(4)}
          </h3>
        );
      }
      // Handle bold subheaders (lines ending with : like "Timeline:" or with ** like **Total:**)
      else if (
        (trimmed.endsWith(':') && !trimmed.startsWith('- ') && !trimmed.startsWith('• ')) ||
        (trimmed.match(/^\*\*.*:\*\*$/))
      ) {
        flushList();
        const text = trimmed.replace(/\*\*(.*?)\*\*/g, '$1'); // Remove ** markers
        elements.push(
          <h4 key={key++} className="text-sm font-bold text-gray-900 mt-3 mb-2">
            {text}
          </h4>
        );
      }
      // Handle bullet points
      else if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
        const bulletContent = trimmed.substring(2).trim();
        
        // Check if this bullet is actually a subheader (e.g., "• **Effectiveness:**")
        const isSubheader = bulletContent.match(/^\*\*.*:\*\*$/);
        
        if (isSubheader) {
          // This is a subheader disguised as a bullet - render as heading
          flushList();
          const text = bulletContent.replace(/\*\*/g, ''); // Remove ** markers
          elements.push(
            <h4 key={key++} className="text-sm font-bold text-gray-900 mt-3 mb-2">
              {text}
            </h4>
          );
        } else {
          // Regular bullet point
          const text = bulletContent.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
          currentList.push(
            <li 
              key={key++} 
              className="text-sm text-gray-700 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: text }}
            />
          );
          inList = true;
        }
      }
      // Handle regular paragraphs
      else if (trimmed.length > 0) {
        flushList();
        const formattedText = trimmed.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        elements.push(
          <p 
            key={key++} 
            className="text-sm text-gray-700 leading-relaxed mb-2"
            dangerouslySetInnerHTML={{ __html: formattedText }}
          />
        );
      }
      // Handle empty lines
      else if (inList) {
        flushList();
      }
    });

    // Flush any remaining list items
    flushList();

    return elements;
  };

  // Status indicator
  const StatusIndicator = () => {
    if (status === 'complete') {
      return (
        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      );
    } else if (status === 'generating') {
      return (
        <svg className="w-4 h-4 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      );
    } else {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    }
  };

  return (
    <div className="mb-6 animate-fade-in group">
      {/* Section Title with Status and Edit Button */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <StatusIndicator />
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          {status === 'generating' && (
            <span className="text-xs text-blue-600 font-medium">generating...</span>
          )}
          {status === 'pending' && (
            <span className="text-xs text-gray-500 font-medium">pending...</span>
          )}
        </div>
        
        {/* Edit/Save/Cancel buttons in top right */}
        {status === 'complete' && (
          <div className="flex items-center gap-1">
            {isEditing ? (
              <>
                {/* Save button (tick icon) - always visible in edit mode */}
                <button
                  onClick={handleSave}
                  disabled={isSaving || editedContent === content}
                  className="p-1.5 text-gray-500 hover:text-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Save changes"
                >
                  {isSaving ? (
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
                
                {/* Cancel button (cross icon) - always visible in edit mode */}
                <button
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="p-1.5 text-gray-500 hover:text-red-600 disabled:opacity-50 transition-colors"
                  title="Cancel"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </>
            ) : (
              /* Edit button (pencil icon) - only visible on hover */
              <button
                onClick={() => onEditStart && onEditStart(id)}
                className="p-1.5 text-gray-400 hover:text-gray-600 transition-all opacity-0 group-hover:opacity-100"
                title="Edit section"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Content Box */}
      {status !== 'pending' && (
        <div
          className={`rounded-xl border bg-white transition-all duration-300 p-5 ${
            isEditing
              ? 'border-blue-500 shadow-md'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          {isEditing ? (
            /* Edit Mode */
            <textarea
              ref={textareaRef}
              value={editedContent}
              onChange={handleTextareaChange}
              className="w-full text-sm text-gray-900 focus:outline-none resize-none font-mono"
              rows={10}
            />
          ) : (
            /* View Mode */
            <div className="space-y-2 [&_strong]:font-bold [&_strong]:text-black">
              {renderContent(content)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

