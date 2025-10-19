import { cookies } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import ProjectNav from '@/components/projects/ProjectNav';
import ProjectBriefPanel from '@/components/projects/ProjectBriefPanel';
import ResponsesSection from './ResponsesSection';
import SourcesSection from './SourcesSection';
import ReportSection from './ReportSection';
import AnalysisSection from './AnalysisSection';

type ServerSupabaseClient = ReturnType<typeof createServerClient>;

type ProjectRecord = {
  id: string;
  name: string;
  description: string | null;
  slug: string | null;
};

const PROJECT_SELECT_FIELDS = 'id, name, description, slug';

async function resolveProject(
  client: ServerSupabaseClient,
  identifier: string,
  userId: string
): Promise<ProjectRecord | null> {
  const attempts: Array<{ column: string; value: string }> = [
    { column: 'id', value: identifier },
    { column: 'slug', value: identifier },
    { column: 'name', value: identifier.replace(/-/g, ' ') },
  ];

  for (const attempt of attempts) {
    const { data, error } = await client
      .from('projects')
      .select(PROJECT_SELECT_FIELDS)
      .eq('user_id', userId)
      .eq(attempt.column, attempt.value)
      .maybeSingle();

    if (!error && data) {
      return data as ProjectRecord;
    }
  }

  return null;
}

interface ProjectPageProps {
  params: {
    id: string;
  };
  searchParams?: {
    view?: string;
  };
}

export default async function ProjectPage({ params, searchParams }: ProjectPageProps) {
  const identifier = params.id?.trim();

  if (!identifier) {
    notFound();
  }

  const cookieStore = cookies();
  const supabase = createServerClient(cookieStore);

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect(`/login?next=${encodeURIComponent(`/projects/${identifier}`)}`);
  }

  const project = await resolveProject(supabase, identifier, user.id);

  if (!project) {
    notFound();
  }
  // Determine active tab from searchParams.view (server-side)
  const view = (searchParams?.view || '').toLowerCase();
  const validTabs = new Map([
    ['design', 'Design'],
    ['sources', 'Sources'],
    ['responses', 'Responses'],
    ['report', 'Report'],
    ['analysis', 'Analysis'],
    ['sharing', 'Sharing'],
  ]);

  const activeTab = (validTabs.get(view) as typeof view | undefined) || 'Design';

  return (
    <div
      className="min-h-screen"
      style={{
        background: 'var(--page-bg)',
        color: 'var(--foreground)',
      }}
    >
      <ProjectNav
        projectName={project.name}
        projectSlug={project.slug ?? project.id}
        activeTab={activeTab as any}
      />

      <main className="px-4 py-8 sm:px-6 lg:px-8">
        {activeTab === 'Responses' ? (
          // Client component will fetch project-scoped responses
          <ResponsesSection projectId={project.id} />
        ) : activeTab === 'Sources' ? (
          // Client component for listing participants
          <SourcesSection projectId={project.id} />
        ) : activeTab === 'Report' ? (
          <ReportSection projectId={project.id} />
        ) : activeTab === 'Analysis' ? (
          <AnalysisSection projectId={project.id} />
        ) : (
          <ProjectBriefPanel
            projectId={project.id}
            projectName={project.name}
            fallbackBrief={project.description || 'No project brief is available for this project.'}
          />
        )}
      </main>
    </div>
  );
}