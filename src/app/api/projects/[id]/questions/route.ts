import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize the Supabase client
// As requested, using the client from src/lib/supabase.ts pattern.
// Note: For server-side operations, especially those requiring authentication context,
// using the server-specific client from @/lib/supabase/server is often recommended.
// However, for this public data fetching route, this approach is simple and effective.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const projectId = params?.id;

  if (!projectId) {
    return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
  }

  try {
    // First, verify that the project exists to provide a clear error message.
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      // If the project is not found, return a 404 error.
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // If the project exists, fetch all associated questions.
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('*')
      .eq('project_id', projectId);

    if (questionsError) {
      // This handles errors during the questions query itself.
      console.error('Database error fetching questions:', questionsError.message);
      return NextResponse.json({ error: 'Failed to fetch questions.' }, { status: 500 });
    }

    // If successful, return the array of questions.
    // This will be an empty array if the project has no questions.
    return NextResponse.json(questions, { status: 200 });

  } catch (e) {
    // Catch any unexpected errors during the process.
    const errorMessage = e instanceof Error ? e.message : 'An unknown server error occurred';
    console.error('Unexpected error in questions route:', errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
