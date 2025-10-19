"use client";

import { useEffect, useMemo, useState } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, BarChart, Bar, Cell, CartesianGrid } from 'recharts';

export default function AnalysisSection({ projectId }: { projectId?: string }) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/responses?limit=500`);
        const json = await res.json();
        const responses = json.responses || [];
        const projectResponses = responses.filter((r: any) => {
          const md = r.metadata || {};
          return md.projectId === projectId || md.project_id === projectId || r.projectId === projectId || r.session_project_id === projectId;
        });
        const final = projectResponses.length ? projectResponses : responses;
        if (mounted) setData(final);
      } catch (e) {
        console.error('Failed to load responses for analysis', e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [projectId]);

  const total = data.length;
  const avgDuration = total ? Math.round(data.reduce((s: number, r: any) => s + (r.duration || 0), 0) / total) : 0;
  const completionRate = total ? Math.round(((data.filter(d => d.status === 'completed').length) / total) * 100) : 0;

  const trendSeries = useMemo(() => {
    const map: Record<string, number> = {};
    data.forEach((r: any) => {
      const d = r.date ? new Date(r.date).toISOString().slice(0,10) : new Date().toISOString().slice(0,10);
      map[d] = (map[d] || 0) + 1;
    });
    return Object.keys(map).sort().map(k => ({ date: k, value: map[k] }));
  }, [data]);

  const topParticipants = useMemo(() => {
    const counts: Record<string, { name: string; count: number; duration: number }> = {};
    data.forEach((r: any) => {
      const id = r.userId || r.user_uid || r.user_name || r.userName || r.sessionId || r.id;
      const name = r.userName || r.user_name || 'Unknown';
      counts[id] = counts[id] || { name, count: 0, duration: 0 };
      counts[id].count++;
      counts[id].duration += r.duration || 0;
    });
    return Object.values(counts).sort((a,b) => b.count - a.count).slice(0,6);
  }, [data]);

  const qualityBuckets = useMemo(() => {
    const map: Record<string, number> = {};
    data.forEach((r: any) => { const q = r.quality || 'unknown'; map[q] = (map[q] || 0) + 1; });
    return Object.keys(map).map(k => ({ name: k, value: map[k] }));
  }, [data]);

  if (loading) return <div className="py-8">Loading analysis...</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard title="Total responses" value={total} />
        <KpiCard title="Avg duration" value={`${avgDuration}s`} />
        <KpiCard title="Completion rate" value={`${completionRate}%`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="p-4 rounded-lg" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          <h4 style={{ color: 'var(--foreground)' }} className="font-semibold mb-2">Activity trend</h4>
          <div style={{ height: 160 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendSeries}>
                <XAxis dataKey="date" tick={{ fill: 'var(--muted-foreground)' }} />
                <YAxis tick={{ fill: 'var(--muted-foreground)' }} />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-4 rounded-lg" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          <h4 style={{ color: 'var(--foreground)' }} className="font-semibold mb-2">Top participants</h4>
          <ul className="space-y-2 mt-2">
            {topParticipants.map((p, i) => (
              <li key={i} className="flex justify-between" style={{ color: 'var(--foreground)' }}>
                <span>{p.name}</span>
                <span style={{ color: 'var(--muted-foreground)' }}>{p.count} responses</span>
              </li>
            ))}
            {topParticipants.length === 0 && <li style={{ color: 'var(--muted-foreground)' }}>No participants yet</li>}
          </ul>
        </div>

        <div className="p-4 rounded-lg" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          <h4 style={{ color: 'var(--foreground)' }} className="font-semibold mb-2">Quality breakdown</h4>
          <div style={{ height: 160 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={qualityBuckets} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.06} />
                <XAxis type="number" tick={{ fill: 'var(--muted-foreground)' }} />
                <YAxis dataKey="name" type="category" tick={{ fill: 'var(--muted-foreground)' }} width={120} />
                <Tooltip />
                <Bar dataKey="value" fill="#6366f1">
                  {qualityBuckets.map((entry, idx) => (
                    <Cell key={`cell-${idx}`} fill={idx % 2 === 0 ? '#6366f1' : '#a78bfa'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="p-4 rounded-lg" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
        <h4 style={{ color: 'var(--foreground)' }} className="font-semibold mb-2">Key insights</h4>
        <ol className="list-decimal pl-5" style={{ color: 'var(--muted-foreground)' }}>
          <li>{total} responses collected; average duration {avgDuration}s.</li>
          <li>Completion rate is {completionRate}%; target improvements could focus on increasing completion.</li>
          <li>Top participants contributed repeat responses — consider deduping or incentivizing fewer repeat submissions if necessary.</li>
        </ol>
      </div>
    </div>
  );
}

function KpiCard({ title, value }: { title: string; value: any }) {
  return (
    <div className="p-4 rounded-lg flex flex-col" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
      <div className="text-sm" style={{ color: 'var(--muted-foreground)' }}>{title}</div>
      <div className="mt-2 text-2xl font-bold" style={{ color: 'var(--foreground)' }}>{value}</div>
    </div>
  );
}
