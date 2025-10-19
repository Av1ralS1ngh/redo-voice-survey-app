'use client';

import { ResponsesFilters as FiltersType } from '@/types/responses';

interface ResponsesFiltersProps {
  filters: FiltersType;
  onFiltersChange: (filters: FiltersType) => void;
  onReset: () => void;
  totalCount: number;
  filteredCount: number;
}

export function ResponsesFilters({
  filters,
  onFiltersChange,
  onReset,
  totalCount,
  filteredCount
}: ResponsesFiltersProps) {
  const updateFilter = (key: keyof FiltersType, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  const hasActiveFilters = 
    filters.status !== 'completed' ||
    filters.quality !== '' ||
    filters.dateRange !== 'last30days' ||
    filters.attributes.length > 0;

  return (
    <div className="rounded-lg shadow-sm p-6 mb-6" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
      <div className="flex flex-wrap items-center gap-4 mb-4">
        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Status:</label>
          <select
            value={filters.status}
            onChange={(e) => updateFilter('status', e.target.value)}
            className="px-3 py-2 border rounded-md text-sm focus:outline-none"
            style={{ borderColor: 'var(--card-border)', background: 'transparent', color: 'var(--foreground)' }}
          >
            <option value="">All</option>
            <option value="completed">Completed</option>
            <option value="processing">Processing</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        {/* Quality Filter */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Quality:</label>
          <select
            value={filters.quality}
            onChange={(e) => updateFilter('quality', e.target.value)}
            className="px-3 py-2 border rounded-md text-sm focus:outline-none"
            style={{ borderColor: 'var(--card-border)', background: 'transparent', color: 'var(--foreground)' }}
          >
            <option value="">All</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        {/* Date Range Filter */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Date:</label>
          <select
            value={filters.dateRange}
            onChange={(e) => updateFilter('dateRange', e.target.value)}
            className="px-3 py-2 border rounded-md text-sm focus:outline-none"
            style={{ borderColor: 'var(--card-border)', background: 'transparent', color: 'var(--foreground)' }}
          >
            <option value="last7days">Last 7 days</option>
            <option value="last30days">Last 30 days</option>
            <option value="last90days">Last 90 days</option>
            <option value="all">All time</option>
          </select>
        </div>

        {/* Reset Filters Button */}
        {hasActiveFilters && (
          <button
            onClick={onReset}
            className="px-4 py-2 text-sm rounded-md transition-colors"
            style={{ color: 'var(--foreground)', border: '1px solid var(--card-border)', background: 'transparent' }}
          >
            Reset filters
          </button>
        )}
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between text-sm" style={{ color: 'var(--muted-foreground)' }}>
        <span style={{ color: 'var(--muted-foreground)' }}>
          Showing {filteredCount.toLocaleString()} of {totalCount.toLocaleString()} responses
        </span>
        {hasActiveFilters && (
          <span style={{ color: 'var(--button-bg)' }}>
            {totalCount - filteredCount} filtered out
          </span>
        )}
      </div>

      {/* Active Filters Tags */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 mt-3 pt-3" style={{ borderTop: '1px solid var(--card-border)' }}>
          {filters.status && filters.status !== 'completed' && (
            <FilterTag
              label={`Status: ${filters.status}`}
              onRemove={() => updateFilter('status', 'completed')}
            />
          )}
          {filters.quality && (
            <FilterTag
              label={`Quality: ${filters.quality}`}
              onRemove={() => updateFilter('quality', '')}
            />
          )}
          {filters.dateRange && filters.dateRange !== 'last30days' && (
            <FilterTag
              label={`Date: ${filters.dateRange.replace(/([a-z])([0-9])/g, '$1 $2')}`}
              onRemove={() => updateFilter('dateRange', 'last30days')}
            />
          )}
          {filters.attributes.map(attr => (
            <FilterTag
              key={attr}
              label={attr}
              onRemove={() => updateFilter('attributes', 
                filters.attributes.filter(a => a !== attr)
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface FilterTagProps {
  label: string;
  onRemove: () => void;
}

function FilterTag({ label, onRemove }: FilterTagProps) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
      {label}
      <button
        onClick={onRemove}
        className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"
        aria-label={`Remove ${label} filter`}
      >
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>
    </span>
  );
}
