import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@/lib/supabase/client';

type Supabase = ReturnType<typeof createClient>;

export interface CreateResearchStudyOptions {
  supabase: Supabase;
  userId: string;
  name?: string;
  description?: string;
}

export interface CreateResearchStudyResult {
  projectId: string;
  projectSlug: string | null;
  interviewId: string;
}

export async function createResearchStudy({
  supabase,
  userId,
  name,
  description,
}: CreateResearchStudyOptions): Promise<CreateResearchStudyResult> {
  const timestamp = new Date().toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  const derivedName = name?.trim().length ? name.trim() : `Research Study ${timestamp}`;
  const derivedDescription = description?.trim().length
    ? description.trim()
    : 'Automatically created research study project';

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .insert({
      name: derivedName,
      description: derivedDescription,
      category: 'custom',
      status: 'active',
      user_id: userId,
      settings: {
        studyType: 'research_study',
      },
    } as any)
    .select('id, slug')
    .single();

  if (projectError) {
    console.error('Project creation error:', projectError);
    throw new Error(`Failed to create project: ${projectError.message || 'Unknown database error'}`);
  }

  const projectId = project.id as string;
  const projectSlug = (project as any).slug || null;
  const shareId = uuidv4();
  const shareUrl = `/interview/${shareId}`;

  const { data: interview, error: interviewError } = await supabase
    .from('interviews')
    .insert({
      project_id: projectId,
      name: `${derivedName} Interview`,
      description: `Interview created for ${derivedName}`,
      category: 'usability_testing',
      status: 'draft',
      questions: [],
      response_count: 0,
      target_response_count: 10,
      share_url: shareUrl,
      is_public: false,
    } as any)
    .select('id')
    .single();

  if (interviewError) {
    console.error('Interview creation error:', interviewError);
    throw new Error(`Failed to create interview: ${interviewError.message || 'Unknown database error'}`);
  }

  return {
    projectId,
    projectSlug,
    interviewId: interview.id as string,
  };
}
