import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Server endpoint to ensure a starter project exists for the authenticated user.
 * The client should call this endpoint with the user's access token in the
 * Authorization header: `Authorization: Bearer <access_token>`.
 *
 * This endpoint creates a Supabase client using the provided token so that
 * RLS applies and the insert happens in-session (no service_role key needed).
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing Authorization header' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    // Fetch current user (via token)
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      return NextResponse.json({ error: 'Invalid user token' }, { status: 401 });
    }
    const userId = userData.user.id;

    // Check if user already has any projects
    const { data: existing, error: existingError } = await supabase
      .from('projects')
      .select('id')
      .eq('user_id', userId)
      .limit(1);

    if (existingError) {
      console.error('Error checking projects:', existingError);
      return NextResponse.json({ error: 'Failed to check projects' }, { status: 500 });
    }

    if (!existing || existing.length === 0) {
      // create starter project in-session so RLS ensures ownership
      const { data: created, error: createError } = await supabase
        .from('projects')
        .insert({
          user_id: userId,
          name: 'Getting started',
          description: 'This is your starter project. Edit or delete it.',
          category: 'custom',
          status: 'active'
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating starter project:', createError);
        return NextResponse.json({ error: 'Failed to create starter project' }, { status: 500 });
      }

      return NextResponse.json({ success: true, created: true, project: created });
    }

    return NextResponse.json({ success: true, created: false });
  } catch (err) {
    console.error('ensure-default error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
