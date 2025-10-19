import { NextRequest, NextResponse } from "next/server";
import { conversationManager } from "@/lib/conversation-manager";
import { HumeMessageWithProsody } from "@/lib/prosody-interfaces";

export async function POST(req: NextRequest) {
  try {
    const { sessionId, userUid, message, turnNumber } = await req.json();

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

      // Store audio file if available
      if (audioData?.url) {
        await storeAudioFile(sessionId, turnNumber, role, audioData);
      }

      // Extract and store detailed prosody features if available
      if (prosodyData) {
        await storeProsodyFeatures(sessionId, turnNumber, role, prosodyData);
      }
    }

    return NextResponse.json({ 
      success: true,
      processed: completeMessageTypes.includes(message.type) && content.length > 10,
      prosody_captured: !!message.prosody,
      audio_captured: !!message.audio
    });

  } catch (error) {
    console.error("Enhanced response save error:", error);
    return NextResponse.json(
      { error: "Failed to save response", details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * Extract prosody data from Hume message
 */
function extractProsodyData(message: HumeMessageWithProsody) {
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
function extractAudioData(message: HumeMessageWithProsody) {
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
function extractMetadata(message: HumeMessageWithProsody) {
  return {
    confidence: message.transcript?.confidence,
    language: message.language,
    sentiment: message.sentiment,
    timestamp: message.timestamp,
  };
}

/**
 * Store audio file information in database
 */
async function storeAudioFile(
  sessionId: string, 
  turnNumber: number, 
  speaker: 'user' | 'agent', 
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
  } catch (error) {
    console.error('Error storing audio file:', error);
  }
}

/**
 * Store detailed prosody features in database
 */
async function storeProsodyFeatures(
  sessionId: string, 
  turnNumber: number, 
  speaker: 'user' | 'agent', 
  prosodyData: any
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
        
        // Extract emotional features from emotions if available
        emotional_arousal: prosodyData.emotional_arousal,
        emotional_valence: prosodyData.emotional_valence,
      });

    console.log(`✅ Stored prosody features for turn ${turnNumber} (${speaker})`);
  } catch (error) {
    console.error('Error storing prosody features:', error);
  }
}
