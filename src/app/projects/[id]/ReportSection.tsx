"use client";

import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
  CartesianGrid,
  AreaChart,
  Area
} from 'recharts';
// avoid date-fns dependency; use toISOString slice for date keys

type Resp = any;

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function ReportSection({ projectId }: { projectId: string }) {
  const [data, setData] = useState<Resp[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/responses?limit=500`);
        const json = await res.json();
        const responses = json.responses || [];

        // Try to scope to project if metadata exists
        const projectResponses = responses.filter((r: any) => {
          const md = r.metadata || {};
          return md.projectId === projectId || md.project_id === projectId || r.projectId === projectId || r.session_project_id === projectId;
        });

        const final = projectResponses.length ? projectResponses : responses;

        if (mounted) setData(final);
      } catch (e) {
        console.error('Failed to load responses for report', e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [projectId]);

  // Compute metrics
  const total = data.length;
  const avgDuration = total ? Math.round(data.reduce((s: number, r: any) => s + (r.duration || 0), 0) / total) : 0;
  const completionCounts = data.reduce((acc: any, r: any) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc; }, {});
  const qualityCounts = data.reduce((acc: any, r: any) => { acc[r.quality] = (acc[r.quality] || 0) + 1; return acc; }, {});

  // Time series aggregation (per-day)
  const timeseriesMap: Record<string, number> = {};
  data.forEach((r: any) => {
    const d = r.date ? new Date(r.date) : new Date();
    const key = d.toISOString().slice(0, 10);
    timeseriesMap[key] = (timeseriesMap[key] || 0) + 1;
  });
  const timeseries = Object.keys(timeseriesMap).sort().map(k => ({ date: k, count: timeseriesMap[k] }));

  // Duration buckets
  const buckets: Record<string, number> = { '<1m': 0, '1-3m': 0, '3-5m': 0, '>5m': 0 };
  data.forEach((r: any) => {
    const s = r.duration || 0;
    if (s < 60) buckets['<1m']++;
    else if (s < 180) buckets['1-3m']++;
    else if (s < 300) buckets['3-5m']++;
    else buckets['>5m']++;
  });
  const durationSeries = Object.keys(buckets).map(k => ({ name: k, value: buckets[k] }));

  const qualitySeries = Object.keys(qualityCounts).map((k, i) => ({ name: k || 'unknown', value: qualityCounts[k], color: COLORS[i % COLORS.length] }));
  const statusSeries = Object.keys(completionCounts).map((k, i) => ({ name: k, value: completionCounts[k], color: COLORS[i % COLORS.length] }));

  if (loading) return <div className="py-8">Loading report...</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <StatCard label="Total responses" value={total} />
        <StatCard label="Avg duration" value={`${Math.round(avgDuration)}s`} />
        <StatCard label="Completion rate" value={`${Math.round(((completionCounts['completed'] || 0) / Math.max(total,1)) * 100)}%`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-4 rounded-lg" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          <h4 style={{ color: 'var(--foreground)' }} className="mb-2 font-semibold">Responses over time</h4>
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeseries}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fill: 'var(--muted-foreground)' }} />
                <YAxis tick={{ fill: 'var(--muted-foreground)' }} />
                <Tooltip />
                <Area type="monotone" dataKey="count" stroke="#3b82f6" fillOpacity={1} fill="url(#colorCount)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-4 rounded-lg" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          <h4 style={{ color: 'var(--foreground)' }} className="mb-2 font-semibold">Quality distribution</h4>
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={qualitySeries} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                  {qualitySeries.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-4 rounded-lg" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          <h4 style={{ color: 'var(--foreground)' }} className="mb-2 font-semibold">Duration buckets</h4>
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={durationSeries}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.06} />
                <XAxis dataKey="name" tick={{ fill: 'var(--muted-foreground)' }} />
                <YAxis tick={{ fill: 'var(--muted-foreground)' }} />
                <Tooltip />
                <Bar dataKey="value" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-4 rounded-lg" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          <h4 style={{ color: 'var(--foreground)' }} className="mb-2 font-semibold">Status breakdown</h4>
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusSeries} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={70} label>
                  {statusSeries.map((entry, index) => (
                    <Cell key={`cell-s-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: any }) {
  return (
    <div className="p-4 rounded-lg flex flex-col" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
      <div className="text-sm" style={{ color: 'var(--muted-foreground)' }}>{label}</div>
      <div className="mt-2 text-2xl font-bold" style={{ color: 'var(--foreground)' }}>{value}</div>
    </div>
  );

