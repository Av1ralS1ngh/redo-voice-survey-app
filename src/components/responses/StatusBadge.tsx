'use client';

interface StatusBadgeProps {
  status: 'completed' | 'processing' | 'failed';
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const styles = {
    completed: 'bg-green-100 text-green-800 border-green-200',
    processing: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    failed: 'bg-red-100 text-red-800 border-red-200'
  };

  const labels = {
    completed: 'Completed',
    processing: 'Processing',
    failed: 'Failed'
  };

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}
