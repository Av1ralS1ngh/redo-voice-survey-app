import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { Interview, CreateInterviewRequest } from "@/types/projects";
import { v4 as uuidv4 } from 'uuid';

export async function GET(req: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(cookieStore);

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    const status = searchParams.get('status') || 'active';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabase
      .from('interviews')
      .select(`
        id,
        project_id,
        name,
        description,
        category,
        status,
        created_at,
        updated_at,
        response_count,
        target_response_count,
        share_url,
        is_public,
        questions
      `)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: interviews, error: interviewsError } = await query;

    if (interviewsError) {
      console.error('Error fetching interviews:', interviewsError);
      return NextResponse.json(
        { error: 'Failed to fetch interviews' },
        { status: 500 }
      );
    }

    const transformedInterviews: Interview[] = interviews?.map(interview => ({
      id: interview.id,
      projectId: interview.project_id,
      name: interview.name,
      description: interview.description || undefined,
      category: interview.category,
      status: interview.status,
      createdAt: interview.created_at,
      updatedAt: interview.updated_at,
      questions: interview.questions || undefined,
      responseCount: interview.response_count || 0,
      targetResponseCount: interview.target_response_count || 10,
      shareUrl: interview.share_url || undefined,
      isPublic: interview.is_public || false,
    })) || [];

    return NextResponse.json({
      success: true,
      interviews: transformedInterviews,
      total: transformedInterviews.length,
      hasMore: transformedInterviews.length === limit
    });

  } catch (error) {
    console.error('Interviews API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch interviews', 
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

    const body: CreateInterviewRequest = await req.json();
    const { projectId, name, description, category, questions, targetResponseCount } = body;

    if (!name || !category) {
      return NextResponse.json(
        { error: 'Name and category are required' },
        { status: 400 }
      );
    }

    // If projectId is provided, verify the user owns the project
    if (projectId) {
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('id')
        .eq('id', projectId)
        .single();

      if (projectError || !project) {
        return NextResponse.json(
          { error: 'Project not found or access denied' },
          { status: 404 }
        );
      }
    }

    // Generate a unique share URL
    const shareId = uuidv4();
    const shareUrl = `/interview/${shareId}`;

    // Create interview in database
    const { data: interview, error: createError } = await supabase
      .from('interviews')
      .insert({
        project_id: projectId || null,
        name: name.trim(),
        description: description?.trim() || null,
        category,
        status: 'draft',
        questions: questions || [],
        response_count: 0,
        target_response_count: targetResponseCount || 10,
        share_url: shareUrl,
        is_public: false
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating interview:', createError);
      return NextResponse.json(
        { error: 'Failed to create interview' },
        { status: 500 }
      );
    }

    // If interview belongs to a project, update the project's updated_at timestamp
    if (projectId) {
      await supabase
        .from('projects')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', projectId);
    }

    const transformedInterview: Interview = {
      id: interview.id,
      projectId: interview.project_id,
      name: interview.name,
      description: interview.description || undefined,
      category: interview.category,
      status: interview.status,
      createdAt: interview.created_at,
      updatedAt: interview.updated_at,
      questions: interview.questions || undefined,
      responseCount: interview.response_count || 0,
      targetResponseCount: interview.target_response_count || 10,
      shareUrl: interview.share_url || undefined,
      isPublic: interview.is_public || false,
    };

    return NextResponse.json({
      success: true,
      interview: transformedInterview
    });

  } catch (error) {
    console.error('Create interview error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create interview', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
