// lib/turn-audio-service.ts
// Real-time turn audio capture service for user and assistant audio

import { completeAudioUpload } from './audio-storage-service';

/**
 * Save user turn audio from useMicrophone hook
 * Called every time Hume's MediaRecorder captures audio
 */
export async function saveUserTurnAudio(
  sessionId: string,
  turnNumber: number,
  audioBuffer: ArrayBuffer,
  duration: number = 0 // Duration will be calculated if not provided
): Promise<{ success: boolean; audioUrl?: string; error?: string }> {
  try {
    console.log(`🎤 Saving user turn audio: session=${sessionId}, turn=${turnNumber}`);
    
    // Convert ArrayBuffer to Blob (audio/webm format from MediaRecorder)
    const audioBlob = new Blob([audioBuffer], { type: 'audio/webm' });
    
    // Calculate duration if not provided (estimate based on size)
    const estimatedDuration = duration || Math.round((audioBlob.size / 16) * 1000); // ~16KB/sec
    
    // Upload to Supabase
    const result = await completeAudioUpload(
      sessionId,
      turnNumber,
      'user',
      audioBlob,
      estimatedDuration
    );
    
    console.log(`✅ User turn audio saved: ${result.url}`);
    
    return {
      success: true,
      audioUrl: result.url
    };
    
  } catch (error) {
    console.error('❌ Failed to save user turn audio:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Save assistant turn audio from audio_output message
 * Called when we receive audio_output from Hume WebSocket
 */
export async function saveAssistantTurnAudio(
  sessionId: string,
  turnNumber: number,
  base64Audio: string,
  duration: number = 0
): Promise<{ success: boolean; audioUrl?: string; error?: string }> {
  try {
    console.log(`🤖 Saving assistant turn audio: session=${sessionId}, turn=${turnNumber}`);
    
    // Convert base64 to Blob
    const audioBlob = base64ToBlob(base64Audio, 'audio/wav');
    
    // Calculate duration if not provided
    const estimatedDuration = duration || Math.round((audioBlob.size / 16) * 1000);
    
    // Upload to Supabase
    const result = await completeAudioUpload(
      sessionId,
      turnNumber,
      'agent', // Note: using 'agent' to match existing schema
      audioBlob,
      estimatedDuration
    );
    
    console.log(`✅ Assistant turn audio saved: ${result.url}`);
    
    return {
      success: true,
      audioUrl: result.url
    };
    
  } catch (error) {
    console.error('❌ Failed to save assistant turn audio:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Helper: Convert base64 string to Blob
 */
function base64ToBlob(base64: string, mimeType: string): Blob {
  // Remove data URI prefix if present
  const base64Data = base64.replace(/^data:[^;]+;base64,/, '');
  
  // Decode base64 to binary
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  return new Blob([bytes], { type: mimeType });
}

/**
 * Batch save turn audio (for bulk operations)
 */
export async function batchSaveTurnAudio(
  turns: Array<{
    sessionId: string;
    turnNumber: number;
    speaker: 'user' | 'assistant';
    audioData: ArrayBuffer | string;
    duration?: number;
  }>
): Promise<{ 
  totalSaved: number; 
  totalFailed: number; 
  results: Array<{ success: boolean; turnNumber: number; error?: string }> 
}> {
  const results = await Promise.all(
    turns.map(async (turn) => {
      if (turn.speaker === 'user' && turn.audioData instanceof ArrayBuffer) {
        const result = await saveUserTurnAudio(
          turn.sessionId,
          turn.turnNumber,
          turn.audioData,
          turn.duration
        );
        return { ...result, turnNumber: turn.turnNumber };
      } else if (turn.speaker === 'assistant' && typeof turn.audioData === 'string') {
        const result = await saveAssistantTurnAudio(
          turn.sessionId,
          turn.turnNumber,
          turn.audioData,
          turn.duration
        );
        return { ...result, turnNumber: turn.turnNumber };
      } else {
        return {
          success: false,
          turnNumber: turn.turnNumber,
          error: 'Invalid audio data type for speaker'
        };
      }
    })
  );
  
  const totalSaved = results.filter(r => r.success).length;
  const totalFailed = results.filter(r => !r.success).length;
  
  return { totalSaved, totalFailed, results };
}
