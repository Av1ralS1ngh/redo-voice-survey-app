// lib/audio-storage-service.ts
// Supabase audio storage service for conversation audio files

import { supabaseService } from './supabase';

export interface AudioUploadResult {
  url: string;
  fileName: string;
  size: number;
  duration: number;
}

export interface AudioRecord {
  conversation_id: string;
  turn_number: number;
  speaker: 'user' | 'agent';
  audio_url: string;
  audio_duration: number;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at?: string;
  updated_at?: string;
}

/**
 * Upload conversation audio file to Supabase storage
 */
export async function uploadConversationAudio(
  conversationId: string,
  turnNumber: number,
  speaker: 'user' | 'agent',
  audioBlob: Blob,
  duration: number
): Promise<AudioUploadResult> {
  try {
    console.log(`🎵 Uploading audio for conversation ${conversationId}, turn ${turnNumber}, speaker: ${speaker}`);
    
    // Generate unique filename using standard pattern (matching useHumeAudioCapture)
    const timestamp = Date.now();
    const fileName = `conversations/${conversationId}/audio/turn-${turnNumber}-${speaker}-${timestamp}.webm`;
    
    // Upload to Supabase storage
    const { data, error } = await supabaseService()
      .storage
      .from('conversation-audio')
      .upload(fileName, audioBlob, {
        contentType: 'audio/webm',
        upsert: false, // Don't overwrite existing files
        cacheControl: '3600' // Cache for 1 hour
      });
    
    if (error) {
      console.error('❌ Audio upload failed:', error);
      throw new Error(`Audio upload failed: ${error.message}`);
    }
    
    // Get public URL
    const { data: urlData } = supabaseService()
      .storage
      .from('conversation-audio')
      .getPublicUrl(fileName);
    
    const result: AudioUploadResult = {
      url: urlData.publicUrl,
      fileName: fileName,
      size: audioBlob.size,
      duration: duration
    };
    
    console.log(`✅ Audio uploaded successfully:`, {
      fileName: result.fileName,
      size: `${(result.size / 1024).toFixed(2)}KB`,
      duration: `${result.duration}ms`,
      url: result.url
    });
    
    return result;
    
  } catch (error) {
    console.error('❌ Audio upload error:', error);
    throw error;
  }
}

/**
 * Update conversation_audio table with file URL and metadata
 */
export async function updateAudioRecord(
  conversationId: string,
  turnNumber: number,
  speaker: 'user' | 'agent',
  audioUrl: string,
  audioDuration: number,
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed' = 'completed'
): Promise<void> {
  try {
    console.log(`📝 Updating audio record for conversation ${conversationId}, turn ${turnNumber}`);
    
    // Create a simplified record without optional fields that might not exist
    const audioRecord = {
      conversation_id: conversationId,
      turn_number: turnNumber,
      speaker: speaker,
      audio_url: audioUrl,
      audio_duration: audioDuration,
      processing_status: processingStatus
    };
    
    const { error } = await supabaseService()
      .from('conversation_audio')
      .upsert(audioRecord);
    
    if (error) {
      console.error('❌ Failed to update audio record:', error);
      
      // If the table doesn't exist, log a helpful message
      if (error.message.includes('Could not find') || error.message.includes('schema cache')) {
        console.log('💡 The conversation_audio table may not exist yet. Please run the SQL script in Supabase.');
        console.log('💡 For now, audio files are uploaded but not tracked in the database.');
        return; // Don't throw error, just skip database update
      }
      
      throw new Error(`Failed to update audio record: ${error.message}`);
    }
    
    console.log(`✅ Audio record updated successfully`);
    
  } catch (error) {
    console.error('❌ Audio record update error:', error);
    
    // If it's a schema error, don't throw - just log and continue
    if (error instanceof Error && error.message.includes('schema cache')) {
      console.log('💡 Skipping database update due to missing table. Audio file uploaded successfully.');
      return;
    }
    
    throw error;
  }
}

/**
 * Complete audio upload process (upload + update record)
 */
