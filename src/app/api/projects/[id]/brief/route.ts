import { NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    // Try to find latest research brief for interviews under this project
    const { data: briefs, error: briefsError } = await supabaseService()
      .from('research_briefs')
      .select('*')
      .eq('project_id', id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (briefsError) {
      console.error('Error fetching research_briefs:', briefsError);
    }

    if (briefs && briefs.length > 0) {
      return NextResponse.json({ success: true, brief: briefs[0].content, metadata: briefs[0] });
    }

    // Fallback: load project description
    const { data: project, error: projectError } = await supabaseService()
      .from('projects')
      .select('description')
      .eq('id', id)
      .maybeSingle();

    if (projectError) console.error('Error fetching project fallback brief:', projectError);

    return NextResponse.json({ success: true, brief: project?.description || null });
  } catch (error) {
    console.error('Get project brief error:', error);
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
