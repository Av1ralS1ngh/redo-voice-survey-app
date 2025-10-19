import { NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    const interviewId = searchParams.get('interviewId');
    const limitParam = searchParams.get('limit');

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'projectId query parameter is required' },
        { status: 400 }
      );
    }

    const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10) || 1, 1), 50) : 1;

    let query = supabaseService()
      .from('research_briefs')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .order('version', { ascending: false })
      .limit(limit);

    if (interviewId) {
      query = query.eq('interview_id', interviewId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to fetch research briefs:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    const briefs = data ?? [];
    const latest = briefs.length > 0 ? briefs[0] : null;

    return NextResponse.json({
      success: true,
      briefs,
      latest,
    });
  } catch (error) {
    console.error('GET research_brief error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { project_id, interview_id, content, version, metadata } = body;

    if (!project_id || !content) {
      return NextResponse.json({ success: false, error: 'project_id and content are required' }, { status: 400 });
    }

    const trimmedContent = (content as string).trim();

    if (!trimmedContent) {
      return NextResponse.json({ success: false, error: 'content cannot be empty' }, { status: 400 });
    }

    let existingQuery = supabaseService()
      .from('research_briefs')
      .select('*')
      .eq('project_id', project_id);

    if (interview_id) {
      existingQuery = existingQuery.eq('interview_id', interview_id);
    } else {
      existingQuery = existingQuery.is('interview_id', null);
    }

    existingQuery = existingQuery
      .order('created_at', { ascending: false })
      .order('version', { ascending: false })
      .limit(1);

    const { data: existing, error: existingError } = await existingQuery;

    if (existingError) {
      console.error('Failed to check existing research brief:', existingError);
      return NextResponse.json({ success: false, error: existingError.message }, { status: 500 });
    }

    const latest = existing && existing.length > 0 ? existing[0] : null;

    if (latest) {
      const latestContent = (latest.content as string)?.trim?.() ?? latest.content;
      const latestMetadataSignature = latest.metadata ? JSON.stringify(latest.metadata) : undefined;
      const incomingMetadataSignature = metadata ? JSON.stringify(metadata) : undefined;
      const latestVersion = typeof latest.version === 'number' ? latest.version : null;
      const incomingVersion = typeof version === 'number' ? version : latestVersion;

      if (
        latestContent === trimmedContent &&
        latestMetadataSignature === incomingMetadataSignature &&
        latestVersion === incomingVersion
      ) {
        return NextResponse.json({ success: true, brief: latest, deduped: true });
      }
    }

    const nextVersion = (() => {
      if (typeof version === 'number') return version;
      if (latest && typeof latest.version === 'number') return latest.version + 1;
      return 1;
    })();

    const upsertData: any = {
      project_id,
      interview_id: interview_id ?? null,
      content: trimmedContent,
      version: nextVersion,
    };

    if (metadata !== undefined) upsertData.metadata = metadata;

    const { data, error } = await supabaseService()
      .from('research_briefs')
      .upsert(upsertData, {
        onConflict: 'project_id,interview_id',
        ignoreDuplicates: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Insert research_brief error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, brief: data });
  } catch (error) {
    console.error('POST research_brief error:', error);
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
