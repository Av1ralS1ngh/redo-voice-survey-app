/**
 * Audio Metadata Collector
 * 
 * This utility collects audio-related metadata from Hume messages
 * without actually handling audio files. It's the first step towards
 * audio processing - understanding what data Hume provides.
 */

export interface AudioMetadata {
  messageId?: string;
  messageType: 'user_message' | 'assistant_message' | 'audio_output';
  hasAudioData: boolean;
  audioProperties?: {
    duration?: number;
    format?: string;
    sampleRate?: number;
    channels?: number;
    url?: string;
    size?: number;
    base64Data?: string; // For audio_output messages
    mimeType?: string;
  };
  prosodyData?: any;
  timestamp: string;
}

/**
 * Extract audio metadata from a Hume message
 */
export function extractAudioMetadata(message: any): AudioMetadata | null {
  if (!message || !message.type) {
    return null;
  }

  const metadata: AudioMetadata = {
    messageId: message.id,
    messageType: message.type,
    hasAudioData: false,
    timestamp: message.receivedAt || new Date().toISOString()
  };

  // Check for audio data in the message (multiple possible locations)
  if (message.audio || message.audio_output) {
    metadata.hasAudioData = true;
    const audioSource = message.audio || message.audio_output;
    
    metadata.audioProperties = {
      duration: audioSource.duration,
      format: audioSource.format,
      sampleRate: audioSource.sampleRate,
      channels: audioSource.channels,
      url: audioSource.url,
      size: audioSource.size,
      base64Data: audioSource.data ? 'present' : undefined, // Don't log full base64
      mimeType: audioSource.mime_type
    };
    
    console.log('🎵 Found audio data in message:', {
      messageId: metadata.messageId,
      type: metadata.messageType,
      audioSource: message.audio ? 'audio' : 'audio_output',
      hasBase64: !!audioSource.data,
      properties: metadata.audioProperties
    });
  }

  // Special handling for audio_output messages
  if (message.type === 'audio_output') {
    console.log('🎙️ FOUND AUDIO_OUTPUT MESSAGE:', {
      messageId: metadata.messageId,
      hasData: !!message.data,
      mimeType: message.mime_type,
      dataLength: message.data ? message.data.length : 0
    });
  }

  // Check for prosody data (emotional analysis)
  if (message.models?.prosody) {
    metadata.prosodyData = message.models.prosody;
    console.log('🎭 Found prosody data in message:', metadata.messageId);
  }

  // Check for time information (user messages)
  if (message.time) {
    if (!metadata.audioProperties) {
      metadata.audioProperties = {};
    }
    metadata.audioProperties.duration = message.time.end - message.time.begin;
    
    console.log('⏱️ Found timing data in message:', {
      messageId: metadata.messageId,
      duration: metadata.audioProperties.duration + 'ms'
    });
  }

  return metadata;
}

/**
 * Store audio metadata in our database
 */
export async function storeAudioMetadata(
  sessionId: string,
  conversationId: string,
  turnNumber: number,
  metadata: AudioMetadata
): Promise<void> {
  try {
    const { supabaseService } = await import('@/lib/supabase');
    
    // Only store if there's meaningful audio data
    if (!metadata.hasAudioData && !metadata.prosodyData && !metadata.audioProperties?.duration) {
      return;
    }

    const record = {
      session_id: sessionId,
      conversation_id: conversationId,
      message_id: metadata.messageId,
      turn_number: turnNumber,
      speaker: metadata.messageType === 'user_message' ? 'user' : 'agent',
      audio_metadata: {
        hasAudioData: metadata.hasAudioData,
        audioProperties: metadata.audioProperties,
        prosodyData: metadata.prosodyData,
        timestamp: metadata.timestamp
      },
      processing_status: 'metadata_collected',
      created_at: new Date().toISOString()
    };

    const { error } = await supabaseService()
      .from('conversation_audio')
      .insert(record);

    if (error) {
      console.error('❌ Failed to store audio metadata:', error);
    } else {
      console.log('✅ Stored audio metadata for message:', metadata.messageId);
    }

  } catch (error) {
    console.error('❌ Error storing audio metadata:', error);
  }
}

/**
 * Log audio metadata for debugging
 */
export function logAudioDiscovery(metadata: AudioMetadata): void {
  const summary = {
    messageId: metadata.messageId,
    type: metadata.messageType,
    hasAudio: metadata.hasAudioData,
    hasProsody: !!metadata.prosodyData,
    hasTiming: !!metadata.audioProperties?.duration,
    audioUrl: metadata.audioProperties?.url
  };

  console.log('🔍 Audio Discovery:', summary);
  
  // If we found audio URLs, this is gold!
  if (metadata.audioProperties?.url) {
    console.log('🎯 FOUND AUDIO URL:', metadata.audioProperties.url);
  }
}
