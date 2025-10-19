import { NextRequest, NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Checking recent conversation data...');

    // Get the most recent conversations
    const { data: conversations, error: conversationError } = await supabaseService()
      .from('conversations')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(5);

    if (conversationError) {
      console.error('❌ Error fetching conversations:', conversationError);
      throw conversationError;
    }

    console.log('✅ Found', conversations?.length || 0, 'recent conversations');

    // Check for conversations from today
    const today = new Date().toISOString().split('T')[0];
    const todaysConversations = conversations?.filter(conv => 
      conv.started_at?.startsWith(today)
    ) || [];

    console.log('📅 Today\'s conversations:', todaysConversations.length);

    // Get the latest conversation details
    const latestConversation = conversations?.[0];
    let conversationDetails = null;
    
    if (latestConversation) {
      // Extract turn data from conversation_data
      const conversationData = latestConversation.conversation_data;
      const turns = conversationData?.turns || [];
      
      conversationDetails = {
        session_id: latestConversation.session_id,
        user_uid: latestConversation.user_uid,
        started_at: latestConversation.started_at,
        status: latestConversation.status,
        total_turns: turns.length,
        turns: turns.slice(-10), // Last 10 turns
        conversation_summary: {
          user_messages: turns.filter((t: any) => t.speaker === 'user').length,
          agent_messages: turns.filter((t: any) => t.speaker === 'agent').length,
          last_activity: latestConversation.updated_at
        }
      };
    }

    // Check audio records for the latest conversation
    let audioData = null;
    if (latestConversation?.id) {
      const { data: audioRecords, error: audioError } = await supabaseService()
        .from('conversation_audio')
        .select('*')
        .eq('conversation_id', latestConversation.id)
        .order('turn_number', { ascending: false })
        .limit(10);

      if (!audioError && audioRecords) {
        audioData = {
          total_audio_records: audioRecords.length,
          recent_audio: audioRecords
        };
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        total_conversations: conversations?.length || 0,
        todays_conversations: todaysConversations.length,
        latest_conversation_id: latestConversation?.id || null,
        latest_session_id: latestConversation?.session_id || null
      },
      latest_conversation: conversationDetails,
      audio_data: audioData,
      raw_conversations: conversations?.map(conv => ({
        id: conv.id,
        session_id: conv.session_id,
        user_uid: conv.user_uid,
        started_at: conv.started_at,
        status: conv.status,
        turn_count: conv.conversation_data?.turns?.length || 0
      }))
    });

  } catch (error) {
    console.error('❌ Error checking conversation data:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to check conversation data',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
