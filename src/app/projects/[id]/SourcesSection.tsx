"use client";

import { useEffect, useState } from 'react';
import { formatDuration } from '@/utils/dateUtils';

type Participant = {
  id: string;
  name: string;
  email?: string | null;
  duration: number; // seconds
  status: string;
  lastSeen: string;
};

interface SourcesSectionProps {
  projectId: string;
}

export default function SourcesSection({ projectId }: SourcesSectionProps) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { loadParticipants(); }, []);

  const loadParticipants = async () => {
    try {
      setLoading(true);
      const resp = await fetch(`/api/responses?projectId=${encodeURIComponent(projectId)}`);
      if (!resp.ok) throw new Error('Failed to load responses');
      const data = await resp.json();
      const responses = data.responses || [];

      // Filter responses that belong to this project (best-effort: back-end may include project id in metadata)
      const projectResponses = responses.filter((r: any) => {
        const md = r.metadata || {};
        return (
          md.projectId === projectId ||
          md.project_id === projectId ||
          r.projectId === projectId ||
          r.session_project_id === projectId
        );
      });

      // Aggregate by userId or userName
      const map = new Map<string, Participant>();
      const iterateResponses = projectResponses.length > 0 ? projectResponses : responses;
      
      for (const r of iterateResponses) {
  // for (const r of responses) {
  const key = r.userId || r.user_uid || r.userName || r.user_name || r.id;
        const existing = map.get(key);
        const timestamp = new Date(r.date).getTime() || 0;
        // Choose the latest response as representative
        if (!existing || new Date(existing.lastSeen).getTime() < timestamp) {
          map.set(key, {
            id: key,
            name: r.userName || r.user_name || 'Unknown',
            email: r.metadata?.email || r.metadata?.user_email || null,
            duration: r.duration || 0,
            status: r.status || 'unknown',
            lastSeen: r.date || new Date().toISOString()
          });
        }
      }

      setParticipants(Array.from(map.values()).sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime()));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load participants');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-8" style={{ background: 'var(--page-bg)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4" />
          <div style={{ color: 'var(--foreground)' }}>Loading participants...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8" style={{ background: 'var(--page-bg)' }}>
        <div className="text-center">
          <div style={{ color: 'var(--foreground)' }}>Error: {error}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--page-bg)' }}>
      <div className="rounded-lg p-4" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
        <h3 className="text-xl font-semibold mb-4" style={{ color: 'var(--foreground)' }}>Participants</h3>

        <div className="overflow-x-auto">
          <table className="min-w-full" style={{ color: 'var(--foreground)' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--card-border)' }}>
                <th className="text-left py-2 pr-4">Full name</th>
                <th className="text-left py-2 pr-4">Email</th>
                <th className="text-left py-2 pr-4">Time taken</th>
                <th className="text-left py-2 pr-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {participants.map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--card-border)' }}>
                  <td className="py-3 pr-4" style={{ color: 'var(--foreground)' }}>{p.name}</td>
                  <td className="py-3 pr-4" style={{ color: 'var(--muted-foreground)' }}>{p.email || '—'}</td>
                  <td className="py-3 pr-4" style={{ color: 'var(--muted-foreground)' }}>{formatDuration(p.duration)}</td>
                  <td className="py-3 pr-4"><StatusPill status={p.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const label = (status || '').toString();
  const bg = label === 'completed' ? 'rgba(16,185,129,0.12)' : label === 'processing' ? 'rgba(59,130,246,0.08)' : 'rgba(249,115,22,0.08)';
  const color = label === 'completed' ? 'var(--button-bg)' : label === 'processing' ? 'var(--button-bg)' : 'var(--muted-foreground)';
  return (
    <span className="inline-flex items-center px-2 py-1 rounded-full text-sm font-medium" style={{ background: bg, color }}>{label}</span>
  );
}
