/**
 * Hume Audio Reconstruction Service
 * 
 * This service handles retrieving complete conversation audio files
 * from Hume's Audio Reconstruction API after conversations complete.
 */

interface AudioReconstructionStatus {
  id: string;
  user_id: string;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETE' | 'FAILED';
  filename?: string;
  modified_at: number;
  signed_audio_url?: string;
  signed_url_expiration_timestamp_millis?: number;
}

export class HumeAudioReconstructionService {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.HUME_API_KEY!;
    if (!this.apiKey) {
      throw new Error('HUME_API_KEY is required for audio reconstruction');
    }
  }

  /**
   * Get the mapping between our session ID and Hume's chat ID
   * Since we know Hume creates chat IDs, we need to find the chat ID for our session
   */
  async findChatIdForSession(sessionId: string): Promise<string | null> {
    try {
      console.log(`🔍 Looking for Hume chat ID for session: ${sessionId}`);
      
      // Get recent chats from Hume
      const response = await fetch('https://api.hume.ai/v0/evi/chats', {
        headers: {
          'X-Hume-Api-Key': this.apiKey,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch chats: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.chats_page && Array.isArray(data.chats_page)) {
        console.log(`📋 Found ${data.chats_page.length} chats from Hume`);
        
        // For now, we'll use a time-based heuristic to match sessions to chats
        // In the future, we could store the chat_id when creating sessions
        
        // 🎯 FIRST: Check if we have stored chat metadata in dedicated table (preferred method)
        const { supabaseService } = await import('@/lib/supabase');
        const { data: chatMetadata, error: metadataError } = await supabaseService()
          .from('conversation_chat_metadata')
          .select('hume_chat_id, captured_at')  // Fix: use 'captured_at' not 'created_at'
          .eq('session_id', sessionId)
          .maybeSingle();  // Fix: use maybeSingle() instead of single() to avoid error if not found

        if (metadataError) {
          console.error('❌ Error querying conversation_chat_metadata:', metadataError);
        }

        if (chatMetadata?.hume_chat_id) {
          console.log(`✅ Found stored chat ID from metadata table: ${chatMetadata.hume_chat_id}`);
          return chatMetadata.hume_chat_id;
        }

        console.log('⚠️ No stored chat metadata found, trying to get conversation start time');
        
        // Get the conversation start time from our database (for fallback time matching)
        const { data: conversation } = await supabaseService()
          .from('conversations')
          .select('started_at, conversation_data')
          .eq('session_id', sessionId)
          .single();

        if (!conversation) {
          console.log('❌ No conversation found for session:', sessionId);
          console.log('💡 This might be because the sessions table foreign key constraint failed');
          console.log('💡 But we should still have chat metadata in conversation_chat_metadata table');
          return null;
        }

        console.log('⚠️ Falling back to time-based matching');

        // 🕐 FALLBACK: Use time-based matching if no stored chat ID
        const conversationStartTime = new Date(conversation.started_at).getTime();
        console.log(`📅 Conversation started at: ${conversation.started_at} (${conversationStartTime})`);
        
        // Find the chat that started closest to our conversation time (within 30 minutes)
        let bestMatch: any = null;
        let smallestTimeDiff = Infinity;
        
        console.log(`🔍 Checking ${data.chats_page.length} available chats:`);
        for (const chat of data.chats_page) {
          const chatStartTime = chat.start_timestamp;
          const timeDiff = Math.abs(conversationStartTime - chatStartTime);
          const timeDiffMinutes = timeDiff / 60000; // Convert to minutes
          
          console.log(`  Chat ${chat.id}: ${new Date(chatStartTime).toISOString()} (diff: ${timeDiffMinutes.toFixed(1)} min)`);
          
          // Within 30 minutes (1,800,000 ms) - more lenient
          if (timeDiff < 1800000 && timeDiff < smallestTimeDiff) {
            smallestTimeDiff = timeDiff;
            bestMatch = chat;
          }
        }
        
        if (bestMatch) {
          console.log(`✅ Found matching chat ID: ${bestMatch.id} (time diff: ${smallestTimeDiff}ms)`);
          return bestMatch.id;
        } else {
          console.log(`❌ No matching chat found for session ${sessionId}`);
          return null;
        }
      }
      
      return null;
      
    } catch (error) {
      console.error('Error finding chat ID:', error);
      return null;
    }
  }

  /**
   * Initiate audio reconstruction for a chat
   */
  async initiateAudioReconstruction(chatId: string): Promise<AudioReconstructionStatus | null> {
    try {
      console.log(`🎵 Initiating audio reconstruction for chat: ${chatId}`);
      
      const response = await fetch(`https://api.hume.ai/v0/evi/chats/${chatId}/audio`, {
        method: 'GET',
        headers: {
          'X-Hume-Api-Key': this.apiKey,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Audio reconstruction failed: ${response.status} ${errorText}`);
        return null;
      }

      const status: AudioReconstructionStatus = await response.json();
      console.log(`✅ Audio reconstruction status: ${status.status}`);
      
      return status;
      
    } catch (error) {
      console.error('Error initiating audio reconstruction:', error);
      return null;
    }
  }

  /**
   * Check the status of audio reconstruction
   */
  async checkReconstructionStatus(chatId: string): Promise<AudioReconstructionStatus | null> {
    try {
      const response = await fetch(`https://api.hume.ai/v0/evi/chats/${chatId}/audio`, {
        method: 'GET',
        headers: {
          'X-Hume-Api-Key': this.apiKey,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        return null;
      }

      return await response.json();
      
    } catch (error) {
      console.error('Error checking reconstruction status:', error);
      return null;
    }
  }

  /**
   * Download audio file from signed URL and store in Supabase
   */
  async downloadAndStoreAudio(
    audioUrl: string, 
    sessionId: string, 
    chatId: string
  ): Promise<string | null> {
    try {
      console.log(`⬇️  Downloading audio from: ${audioUrl.substring(0, 50)}...`);
      
      // Download the audio file
      const response = await fetch(audioUrl);
      if (!response.ok) {
        throw new Error(`Failed to download audio: ${response.statusText}`);
      }

      const audioBlob = await response.blob();
      console.log(`📁 Downloaded audio file: ${audioBlob.size} bytes`);
      console.log(`🔍 Original blob type: ${audioBlob.type}`);

      // Create a new blob with the correct MIME type to avoid Supabase issues
      const correctedBlob = new Blob([audioBlob], { type: 'audio/mpeg' });
      console.log(`🔧 Corrected blob type: ${correctedBlob.type}`);

      // Store in Supabase Storage
      const { supabaseService } = await import('@/lib/supabase');
      const fileName = `conversations/${sessionId}/complete-audio-${chatId}.mp4`;
      
      const { data: uploadData, error: uploadError } = await supabaseService()
        .storage
        .from('conversation-audio')
        .upload(fileName, correctedBlob, {
          contentType: 'audio/mpeg', // Use audio/mpeg for Supabase compatibility
          upsert: true // Overwrite if exists
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Get public URL
      const { data: urlData } = supabaseService()
        .storage
        .from('conversation-audio')
        .getPublicUrl(fileName);

      console.log(`✅ Audio stored successfully: ${urlData.publicUrl}`);
      
      // 🔧 FIX: Update conversation_data with audio URL
      try {
        const { data: conv, error: convError } = await supabaseService()
          .from('conversations')
          .select('conversation_data')
          .eq('session_id', sessionId)
          .maybeSingle();

        if (convError) {
          console.error('⚠️ Error fetching conversation for audio URL update:', convError);
        } else if (conv) {
          const updatedData = {
            ...conv.conversation_data,
            audio_url: urlData.publicUrl
          };
          
          const { error: updateError } = await supabaseService()
            .from('conversations')
            .update({ conversation_data: updatedData })
            .eq('session_id', sessionId);
          
          if (updateError) {
            console.error('⚠️ Error updating conversation_data with audio URL:', updateError);
          } else {
            console.log('✅ Updated conversation_data.audio_url');
          }
        } else {
          console.log('⚠️ No conversation record found to update (foreign key constraint issue)');
        }
      } catch (updateErr) {
        console.error('⚠️ Failed to update conversation_data:', updateErr);
        // Don't fail the whole operation if update fails
      }
      
      return urlData.publicUrl;
      
    } catch (error) {
      console.error('Error downloading and storing audio:', error);
      return null;
    }
  }

  /**
   * Complete workflow: Find chat, reconstruct audio, download and store
   */
  async processConversationAudio(sessionId: string): Promise<{
    success: boolean;
    chatId?: string;
    audioUrl?: string;
    status?: string;
    error?: string;
  }> {
    try {
      console.log(`🎯 Processing audio for conversation: ${sessionId}`);
      
      // Step 1: Find the chat ID
      const chatId = await this.findChatIdForSession(sessionId);
      if (!chatId) {
        return {
          success: false,
          error: 'Could not find matching Hume chat ID for session'
        };
      }

      // Step 2: Initiate reconstruction
      const reconstructionStatus = await this.initiateAudioReconstruction(chatId);
      if (!reconstructionStatus) {
        return {
          success: false,
          chatId,
          error: 'Failed to initiate audio reconstruction'
        };
      }

      // Step 3: If already complete, download immediately
      if (reconstructionStatus.status === 'COMPLETE' && reconstructionStatus.signed_audio_url) {
        const audioUrl = await this.downloadAndStoreAudio(
          reconstructionStatus.signed_audio_url,
          sessionId,
          chatId
        );
        
        return {
          success: !!audioUrl,
          chatId,
          audioUrl: audioUrl || undefined,
          status: 'COMPLETE'
        };
      }

      // Step 4: If queued/processing, return status for polling
      return {
        success: true,
        chatId,
        status: reconstructionStatus.status
      };
      
    } catch (error) {
      console.error('Error processing conversation audio:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Poll for completion and download when ready
   */
  async pollForCompletion(
    chatId: string, 
    sessionId: string, 
    maxAttempts: number = 12, // 2 minutes with 10-second intervals
    intervalMs: number = 10000
  ): Promise<string | null> {
    console.log(`⏳ Polling for audio reconstruction completion (max ${maxAttempts} attempts)`);
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const status = await this.checkReconstructionStatus(chatId);
      
      if (!status) {
        console.log(`❌ Failed to check status (attempt ${attempt})`);
        continue;
      }

      console.log(`📊 Attempt ${attempt}: Status = ${status.status}`);

      if (status.status === 'COMPLETE' && status.signed_audio_url) {
        return await this.downloadAndStoreAudio(status.signed_audio_url, sessionId, chatId);
      }

      if (status.status === 'FAILED') {
        console.log('❌ Audio reconstruction failed');
        return null;
      }

      // Wait before next attempt
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, intervalMs));
      }
    }

    console.log('⏰ Polling timeout - audio reconstruction taking longer than expected');
    return null;
  }
}
