'use client';

import { useState, useEffect } from 'react';
import { ResponsesTable } from '@/components/responses/ResponsesTable';
import { ResponsesFilters } from '@/components/responses/ResponsesFilters';
import { BulkActionsToolbar } from '@/components/responses/BulkActionsToolbar';
import { ConversationResponse } from '@/types/responses';
import { downloadResponses } from '@/lib/download-service';

export default function ResponsesPage() {
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

  // Load responses on mount
  useEffect(() => {
    loadResponses();
  }, []);

  // Apply filters when responses or filters change
  useEffect(() => {
    applyFilters();
  }, [responses, filters]);

  const loadResponses = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/responses');
      if (!response.ok) throw new Error('Failed to load responses');
      
      const data = await response.json();
      setResponses(data.responses || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load responses');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...responses];

    // Status filter
    if (filters.status) {
      filtered = filtered.filter(r => r.status === filters.status);
    }

    // Quality filter
    if (filters.quality) {
      filtered = filtered.filter(r => r.quality === filters.quality);
    }

    // Date range filter
    if (filters.dateRange) {
      const now = new Date();
      const cutoff = new Date();
      
      switch (filters.dateRange) {
        case 'last7days':
          cutoff.setDate(now.getDate() - 7);
          break;
        case 'last30days':
          cutoff.setDate(now.getDate() - 30);
          break;
        case 'last90days':
          cutoff.setDate(now.getDate() - 90);
          break;
      }
      
      filtered = filtered.filter(r => new Date(r.date) >= cutoff);
    }

    // Attributes filter
    if (filters.attributes.length > 0) {
      filtered = filtered.filter(r => 
        filters.attributes.some(attr => r.attributes?.includes(attr))
      );
    }

    setFilteredResponses(filtered);
  };

  const handleSelectionChange = (id: string, selected: boolean) => {
    const newSelected = new Set(selectedIds);
    if (selected) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedIds(new Set(filteredResponses.map(r => r.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleBulkAction = async (action: string) => {
    const selectedResponses = filteredResponses.filter(r => selectedIds.has(r.id));
    
    switch (action) {
      case 'download':
        try {
          await downloadResponses(selectedResponses);
          // Clear selection after successful download
          setSelectedIds(new Set());
        } catch (error) {
          console.error('Bulk download failed:', error);
          alert('Download failed. Please try again.');
        }
        break;
      case 'delete':
        // Implement bulk delete
        console.log('Deleting:', selectedResponses.length, 'responses');
        break;
      case 'tag':
        // Implement bulk tagging
        console.log('Tagging:', selectedResponses.length, 'responses');
        break;
    }
  };

  const resetFilters = () => {
    setFilters({
      status: 'completed',
      quality: '',
      dateRange: 'last30days',
      attributes: []
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--page-bg)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p style={{ color: 'var(--foreground)', opacity: 0.7 }}>Loading responses...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--page-bg)' }}>
        <div className="text-center">
          <div className="text-red-600 mb-4">⚠️ Error</div>
          <p className="mb-4" style={{ color: 'var(--foreground)', opacity: 0.7 }}>{error}</p>
          <button 
            onClick={loadResponses}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--page-bg)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold" style={{ color: 'var(--foreground)' }}>Responses</h1>
          <p className="mt-2" style={{ color: 'var(--foreground)', opacity: 0.7 }}>
            Review and manage recorded AI conversations
          </p>
        </div>

        {/* Filters */}
        <ResponsesFilters
          filters={filters}
          onFiltersChange={setFilters}
          onReset={resetFilters}
          totalCount={responses.length}
          filteredCount={filteredResponses.length}
        />

        {/* Bulk Actions Toolbar */}
        {selectedIds.size > 0 && (
          <BulkActionsToolbar
            selectedCount={selectedIds.size}
            onAction={handleBulkAction}
            onClear={() => setSelectedIds(new Set())}
          />
        )}

        {/* Responses Table */}
        <ResponsesTable
          responses={filteredResponses}
          selectedIds={selectedIds}
          expandedId={expandedId}
          onSelectionChange={handleSelectionChange}
          onSelectAll={handleSelectAll}
          onExpand={handleExpand}
        />

        {/* Empty State */}
        {filteredResponses.length === 0 && !loading && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">📝</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No responses found
            </h3>
            <p className="text-gray-600 mb-4">
              {responses.length === 0 
                ? "No responses have been recorded yet."
                : "Try adjusting your filters to see more results."
              }
            </p>
            {responses.length > 0 && (
              <button
                onClick={resetFilters}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Reset Filters
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
