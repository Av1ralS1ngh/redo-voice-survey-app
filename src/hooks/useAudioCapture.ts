// hooks/useAudioCapture.ts
// React hook for audio capture integration

import { useState, useRef, useCallback, useEffect } from 'react';
import { AudioCaptureService, AudioCaptureResult, checkAudioCaptureCompatibility } from '@/lib/audio-capture-service';

export interface UseAudioCaptureOptions {
  autoStart?: boolean;
  onRecordingStart?: () => void;
  onRecordingStop?: (result: AudioCaptureResult) => void;
  onError?: (error: Error) => void;
}

export interface UseAudioCaptureReturn {
  // State
  isRecording: boolean;
  isSupported: boolean;
  duration: number;
  compatibility: ReturnType<typeof checkAudioCaptureCompatibility>;
  
  // Actions
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<AudioCaptureResult | null>;
  pauseRecording: () => void;
  resumeRecording: () => void;
  
  // Utilities
  getAudioLevel: () => Promise<number>;
  cleanup: () => void;
}

export function useAudioCapture(options: UseAudioCaptureOptions = {}): UseAudioCaptureReturn {
  const {
    autoStart = false,
    onRecordingStart,
    onRecordingStop,
    onError
  } = options;
  
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [compatibility, setCompatibility] = useState(() => ({
    supported: false,
    mimeTypes: [],
    issues: ['Initializing...']
  }));
  
  const audioServiceRef = useRef<AudioCaptureService | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Initialize audio service and check compatibility on client side
  useEffect(() => {
    // Only run on client side
    if (typeof window !== 'undefined') {
      const compat = checkAudioCaptureCompatibility();
      setCompatibility(compat);
      
      if (compat.supported) {
        audioServiceRef.current = new AudioCaptureService();
      }
    }
    
    return () => {
      cleanup();
    };
  }, []);
  
  // Auto-start recording if enabled
  useEffect(() => {
    if (autoStart && compatibility.supported && !isRecording) {
      startRecording().catch(error => {
        console.error('Auto-start recording failed:', error);
        onError?.(error);
      });
    }
  }, [autoStart, compatibility.supported, isRecording]);
  
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
  
  const startRecording = useCallback(async (): Promise<void> => {
    if (!audioServiceRef.current) {
      const error = new Error('Audio capture is not supported');
      onError?.(error);
      throw error;
    }
    
    try {
      await audioServiceRef.current.startRecording();
      setIsRecording(true);
      setDuration(0);
      onRecordingStart?.();
      
      console.log('🎤 Recording started');
    } catch (error) {
      console.error('Failed to start recording:', error);
      onError?.(error as Error);
      throw error;
    }
  }, [onRecordingStart, onError]);
  
  const stopRecording = useCallback(async (): Promise<AudioCaptureResult | null> => {
    if (!audioServiceRef.current || !isRecording) {
      return null;
    }
    
    try {
      const result = await audioServiceRef.current.stopRecording();
      setIsRecording(false);
      setDuration(0);
      onRecordingStop?.(result);
      
      console.log('🎤 Recording stopped:', {
        duration: `${result.duration}ms`,
        size: `${(result.size / 1024).toFixed(2)}KB`
      });
      
      return result;
    } catch (error) {
      console.error('Failed to stop recording:', error);
      setIsRecording(false);
      setDuration(0);
      onError?.(error as Error);
      throw error;
    }
  }, [isRecording, onRecordingStop, onError]);
  
  const pauseRecording = useCallback((): void => {
    if (audioServiceRef.current && isRecording) {
      audioServiceRef.current.pauseRecording();
    }
  }, [isRecording]);
  
  const resumeRecording = useCallback((): void => {
    if (audioServiceRef.current && isRecording) {
      audioServiceRef.current.resumeRecording();
    }
  }, [isRecording]);
  
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
  }, []);
  
  return {
    // State
    isRecording,
    isSupported: compatibility.supported,
    duration,
    compatibility,
    
    // Actions
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    
    // Utilities
    getAudioLevel,
    cleanup
  };
}
