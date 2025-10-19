'use client';

interface BulkActionsToolbarProps {
  selectedCount: number;
  onAction: (action: string) => void;
  onClear: () => void;
}

export function BulkActionsToolbar({
  selectedCount,
  onAction,
  onClear
}: BulkActionsToolbarProps) {
  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
      <div className="rounded-lg shadow-lg px-6 py-4" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
        <div className="flex items-center gap-4">
          {/* Selection Count */}
          <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
            {selectedCount} selected
          </span>

          {/* Divider */}
          <div className="w-px h-6" style={{ background: 'var(--card-border)' }} />

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onAction('download')}
              className="flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors"
              title="Download selected responses"
              style={{ color: 'var(--foreground)' }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download
            </button>

            <button
              onClick={() => onAction('tag')}
              className="flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors"
              title="Tag selected responses"
              style={{ color: 'var(--foreground)' }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              Tag
            </button>

            <button
              onClick={() => onAction('delete')}
              className="flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors"
              title="Delete selected responses"
              style={{ color: 'var(--muted-foreground)' }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </button>
          </div>

          {/* Divider */}
          <div className="w-px h-6" style={{ background: 'var(--card-border)' }} />

          {/* Clear Selection */}
          <button
            onClick={onClear}
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors"
            title="Clear selection"
            style={{ color: 'var(--muted-foreground)' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}
