import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userUid = searchParams.get('userUid');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '10');

    let query = supabaseService()
      .from('conversations')
      .select('*')
      .order('completed_at', { ascending: false })
      .limit(limit);

    if (userUid) {
      query = query.eq('user_uid', userUid);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: conversations, error } = await query;

    if (error) {
      console.error('Error fetching conversations:', error);
      return NextResponse.json(
        { error: "Failed to fetch conversations" },
        { status: 500 }
      );
    }

    // Calculate aggregate metrics
    const metrics = {
      total_conversations: conversations?.length || 0,
      completed_conversations: conversations?.filter(c => c.status === 'completed').length || 0,
      abandoned_conversations: conversations?.filter(c => c.status === 'abandoned').length || 0,
      average_duration: 0,
      total_users: new Set(conversations?.map(c => c.user_uid)).size || 0,
    };

    // Calculate average duration for completed conversations
    const completedWithDuration = conversations?.filter(c => 
      c.status === 'completed' && c.metrics?.duration_seconds
    ) || [];
    
    if (completedWithDuration.length > 0) {
      const totalDuration = completedWithDuration.reduce((sum, c) => 
        sum + (c.metrics.duration_seconds || 0), 0
      );
      metrics.average_duration = Math.round(totalDuration / completedWithDuration.length);
    }

    return NextResponse.json({
      conversations: conversations || [],
      metrics,
      success: true
    });

  } catch (error) {
    console.error("Analytics error:", error);
    return NextResponse.json(
      { error: "Failed to fetch conversation analytics", details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
