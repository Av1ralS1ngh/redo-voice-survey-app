'use client';

import { useState } from 'react';
import { Project, ProjectCategory } from '@/types/projects';
import { formatRelativeDate } from '@/utils/dateUtils';

interface ProjectHeaderProps {
  project: Project;
  onUpdate: () => void;
}

export function ProjectHeader({ project, onUpdate }: ProjectHeaderProps) {
  const [showActionsMenu, setShowActionsMenu] = useState(false);

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

  const handleEdit = () => {
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

  const categoryConfig = getCategoryConfig(project.category);

  return (
    <div className="mb-8">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-gray-900 truncate">{project.name}</h1>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${categoryConfig.color}`}>
              {categoryConfig.label}
            </span>
            {project.status !== 'active' && (
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                project.status === 'archived' 
                  ? 'bg-yellow-100 text-yellow-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
              </span>
            )}
          </div>
          
          {project.description && (
            <p className="text-gray-600 mb-2">{project.description}</p>
          )}
          
          <p className="text-sm text-gray-500">
            Created {formatRelativeDate(project.createdAt)} • 
            Updated {formatRelativeDate(project.updatedAt)}
          </p>
        </div>

        {/* Actions Menu */}
        <div className="relative ml-4">
          <button
            onClick={() => setShowActionsMenu(!showActionsMenu)}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Project actions"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </button>

          {showActionsMenu && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-10">
              <div className="py-1">
                <button
                  onClick={handleEdit}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Edit project
                </button>
                <button
                  onClick={handleArchive}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Archive project
                </button>
                <hr className="my-1" />
                <button
                  onClick={() => {
                    setShowActionsMenu(false);
                    // TODO: Implement export functionality
                    console.log('Export project data:', project.id);
                  }}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Export data
                </button>
              </div>
            </div>
          )}
        </div>
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
