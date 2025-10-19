"use client";

import { useState, useEffect } from 'react';
import { InterviewCard } from '@/components/interviews/InterviewCard';
import { NewInterviewModal } from '@/components/interviews/NewInterviewModal';
import { EmptyInterviewsState } from '@/components/interviews/EmptyInterviewsState';
import { Interview } from '@/types/projects';

export default function InterviewsPage() {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewInterviewModal, setShowNewInterviewModal] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    loadInterviews();
  }, []);

  const loadInterviews = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/interviews');
      if (!response.ok) throw new Error('Failed to load interviews');
      const data = await response.json();
      setInterviews(data.interviews || []);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load interviews');
    } finally {
      setLoading(false);
    }
  };

  const handleNewInterview = () => setShowNewInterviewModal(true);

  const handleInterviewCreated = () => {
    setShowNewInterviewModal(false);
    loadInterviews();
  };

  const formatLastUpdated = (date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffInSeconds < 60) return 'Updated just now';
    if (diffInSeconds < 3600) return `Updated ${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `Updated ${Math.floor(diffInSeconds / 3600)}h ago`;
    return `Updated ${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--page-bg)', color: 'var(--foreground)' }}>Loading interviews...</div>;
  if (error) return <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--page-bg)', color: 'var(--foreground)' }}>Error: {error}</div>;

  return (
    <div className="min-h-screen" style={{ background: 'var(--page-bg)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: 'var(--foreground)' }}>Interviews</h1>
            <div className="flex items-center mt-2 text-sm" style={{ color: 'var(--foreground)', opacity: 0.7 }}>
              <span>{formatLastUpdated(lastUpdated)}</span>
            </div>
          </div>

          <button
            onClick={handleNewInterview}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            New Interview
          </button>
        </div>

        {interviews.length === 0 ? (
          <EmptyInterviewsState onNewInterview={handleNewInterview} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {interviews.map((i) => (
              <InterviewCard key={i.id} interview={i} onUpdate={loadInterviews} />
            ))}
          </div>
        )}

        {showNewInterviewModal && (
          <NewInterviewModal onClose={() => setShowNewInterviewModal(false)} onSuccess={handleInterviewCreated} />
        )}
      </div>
    </div>
  );
}
