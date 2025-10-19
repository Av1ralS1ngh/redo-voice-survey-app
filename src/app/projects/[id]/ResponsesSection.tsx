"use client";

import { useState, useEffect } from 'react';
import { ResponsesTable } from '@/components/responses/ResponsesTable';
import { ResponsesFilters } from '@/components/responses/ResponsesFilters';
import { BulkActionsToolbar } from '@/components/responses/BulkActionsToolbar';
import { ConversationResponse } from '@/types/responses';
import { downloadResponses } from '@/lib/download-service';

interface ResponsesSectionProps {
  projectId: string;
}

export default function ResponsesSection({ projectId }: ResponsesSectionProps) {
  const [responses, setResponses] = useState<ConversationResponse[]>([]);
  const [filteredResponses, setFilteredResponses] = useState<ConversationResponse[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [filters, setFilters] = useState({
    status: 'completed',
    quality: '',
    dateRange: 'last30days',
    attributes: [] as string[]
  });

  useEffect(() => { loadResponses(); }, []);
  useEffect(() => { applyFilters(); }, [responses, filters]);

  const loadResponses = async () => {
    try {
      setLoading(true);
      const resp = await fetch(`/api/responses?projectId=${encodeURIComponent(projectId)}`);
      if (!resp.ok) throw new Error('Failed to load responses');
      const data = await resp.json();
      setResponses(data.responses || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load responses');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...responses];
    if (filters.status) filtered = filtered.filter(r => r.status === filters.status);
    if (filters.quality) filtered = filtered.filter(r => r.quality === filters.quality);

    if (filters.dateRange) {
      const now = new Date();
      const cutoff = new Date();
      switch (filters.dateRange) {
        case 'last7days': cutoff.setDate(now.getDate() - 7); break;
        case 'last30days': cutoff.setDate(now.getDate() - 30); break;
        case 'last90days': cutoff.setDate(now.getDate() - 90); break;
      }
      filtered = filtered.filter(r => new Date(r.date) >= cutoff);
    }

    if (filters.attributes.length > 0) {
      filtered = filtered.filter(r => filters.attributes.some(attr => r.attributes?.includes(attr)));
    }

    setFilteredResponses(filtered);
  };

  const handleSelectionChange = (id: string, selected: boolean) => {
    const newSelected = new Set(selectedIds);
    if (selected) newSelected.add(id); else newSelected.delete(id);
    setSelectedIds(newSelected);
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) setSelectedIds(new Set(filteredResponses.map(r => r.id)));
    else setSelectedIds(new Set());
  };

  const handleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleBulkAction = async (action: string) => {
    const selectedResponses = filteredResponses.filter(r => selectedIds.has(r.id));
    if (action === 'download') {
      try { await downloadResponses(selectedResponses); setSelectedIds(new Set()); } catch (err) { console.error(err); alert('Download failed'); }
    }
  };

  const resetFilters = () => setFilters({ status: 'completed', quality: '', dateRange: 'last30days', attributes: [] });

  if (loading) {
    return (
      <div className="min-h-64 flex items-center justify-center p-8" style={{ background: 'var(--page-bg)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4" />
          <p style={{ color: 'var(--foreground)', opacity: 0.8 }}>Loading responses...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-64 flex items-center justify-center p-8" style={{ background: 'var(--page-bg)' }}>
        <div className="text-center">
          <div className="text-red-600 mb-4">⚠️ Error</div>
          <p className="mb-4" style={{ color: 'var(--foreground)', opacity: 0.8 }}>{error}</p>
          <button onClick={loadResponses} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--page-bg)' }}>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>Responses</h2>
          <p style={{ color: 'var(--foreground)', opacity: 0.8 }}>Responses for this project</p>
        </div>

        <ResponsesFilters
          filters={filters}
          onFiltersChange={setFilters}
          onReset={resetFilters}
          totalCount={responses.length}
          filteredCount={filteredResponses.length}
        />

        {selectedIds.size > 0 && (
          <BulkActionsToolbar selectedCount={selectedIds.size} onAction={handleBulkAction} onClear={() => setSelectedIds(new Set())} />
        )}

        <ResponsesTable
          responses={filteredResponses}
          selectedIds={selectedIds}
          expandedId={expandedId}
          onSelectionChange={handleSelectionChange}
          onSelectAll={handleSelectAll}
          onExpand={handleExpand}
        />

        {filteredResponses.length === 0 && (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-4">📝</div>
            <h3 className="text-lg font-medium" style={{ color: 'var(--foreground)' }}>No responses found</h3>
            <p style={{ color: 'var(--muted-foreground)' }}>
              {responses.length === 0 ? 'No responses have been recorded yet.' : 'Try adjusting your filters.'}
            </p>
            {responses.length > 0 && (
              <button onClick={resetFilters} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Reset Filters</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
