'use client';

interface EmptyResearchStudiesStateProps {
  onCreateStudy: () => void;
  creating?: boolean;
}

export function EmptyResearchStudiesState({ onCreateStudy, creating = false }: EmptyResearchStudiesStateProps) {
  return (
    <div className="text-center py-16">
      <div className="mx-auto w-24 h-24 mb-6 flex items-center justify-center rounded-full"
           style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#1d4ed8' }}
      >
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7h6a2 2 0 012 2v10a2 2 0 01-2 2H3m0-14V5a2 2 0 012-2h6m-8 4h8m4 0h4m-4 4h4m-4 4h4m-4 4h4" />
        </svg>
      </div>

      <div className="max-w-md mx-auto">
        <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--foreground)' }}>
          No research studies yet
        </h3>
        <p className="mb-6" style={{ color: 'var(--muted-foreground)' }}>
          Create your first research study to generate briefs, interview guides, and track progress with your team.
        </p>

        <button
          onClick={onCreateStudy}
          disabled={creating}
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6" />
          </svg>
          {creating ? 'Preparing…' : 'Create a new research study'}
        </button>
      </div>
    </div>
  );
}
