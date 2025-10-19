import { NextRequest, NextResponse } from "next/server";
import { HumeAudioReconstructionService } from "@/lib/hume-audio-reconstruction";
import { supabaseService } from "@/lib/supabase";

/**
 * API endpoint to process conversation audio
 * POST /api/conversation/audio
 * 
 * Body: { sessionId: string, action: 'start' | 'poll' | 'status', chatId?: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { sessionId, action, chatId } = await req.json();

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 });
    }

    const audioService = new HumeAudioReconstructionService();

    switch (action) {
      case 'start': {
        // Initiate audio reconstruction process
        console.log(`🎯 Starting audio reconstruction for session: ${sessionId}`);
        
        const result = await audioService.processConversationAudio(sessionId);
        
        if (result.success) {
          // Store the chat ID mapping in our database for future reference
          if (result.chatId) {
            await supabaseService()
              .from('conversations')
              .update({ 
                metadata: { 
                  hume_chat_id: result.chatId,
                  audio_reconstruction_status: result.status 
                } 
              })
              .eq('session_id', sessionId);
          }
        }
        
        return NextResponse.json(result);
      }

      case 'poll': {
        // Poll for completion and download when ready
        if (!chatId) {
          return NextResponse.json({ error: "Chat ID is required for polling" }, { status: 400 });
        }

        console.log(`⏳ Polling audio reconstruction for chat: ${chatId}`);
        
        const audioUrl = await audioService.pollForCompletion(chatId, sessionId, 6, 5000); // 30 seconds max
        
        if (audioUrl) {
          // Update conversation record with audio URL
          await supabaseService()
            .from('conversations')
            .update({ 
              metadata: { 
                hume_chat_id: chatId,
                audio_reconstruction_status: 'COMPLETE',
                complete_audio_url: audioUrl
              } 
            })
            .eq('session_id', sessionId);

          return NextResponse.json({
            success: true,
            status: 'COMPLETE',
            audioUrl
          });
        } else {
          return NextResponse.json({
            success: false,
            status: 'TIMEOUT_OR_FAILED'
          });
        }
      }

      case 'status': {
        // Check current status
        if (!chatId) {
          return NextResponse.json({ error: "Chat ID is required for status check" }, { status: 400 });
        }

        const status = await audioService.checkReconstructionStatus(chatId);
        return NextResponse.json({
          success: !!status,
          status: status?.status,
          audioUrl: status?.signed_audio_url
        });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

  } catch (error) {
    console.error("Audio processing error:", error);
    return NextResponse.json(
      { 
        error: "Failed to process audio", 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
