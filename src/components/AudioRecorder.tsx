// components/AudioRecorder.tsx
// Audio recording component for conversation interface

import React, { useState, useCallback } from 'react';
import { Mic, MicOff, Square, Play, Pause, Upload, AlertCircle } from 'lucide-react';
import { useAudioCapture } from '@/hooks/useAudioCapture';
import { AudioCaptureResult } from '@/lib/audio-capture-service';

interface AudioRecorderProps {
  conversationId: string;
  turnNumber: number;
  speaker: 'user' | 'agent';
  onAudioRecorded?: (result: AudioCaptureResult) => void;
  onUploadComplete?: (url: string) => void;
  disabled?: boolean;
  className?: string;
}

export function AudioRecorder({
  conversationId,
  turnNumber,
  speaker,
  onAudioRecorded,
  onUploadComplete,
  disabled = false,
  className = ''
}: AudioRecorderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [lastRecording, setLastRecording] = useState<AudioCaptureResult | null>(null);
  
  const {
    isRecording,
    isSupported,
    duration,
    compatibility,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    getAudioLevel,
    cleanup
  } = useAudioCapture({
    onRecordingStart: () => {
      setUploadError(null);
      console.log(`🎤 Started recording for ${speaker} turn ${turnNumber}`);
    },
    onRecordingStop: (result) => {
      setLastRecording(result);
      onAudioRecorded?.(result);
      console.log(`🎤 Stopped recording for ${speaker} turn ${turnNumber}`);
    },
    onError: (error) => {
      setUploadError(error.message);
      console.error('Audio recording error:', error);
    }
  });

  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleStartRecording = useCallback(async () => {
    try {
      await startRecording();
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  }, [startRecording]);

  const handleStopRecording = useCallback(async () => {
    try {
      await stopRecording();
    } catch (error) {
      console.error('Failed to stop recording:', error);
    }
  }, [stopRecording]);

  const handleUpload = useCallback(async () => {
    if (!lastRecording) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('conversationId', conversationId);
      formData.append('turnNumber', turnNumber.toString());
      formData.append('speaker', speaker);
      formData.append('duration', lastRecording.duration.toString());
      formData.append('audioFile', lastRecording.audioBlob, `turn-${turnNumber}-${speaker}.webm`);

      const response = await fetch('/api/audio/upload', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        console.log('✅ Audio uploaded successfully:', result.data);
        onUploadComplete?.(result.data.url);
        setLastRecording(null); // Clear the recording after successful upload
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload failed:', error);
      setUploadError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  }, [lastRecording, conversationId, turnNumber, speaker, onUploadComplete]);

  // Show compatibility issues
  if (!isSupported) {
    return (
      <div className={`flex items-center space-x-2 text-red-600 ${className}`}>
        <AlertCircle className="h-4 w-4" />
        <span className="text-sm">
          Audio recording not supported: {compatibility.issues.join(', ')}
        </span>
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      {/* Recording Controls */}
      <div className="flex items-center space-x-2">
        {!isRecording ? (
          <button
            onClick={handleStartRecording}
            disabled={disabled}
            className="flex items-center space-x-2 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Mic className="h-4 w-4" />
            <span className="text-sm">Record</span>
          </button>
        ) : (
          <div className="flex items-center space-x-2">
            <button
              onClick={pauseRecording}
              className="flex items-center space-x-2 px-3 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
            >
              <Pause className="h-4 w-4" />
            </button>
            <button
              onClick={resumeRecording}
              className="flex items-center space-x-2 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
            >
              <Play className="h-4 w-4" />
            </button>
            <button
              onClick={handleStopRecording}
              className="flex items-center space-x-2 px-3 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
            >
              <Square className="h-4 w-4" />
              <span className="text-sm">Stop</span>
            </button>
          </div>
        )}
      </div>

      {/* Duration Display */}
      {isRecording && (
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <MicOff className="h-4 w-4 text-red-500 animate-pulse" />
          <span className="font-mono">{formatDuration(duration)}</span>
        </div>
      )}

      {/* Upload Button */}
      {lastRecording && !isRecording && (
        <button
          onClick={handleUpload}
          disabled={isUploading}
          className="flex items-center space-x-2 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
        >
          <Upload className="h-4 w-4" />
          <span className="text-sm">
            {isUploading ? 'Uploading...' : 'Upload'}
          </span>
        </button>
      )}

      {/* Error Display */}
      {uploadError && (
        <div className="flex items-center space-x-2 text-red-600">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">{uploadError}</span>
        </div>
      )}

      {/* Recording Info */}
      {lastRecording && (
        <div className="text-sm text-gray-600">
          <div>Duration: {formatDuration(lastRecording.duration)}</div>
          <div>Size: {(lastRecording.size / 1024).toFixed(2)}KB</div>
        </div>
      )}
    </div>
  );
}
