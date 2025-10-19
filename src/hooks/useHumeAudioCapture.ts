// voice-survey/src/hooks/useHumeAudioCapture.ts
// Continuous audio capture with Hume message ID indexing + dual user/assistant capture

import { useState, useRef, useEffect, useCallback } from 'react';
import { supabaseService } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

interface UseHumeAudioCaptureConfig {
  sessionId: string;
  chatId: string;
  onUserAudioReady?: (audioBlob: Blob, messageId: string) => void;
  onAssistantAudioReady?: (audioBlob: Blob, messageId: string) => void;
  onError?: (error: Error) => void;
}

interface HumeAudioCaptureReturn {
  isInitialized: boolean;
  isSupported: boolean;
  supportedMimeType: string | null;
  initializeContinuousRecording: () => Promise<void>;
  completeTurn: (messageId: string, speaker: 'user' | 'assistant') => Promise<void>;
  processAssistantAudio: (message: any) => Promise<void>;
  getSupportedMimeType: () => string | null;
  setCurrentUserMessage: (messageId: string) => void;
  cleanup: () => void;
}

// Helper to convert Blob to Base64
const convertBlobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve(base64String);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

// Helper to convert Base64 to Blob
const base64ToBlob = (base64: string, mimeType: string): Blob => {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
};

// Helper to generate storage path using Hume message ID
const generateStoragePath = (chatId: string, messageId: string, speaker: 'user' | 'assistant', format: string) => {
  const timestamp = Date.now();
  return `conversations/${chatId}/audio/${messageId}_${speaker}_${timestamp}.${format}`;
};

