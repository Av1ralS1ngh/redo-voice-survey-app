"use client";

import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';

interface ProjectBriefPanelProps {
  projectId: string;
  projectName: string;
  fallbackBrief?: string;
}

export default function ProjectBriefPanel({ projectId, projectName, fallbackBrief }: ProjectBriefPanelProps) {
  const [brief, setBrief] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function fetchBrief() {
      setLoading(true);
      try {
        const res = await fetch(`/api/projects/${projectId}/brief`);
        if (!res.ok) throw new Error('Failed to fetch brief');
        const data = await res.json();
        if (mounted) {
          setBrief(data?.brief || data?.research_brief || null);
        }
      } catch (err) {
        console.warn('Could not fetch project brief, using fallback', err);
        if (mounted) setBrief(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchBrief();

    return () => { mounted = false; };
  }, [projectId]);

  const display = brief || fallbackBrief || 'No project brief has been generated for this project yet. Use the design assistant to create one.';

  // Short preview length
  const PREVIEW_CHARS = 600;
  const isLong = display.length > PREVIEW_CHARS;
  const preview = isLong && !expanded ? display.slice(0, PREVIEW_CHARS) + '...' : display;

  return (
    <div className="mx-auto w-full max-w-4xl">
      <section
        className="rounded-2xl shadow-lg"
        style={{
          backgroundColor: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
          borderRadius: '16px',
        }}
      >
        <div className="p-6 sm:p-8">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--muted-foreground)' }}>Design</p>
            </div>
          </div>

          <div className="prose prose-slate max-w-none dark:prose-invert mt-4">
            {loading ? (
              <div className="text-sm text-gray-500">Loading brief…</div>
            ) : (
              <>
                <ReactMarkdown>{preview}</ReactMarkdown>
                {isLong && (
                  <button
                    onClick={() => setExpanded((s) => !s)}
                    className="mt-4 text-sm text-blue-600 hover:underline"
                  >
                    {expanded ? 'Read less' : 'Read more'}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
