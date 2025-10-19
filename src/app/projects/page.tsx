'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { EmptyProjectsState } from '@/components/projects/EmptyProjectsState';
import { LogoutButton } from '@/components/LogoutButton';
import { Project } from '@/types/projects';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const router = useRouter();

  // Load projects on mount
  useEffect(() => {
    checkAuthAndLoadProjects();
  }, []);

  const checkAuthAndLoadProjects = async () => {
    try {
      const supabase = createClient();
      
      // Get current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log('Projects page session check:', { session: session?.user?.id, sessionError });
      
      let user = session?.user;
      
      if (!user) {
        // Try refreshing the session
        console.log('No session found, trying to refresh...');
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        console.log('Refresh result:', { user: refreshData?.user?.id, refreshError });
        
        if (refreshData?.user) {
          user = refreshData.user;
        } else {
          // Try getUser as final fallback
          const { data: { user: userData }, error: userError } = await supabase.auth.getUser();
          console.log('User check result:', { user: userData?.id, userError });
          user = userData || undefined;
        }
      }
      
      if (!user) {
        console.log('No user found, redirecting to login');
        window.location.href = '/login?next=/projects';
        return;
      }

      loadProjects();
    } catch (err) {
      console.error('Authentication check failed:', err);
      setError('Authentication check failed');
      setLoading(false);
    }
  };

  const loadProjects = async () => {
    try {
      setLoading(true);
      // Use client-side supabase to fetch projects in user session (RLS will apply)
      const supabase = createClient();
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;

      setProjects((data || []) as any[]);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadProjects();
  };

  const handleNewInterview = () => {
    router.push('/projects/new-interview');
  };

  const formatLastUpdated = (date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Updated just now';
    if (diffInSeconds < 3600) return `Updated ${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `Updated ${Math.floor(diffInSeconds / 3600)}h ago`;
    return `Updated ${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--page-bg)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p style={{ color: 'var(--foreground)', opacity: 0.7 }}>Loading projects...</p>
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
            onClick={loadProjects}
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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: 'var(--foreground)' }}>Projects</h1>
            <div className="flex items-center mt-2 text-sm" style={{ color: 'var(--foreground)', opacity: 0.7 }}>
              <span>{formatLastUpdated(lastUpdated)}</span>
              <button
                onClick={handleRefresh}
                className="ml-2 p-1 rounded transition-colors"
                style={{ color: 'var(--foreground)', opacity: 0.7 }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--card-bg)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                title="Refresh"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleNewInterview}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              New Interview
            </button>
            <LogoutButton />
          </div>
        </div>

        {/* Content */}
        {projects.length === 0 ? (
          <EmptyProjectsState onNewInterview={handleNewInterview} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onUpdate={loadProjects}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
