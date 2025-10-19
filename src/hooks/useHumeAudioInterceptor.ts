// useHumeAudioInterceptor.ts
// 🎯 NEW APPROACH: Intercept audio from Hume's existing stream instead of creating duplicate MediaRecorder

import { useCallback, useEffect, useRef, useState } from 'react';
import { useVoice } from '@humeai/voice-react';
import { supabaseService } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

interface HumeAudioInterceptorConfig {
  sessionId: string;
  chatId: string;
  onUserAudioReady?: (audioBlob: Blob, messageId: string) => void;
  onAssistantAudioReady?: (audioBlob: Blob, messageId: string) => void;
  onError?: (error: Error) => void;
}

interface HumeAudioInterceptorReturn {
  isInitialized: boolean;
  isSupported: boolean;
  initializeInterceptor: () => Promise<void>;
  processMessage: (message: any) => Promise<void>;
  cleanup: () => void;
}

const generateStoragePath = (chatId: string, messageId: string, speaker: 'user' | 'assistant', format: string): string => {
  return `conversations/${chatId}/audio/msg-${messageId}-${speaker}.${format}`;
};

export function useHumeAudioInterceptor(config: HumeAudioInterceptorConfig): HumeAudioInterceptorReturn {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSupported, setIsSupported] = useState(true); // Always supported since we use Hume's stream
  
  // Get Hume voice hook for accessing the websocket connection
  const humeVoice = useVoice();
  
  // Track processed messages to avoid duplicates
  const processedMessagesRef = useRef<Set<string>>(new Set());

  const initializeInterceptor = useCallback(async (): Promise<void> => {
    if (isInitialized) {
      console.log('🎤 Audio interceptor already initialized');
      return;
    }

    try {
      console.log('🚀 Initializing Hume audio interceptor...');
      
      setIsInitialized(true);
      
      console.log('✅ Hume audio interceptor ready', {
        note: 'Will intercept audio from Hume message events',
        mode: 'message-based processing'
      });
      
    } catch (error) {
      console.error('❌ Failed to initialize audio interceptor:', error);
      config.onError?.(error as Error);
      throw error;
    }
  }, [isInitialized, config]);

  const processMessage = useCallback(async (message: any): Promise<void> => {
    if (!isInitialized) return;
    
    const messageId = message.id || `${message.type}_${Date.now()}`;
    
    // 🎯 ENHANCED DEDUPLICATION: Check content + timestamp + interim status
    const messageKey = `${message.type}_${message.message?.content || message.transcript?.content}_${message.time?.begin}_${message.time?.end}_${message.interim}`;
    
    // Prevent duplicate processing by content AND timestamp
    if (processedMessagesRef.current.has(messageKey)) {
      console.log(`⚠️ Skipping duplicate message by content+timestamp: ${messageKey.substring(0, 50)}...`);
      return;
    }
    processedMessagesRef.current.add(messageKey);

    try {
      if (message.type === 'user_message' && message.interim === false) {
        // Process completed user message
        await processUserMessage(message, messageId);
      } else if (message.type === 'assistant_message') {
        // Process assistant text message
        await processAssistantMessage(message, messageId);
      } else if (message.audio?.data || message.audio_output?.data) {
        // Process assistant audio output
        await processAssistantAudio(message, messageId);
      }
    } catch (error) {
      console.error(`❌ Failed to process message ${messageId}:`, error);
      config.onError?.(error as Error);
    }
  }, [isInitialized, config]);

  const processUserMessage = useCallback(async (message: any, messageId: string): Promise<void> => {
    const content = message.message?.content || message.transcript?.content || '';
    const { begin, end } = message.time || {};
    
    if (!content || content.length < 5) return;
    
    console.log(`🎤 Processing user message ${messageId}:`, {
      content: content.substring(0, 50) + '...',
      duration: end - begin,
      timeRange: `${begin}-${end}ms`
    });

    // Create audio metadata record (since we can't capture the actual audio from Hume's stream)
    const audioMetadata = {
      messageId,
      speaker: 'user',
      content,
      duration: end - begin,
      timeRange: { begin, end },
      prosodyData: message.models?.prosody?.scores || null,
      mimeType: 'audio/webm', // Standard format
      isReconstructed: true // Flag to indicate this is metadata, not actual audio
    };

    // Store in database as conversation_audio record
    await storeAudioMetadata(messageId, 'user', audioMetadata);
    
    // Notify parent if callback provided
    if (config.onUserAudioReady) {
      // Create a minimal blob placeholder
      const placeholderBlob = new Blob(['audio placeholder'], { type: 'audio/webm' });
      config.onUserAudioReady(placeholderBlob, messageId);
    }
    
    console.log(`✅ User message metadata stored for ${messageId}`);
  }, [config]);

  const processAssistantMessage = useCallback(async (message: any, messageId: string): Promise<void> => {
    const content = message.message?.content || '';
    
    if (!content || content.length < 5) return;
    
    console.log(`🤖 Processing assistant message ${messageId}:`, {
      content: content.substring(0, 50) + '...'
    });

    // Assistant text messages don't have audio - actual audio comes via audio_output messages
    // We'll just log this for now and wait for the corresponding audio_output message
  }, []);

  const processAssistantAudio = useCallback(async (message: any, messageId: string): Promise<void> => {
    const audioData = message.audio?.data || message.audio_output?.data;
    
    if (!audioData) {
      console.warn(`⚠️ No audio data found in message ${messageId}`);
      return;
    }

    try {
      console.log(`🤖 Processing assistant audio ${messageId}:`, {
        dataLength: audioData.length,
        type: 'base64'
      });

      // Convert base64 to blob
      const audioBlob = base64ToBlob(audioData, 'audio/wav'); // Hume typically sends WAV
      
      // Upload to Supabase
      await uploadAssistantAudio(messageId, audioBlob);
      
      // Notify parent
      if (config.onAssistantAudioReady) {
        config.onAssistantAudioReady(audioBlob, messageId);
      }
      
      console.log(`✅ Assistant audio processed for ${messageId}`);
      
    } catch (error) {
      console.error(`❌ Failed to process assistant audio ${messageId}:`, error);
      throw error;
    }
  }, [config]);

  const storeAudioMetadata = useCallback(async (messageId: string, speaker: 'user' | 'assistant', metadata: any): Promise<void> => {
    try {
      // Get conversation ID from session
      const { data: conversation } = await supabaseService()
        .from('conversations')
        .select('id')
        .eq('session_id', config.sessionId)
        .eq('status', 'active')
        .single();

      if (!conversation) {
        throw new Error(`No active conversation found for session ${config.sessionId}`);
      }

      const conversationId = conversation.id;
      const format = 'webm'; // Standard format
      const storagePath = generateStoragePath(config.chatId, messageId, speaker, format);

      // Insert metadata record
      const { error: dbError } = await supabaseService()
        .from('conversation_audio')
        .insert({
          session_id: config.sessionId,
          conversation_id: conversationId,
          message_id: messageId,
          speaker: speaker,
          audio_url: null, // No actual file for user audio metadata
          audio_duration: metadata.duration || 0,
          audio_format: format,
          file_size: 0, // No actual file
          processing_status: 'metadata_only',
          storage_path: storagePath,
          metadata: metadata // Store rich metadata including content, prosody, etc.
        });

      if (dbError) {
        throw new Error(`Database insert failed: ${dbError.message}`);
      }

    } catch (error) {
      console.error(`❌ Failed to store audio metadata for ${messageId}:`, error);
      throw error;
    }
  }, [config.sessionId, config.chatId]);

  const uploadAssistantAudio = useCallback(async (messageId: string, audioBlob: Blob): Promise<void> => {
    try {
      // Get conversation ID
      const { data: conversation } = await supabaseService()
        .from('conversations')
        .select('id')
        .eq('session_id', config.sessionId)
        .eq('status', 'active')
        .single();

      if (!conversation) {
        throw new Error(`No active conversation found for session ${config.sessionId}`);
      }

      const conversationId = conversation.id;
      const format = 'wav'; // Hume audio format
      const storagePath = generateStoragePath(config.chatId, messageId, 'assistant', format);

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabaseService()
        .storage
        .from('conversation-audio')
        .upload(storagePath, audioBlob, {
          contentType: 'audio/wav'
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Get public URL
      const { data: urlData } = supabaseService()
        .storage
        .from('conversation-audio')
        .getPublicUrl(storagePath);

      if (!urlData?.publicUrl) {
        throw new Error('Failed to get public URL');
      }

      // Store record in database
      const { error: dbError } = await supabaseService()
        .from('conversation_audio')
        .insert({
          session_id: config.sessionId,
          conversation_id: conversationId,
          message_id: messageId,
          speaker: 'assistant',
          audio_url: urlData.publicUrl,
          audio_duration: audioBlob.size / 1000, // Rough estimate
          audio_format: format,
          file_size: audioBlob.size,
          processing_status: 'completed',
          storage_path: storagePath
        });

      if (dbError) {
        throw new Error(`Database insert failed: ${dbError.message}`);
      }

      console.log(`✅ Successfully uploaded assistant audio for message ${messageId}`);

    } catch (error) {
      console.error(`❌ Failed to upload assistant audio for ${messageId}:`, error);
      throw error;
    }
  }, [config.sessionId, config.chatId]);

  const cleanup = useCallback(() => {
    console.log('🧹 Cleaning up audio interceptor...');
    processedMessagesRef.current.clear();
    setIsInitialized(false);
  }, []);

  return {
    isInitialized,
    isSupported,
    initializeInterceptor,
    processMessage,
    cleanup
  };
}

// Helper function to convert base64 to blob
function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}
