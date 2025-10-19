'use client';

import { useState } from 'react';
import { ConversationResponse } from '@/types/responses';
import { CompactAudioPlayer } from './CompactAudioPlayer';
import { StatusBadge } from './StatusBadge';
import { QualityBadge } from './QualityBadge';
import { formatRelativeDate, formatDuration } from '@/utils/dateUtils';
import { downloadResponse } from '@/lib/download-service';

interface ResponseRowProps {
  response: ConversationResponse;
  isSelected: boolean;
  isExpanded: boolean;
  onSelectionChange: (id: string, selected: boolean) => void;
  onExpand: (id: string) => void;
}

export function ResponseRow({
  response,
  isSelected,
  isExpanded,
  onSelectionChange,
  onExpand
}: ResponseRowProps) {
  const [showActionsMenu, setShowActionsMenu] = useState(false);

  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(response.id);
      // Could add a toast notification here
    } catch (error) {
      console.error('Failed to copy ID:', error);
    }
  };

  const handleDownload = async () => {
    try {
      await downloadResponse(response);
    } catch (error) {
      console.error('Download failed:', error);
      // You could add a toast notification here
      alert('Download failed. Please try again.');
    }
  };

  const handleDelete = () => {
    // Implement individual delete
    console.log('Deleting response:', response.id);
  };

  const handleTag = () => {
    // Implement individual tagging
    console.log('Tagging response:', response.id);
  };

  return (
    <div className="px-6 py-4 transition-colors" style={{ background: 'transparent' }}>
      <div className="grid grid-cols-12 gap-4 items-center min-h-[60px]">
        {/* Selection Checkbox */}
        <div className="col-span-1 flex items-center">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => onSelectionChange(response.id, e.target.checked)}
            className="w-4 h-4 rounded focus:ring-2"
            style={{ accentColor: 'var(--button-bg)', borderColor: 'var(--card-border)' }}
            aria-label={`Select response ${response.id}`}
          />
        </div>

        {/* ID Column */}
        <div className="col-span-1 flex items-center">
          {/* ID (clickable to copy) */}
          <button
            onClick={handleCopyId}
            className="text-sm font-mono truncate"
            title="Click to copy ID"
            style={{ color: 'var(--button-bg)' }}
          >
            ID {response.id.slice(-4)}
          </button>
        </div>

        {/* Progress Column */}
        <div className="col-span-1 flex items-center">
          <StatusBadge status={response.status} />
        </div>

        {/* Quality Column */}
        <div className="col-span-1 flex items-center">
          <QualityBadge quality={response.quality} />
        </div>

        {/* Date Column */}
        <div className="col-span-2 flex items-center">
          <div>
            <div className="text-sm">
              <span title={new Date(response.date).toLocaleString()} style={{ color: 'var(--foreground)' }}>
                {formatRelativeDate(response.date)}
              </span>
            </div>
            <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
              {response.userName} • {response.turnCount} turns • {formatDuration(response.duration)}
            </div>
          </div>
        </div>

        {/* Audio Column */}
        <div className="col-span-4 flex items-center">
          {response.audioUrl ? (
            <CompactAudioPlayer
              audioUrl={response.audioUrl}
              duration={response.duration}
              title={`Conversation with ${response.userName}`}
            />
          ) : (
            <div className="text-sm text-gray-400 italic">
              No audio available
            </div>
          )}
        </div>

        {/* Actions Column */}
        <div className="col-span-2 flex items-center justify-end">
          <div className="flex items-center gap-1">
            {/* Quick Actions */}
            <button
              onClick={handleDownload}
              className="p-2 rounded transition-colors flex-shrink-0"
              title="Download"
              style={{ color: 'var(--muted-foreground)' }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </button>

            {/* More Actions Menu */}
            <div className="relative">
              <button
                onClick={() => setShowActionsMenu(!showActionsMenu)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
                title="More actions"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                </svg>
              </button>

              {/* Actions Dropdown */}
              {showActionsMenu && (
                <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg z-10" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
                  <div className="py-1">
                    <button
                      onClick={() => {
                        onExpand(response.id);
                        setShowActionsMenu(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm"
                      style={{ color: 'var(--foreground)' }}
                    >
                      View details
                    </button>
                    <button
                      onClick={() => {
                        handleTag();
                        setShowActionsMenu(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Tag
                    </button>
                    <button
                      onClick={() => {
                        handleCopyId();
                        setShowActionsMenu(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Copy ID
                    </button>
                    <hr className="my-1" />
                    <button
                      onClick={() => {
                        handleDelete();
                        setShowActionsMenu(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm"
                      style={{ color: 'var(--muted-foreground)' }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Click outside to close menu */}
      {showActionsMenu && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowActionsMenu(false)}
        />
      )}
    </div>
  );
}
