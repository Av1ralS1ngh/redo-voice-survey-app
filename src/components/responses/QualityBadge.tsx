'use client';

interface QualityBadgeProps {
  quality: 'high' | 'medium' | 'low';
}

export function QualityBadge({ quality }: QualityBadgeProps) {
  const styles = {
    high: 'bg-blue-100 text-blue-800 border-blue-200',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    low: 'bg-gray-100 text-gray-800 border-gray-200'
  };

  const labels = {
    high: 'High',
    medium: 'Medium',
    low: 'Low'
  };

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${styles[quality]}`}>
      {labels[quality]}
    </span>
  );
}
