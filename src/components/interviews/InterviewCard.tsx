import React from 'react';
import { Interview } from '@/types/projects';

export function InterviewCard({ interview, onUpdate }: { interview: Interview; onUpdate?: () => void }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow hover:shadow-lg transition">
      <h3 className="text-xl font-semibold text-slate-800">{interview.name}</h3>
      <p className="text-sm text-slate-500 mt-2">{interview.description || 'No description'}</p>
      <div className="mt-4 text-xs text-slate-400">Status: {interview.status}</div>
    </div>
  );
}

export default InterviewCard;
