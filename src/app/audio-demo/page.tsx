// app/audio-demo/page.tsx
// Demo page for testing audio capture and storage

'use client';

import React, { useState } from 'react';
import { VoiceSurveyWithAudio } from '@/components/VoiceSurveyWithAudio';
import { AudioRecorder } from '@/components/AudioRecorder';
import { Play, Download, Trash2 } from 'lucide-react';

export default function AudioDemoPage() {
  const [conversationId] = useState(`demo-${Date.now()}`);
  const [uploadedAudio, setUploadedAudio] = useState<string[]>([]);

  const handleUploadComplete = (audioUrl: string) => {
    setUploadedAudio(prev => [...prev, audioUrl]);
  };

  const handleTurnComplete = (turnNumber: number, audioUrl?: string) => {
    console.log(`Turn ${turnNumber} completed`, audioUrl);
  };

  const playAudio = (url: string) => {
    const audio = new Audio(url);
    audio.play().catch(error => {
      console.error('Failed to play audio:', error);
    });
  };

  const downloadAudio = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Audio Capture & Storage Demo
          </h1>
          <p className="text-gray-600">
            Test the audio recording and storage pipeline
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Audio Recording Demo */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Simple Audio Recorder
            </h2>
            
            <div className="mb-6">
              <AudioRecorder
                conversationId={conversationId}
                turnNumber={1}
                speaker="user"
                onUploadComplete={handleUploadComplete}
              />
            </div>

            <div className="text-sm text-gray-600">
              <h3 className="font-semibold mb-2">Features:</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>WebRTC audio capture</li>
                <li>Hume AI compatible settings</li>
                <li>Automatic upload to Supabase</li>
                <li>Real-time duration tracking</li>
                <li>Error handling</li>
              </ul>
            </div>
          </div>

          {/* Voice Survey Demo */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <VoiceSurveyWithAudio
              conversationId={conversationId}
              onTurnComplete={handleTurnComplete}
            />
          </div>
        </div>

        {/* Uploaded Audio Files */}
        {uploadedAudio.length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Uploaded Audio Files
            </h2>
            
            <div className="space-y-3">
              {uploadedAudio.map((url, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <Play className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        Audio File {index + 1}
                      </div>
                      <div className="text-sm text-gray-600">
                        {url.split('/').pop()}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => playAudio(url)}
                      className="flex items-center space-x-1 px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                    >
                      <Play className="h-3 w-3" />
                      <span className="text-sm">Play</span>
                    </button>
                    
                    <button
                      onClick={() => downloadAudio(url, `audio-${index + 1}.webm`)}
                      className="flex items-center space-x-1 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      <Download className="h-3 w-3" />
                      <span className="text-sm">Download</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Technical Details */}
        <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Technical Implementation
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Audio Capture</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• WebRTC MediaRecorder API</li>
                <li>• 16kHz sample rate (Hume AI compatible)</li>
                <li>• Mono audio channel</li>
                <li>• Echo cancellation & noise suppression</li>
                <li>• WebM format with Opus codec</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Storage & Database</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Supabase Storage bucket</li>
                <li>• PostgreSQL conversation_audio table</li>
                <li>• RLS policies for security</li>
                <li>• Public URLs for playback</li>
                <li>• Processing status tracking</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Setup Instructions */}
        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-blue-900 mb-4">
            Setup Instructions
          </h2>
          
          <div className="text-sm text-blue-800 space-y-2">
            <p><strong>1. Run the SQL script in Supabase:</strong></p>
            <p className="ml-4">Copy and run the contents of <code>scripts/setup-audio-storage.sql</code> in your Supabase SQL editor.</p>
            
            <p><strong>2. Verify storage bucket:</strong></p>
            <p className="ml-4">Check that the <code>conversation-audio</code> bucket exists in Storage.</p>
            
            <p><strong>3. Test audio capture:</strong></p>
            <p className="ml-4">Use the recorders above to test audio capture and upload functionality.</p>
            
            <p><strong>4. Check database:</strong></p>
            <p className="ml-4">Verify that audio records are being created in the <code>conversation_audio</code> table.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
