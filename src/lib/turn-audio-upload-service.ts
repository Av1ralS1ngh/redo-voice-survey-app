// src/lib/turn-audio-upload-service.ts
// Service to upload extracted turn audio files to Supabase Storage

import { supabaseService } from './supabase';
import { readFileSync, unlinkSync } from 'fs';

export interface TurnAudioUploadResult {
  success: boolean;
  turn_number: number;
  speaker: 'user' | 'agent';
  audio_url?: string;
  error?: string;
}

/**
 * Upload a single turn audio file to Supabase Storage
 * 
 * @param sessionId - The conversation session ID
 * @param turnNumber - The turn number
 * @param speaker - 'user' or 'agent'
 * @param filePath - Local path to the audio file
 * @returns Upload result with audio URL
 */
export async function uploadTurnAudio(
  sessionId: string,
  turnNumber: number,
  speaker: 'user' | 'agent',
  filePath: string
): Promise<TurnAudioUploadResult> {
  try {
    console.log(`📤 Uploading turn ${turnNumber} (${speaker}) to Supabase...`);
    
    // Read the file
    const audioBuffer = readFileSync(filePath);
    
    // Define storage path
    const storagePath = `conversations/${sessionId}/turns/turn-${turnNumber}-${speaker}.mp3`;
    
    // Upload to Supabase Storage
    const { data, error: uploadError } = await supabaseService()
      .storage
      .from('conversation-audio')
      .upload(storagePath, audioBuffer, {
        contentType: 'audio/mpeg',
        upsert: true
      });
    
    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }
    
    // Get public URL
    const { data: urlData } = supabaseService()
      .storage
      .from('conversation-audio')
      .getPublicUrl(storagePath);
    
    console.log(`✅ Uploaded turn ${turnNumber} to: ${urlData.publicUrl}`);
    
    // Clean up local file
    try {
      unlinkSync(filePath);
      console.log(`🧹 Cleaned up temp file: ${filePath}`);
    } catch (cleanupError) {
      console.warn(`⚠️  Could not delete temp file: ${cleanupError}`);
    }
    
    return {
      success: true,
      turn_number: turnNumber,
      speaker,
      audio_url: urlData.publicUrl
    };
  } catch (error) {
    console.error(`❌ Failed to upload turn ${turnNumber}:`, error);
    return {
      success: false,
      turn_number: turnNumber,
      speaker,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Upload all extracted turn audio files to Supabase
 * 
 * @param sessionId - The conversation session ID
 * @param segments - Array of extracted segments with file paths
 * @returns Array of upload results
 */
export async function uploadAllTurnAudio(
  sessionId: string,
  segments: Array<{
    turn_number: number;
    speaker: 'user' | 'agent';
    filePath?: string;
    error?: string;
  }>
): Promise<TurnAudioUploadResult[]> {
  console.log(`📤 Uploading ${segments.length} turn audio files...`);
  
  const results: TurnAudioUploadResult[] = [];
  
  for (const segment of segments) {
    if (segment.error || !segment.filePath) {
      // Skip failed extractions
      results.push({
        success: false,
        turn_number: segment.turn_number,
        speaker: segment.speaker,
        error: segment.error || 'No file path provided'
      });
      continue;
    }
    
    const result = await uploadTurnAudio(
      sessionId,
      segment.turn_number,
      segment.speaker,
      segment.filePath
    );
    
    results.push(result);
  }
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`\n📊 Upload complete: ${successful} succeeded, ${failed} failed`);
  
  return results;
}

/**
 * Update conversation_audio table with turn audio records
 * 
 * @param sessionId - The conversation session ID
 * @param uploadResults - Array of upload results with audio URLs
 * @returns Success status
 */
export async function updateConversationAudioTable(
  sessionId: string,
  uploadResults: TurnAudioUploadResult[]
): Promise<{ success: boolean; inserted: number; error?: string }> {
  try {
    console.log(`💾 Updating conversation_audio table...`);
    
    // Filter successful uploads
    const successfulUploads = uploadResults.filter(r => r.success && r.audio_url);
    
    if (successfulUploads.length === 0) {
      console.log('⚠️  No successful uploads to record in database');
      return { success: true, inserted: 0 };
    }
    
    // Prepare records for insertion
    const records = successfulUploads.map(upload => ({
      session_id: sessionId,
      conversation_id: null, // Optional - will be updated later if needed
      turn_number: upload.turn_number,
      speaker: upload.speaker,
      audio_url: upload.audio_url,
      audio_duration: null, // TODO: Calculate from file
      audio_format: 'mp3',
      processing_status: 'complete',
      created_at: new Date().toISOString()
    }));
    
    // Insert into conversation_audio table
    const { data, error } = await supabaseService()
      .from('conversation_audio')
      .insert(records)
      .select();
    
    if (error) {
      throw new Error(`Database insert failed: ${error.message}`);
    }
    
    console.log(`✅ Inserted ${data?.length || 0} records into conversation_audio table`);
    
    return {
      success: true,
      inserted: data?.length || 0
    };
  } catch (error) {
    console.error('❌ Failed to update conversation_audio table:', error);
    return {
      success: false,
      inserted: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Complete turn audio processing pipeline
 * Extract → Upload → Update Database
 * 
 * @param sessionId - The conversation session ID
 * @param segments - Extracted audio segments
 * @returns Processing results
 */
export async function processTurnAudio(
  sessionId: string,
  segments: Array<{
    turn_number: number;
    speaker: 'user' | 'agent';
    filePath?: string;
    error?: string;
  }>
): Promise<{
  success: boolean;
  uploaded: number;
  failed: number;
  dbRecords: number;
}> {
  console.log(`\n🔄 Starting turn audio processing pipeline for session ${sessionId}`);
  
  // Step 1: Upload all turn audio files
  const uploadResults = await uploadAllTurnAudio(sessionId, segments);
  
  // Step 2: Update database
  const dbResult = await updateConversationAudioTable(sessionId, uploadResults);
  
  const successful = uploadResults.filter(r => r.success).length;
  const failed = uploadResults.filter(r => !r.success).length;
  
  console.log(`\n✅ Turn audio processing complete!`);
  console.log(`   Uploaded: ${successful}`);
  console.log(`   Failed: ${failed}`);
  console.log(`   DB Records: ${dbResult.inserted}`);
  
  return {
    success: successful > 0,
    uploaded: successful,
    failed,
    dbRecords: dbResult.inserted
  };
}
