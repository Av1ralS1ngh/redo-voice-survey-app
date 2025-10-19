// hooks/useVoiceSurveyAudioCapture.ts
// Audio capture hook specifically for voice survey integration

import { useState, useRef, useCallback, useEffect } from 'react';
import { AudioCaptureService, AudioCaptureResult } from '@/lib/audio-capture-service';
import { completeAudioUpload } from '@/lib/audio-storage-service';

export interface UseVoiceSurveyAudioCaptureOptions {
  sessionId: string; // UUID session ID from the survey
  currentTurnNumber?: number; // Current turn number for accurate tracking
  onAudioUploaded?: (audioUrl: string, turnNumber: number, speaker: 'user' | 'agent') => void;
  onError?: (error: Error) => void;
}

export interface UseVoiceSurveyAudioCaptureReturn {
  // State
  isRecording: boolean;
  isSupported: boolean;
  duration: number;
  isUploading: boolean;
  
  // Actions
  startRecording: (speaker: 'user' | 'agent') => Promise<void>;
  stopRecording: () => Promise<void>;
  
  // Utilities
  getAudioLevel: () => Promise<number>;
  cleanup: () => void;
}

export function useVoiceSurveyAudioCapture({
  sessionId,
  currentTurnNumber,
  onAudioUploaded,
  onError
}: UseVoiceSurveyAudioCaptureOptions): UseVoiceSurveyAudioCaptureReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [currentSpeaker, setCurrentSpeaker] = useState<'user' | 'agent'>('user');
  
  const audioServiceRef = useRef<AudioCaptureService | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Initialize audio service
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Check if audio capture is supported
      const supported = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
      setIsSupported(supported);
      
      if (supported) {
        audioServiceRef.current = new AudioCaptureService();
      }
    }
    
    return () => {
      cleanup();
    };
  }, []);
  
  // Update duration while recording
  useEffect(() => {
    if (isRecording) {
      durationIntervalRef.current = setInterval(() => {
        if (audioServiceRef.current) {
          const status = audioServiceRef.current.getRecordingStatus();
          setDuration(status.duration);
        }
      }, 100);
    } else {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
    }
    
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
    };
  }, [isRecording]);
  
  const startRecording = useCallback(async (speaker: 'user' | 'agent'): Promise<void> => {
    if (!audioServiceRef.current || !isSupported) {
      const error = new Error('Audio capture is not supported');
      onError?.(error);
      throw error;
    }
    
    if (isRecording) {
      console.warn('Recording already in progress');
      return;
    }
    
    try {
      setCurrentSpeaker(speaker);
      await audioServiceRef.current.startRecording();
      setIsRecording(true);
      setDuration(0);
      
      console.log(`🎤 Started recording for ${speaker} in session ${sessionId}`);
    } catch (error) {
      console.error('Failed to start recording:', error);
      onError?.(error as Error);
      throw error;
    }
  }, [isRecording, isSupported, sessionId, onError]);
  
  const stopRecording = useCallback(async (): Promise<void> => {
    if (!audioServiceRef.current || !isRecording) {
      return;
    }
    
    try {
      const result = await audioServiceRef.current.stopRecording();
      setIsRecording(false);
      setDuration(0);
      
      console.log(`🎤 Stopped recording for ${currentSpeaker}:`, {
        duration: `${result.duration}ms`,
        size: `${(result.size / 1024).toFixed(2)}KB`
      });
      
      // Upload audio file
      setIsUploading(true);
      try {
        // Use current turn number if provided, otherwise estimate from duration
        const turnNumber = currentTurnNumber || Math.ceil(result.duration / 1000);
        
        const uploadResult = await completeAudioUpload(
          sessionId, // Will be converted to conversation_id in storage service
          turnNumber,
          currentSpeaker,
          result.audioBlob,
          result.duration
        );
        
        console.log(`✅ Audio uploaded for ${currentSpeaker}, turn ${turnNumber}:`, uploadResult.url);
        
        // Notify parent component
        onAudioUploaded?.(uploadResult.url, turnNumber, currentSpeaker);
        
      } catch (uploadError) {
        console.error('Audio upload failed:', uploadError);
        onError?.(uploadError as Error);
      } finally {
        setIsUploading(false);
      }
      
    } catch (error) {
      console.error('Failed to stop recording:', error);
      setIsRecording(false);
      setDuration(0);
      onError?.(error as Error);
      throw error;
    }
  }, [isRecording, currentSpeaker, sessionId, onAudioUploaded, onError]);
  
  const getAudioLevel = useCallback(async (): Promise<number> => {
    if (!audioServiceRef.current) {
      return 0;
    }
    
    try {
      return await audioServiceRef.current.getAudioLevel();
    } catch (error) {
      console.warn('Failed to get audio level:', error);
      return 0;
    }
  }, []);
  
  const cleanup = useCallback((): void => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    
    if (audioServiceRef.current) {
      audioServiceRef.current.destroy();
      audioServiceRef.current = null;
    }
    
    setIsRecording(false);
    setDuration(0);
    setIsUploading(false);
  }, []);
  
  return {
    // State
    isRecording,
    isSupported,
    duration,
    isUploading,
    
    // Actions
    startRecording,
    stopRecording,
    
    // Utilities
    getAudioLevel,
    cleanup
  };
}
