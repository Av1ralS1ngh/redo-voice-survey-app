import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { Project, CreateProjectRequest } from "@/types/projects";

export async function GET(req: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(cookieStore);

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'active';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Fetch projects from database (server-side with RLS applied)
    let query = supabase.from('projects').select(
      `id, name, description, category, status, created_at, updated_at, user_id, settings`
    ).order('updated_at', { ascending: false }).range(offset, offset + limit - 1);

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: projects, error: projectsError } = await query;

    if (projectsError) {
      console.error('Error fetching projects:', projectsError);
      return NextResponse.json(
        { error: 'Failed to fetch projects' },
        { status: 500 }
      );
    }

    // Get interview counts and response stats for each project
  const projectIds = projects?.map((p: any) => p.id) || [];
    
    const { data: interviewStats } = await supabase
      .from('interviews')
      .select('project_id, id, response_count, target_response_count')
      .in('project_id', projectIds);

    // Calculate stats for each project
    const transformedProjects: Project[] = projects?.map(project => {
      const projectSettings = (project.settings ?? {}) as Record<string, any>;
      const derivedCategory = projectSettings?.studyType === 'research_study'
        ? 'research_study'
        : project.category;
  const projectInterviews = interviewStats?.filter((i: any) => i.project_id === project.id) || [];
      const interviewCount = projectInterviews.length;
      const responseCount = projectInterviews.reduce((sum, i) => sum + (i.response_count || 0), 0);
      const targetResponses = projectInterviews.reduce((sum, i) => sum + (i.target_response_count || 10), 0);
      const responseRate = targetResponses > 0 ? Math.round((responseCount / targetResponses) * 100) : 0;

      return {
        id: project.id,
        name: project.name,
        description: project.description || undefined,
        category: derivedCategory,
        createdAt: project.created_at,
        updatedAt: project.updated_at,
  userId: project.user_id,
        status: project.status,
        interviewCount,
        responseCount,
        responseRate,
        settings: Object.keys(projectSettings).length ? projectSettings : undefined,
      };
    }) || [];

    return NextResponse.json({
      success: true,
      projects: transformedProjects,
      total: transformedProjects.length,
      hasMore: transformedProjects.length === limit
    });

  } catch (error) {
    console.error('Projects API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch projects', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(cookieStore);

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }

    const body: CreateProjectRequest = await req.json();
    const { name, description, category } = body;

    if (!name || !category) {
      return NextResponse.json(
        { error: 'Name and category are required' },
        { status: 400 }
      );
    }

    // Create project in database (RLS will ensure user_id matches)
    const { data: project, error: createError } = await supabase
      .from('projects')
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        category,
        user_id: user.id,
        status: 'active',
        settings: {}
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating project:', createError);
      return NextResponse.json(
        { error: 'Failed to create project' },
        { status: 500 }
      );
    }

    const transformedProject: Project = {
      id: project.id,
      name: project.name,
      description: project.description || undefined,
      category: project.category,
      createdAt: project.created_at,
      updatedAt: project.updated_at,
      userId: project.user_id,
      status: project.status,
      interviewCount: 0,
      responseCount: 0,
      responseRate: 0,
      settings: project.settings || undefined,
    };

    return NextResponse.json({
      success: true,
      project: transformedProject
    });

  } catch (error) {
    console.error('Create project error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create project', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
