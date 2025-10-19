import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const status = searchParams.get('status');
    const quality = searchParams.get('quality');

    // Fetch conversations with their metadata and audio URLs
    let query = supabaseService()
      .from('conversations')
      .select(`
        session_id,
        user_uid,
        user_name,
        status,
        started_at,
        completed_at,
        conversation_data,
        metrics
      `)
      .order('started_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }

    const { data: conversations, error: conversationsError } = await query;

    if (conversationsError) {
      console.error('Error fetching conversations:', conversationsError);
      return NextResponse.json(
        { error: 'Failed to fetch conversations' },
        { status: 500 }
      );
    }

    // Fetch chat metadata for audio URLs
    const sessionIds = conversations?.map(c => c.session_id) || [];
    const { data: chatMetadata } = await supabaseService()
      .from('conversation_chat_metadata')
      .select('session_id, hume_chat_id')
      .in('session_id', sessionIds);

    // Fetch audio URLs from storage
    const audioUrls: Record<string, string> = {};
    if (chatMetadata) {
      for (const meta of chatMetadata) {
        try {
          const { data: audioFiles } = await supabaseService()
            .storage
            .from('conversation-audio')
            .list(`conversations/${meta.session_id}`, {
              search: `complete-audio-${meta.hume_chat_id}`
            });

          if (audioFiles && audioFiles.length > 0) {
            const { data: publicUrl } = supabaseService()
              .storage
              .from('conversation-audio')
              .getPublicUrl(`conversations/${meta.session_id}/${audioFiles[0].name}`);
            
            audioUrls[meta.session_id] = publicUrl.publicUrl;
          }
        } catch (error) {
          console.warn(`Failed to get audio URL for session ${meta.session_id}:`, error);
        }
      }
    }

    // Transform conversations to response format
    const responses = conversations?.map(conv => {
      const conversationData = conv.conversation_data || {};
      const metrics = conv.metrics || {};
      const turns = conversationData.turns || [];
      
      // Calculate quality based on metrics
      const quality = calculateQuality(metrics, turns);
      
      // Extract attributes from conversation data
      const attributes = extractAttributes(conversationData);

      // 🔧 FIX: Sort turns by timestamp and apply conversation flow logic
      const sortedTurns = [...turns].sort((a: any, b: any) => {
        // Primary sort: by timestamp if both have valid timestamps
        if (a.timestamp && b.timestamp) {
          const timeA = new Date(a.timestamp).getTime();
          const timeB = new Date(b.timestamp).getTime();
          
          // Special case: If timestamps are very close (within 100ms) and we have
          // an agent response followed by a user message, swap them as the user
          // likely spoke first but their message arrived later due to processing delays
          const timeDiff = Math.abs(timeA - timeB);
          if (timeDiff <= 100) { // Within 100ms
            const aIndex = turns.indexOf(a);
            const bIndex = turns.indexOf(b);
            
            // If A is agent and B is user, and they're consecutive, put user first
            if (a.speaker === 'agent' && b.speaker === 'user' && Math.abs(aIndex - bIndex) === 1) {
              return 1; // Put user (b) before agent (a)
            }
            // If A is user and B is agent, and they're consecutive, keep user first
            if (a.speaker === 'user' && b.speaker === 'agent' && Math.abs(aIndex - bIndex) === 1) {
              return -1; // Keep user (a) before agent (b)
            }
          }
          
          if (timeA !== timeB) {
            return timeA - timeB;
          }
        }
        
        // Secondary sort: by turn_number if timestamps are equal/missing
        if (a.turn_number && b.turn_number) {
          return a.turn_number - b.turn_number;
        }
        
        // Tertiary sort: by original array index (fallback)
        const indexA = turns.indexOf(a);
        const indexB = turns.indexOf(b);
        return indexA - indexB;
      });

      return {
        id: conv.session_id,
        sessionId: conv.session_id,
        userId: conv.user_uid,
        userName: conv.user_name,
        status: conv.status === 'completed' ? 'completed' : 
                conv.status === 'active' ? 'processing' : 'failed',
        quality,
        date: conv.started_at,
        duration: metrics.duration_seconds || 0,
        turnCount: metrics.total_turns || turns.length,
        audioUrl: audioUrls[conv.session_id],
        transcript: sortedTurns.map((turn: any, index: number) => ({
          id: `${conv.session_id}-turn-${index}`,
          turnNumber: turn.turn_number || index + 1,
          speaker: turn.speaker,
          message: turn.message,
          timestamp: calculateTimestamp(turn, index, sortedTurns),
          duration: turn.duration,
          audioUrl: turn.audio?.url,
          emotions: turn.emotions,
          prosody: turn.prosody
        })),
        attributes,
        metadata: {
          userType: conversationData.survey_responses?.user_type,
          ageRange: conversationData.survey_responses?.age_range,
          keyImprovement: conversationData.survey_responses?.key_improvement,
          contentLevel: conversationData.survey_responses?.content_level,
          preferredMedia: conversationData.survey_responses?.preferred_media,
          ...conversationData.metadata
        }
      };
    }) || [];

    return NextResponse.json({
      success: true,
      responses,
      total: responses.length,
      hasMore: responses.length === limit
    });

  } catch (error) {
    console.error('Responses API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch responses', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

function calculateQuality(metrics: any, turns: any[]): 'high' | 'medium' | 'low' {
  // Quality scoring based on conversation metrics
  let score = 0;
  
  // Duration factor (longer conversations generally higher quality)
  const duration = metrics.duration_seconds || 0;
  if (duration > 180) score += 2; // 3+ minutes
  else if (duration > 60) score += 1; // 1+ minutes
  
  // Turn count factor
  const turnCount = metrics.total_turns || turns.length;
  if (turnCount > 10) score += 2;
  else if (turnCount > 5) score += 1;
  
  // User engagement factor (based on user message length)
  const userTurns = turns.filter(t => t.speaker === 'user');
  const avgUserMessageLength = userTurns.reduce((sum, turn) => 
    sum + (turn.message?.length || 0), 0) / Math.max(userTurns.length, 1);
  
  if (avgUserMessageLength > 50) score += 2;
  else if (avgUserMessageLength > 20) score += 1;
  
  // Return quality based on score
  if (score >= 4) return 'high';
  if (score >= 2) return 'medium';
  return 'low';
}

function extractAttributes(conversationData: any): string[] {
  const attributes: string[] = [];
  
  // Extract attributes from survey responses
  const surveyResponses = conversationData.survey_responses || {};
  
  if (surveyResponses.user_type) {
    attributes.push(`user-type:${surveyResponses.user_type}`);
  }
  
  if (surveyResponses.age_range) {
    attributes.push(`age:${surveyResponses.age_range}`);
  }
  
  if (surveyResponses.preferred_media) {
    attributes.push(`media:${surveyResponses.preferred_media}`);
  }
  
  if (surveyResponses.content_level) {
    attributes.push(`level:${surveyResponses.content_level}`);
  }
  
  // Add completion status
  if (conversationData.metrics?.completion_status) {
    attributes.push(`completion:${conversationData.metrics.completion_status}`);
  }
  
  return attributes;
}

function calculateTimestamp(turn: any, index: number, allTurns: any[]): number {
  // If turn has explicit timestamp, use it
  if (turn.timestamp) {
    return parseFloat(turn.timestamp);
  }
  
  // Otherwise, estimate based on position and average turn duration
  const avgTurnDuration = 15; // seconds per turn (estimate)
  return index * avgTurnDuration;
}
