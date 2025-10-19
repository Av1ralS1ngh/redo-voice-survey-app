'use client';

import type { LucideIcon } from 'lucide-react';

interface UseCaseCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  isSelected?: boolean;
  onClick: () => void;
}

export function UseCaseCard({ icon: Icon, title, description, isSelected = false, onClick }: UseCaseCardProps) {
  const baseClasses = 'group w-full text-left rounded-xl bg-surface border border-surface p-6 shadow-sm transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer hover:-translate-y-1 hover:shadow-lg';
  const stateClasses = isSelected
    ? ' border-2 border-blue-600 shadow-lg dark:border-blue-400'
    : ' hover:border-blue-400/60';
  const iconBase = 'inline-flex h-12 w-12 items-center justify-center rounded-lg transition-all duration-300';
  const iconState = isSelected
    ? ' bg-blue-600 text-white dark:bg-blue-500'
    : ' bg-gray-100 text-gray-700 group-hover:bg-blue-600 group-hover:text-white dark:bg-white/10 dark:text-muted';

  return (
    <button type="button" onClick={onClick} className={`${baseClasses}${stateClasses}`}>
      <div className={`${iconBase}${iconState}`}>
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-sm text-muted">{description}</p>
    </button>
  );
}
