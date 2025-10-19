'use client';

import { ConversationResponse } from '@/types/responses';
import { ResponseRow } from './ResponseRow';
import { ExpandedTranscriptView } from './ExpandedTranscriptView';

interface ResponsesTableProps {
  responses: ConversationResponse[];
  selectedIds: Set<string>;
  expandedId: string | null;
  onSelectionChange: (id: string, selected: boolean) => void;
  onSelectAll: (selected: boolean) => void;
  onExpand: (id: string) => void;
}

export function ResponsesTable({
  responses,
  selectedIds,
  expandedId,
  onSelectionChange,
  onSelectAll,
  onExpand
}: ResponsesTableProps) {
  const allSelected = responses.length > 0 && responses.every(r => selectedIds.has(r.id));
  const someSelected = responses.some(r => selectedIds.has(r.id));

  return (
    <div className="rounded-lg shadow-sm overflow-hidden" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
      {/* Table Header */}
      <div style={{ background: 'transparent', borderBottom: '1px solid var(--card-border)' }} className="px-6 py-3">
        <div className="grid grid-cols-12 gap-4 items-center text-sm font-medium" style={{ color: 'var(--muted-foreground)' }}>
          {/* Bulk Select Checkbox */}
          <div className="col-span-1 flex items-center">
            <input
              type="checkbox"
              checked={allSelected}
              ref={(input) => {
                if (input) input.indeterminate = someSelected && !allSelected;
              }}
              onChange={(e) => onSelectAll(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              aria-label="Select all responses"
            />
          </div>

          {/* Column Headers */}
          <div className="col-span-1 flex items-center">ID</div>
          <div className="col-span-1 flex items-center">Progress</div>
          <div className="col-span-1 flex items-center">Quality</div>
          <div className="col-span-2 flex items-center">Date</div>
          <div className="col-span-4 flex items-center">Audio</div>
          <div className="col-span-2 flex items-center justify-end">Actions</div>
        </div>
      </div>

      {/* Table Body */}
      <div style={{ borderTop: '1px solid var(--card-border)', borderBottom: responses.length > 0 ? '1px solid var(--card-border)' : 'none' }}>
        {responses.map((response) => (
          <div key={response.id}>
            {/* Main Row */}
            <ResponseRow
              response={response}
              isSelected={selectedIds.has(response.id)}
              isExpanded={expandedId === response.id}
              onSelectionChange={onSelectionChange}
              onExpand={onExpand}
            />

            {/* Expanded Transcript View */}
            {expandedId === response.id && (
              <ExpandedTranscriptView
                response={response}
                onClose={() => onExpand(response.id)}
              />
            )}
          </div>
        ))}
      </div>

      {/* Table Footer */}
      {responses.length > 0 && (
        <div className="px-6 py-3" style={{ borderTop: '1px solid var(--card-border)', background: 'transparent' }}>
          <div className="flex items-center justify-between text-sm" style={{ color: 'var(--muted-foreground)' }}>
            <span>
              {responses.length} response{responses.length !== 1 ? 's' : ''}
            </span>
            {selectedIds.size > 0 && (
              <span>
                {selectedIds.size} selected
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