export function useHumeAudioCapture(config: UseHumeAudioCaptureConfig): HumeAudioCaptureReturn {
  // State management for continuous recording
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [supportedMimeType, setSupportedMimeType] = useState<string | null>(null);

  // Refs for MediaRecorder and audio management
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  // Turn-based chunk buffers indexed by message ID
  const userChunksBufferRef = useRef<Map<string, Blob[]>>(new Map());
  const currentUserMessageIdRef = useRef<string | null>(null);

  // Check browser support and determine MIME type
  useEffect(() => {
    const checkSupport = () => {
      const hasMediaRecorder = typeof MediaRecorder !== 'undefined';
      const hasGetUserMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
      
      if (!hasMediaRecorder || !hasGetUserMedia) {
        setIsSupported(false);
        return;
      }
      
      // Find supported MIME type
      const supportedTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/wav'
      ];
      
      const mimeType = supportedTypes.find(type => MediaRecorder.isTypeSupported(type));
      
      if (mimeType) {
        setIsSupported(true);
        setSupportedMimeType(mimeType);
        console.log('🎤 Audio capture supported:', { mimeType });
      } else {
        setIsSupported(false);
        console.warn('🚨 No supported audio MIME types found');
      }
    };
    
    checkSupport();
  }, []);

  // Get supported MIME type
  const getSupportedMimeType = useCallback(() => {
    return supportedMimeType;
  }, [supportedMimeType]);

  // Initialize continuous recording (called once per conversation)
  const initializeContinuousRecording = useCallback(async (): Promise<void> => {
    // 🎯 NEW APPROACH: Use Hume's existing audio stream, don't create our own MediaRecorder
    if (!isSupported || !supportedMimeType || isInitialized) {
      const error = new Error('Cannot initialize: not supported or already initialized');
      config.onError?.(error);
      throw error;
    }

    try {
      console.log('🚀 Initializing audio capture integration (using Hume stream)...');
      
      // Mark as initialized - we're ready to process Hume audio events
      setIsInitialized(true);
      
      console.log('✅ Audio capture integration ready', {
        note: 'Using Hume VoiceProvider audio stream',
        mode: 'message-based storage only'
      });
      
    } catch (error) {
      console.error('❌ Failed to initialize audio capture integration:', error);
      config.onError?.(error as Error);
      throw error;
    }
  }, [isSupported, supportedMimeType, isInitialized, config]);

  // Emergency upload function for onstop events
  const emergencyUpload = useCallback(async () => {
    console.log('🚨 Emergency upload triggered');
    
    // Upload all buffered user chunks
    for (const [messageId, chunks] of userChunksBufferRef.current.entries()) {
      if (chunks.length > 0) {
        try {
          await uploadChunksForMessage(messageId, 'user', chunks);
          console.log(`🆘 Emergency uploaded user audio for message ${messageId}`);
        } catch (error) {
          console.error(`❌ Emergency upload failed for message ${messageId}:`, error);
        }
      }
    }
    
    // Clear buffers
    userChunksBufferRef.current.clear();
    currentUserMessageIdRef.current = null;
  }, []);

  // Upload chunks for a specific message ID
  const uploadChunksForMessage = useCallback(async (
    messageId: string, 
    speaker: 'user' | 'assistant', 
    chunks: Blob[]
  ): Promise<void> => {
    if (chunks.length === 0) return;

    try {
      // Concatenate chunks into single blob
      const completeBlob = new Blob(chunks, { 
        type: supportedMimeType || 'audio/webm' 
      });
      
      const duration = chunks.length * 100; // Estimate: 100ms per chunk
      
      console.log(`🔄 Uploading ${speaker} audio for message ${messageId}:`, {
        chunks: chunks.length,
        size: completeBlob.size,
        estimatedDuration: `${duration}ms`
      });

      // Convert sessionId to conversationId (same pattern as existing code)
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
      
      // Generate storage path using message ID
      const format = supportedMimeType?.includes('webm') ? 'webm' : 'wav';
      const storagePath = generateStoragePath(config.chatId, messageId, speaker, format);
      
      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabaseService()
        .storage
        .from('conversation-audio')
        .upload(storagePath, completeBlob, {
          contentType: supportedMimeType || 'audio/webm'
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

      // Store record in database with message ID
      const { error: dbError } = await supabaseService()
        .from('conversation_audio')
        .insert({
          session_id: config.sessionId,
          conversation_id: conversationId,
          message_id: messageId,
          speaker: speaker,
          audio_url: urlData.publicUrl,
          audio_duration: duration,
          audio_format: format,
          file_size: completeBlob.size,
          processing_status: 'completed',
          storage_path: storagePath
        });

      if (dbError) {
        console.error('❌ Database insert failed:', dbError);
        throw new Error(`Database insert failed: ${dbError.message}`);
      }

      console.log(`✅ Successfully uploaded ${speaker} audio for message ${messageId}`);
      
      // Notify parent component
      if (speaker === 'user') {
        config.onUserAudioReady?.(completeBlob, messageId);
      } else {
        config.onAssistantAudioReady?.(completeBlob, messageId);
      }

    } catch (error) {
      console.error(`❌ Upload failed for message ${messageId}:`, error);
      config.onError?.(error as Error);
      throw error;
    }
  }, [config, supportedMimeType]);

  // Complete turn - upload buffered chunks for a message ID
  const completeTurn = useCallback(async (messageId: string, speaker: 'user' | 'assistant'): Promise<void> => {
    console.log(`🎯 Completing turn for ${speaker} message ${messageId}`);

    if (speaker === 'user') {
      // Upload buffered user chunks
      const chunks = userChunksBufferRef.current.get(messageId) || [];
      if (chunks.length > 0) {
        await uploadChunksForMessage(messageId, 'user', chunks);
        userChunksBufferRef.current.delete(messageId);
      } else {
        console.warn(`⚠️ No user audio chunks found for message ${messageId}`);
      }
      
      // Clear current message tracking
      if (currentUserMessageIdRef.current === messageId) {
        currentUserMessageIdRef.current = null;
      }
    }
    // Note: Assistant audio is handled separately in processAssistantAudio
  }, [uploadChunksForMessage]);

  // Process assistant audio from messages with audio data
  const processAssistantAudio = useCallback(async (message: any): Promise<void> => {
    // Check if message has audio data (could be in various formats from Hume)
    const audioData = message.audio?.data || message.audio_output?.data;
    if (!audioData) {
      console.log('⚠️ No audio data found in message:', message.type);
      return;
    }

    try {
      const messageId = message.id || `assistant_${Date.now()}`;
      const base64Audio = audioData;
      const mimeType = message.audio?.mime_type || message.audio_output?.mime_type || 'audio/wav';
      
      console.log(`🤖 Processing assistant audio for message ${messageId}`);
      
      // Convert base64 to blob
      const audioBlob = base64ToBlob(base64Audio, mimeType);
      
      // Upload directly (no buffering needed for assistant audio)
      await uploadChunksForMessage(messageId, 'assistant', [audioBlob]);
      console.log(`✅ Assistant audio uploaded for message ${messageId}`);
      
    } catch (error) {
      console.error('❌ Failed to process assistant audio:', error);
      config.onError?.(error as Error);
    }
  }, [uploadChunksForMessage, config]);

  // Set current user message ID for chunk buffering
  const setCurrentUserMessage = useCallback((messageId: string) => {
    console.log(`🎯 Setting current user message ID: ${messageId}`);
    currentUserMessageIdRef.current = messageId;
    if (!userChunksBufferRef.current.has(messageId)) {
      userChunksBufferRef.current.set(messageId, []);
    }
  }, []);

  // Cleanup function
  const cleanup = useCallback((): void => {
    console.log('🧹 Cleaning up continuous audio capture');
    
    // Stop MediaRecorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    // Stop all tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    
    // Clear refs and buffers
    mediaRecorderRef.current = null;
    streamRef.current = null;
    userChunksBufferRef.current.clear();
    currentUserMessageIdRef.current = null;
    setIsInitialized(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    isInitialized,
    isSupported,
    supportedMimeType,
    initializeContinuousRecording,
    completeTurn,
    processAssistantAudio,
    getSupportedMimeType,
    setCurrentUserMessage,
    cleanup
  };
}