'use client';

import { useState, useEffect } from 'react';
import { Project, InterviewCategory } from '@/types/projects';
import { createClient } from '@/lib/supabase/client';
import { createResearchStudy } from '@/lib/research-studies/createResearchStudy';
import { v4 as uuidv4 } from 'uuid';

interface NewInterviewModalProps {
  projects: Project[];
  selectedProjectId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

type SupabaseClient = ReturnType<typeof createClient>;

export function NewInterviewModal({ projects, selectedProjectId, onClose, onSuccess }: NewInterviewModalProps) {
  const [formData, setFormData] = useState({
    category: 'usability_testing' as InterviewCategory,
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [creatingResearchStudy, setCreatingResearchStudy] = useState(false);

  // Focus trap management
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    // Don't hide overflow - let the background remain visible

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const categoryOptions = [
    { value: 'usability_testing', label: 'Usability Testing', enabled: true, description: 'User experience feedback' },
    { value: 'product_feedback', label: 'Product Feedback', enabled: true, description: 'Product improvement insights' },
    { value: 'customer_satisfaction', label: 'Customer Satisfaction', enabled: true, description: 'Satisfaction & retention research' },
    { value: 'concept_testing', label: 'Concept Testing', enabled: true, description: 'Test concepts & make go/no-go decisions' },
    { value: 'nps', label: 'NPS', enabled: false, description: 'Net Promoter Score surveys' },
    { value: 'won_deals', label: 'Won Deals', enabled: false, description: 'Success story interviews' },
    { value: 'lost_deals', label: 'Lost Deals', enabled: false, description: 'Exit interviews' },
    { value: 'churn', label: 'Churn', enabled: false, description: 'Customer retention insights' },
    { value: 'renewal', label: 'Renewal', enabled: false, description: 'Renewal feedback' },
    { value: 'custom', label: 'Custom', enabled: false, description: 'Custom interview type' },
  ];

  const getAuthenticatedUser = async (supabase: SupabaseClient) => {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    console.log('Session check result:', { session: session?.user?.id, sessionError });

    let user = session?.user;

    if (!user) {
      console.log('No session found, trying to refresh...');
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      console.log('Refresh result:', { user: refreshData?.user?.id, refreshError });

      if (refreshData?.user) {
        user = refreshData.user;
      } else {
        const { data: { user: userData }, error: userError } = await supabase.auth.getUser();
        console.log('User check result:', { user: userData?.id, userError });
        user = userData || undefined;
      }
    }

    if (!user) {
      console.error('No authenticated user found after all attempts');
      throw new Error('User not authenticated');
    }

    return user;
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // No validation needed - just category selection which has a default
    setErrors(newErrors);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    try {
      const supabase = createClient();
      const user = await getAuthenticatedUser(supabase);

      // Create a default project for this interview type
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .insert({
          name: `${formData.category.charAt(0).toUpperCase() + formData.category.slice(1)} Interviews`,
          description: `Auto-created project for ${formData.category} interviews`,
          category: formData.category,
          status: 'active',
          user_id: user.id,
        } as any)
        .select()
        .single();

      if (projectError) {
        console.error('Project creation error:', projectError);
        throw new Error(`Failed to create project: ${projectError.message}`);
      }

      console.log('Created project:', projectData);
      const projectId = (projectData as any).id;

      // Create interview with default name
      const shareId = uuidv4();
      const shareUrl = `/interview/${shareId}`;

      const { data: interviewData, error: interviewError } = await supabase
        .from('interviews')
        .insert({
          project_id: projectId,
          name: `${formData.category.charAt(0).toUpperCase() + formData.category.slice(1)} Interview`,
          description: `${formData.category} interview created on ${new Date().toLocaleDateString()}`,
          category: formData.category,
          status: 'draft',
          questions: [],
          response_count: 0,
          target_response_count: 10,
          share_url: shareUrl,
          is_public: false
        } as any)
        .select()
        .single();

      if (interviewError) {
        console.error('Interview creation error:', interviewError);
        throw new Error(`Failed to create interview: ${interviewError.message}`);
      }

      console.log('Created interview data:', interviewData);
      const interviewId = (interviewData as any).id;

      console.log('Created interview:', interviewId);
      console.log('Redirecting to:', `/interview-wizard/${interviewId}`);

      // Redirect to interview wizard
      window.location.href = `/interview-wizard/${interviewId}`;

      onSuccess();
    } catch (error) {
      console.error('Error creating interview:', error);
      setErrors({ 
        submit: error instanceof Error ? error.message : 'Failed to create interview' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear related errors
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleCreateResearchStudy = async () => {
    if (creatingResearchStudy) return;

    setErrors({});
    setCreatingResearchStudy(true);

    try {
      const supabase = createClient();
      const user = await getAuthenticatedUser(supabase);
      const { projectId, projectSlug } = await createResearchStudy({
        supabase,
        userId: user.id,
      });

      const identifier = projectSlug || projectId;

      onSuccess();
      window.location.href = `/research-study/${identifier}`;
    } catch (error) {
      console.error('Error creating research study:', error);
      setErrors({
        submit: error instanceof Error ? error.message : 'Failed to create research study',
      });
    } finally {
      setCreatingResearchStudy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden pointer-events-none">
      {/* Transparent background - no overlay, content fully visible */}
      <div 
        className="fixed inset-0 transition-opacity pointer-events-auto"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="absolute right-0 top-0 h-full w-full max-w-md shadow-xl transform transition-transform pointer-events-auto"
           style={{
             backgroundColor: 'var(--card-bg)',
             borderLeft: '1px solid var(--card-border)'
           }}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4"
               style={{ borderBottom: '1px solid var(--card-border)' }}
          >
            <h2 className="text-lg font-semibold"
                style={{ color: 'var(--foreground)' }}
            >
              Create New Interview
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full transition-colors"
              style={{
                color: 'var(--muted-foreground)',
                backgroundColor: 'var(--background)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--background)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--background)';
              }}
              aria-label="Close modal"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
            <div className="flex-1 px-6 py-4 space-y-6 overflow-y-auto">
              {/* Interview Types as Tiles */}
              <div>
                <label className="block text-sm font-medium mb-4"
                       style={{ color: 'var(--foreground)' }}
                >
                  Select Interview Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {categoryOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleInputChange('category', option.value)}
                      className="p-4 border-2 rounded-lg text-left transition-all"
                      style={{
                        backgroundColor: 'var(--card-bg)',
                        borderColor: formData.category === option.value ? '#3b82f6' : 'var(--card-border)',
                        color: formData.category === option.value ? '#1d4ed8' : 'var(--foreground)'
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{option.label}</span>
                        <div className={`w-4 h-4 rounded-full border-2 ${
                          formData.category === option.value
                            ? 'border-blue-500'
                            : ''
                        }`}
                             style={{
                               borderColor: formData.category === option.value ? '#3b82f6' : 'var(--card-border)',
                               backgroundColor: formData.category === option.value ? '#3b82f6' : 'transparent'
                             }}
                        >
                          {formData.category === option.value && (
                            <div className="w-2 h-2 bg-white rounded-full m-0.5"></div>
                          )}
                        </div>
                      </div>
                      <p className="text-xs mt-1"
                         style={{ color: 'var(--muted-foreground)' }}
                      >
                        {option.value === 'nps' && 'Net Promoter Score surveys'}
                        {option.value === 'won_deals' && 'Success story interviews'}
                        {option.value === 'lost_deals' && 'Exit interviews'}
                        {option.value === 'churn' && 'Customer retention insights'}
                        {option.value === 'renewal' && 'Renewal feedback'}
                        {option.value === 'custom' && 'Custom interview type'}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              <div
                className="pt-4"
                style={{ borderTop: '1px dashed var(--card-border)' }}
              >
                <label className="block text-sm font-medium mb-4"
                       style={{ color: 'var(--foreground)' }}
                >
                  Stimuli Study Workspace
                </label>
                <button
                  type="button"
                  onClick={handleCreateResearchStudy}
                  disabled={creatingResearchStudy}
                  className="w-full p-4 border-2 rounded-lg text-left transition-all hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                  style={{
                    backgroundColor: 'var(--card-bg)',
                    borderColor: 'var(--card-border)',
                    color: 'var(--foreground)'
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Stimuli Study</span>
                        <span className="text-xs font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                          Beta
                        </span>
                      </div>
                      <p className="text-xs mt-1"
                         style={{ color: 'var(--muted-foreground)' }}
                      >
                        Upload creative stimuli, generate briefs, and manage research study assets in one workspace.
                      </p>
                    </div>
                    <div className="flex items-center">
                      {creatingResearchStudy ? (
                        <svg className="w-5 h-5 animate-spin text-blue-500" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      )}
                    </div>
                  </div>
                </button>
              </div>

              {/* Error Message */}
              {errors.submit && (
                <div className="p-3 rounded-md"
                     style={{
                       backgroundColor: 'rgba(239, 68, 68, 0.1)',
                       border: '1px solid rgba(239, 68, 68, 0.2)',
                       color: '#dc2626'
                     }}
                >
                  <p className="text-sm">{errors.submit}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4"
                 style={{
                   borderTop: '1px solid var(--card-border)',
                   backgroundColor: 'var(--background)'
                 }}
            >
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{
                  color: 'var(--foreground)',
                  backgroundColor: 'var(--card-bg)',
                  borderColor: 'var(--card-border)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--button-hover-bg)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--card-bg)';
                }}
                disabled={loading}
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
