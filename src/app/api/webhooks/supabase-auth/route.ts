import { NextRequest, NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase';

// Expected header: x-supabase-webhook-secret set to process.env.SUPABASE_WEBHOOK_SECRET
export async function POST(req: NextRequest) {
  try {
    const secret = req.headers.get('x-supabase-webhook-secret');
    if (!secret || secret !== process.env.SUPABASE_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Invalid webhook secret' }, { status: 401 });
    }

    const body = await req.json();
    // Supabase Auth webhooks include an event and user
    const userId = body?.user?.id;
    const event = body?.event;

    if (!userId || event !== 'user.created') {
      return NextResponse.json({ ok: true });
    }

    const supabase = supabaseService();

    // Create a starter project as the service role
    const { data, error } = await supabase
      .from('projects')
      .insert({
        user_id: userId,
        name: 'Getting started',
        description: 'This is your starter project. Edit or delete it.',
        category: 'custom',
        status: 'active'
      });

    if (error) {
      console.error('Webhook create starter project error:', error);
      return NextResponse.json({ error: 'Failed to create starter project' }, { status: 500 });
    }

    return NextResponse.json({ success: true, created: true, data });
  } catch (err) {
    console.error('Webhook error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
