import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params;

    // Fetch project details
    const { data: project, error: projectError } = await supabaseService()
      .from('projects')
      .select(`
        id,
        name,
        description,
        category,
        status,
        created_at,
        updated_at,
        user_id,
        settings
      `)
      .eq('id', id)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Fetch interviews for this project
    const { data: interviews, error: interviewsError } = await supabaseService()
      .from('interviews')
      .select(`
        id,
        name,
        description,
        category,
        status,
        created_at,
        updated_at,
        response_count,
        target_response_count,
        share_url,
        is_public
      `)
      .eq('project_id', id)
      .order('updated_at', { ascending: false });

    if (interviewsError) {
      console.error('Error fetching interviews:', interviewsError);
      return NextResponse.json(
        { error: 'Failed to fetch project interviews' },
        { status: 500 }
      );
    }

    // Calculate project stats
    const interviewCount = interviews?.length || 0;
    const responseCount = interviews?.reduce((sum, i) => sum + (i.response_count || 0), 0) || 0;
    const targetResponses = interviews?.reduce((sum, i) => sum + (i.target_response_count || 10), 0) || 0;
    const responseRate = targetResponses > 0 ? Math.round((responseCount / targetResponses) * 100) : 0;

    const projectDetails = {
      id: project.id,
      name: project.name,
      description: project.description || undefined,
      category: project.category,
      createdAt: project.created_at,
      updatedAt: project.updated_at,
      userId: project.user_id,
      status: project.status,
      interviewCount,
      responseCount,
      responseRate,
      settings: project.settings || undefined,
      interviews: interviews?.map(interview => ({
        id: interview.id,
        projectId: id,
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
      })) || []
    };

    return NextResponse.json({
      success: true,
      project: projectDetails
    });

  } catch (error) {
    console.error('Get project error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch project', 
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
    const updates = await req.json();

    // Only allow certain fields to be updated
    const allowedFields = ['name', 'description', 'category', 'status', 'settings'];
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString()
    };

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        updateData[key] = value;
      }
    }

    const { data: project, error: updateError } = await supabaseService()
      .from('projects')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating project:', updateError);
      return NextResponse.json(
        { error: 'Failed to update project' },
        { status: 500 }
      );
    }

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      project: {
        id: project.id,
        name: project.name,
        description: project.description || undefined,
        category: project.category,
        createdAt: project.created_at,
        updatedAt: project.updated_at,
        userId: project.user_id,
        status: project.status,
        settings: project.settings || undefined,
      }
    });

  } catch (error) {
    console.error('Update project error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update project', 
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

    // Get authenticated user
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('Authentication error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if project exists and user owns it
    const { data: project, error: projectError } = await supabaseService()
      .from('projects')
      .select('id, user_id, auth_user_id')
      .eq('id', id)
      .single();

    if (projectError || !project) {
      console.error('Project not found:', projectError);
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Verify ownership (check both old user_id and new auth_user_id columns)
    const isOwner = project.auth_user_id === user.id || project.user_id === user.id;
    if (!isOwner) {
      console.error('User does not own project');
      return NextResponse.json(
        { error: 'You do not have permission to delete this project' },
        { status: 403 }
      );
    }

    // Check if project has interviews
    const { data: interviews, error: checkError } = await supabaseService()
      .from('interviews')
      .select('id')
      .eq('project_id', id)
      .limit(1);

    if (checkError) {
      console.error('Error checking project interviews:', checkError);
      return NextResponse.json(
        { error: 'Failed to check project dependencies', details: checkError.message },
        { status: 500 }
      );
    }

    if (interviews && interviews.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete project with existing interviews. Please delete interviews first.' },
        { status: 400 }
      );
    }

    // Delete project
    const { error: deleteError } = await supabaseService()
      .from('projects')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting project:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete project', details: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Project deleted successfully'
    });

  } catch (error) {
    console.error('Delete project error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to delete project', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
