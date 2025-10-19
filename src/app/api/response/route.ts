import { NextRequest, NextResponse } from "next/server";
import { conversationManager } from "@/lib/conversation-manager";

/**
 * Extract prosody data from Hume message
 */
function extractProsodyData(message: any) {
  if (!message.prosody) return null;

  return {
    // Fundamental frequency features
    f0_mean: message.prosody.f0?.mean,
    f0_std: message.prosody.f0?.std,
    f0_min: message.prosody.f0?.min,
    f0_max: message.prosody.f0?.max,
    f0_range: message.prosody.f0 ? (message.prosody.f0.max - message.prosody.f0.min) : undefined,

    // Speech rate and rhythm features
    speech_rate: message.prosody.speech_rate,
    pause_duration: message.prosody.pause_duration,

    // Volume and intensity features
    intensity_mean: message.prosody.intensity?.mean,
    intensity_std: message.prosody.intensity?.std,
    intensity_min: message.prosody.intensity?.min,
    intensity_max: message.prosody.intensity?.max,
    intensity_range: message.prosody.intensity ? (message.prosody.intensity.max - message.prosody.intensity.min) : undefined,

    // Voice quality features
    jitter: message.prosody.jitter,
    shimmer: message.prosody.shimmer,
    hnr: message.prosody.hnr,

    // Timing features (if available)
    duration: message.audio?.duration,
  };
}

/**
 * Extract audio data from Hume message
 */
function extractAudioData(message: any) {
  if (!message.audio) return null;

  return {
    url: message.audio.url,
    duration: message.audio.duration,
    format: message.audio.format,
    sample_rate: message.audio.sample_rate,
    bit_depth: message.audio.bit_depth,
    file_size: message.audio.file_size,
  };
}

/**
 * Extract metadata from Hume message
 */
function extractMetadata(message: any) {
  return {
    confidence: message.transcript?.confidence,
    language: message.language,
    sentiment: message.sentiment,
    timestamp: message.timestamp,
    // 🎯 CRITICAL: Capture Hume's time.begin and time.end for accurate turn boundaries
    time_begin: message.time?.begin,
    time_end: message.time?.end,
  };
}

/**
 * Store prosody data in dedicated tables
 */
async function storeProsodyData(
  sessionId: string, 
  turnNumber: number, 
  speaker: 'user' | 'agent', 
  prosodyData: any,
  audioData: any
) {
  try {
    const { supabaseService } = await import("@/lib/supabase");
    
    // Get conversation_id from session
    const { data: conversation } = await supabaseService()
      .from('conversations')
      .select('id')
      .eq('session_id', sessionId)
      .eq('status', 'active')
      .single();

    if (!conversation) {
      console.warn(`No active conversation found for session ${sessionId}`);
      return;
    }

    // Store prosody features if available
    if (prosodyData) {
      await supabaseService()
        .from('prosody_features')
        .insert({
          session_id: sessionId,
          conversation_id: conversation.id,
          turn_number: turnNumber,
          speaker: speaker,
          
          // Fundamental frequency features
          f0_mean: prosodyData.f0_mean,
          f0_std: prosodyData.f0_std,
          f0_min: prosodyData.f0_min,
          f0_max: prosodyData.f0_max,
          f0_range: prosodyData.f0_range,
          
          // Speech rate and rhythm features
          speech_rate: prosodyData.speech_rate,
          pause_duration: prosodyData.pause_duration,
          
          // Volume and intensity features
          intensity_mean: prosodyData.intensity_mean,
          intensity_std: prosodyData.intensity_std,
          intensity_min: prosodyData.intensity_min,
          intensity_max: prosodyData.intensity_max,
          intensity_range: prosodyData.intensity_range,
          
          // Voice quality features
          jitter: prosodyData.jitter,
          shimmer: prosodyData.shimmer,
          hnr: prosodyData.hnr,
          
          // Timing features
          duration: prosodyData.duration,
        });

      console.log(`✅ Stored prosody features for turn ${turnNumber} (${speaker})`);
    }

    // Store audio data if available
    if (audioData?.url) {
      await supabaseService()
        .from('conversation_audio')
        .insert({
          session_id: sessionId,
          conversation_id: conversation.id,
          turn_number: turnNumber,
          speaker: speaker,
          audio_url: audioData.url,
          audio_duration: audioData.duration,
          audio_format: audioData.format,
          sample_rate: audioData.sample_rate,
          bit_depth: audioData.bit_depth,
          file_size: audioData.file_size,
          processing_status: 'pending'
        });

      console.log(`✅ Stored audio file for turn ${turnNumber} (${speaker})`);
    }

  } catch (error) {
    console.error('Error storing prosody data:', error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { sessionId, userUid, message, turnNumber, chatMetadata } = await req.json();
    
    // Debug: Log the raw message from Hume
    console.log('🔍 Raw Hume message:', JSON.stringify(message, null, 2));

    // 🎯 HANDLE CHAT METADATA - Store the missing link!
    if (chatMetadata && chatMetadata.chat_id) {
      console.log('🔗 Storing chat metadata:', chatMetadata);
      
      // Update conversation with Hume chat metadata
      await conversationManager.updateConversationMetadata(sessionId, {
        hume_chat_id: chatMetadata.chat_id,
        hume_chat_group_id: chatMetadata.chat_group_id,
        hume_session_id: chatMetadata.hume_session_id,
        chat_metadata_captured_at: chatMetadata.captured_at
      });
      
      return NextResponse.json({ 
        success: true, 
        message: "Chat metadata stored successfully",
        chatId: chatMetadata.chat_id 
      });
    }

    if (!sessionId || !userUid || !message) {
      return NextResponse.json(
        { error: "sessionId, userUid, and message are required" },
        { status: 400 }
      );
    }

    // Get the transcript content from multiple possible sources
    const content = message.message?.content || 
                   message.transcript?.content || 
                   '';

    if (!content.trim()) {
      return NextResponse.json({ success: true, note: "Empty message skipped" });
    }

    // Determine role more accurately
    let role: 'user' | 'agent' = 'agent'; // default
    if (message.type === 'user_message' || message.type === 'user_transcript') {
      role = 'user';
    } else if (message.type === 'assistant_message' || message.type === 'agent_message') {
      role = 'agent';
    }

    // Filter out streaming/partial messages - only keep complete ones
    const completeMessageTypes = [
      'user_message',
      'assistant_message', 
      'user_transcript'
    ];

    if (completeMessageTypes.includes(message.type) && content.length > 10) {
      // Extract prosody data from Hume message
      const prosodyData = extractProsodyData(message);
      const audioData = extractAudioData(message);
      const metadata = extractMetadata(message);

      // Add to conversation buffer with enhanced data
      await conversationManager.addMessage(
        sessionId,
        role,
        content,
        message.type,
        {
          emotions: message.emotions,
          prosody: prosodyData,
          audio: audioData,
          metadata: metadata
        }
      );

      // Log prosody data capture
      if (prosodyData) {
        console.log(`✅ Captured prosody data for turn ${role}:`, {
          f0_mean: prosodyData.f0_mean,
          speech_rate: prosodyData.speech_rate,
          intensity_mean: prosodyData.intensity_mean
        });
      }

      // Store prosody data in dedicated tables
      if (prosodyData || audioData) {
        await storeProsodyData(sessionId, turnNumber, role, prosodyData, audioData);
      }
    }

    return NextResponse.json({ 
      success: true,
      processed: completeMessageTypes.includes(message.type) && content.length > 10
    });

  } catch (error) {
    console.error("Response save error:", error);
    return NextResponse.json(
      { error: "Failed to save response", details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