export async function completeAudioUpload(
  sessionId: string, // Changed: now accepts sessionId and converts to conversationId
  turnNumber: number,
  speaker: 'user' | 'agent',
  audioBlob: Blob,
  duration: number
): Promise<AudioUploadResult> {
  try {
    // Convert sessionId to conversationId (same pattern as response API)
    const { data: conversation } = await supabaseService()
      .from('conversations')
      .select('id')
      .eq('session_id', sessionId)
      .eq('status', 'active')
      .single();

    if (!conversation) {
      throw new Error(`No active conversation found for session ${sessionId}`);
    }

    const conversationId = conversation.id;
    console.log(`🔄 Converted sessionId ${sessionId} to conversationId ${conversationId}`);
    
    // Upload audio file
    const uploadResult = await uploadConversationAudio(
      conversationId,
      turnNumber,
      speaker,
      audioBlob,
      duration
    );
    
    // Update database record
    await updateAudioRecord(
      conversationId,
      turnNumber,
      speaker,
      uploadResult.url,
      duration,
      'completed'
    );
    
    return uploadResult;
    
  } catch (error) {
    console.error('❌ Audio upload failed:', error);
    throw error;
  }
}

/**
 * Get audio records for a conversation
 */
export async function getConversationAudio(
  conversationId: string
): Promise<AudioRecord[]> {
  try {
    const { data, error } = await supabaseService()
      .from('conversation_audio')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('turn_number', { ascending: true });
    
    if (error) {
      console.error('❌ Failed to fetch conversation audio:', error);
      throw new Error(`Failed to fetch conversation audio: ${error.message}`);
    }
    
    return data || [];
    
  } catch (error) {
    console.error('❌ Get conversation audio error:', error);
    throw error;
  }
}

/**
 * Get audio record for a specific turn
 */
export async function getTurnAudio(
  conversationId: string,
  turnNumber: number,
  speaker: 'user' | 'agent'
): Promise<AudioRecord | null> {
  try {
    const { data, error } = await supabaseService()
      .from('conversation_audio')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('turn_number', turnNumber)
      .eq('speaker', speaker)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return null;
      }
      console.error('❌ Failed to fetch turn audio:', error);
      throw new Error(`Failed to fetch turn audio: ${error.message}`);
    }
    
    return data;
    
  } catch (error) {
    console.error('❌ Get turn audio error:', error);
    throw error;
  }
}

/**
 * Delete audio file and record
 */
export async function deleteAudioRecord(
  conversationId: string,
  turnNumber: number,
  speaker: 'user' | 'agent'
): Promise<void> {
  try {
    // Get the audio record first
    const audioRecord = await getTurnAudio(conversationId, turnNumber, speaker);
    
    if (!audioRecord) {
      console.log(`ℹ️ No audio record found for conversation ${conversationId}, turn ${turnNumber}, speaker: ${speaker}`);
      return;
    }
    
    // Extract filename from URL
    const urlParts = audioRecord.audio_url.split('/');
    const fileName = urlParts[urlParts.length - 1];
    const fullPath = `${conversationId}/${fileName}`;
    
    // Delete from storage
    const { error: storageError } = await supabaseService()
      .storage
      .from('conversation-audio')
      .remove([fullPath]);
    
    if (storageError) {
      console.error('❌ Failed to delete audio file from storage:', storageError);
      // Continue with database deletion even if storage deletion fails
    }
    
    // Delete from database
    const { error: dbError } = await supabaseService()
      .from('conversation_audio')
      .delete()
      .eq('conversation_id', conversationId)
      .eq('turn_number', turnNumber)
      .eq('speaker', speaker);
    
    if (dbError) {
      console.error('❌ Failed to delete audio record from database:', dbError);
      throw new Error(`Failed to delete audio record: ${dbError.message}`);
    }
    
    console.log(`✅ Audio record deleted successfully`);
    
  } catch (error) {
    console.error('❌ Delete audio record error:', error);
    throw error;
  }
}

/**
 * Get storage usage statistics
 */
export async function getAudioStorageStats(): Promise<{
  totalFiles: number;
  totalSize: number;
  conversationsWithAudio: number;
}> {
  try {
    // Get all audio records
    const { data: audioRecords, error } = await supabaseService()
      .from('conversation_audio')
      .select('conversation_id, audio_duration, processing_status');
    
    if (error) {
      throw new Error(`Failed to fetch audio records: ${error.message}`);
    }
    
    const totalFiles = audioRecords?.length || 0;
    const totalSize = audioRecords?.reduce((sum, record) => {
      // Estimate size based on duration (rough calculation)
      const estimatedSize = (record.audio_duration / 1000) * 16; // ~16KB per second
      return sum + estimatedSize;
    }, 0) || 0;
    
    const conversationsWithAudio = new Set(
      audioRecords?.map(record => record.conversation_id) || []
    ).size;
    
    return {
      totalFiles,
      totalSize,
      conversationsWithAudio
    };
    
  } catch (error) {
    console.error('❌ Get audio storage stats error:', error);
    throw error;
  }
}
