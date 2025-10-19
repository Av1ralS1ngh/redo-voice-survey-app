import React from 'react';

export function EmptyInterviewsState({ onNewInterview }: { onNewInterview: () => void }) {
  return (
    <div className="text-center py-20 bg-white/60 backdrop-blur-md rounded-2xl shadow-lg">
      <p className="text-slate-600 mb-4 text-xl">You have no interviews yet.</p>
      <p className="text-slate-500 mb-6">Create your first interview to get started.</p>
      <button onClick={onNewInterview} className="px-6 py-3 bg-blue-600 text-white rounded-lg">New Interview</button>
    </div>
  );
}

export default EmptyInterviewsState;
