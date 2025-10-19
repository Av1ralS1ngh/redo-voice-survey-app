'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ResearchStudy } from '@/types/researchStudies';
import { formatRelativeDate } from '@/utils/dateUtils';

interface ResearchStudyCardProps {
  study: ResearchStudy;
}

const MAX_SUMMARY_LENGTH = 220;

function stripMarkdown(markdown: string): string {
  if (!markdown) return '';
  return markdown
    .replace(/```[\s\S]*?```/g, '') // code blocks
    .replace(/`.*?`/g, '') // inline code
    .replace(/[*_~`>#-]/g, '')
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

export function ResearchStudyCard({ study }: ResearchStudyCardProps) {
  const router = useRouter();
  const [launching, setLaunching] = useState(false);

  const subtitle = useMemo(() => {
    if (study.interviewName) {
      return study.interviewName;
    }

    if (study.metadata && typeof study.metadata === 'object') {
      const { focus_area, focusArea, persona } = study.metadata as Record<string, string>;
      if (focus_area) return focus_area;
      if (focusArea) return focusArea;
      if (persona) return persona;
    }

    return study.projectDescription || '';
  }, [study.interviewName, study.metadata, study.projectDescription]);

  const summary = useMemo(() => {
    const preparedSummary = study.summary?.trim().length > 0
      ? study.summary.trim()
      : stripMarkdown(study.content);

    if (preparedSummary.length <= MAX_SUMMARY_LENGTH) {
      return preparedSummary;
    }

    return preparedSummary.slice(0, MAX_SUMMARY_LENGTH) + '…';
  }, [study.summary, study.content]);

  const handleCardClick = () => {
    const slugOrId = study.projectSlug || study.projectId;
    if (slugOrId) {
      router.push(`/projects/research-study/${slugOrId}`);
    }
  };

  const handleLaunchStudy = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    if (!study.interviewId || launching) return;

    try {
      setLaunching(true);
      const supabase = createClient();
      const { error } = await supabase
        .from('interviews')
        .update({ status: 'active' })
        .eq('id', study.interviewId);

      if (error) throw error;

      await supabase
        .from('projects')
        .update({ status: 'active' })
        .eq('id', study.projectId);

      // Optionally refresh the page or update local state
      window.location.reload();
    } catch (err) {
      console.error('Failed to launch study:', err);
      alert('Failed to launch study. Please try again.');
    } finally {
      setLaunching(false);
    }
  };

  return (
    <div className="rounded-xl p-6 hover:shadow-lg transition-all cursor-pointer group"
         onClick={handleCardClick}
         style={{
           backgroundColor: 'var(--card-bg)',
           border: '1px solid var(--card-border)',
           transform: 'translateY(0)',
         }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <p className="text-xs uppercase tracking-wide font-medium mb-1"
             style={{ color: 'var(--muted-foreground)' }}
          >
            Updated {formatRelativeDate(study.updatedAt)}
          </p>
          <h3 className="text-xl font-semibold truncate group-hover:text-blue-600 transition-colors"
              style={{ color: 'var(--foreground)' }}
          >
            {study.projectName}
          </h3>
          {subtitle && (
            <p className="text-sm mt-1 truncate"
               style={{ color: 'var(--muted-foreground)' }}
            >
              {subtitle}
            </p>
          )}
        </div>
        <div className="ml-3 px-3 py-1 text-xs font-semibold rounded-full"
             style={{
               backgroundColor: 'rgba(59, 130, 246, 0.15)',
               color: '#1d4ed8'
             }}
        >
          v{study.version}
        </div>
      </div>

      <div className="text-sm leading-relaxed"
           style={{ color: 'var(--muted-foreground)' }}
      >
        {summary || 'No summary available for this study yet.'}
      </div>

      <div className="mt-6 flex items-center justify-between text-xs"
           style={{ color: 'var(--muted-foreground)' }}
      >
        <span>
          Created {formatRelativeDate(study.createdAt)}
        </span>
        <div className="flex items-center gap-3">
          {study.interviewId && study.interviewStatus !== 'active' && (
            <button
              onClick={handleLaunchStudy}
              disabled={launching}
              className="inline-flex items-center gap-1 font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {launching ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Launching…
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Launch Study
                </>
              )}
            </button>
          )}
          {study.interviewId && study.interviewStatus === 'active' && (
            <span className="inline-flex items-center gap-1 font-medium text-green-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Launched
            </span>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleCardClick();
            }}
            className="inline-flex items-center gap-1 font-medium group-hover:text-blue-600 transition-colors"
            style={{ color: 'var(--foreground)' }}
          >
            View details
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
