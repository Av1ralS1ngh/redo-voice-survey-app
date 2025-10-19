// app/api/audio/conversation/[conversationId]/route.ts
// API endpoint for fetching conversation audio files

import { NextRequest, NextResponse } from 'next/server';
import { getConversationAudio } from '@/lib/audio-storage-service';

export async function GET(
  req: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  try {
    const conversationId = params.conversationId;
    
    if (!conversationId) {
      return NextResponse.json({
        success: false,
        error: 'Conversation ID is required'
      }, { status: 400 });
    }
    
    console.log(`🎵 Fetching audio for conversation: ${conversationId}`);
    
    // Get all audio records for the conversation
    const audioRecords = await getConversationAudio(conversationId);
    
    // Group by turn number for easier frontend consumption
    const audioByTurn = audioRecords.reduce((acc, record) => {
      if (!acc[record.turn_number]) {
        acc[record.turn_number] = {
          turn_number: record.turn_number,
          user_audio: null,
          agent_audio: null
        };
      }
      
      if (record.speaker === 'user') {
        acc[record.turn_number].user_audio = {
          url: record.audio_url,
          duration: record.audio_duration,
          status: record.processing_status,
          created_at: record.created_at
        };
      } else if (record.speaker === 'agent') {
        acc[record.turn_number].agent_audio = {
          url: record.audio_url,
          duration: record.audio_duration,
          status: record.processing_status,
          created_at: record.created_at
        };
      }
      
      return acc;
    }, {} as Record<number, any>);
    
    // Convert to array and sort by turn number
    const audioData = Object.values(audioByTurn).sort((a: any, b: any) => 
      a.turn_number - b.turn_number
    );
    
    console.log(`✅ Found ${audioRecords.length} audio records for conversation ${conversationId}`);
    
    return NextResponse.json({
      success: true,
      data: {
        conversationId,
        totalTurns: audioData.length,
        totalAudioFiles: audioRecords.length,
        audioByTurn: audioData
      }
    });
    
  } catch (error) {
    console.error('❌ Failed to fetch conversation audio:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch conversation audio',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
