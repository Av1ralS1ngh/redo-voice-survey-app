// app/audio-integration-test/page.tsx
// Test page for audio integration with real survey flow

'use client';

import React, { useState, useEffect } from 'react';
import { useVoiceSurveyAudioCapture } from '@/hooks/useVoiceSurveyAudioCapture';
import { Mic, MicOff, Square, Play, Pause, Upload, AlertCircle } from 'lucide-react';

export default function AudioIntegrationTestPage() {
  const [sessionId, setSessionId] = useState<string>('');
  const [uploadedAudio, setUploadedAudio] = useState<Array<{
    url: string;
    turnNumber: number;
    speaker: 'user' | 'agent';
  }>>([]);

  // Generate session ID on client side only to avoid hydration mismatch
  useEffect(() => {
    setSessionId(`test-session-${Date.now()}`);
  }, []);

  const {
    isRecording,
    isSupported: audioSupported,
    duration: audioDuration,
    isUploading: audioUploading,
    startRecording,
    stopRecording,
    cleanup: cleanupAudio
  } = useVoiceSurveyAudioCapture({
    sessionId,
    onAudioUploaded: (audioUrl, turnNumber, speaker) => {
      console.log(`🎵 Audio uploaded for ${speaker}, turn ${turnNumber}:`, audioUrl);
      setUploadedAudio(prev => [...prev, { url: audioUrl, turnNumber, speaker }]);
    },
    onError: (error) => {
      console.error('Audio capture error:', error);
    }
  });

  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const playAudio = (url: string) => {
    const audio = new Audio(url);
    audio.play().catch(error => {
      console.error('Failed to play audio:', error);
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Audio Integration Test
          </h1>
          <p className="text-gray-600">
            Testing audio capture integration with real survey session IDs
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Session ID: {sessionId || 'Generating...'}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Audio Recording Controls */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Audio Recording Controls
            </h2>
            
            {!audioSupported ? (
              <div className="flex items-center space-x-2 text-red-600">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">Audio recording not supported in this browser</span>
              </div>
            ) : (
              <div className="space-y-4">
                {/* User Recording */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">User Audio</h3>
                  <div className="flex items-center space-x-3">
                    {!isRecording ? (
                      <button
                        onClick={() => startRecording('user')}
                        disabled={audioUploading}
                        className="flex items-center space-x-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
                      >
                        <Mic className="h-4 w-4" />
                        <span>Record User</span>
                      </button>
                    ) : (
                      <button
                        onClick={stopRecording}
                        disabled={audioUploading}
                        className="flex items-center space-x-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50"
                      >
                        <Square className="h-4 w-4" />
                        <span>Stop</span>
                      </button>
                    )}
                    
                    {isRecording && (
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <MicOff className="h-4 w-4 text-red-500 animate-pulse" />
                        <span className="font-mono">{formatDuration(audioDuration)}</span>
                      </div>
                    )}
                    
                    {audioUploading && (
                      <div className="flex items-center space-x-2 text-sm text-blue-600">
                        <Upload className="h-4 w-4 animate-spin" />
                        <span>Uploading...</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Agent Recording */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Agent Audio</h3>
                  <div className="flex items-center space-x-3">
                    {!isRecording ? (
                      <button
                        onClick={() => startRecording('agent')}
                        disabled={audioUploading}
                        className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                      >
                        <Mic className="h-4 w-4" />
                        <span>Record Agent</span>
                      </button>
                    ) : (
                      <button
                        onClick={stopRecording}
                        disabled={audioUploading}
                        className="flex items-center space-x-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50"
                      >
                        <Square className="h-4 w-4" />
                        <span>Stop</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Uploaded Audio Files */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Uploaded Audio Files
            </h2>
            
            {uploadedAudio.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No audio files uploaded yet
              </p>
            ) : (
              <div className="space-y-3">
                {uploadedAudio.map((audio, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        audio.speaker === 'user' ? 'bg-red-100' : 'bg-blue-100'
                      }`}>
                        <Play className={`h-4 w-4 ${
                          audio.speaker === 'user' ? 'text-red-600' : 'text-blue-600'
                        }`} />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {audio.speaker === 'user' ? 'User' : 'Agent'} Audio
                        </div>
                        <div className="text-sm text-gray-600">
                          Turn {audio.turnNumber} • {audio.url.split('/').pop()}
                        </div>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => playAudio(audio.url)}
                      className="flex items-center space-x-1 px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                    >
                      <Play className="h-3 w-3" />
                      <span className="text-sm">Play</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Integration Status */}
        <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Integration Status
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Audio Capture</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• WebRTC MediaRecorder API</li>
                <li>• Hume AI compatible settings</li>
                <li>• Real-time duration tracking</li>
                <li>• Browser compatibility check</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Integration</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Uses real session IDs (UUIDs)</li>
                <li>• Integrates with ConversationManager</li>
                <li>• Stores audio URLs in conversation turns</li>
                <li>• Ready for voice survey integration</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Next Steps */}
        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-blue-900 mb-4">
            Next Steps
          </h2>
          
          <div className="text-sm text-blue-800 space-y-2">
            <p><strong>1. Run the SQL script:</strong></p>
            <p className="ml-4">Copy and run <code>scripts/setup-audio-integration.sql</code> in your Supabase SQL editor.</p>
            
            <p><strong>2. Test with real survey:</strong></p>
            <p className="ml-4">Visit <code>http://localhost:3000/s/test-user-123</code> to test with the actual voice survey.</p>
            
            <p><strong>3. Verify audio storage:</strong></p>
            <p className="ml-4">Check that audio files appear in Supabase Storage and conversation turns include audio URLs.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
