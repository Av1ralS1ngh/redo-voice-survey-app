'use client';

import { useState } from 'react';
import { Interview, InterviewCategory } from '@/types/projects';
import { formatRelativeDate } from '@/utils/dateUtils';

interface InterviewTableProps {
  interviews: Interview[];
  onUpdate: () => void;
}

export function InterviewTable({ interviews, onUpdate }: InterviewTableProps) {
  const [sortBy, setSortBy] = useState<'name' | 'status' | 'updated' | 'responses'>('updated');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const getCategoryConfig = (category: InterviewCategory) => {
    const configs = {
      custom: { label: 'Custom', color: 'bg-gray-100 text-gray-800' },
      nps: { label: 'NPS', color: 'bg-blue-100 text-blue-800' },
      lost_deals: { label: 'Lost Deals', color: 'bg-red-100 text-red-800' },
      won_deals: { label: 'Won Deals', color: 'bg-green-100 text-green-800' },
      churn: { label: 'Churn', color: 'bg-orange-100 text-orange-800' },
      renewal: { label: 'Renewal', color: 'bg-purple-100 text-purple-800' },
      usability_testing: { label: 'Usability Testing', color: 'bg-indigo-100 text-indigo-800' },
      product_feedback: { label: 'Product Feedback', color: 'bg-cyan-100 text-cyan-800' },
      customer_satisfaction: { label: 'Customer Satisfaction', color: 'bg-emerald-100 text-emerald-800' },
      concept_testing: { label: 'Concept Testing', color: 'bg-pink-100 text-pink-800' }
    };
    return configs[category] || configs.custom;
  };

  const getStatusConfig = (status: Interview['status']) => {
    const configs = {
      draft: { label: 'Draft', color: 'bg-gray-100 text-gray-800' },
      active: { label: 'Active', color: 'bg-green-100 text-green-800' },
      completed: { label: 'Completed', color: 'bg-blue-100 text-blue-800' },
      archived: { label: 'Archived', color: 'bg-yellow-100 text-yellow-800' }
    };
    return configs[status] || configs.draft;
  };

  const sortedInterviews = [...interviews].sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'status':
        comparison = a.status.localeCompare(b.status);
        break;
      case 'updated':
        comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        break;
      case 'responses':
        comparison = a.responseCount - b.responseCount;
        break;
      default:
        comparison = 0;
    }
    
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const handleInterviewAction = async (interview: Interview, action: 'activate' | 'archive' | 'delete') => {
    try {
      if (action === 'delete') {
        if (!confirm(`Are you sure you want to delete "${interview.name}"? This action cannot be undone.`)) {
          return;
        }
      }

      const response = await fetch(`/api/interviews/${interview.id}`, {
        method: action === 'delete' ? 'DELETE' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: action !== 'delete' ? JSON.stringify({
          status: action === 'activate' ? 'active' : 'archived'
        }) : undefined,
      });

      if (response.ok) {
        onUpdate();
      } else {
        console.error(`Failed to ${action} interview`);
      }
    } catch (error) {
      console.error(`Error ${action}ing interview:`, error);
    }
  };

  const SortButton = ({ column, children }: { column: typeof sortBy; children: React.ReactNode }) => (
    <button
      onClick={() => handleSort(column)}
      className="flex items-center gap-1 text-left font-medium text-gray-700 hover:text-gray-900"
    >
      {children}
      <svg 
        className={`w-4 h-4 transition-transform ${
          sortBy === column && sortOrder === 'desc' ? 'rotate-180' : ''
        }`} 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  );

  return (
    <div className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <SortButton column="name">Name</SortButton>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <SortButton column="status">Status</SortButton>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <SortButton column="responses">Responses</SortButton>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <SortButton column="updated">Updated</SortButton>
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedInterviews.map((interview) => {
              const categoryConfig = getCategoryConfig(interview.category);
              const statusConfig = getStatusConfig(interview.status);
              const responseRate = interview.targetResponseCount > 0 
                ? Math.round((interview.responseCount / interview.targetResponseCount) * 100)
                : 0;

              return (
                <tr key={interview.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {interview.name}
                      </div>
                      {interview.description && (
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          {interview.description}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${categoryConfig.color}`}>
                      {categoryConfig.label}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig.color}`}>
                      {statusConfig.label}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>
                      <div className="font-medium">{interview.responseCount} of {interview.targetResponseCount}</div>
                      <div className="text-xs text-gray-500">{responseRate}% complete</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatRelativeDate(interview.updatedAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      {interview.status === 'draft' && (
                        <button
                          onClick={() => handleInterviewAction(interview, 'activate')}
                          className="text-green-600 hover:text-green-900 text-sm"
                        >
                          Activate
                        </button>
                      )}
                      
                      {interview.status === 'active' && (
                        <button
                          onClick={() => handleInterviewAction(interview, 'archive')}
                          className="text-yellow-600 hover:text-yellow-900 text-sm"
                        >
                          Archive
                        </button>
                      )}

                      {interview.shareUrl && (
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}${interview.shareUrl}`);
                            // Could add toast notification here
                          }}
                          className="text-blue-600 hover:text-blue-900 text-sm"
                          title="Copy share link"
                        >
                          Share
                        </button>
                      )}

                      <button
                        onClick={() => {
                          // TODO: Navigate to interview responses/analytics
                          console.log('View interview:', interview.id);
                        }}
                        className="text-blue-600 hover:text-blue-900 text-sm"
                      >
                        View
                      </button>

                      <button
                        onClick={() => handleInterviewAction(interview, 'delete')}
                        className="text-red-600 hover:text-red-900 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
