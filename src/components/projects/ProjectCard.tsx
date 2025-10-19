'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Project, ProjectCategory } from '@/types/projects';
import { formatRelativeDate } from '@/utils/dateUtils';

interface ProjectCardProps {
  project: Project;
  onUpdate: () => void;
}

export function ProjectCard({ project, onUpdate }: ProjectCardProps) {
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const router = useRouter();

  const getCategoryConfig = (category: ProjectCategory) => {
    const configs: Record<ProjectCategory, { label: string; color: string }> = {
      custom: { label: 'Custom', color: 'bg-gray-100 text-gray-800' },
      nps: { label: 'NPS', color: 'bg-blue-100 text-blue-800' },
      lost_deals: { label: 'Lost Deals', color: 'bg-red-100 text-red-800' },
      won_deals: { label: 'Won Deals', color: 'bg-green-100 text-green-800' },
      churn: { label: 'Churn', color: 'bg-orange-100 text-orange-800' },
      renewal: { label: 'Renewal', color: 'bg-purple-100 text-purple-800' },
      product_feedback: { label: 'Product Feedback', color: 'bg-teal-100 text-teal-800' },
      usability_testing: { label: 'Usability Testing', color: 'bg-sky-100 text-sky-800' },
      customer_satisfaction: { label: 'Customer Satisfaction', color: 'bg-emerald-100 text-emerald-800' },
      concept_testing: { label: 'Concept Testing', color: 'bg-pink-100 text-pink-800' },
      research_study: { label: 'Research Study', color: 'bg-indigo-100 text-indigo-800' }
    };
    return configs[category] || configs.custom;
  };

  const formatResponseRate = () => {
    if (project.interviewCount === 0) return '0% (0 of 0)';
    
    const totalPossibleResponses = project.interviewCount * 10; // Assuming 10 target responses per interview
    const rate = project.responseCount > 0 
      ? Math.round((project.responseCount / totalPossibleResponses) * 100)
      : 0;
    
    return `${rate}% (${project.responseCount} of ${totalPossibleResponses})`;
  };

  const handleCardClick = () => {
    const identifier = project.slug || project.id;

    if (project.category === 'research_study') {
      router.push(`/research-study/${identifier}`);
      return;
    }

    router.push(`/projects/${identifier}`);
  };

  const handleEdit = async () => {
    setShowActionsMenu(false);
    // TODO: Implement edit modal
    console.log('Edit project:', project.id);
  };

  const handleArchive = async () => {
    setShowActionsMenu(false);
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'archived' }),
      });
      
      if (response.ok) {
        onUpdate();
      } else {
        console.error('Failed to archive project');
      }
    } catch (error) {
      console.error('Error archiving project:', error);
    }
  };

  const handleDelete = async () => {
    setShowActionsMenu(false);
    if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        onUpdate();
      } else {
        const data = await response.json();
        const errorMessage = data.error || 'Failed to delete project';
        console.error('Failed to delete project:', errorMessage);
        alert(errorMessage);
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      alert('An unexpected error occurred while deleting the project');
    }
  };

  const categoryConfig = getCategoryConfig(project.category);

  return (
    <div className="relative">
      <div
        onClick={handleCardClick}
        className="rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer group"
        style={{
          backgroundColor: 'var(--card-bg)',
          border: '1px solid var(--card-border)'
        }}
      >
        {/* Header with title and actions */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold truncate group-hover:text-blue-600 transition-colors"
                style={{ color: 'var(--foreground)' }}
            >
              {project.name}
            </h3>
            {project.description && (
              <p className="text-sm mt-1 line-clamp-2"
                 style={{ color: 'var(--muted-foreground)' }}
              >
                {project.description}
              </p>
            )}
          </div>

          {/* Actions Menu */}
          <div className="relative ml-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowActionsMenu(!showActionsMenu);
              }}
              className="p-2 rounded-full transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
              style={{
                color: 'var(--muted-foreground)',
                backgroundColor: 'transparent'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
              aria-label="Project actions"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </button>

            {showActionsMenu && (
              <div className="absolute right-0 top-full mt-1 w-48 rounded-md shadow-lg z-10"
                   style={{
                     backgroundColor: 'var(--card-bg)',
                     border: '1px solid var(--card-border)'
                   }}
              >
                <div className="py-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit();
                    }}
                    className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                    style={{
                      backgroundColor: 'transparent',
                      color: 'var(--foreground)'
                    }}
                  >
                    Edit project
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleArchive();
                    }}
                    className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                    style={{
                      backgroundColor: 'transparent',
                      color: 'var(--foreground)'
                    }}
                  >
                    Archive
                  </button>
                  <hr className="my-1" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete();
                    }}
                    className="block w-full text-left px-4 py-2 text-sm hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400"
                    style={{
                      backgroundColor: 'transparent'
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Category Tag */}
        <div className="mb-4">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${categoryConfig.color}`}>
            {categoryConfig.label}
          </span>
        </div>

        {/* Metadata */}
        <div className="space-y-2 text-sm"
             style={{ color: 'var(--muted-foreground)' }}
        >
          <div className="flex items-center justify-between">
            <span>Interviews</span>
            <span className="font-medium">{project.interviewCount}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span>Response rate</span>
            <span className="font-medium">{formatResponseRate()}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span>Updated</span>
            <span className="font-medium">{formatRelativeDate(project.updatedAt)}</span>
          </div>
        </div>

        {/* Status Indicator */}
        {project.status !== 'active' && (
          <div className="mt-4 pt-4"
               style={{ borderTop: '1px solid var(--card-border)' }}
          >
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
              project.status === 'archived' 
                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' 
                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
            }`}>
              {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
            </span>
          </div>
        )}
      </div>

      {/* Click outside to close menu */}
      {showActionsMenu && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowActionsMenu(false)}
        />
      )}
    </div>
  );
}
