'use client';

interface VoiceSelectionCardProps {
  name: string;
  description: string;
  tags: string[];
  isSelected?: boolean;
  onSelect: () => void;
}

export function VoiceSelectionCard({ name, description, tags, isSelected = false, onSelect }: VoiceSelectionCardProps) {
  const containerBase =
    'flex items-center justify-between rounded-xl p-6 transition-all duration-200 cursor-pointer bg-surface border border-surface';
  const containerState = isSelected
    ? ' border-2 border-blue-600 shadow-sm dark:border-blue-400'
    : ' hover:border-blue-400 hover:shadow-sm';

  return (
    <button type="button" onClick={onSelect} className={`${containerBase}${containerState}`}>
      <div className="flex items-start gap-4 text-left">
        <div className="rounded-full bg-gray-100 p-3 text-gray-600 dark:bg-white/10 dark:text-muted">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 1.5a3 3 0 00-3 3v6a3 3 0 006 0v-6a3 3 0 00-3-3z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5v.75a7.5 7.5 0 01-15 0v-.75M12 21v-3" />
          </svg>
        </div>
        <div>
          <p className="text-lg font-semibold text-foreground">{name}</p>
          <p className="mt-1 text-sm text-muted">{description}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span key={tag} className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700 dark:bg-white/10 dark:text-muted">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="flex h-5 w-5 items-center justify-center">
        {isSelected ? (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white dark:bg-blue-500/90">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </span>
        ) : (
          <span className="h-5 w-5 rounded-full border-2 border-gray-300 dark:border-surface" />
        )}
      </div>
    </button>
  );
}
