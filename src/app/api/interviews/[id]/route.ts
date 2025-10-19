import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params;

    // Fetch interview details
    const { data: interview, error: interviewError } = await supabaseService()
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
        questions,
        research_brief,
        interview_guide,
        hume_system_prompt,
        workflow_state
      `)
      .eq('id', id)
      .single();

    if (interviewError || !interview) {
      return NextResponse.json(
        { error: 'Interview not found' },
        { status: 404 }
      );
    }

    // Fetch project details
    const { data: project, error: projectError } = await supabaseService()
      .from('projects')
      .select(`
        id,
        name,
        description,
        category
      `)
      .eq('id', interview.project_id)
      .single();

    if (projectError) {
      console.error('Error fetching project:', projectError);
    }

    const interviewDetails = {
      id: interview.id,
      projectId: interview.project_id,
      name: interview.name,
      description: interview.description || undefined,
      category: interview.category,
      status: interview.status,
      createdAt: interview.created_at,
      updatedAt: interview.updated_at,
      responseCount: interview.response_count || 0,
      targetResponseCount: interview.target_response_count || 10,
      shareUrl: interview.share_url || undefined,
      isPublic: interview.is_public || false,
      questions: interview.questions || [],
      research_brief: interview.research_brief || undefined,
      interview_guide: interview.interview_guide || undefined,
      hume_system_prompt: interview.hume_system_prompt || undefined,
      workflow_state: interview.workflow_state || undefined,
      project: project ? {
        id: project.id,
        name: project.name,
        description: project.description,
        category: project.category,
      } : null,
    };

    return NextResponse.json({
      success: true,
      interview: interviewDetails
    });

  } catch (error) {
    console.error('Get interview error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch interview', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params;
    
    // Validate request body exists
    const contentType = req.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return NextResponse.json(
        { error: 'Content-Type must be application/json' },
        { status: 400 }
      );
    }
    
    let updates;
    try {
      updates = await req.json();
    } catch (jsonError) {
      console.error('JSON parse error:', jsonError);
      return NextResponse.json(
        { error: 'Invalid JSON in request body', details: (jsonError as Error).message },
        { status: 400 }
      );
    }
    
    if (!updates || typeof updates !== 'object') {
      return NextResponse.json(
        { error: 'Request body must be a valid JSON object' },
        { status: 400 }
      );
    }

    // Only allow certain fields to be updated
    const allowedFields = [
      'name', 
      'description', 
      'status', 
      'questions', 
      'target_response_count', 
      'is_public',
      // AI-generated artifacts
      'research_brief',
      'interview_guide',
      'hume_system_prompt',
      'workflow_state'
    ];
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString()
    };

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        updateData[key] = value;
      }
    }

    const { data: interview, error: updateError } = await supabaseService()
      .from('interviews')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Supabase update error:', updateError);
      console.error('   Update data keys:', Object.keys(updateData));
      console.error('   Interview ID:', id);
      return NextResponse.json(
        { 
          error: 'Failed to update interview',
          details: updateError.message,
          code: updateError.code
        },
        { status: 500 }
      );
    }

    if (!interview) {
      return NextResponse.json(
        { error: 'Interview not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      interview: {
        id: interview.id,
        projectId: interview.project_id,
        name: interview.name,
        description: interview.description || undefined,
        category: interview.category,
        status: interview.status,
        createdAt: interview.created_at,
        updatedAt: interview.updated_at,
        responseCount: interview.response_count || 0,
        targetResponseCount: interview.target_response_count || 10,
        shareUrl: interview.share_url || undefined,
        isPublic: interview.is_public || false,
        questions: interview.questions || [],
      }
    });

  } catch (error) {
    console.error('Update interview error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update interview', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params;

    // Delete interview
    const { error: deleteError } = await supabaseService()
      .from('interviews')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting interview:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete interview' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Interview deleted successfully'
    });

  } catch (error) {
    console.error('Delete interview error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to delete interview', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
