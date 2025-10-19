// components/VoiceSurveyWithAudio.tsx
// Example integration of audio capture with voice survey

import React, { useState, useCallback } from 'react';
import { AudioRecorder } from './AudioRecorder';
import { Mic, Play, Pause } from 'lucide-react';

interface VoiceSurveyWithAudioProps {
  conversationId: string;
  onTurnComplete?: (turnNumber: number, audioUrl?: string) => void;
}

export function VoiceSurveyWithAudio({ 
  conversationId, 
  onTurnComplete 
}: VoiceSurveyWithAudioProps) {
  const [currentTurn, setCurrentTurn] = useState(1);
  const [isUserTurn, setIsUserTurn] = useState(true);
  const [conversationState, setConversationState] = useState<'idle' | 'user-speaking' | 'agent-speaking'>('idle');

  const handleAudioRecorded = useCallback((result: any) => {
    console.log('Audio recorded:', result);
    // Audio will be uploaded automatically by AudioRecorder component
  }, []);

  const handleUploadComplete = useCallback((audioUrl: string) => {
    console.log('Audio uploaded:', audioUrl);
    
    // Move to next turn
    if (isUserTurn) {
      setIsUserTurn(false);
      setConversationState('agent-speaking');
      
      // Simulate agent response
      setTimeout(() => {
        setConversationState('idle');
        setIsUserTurn(true);
        setCurrentTurn(prev => prev + 1);
        onTurnComplete?.(currentTurn, audioUrl);
      }, 2000);
    }
  }, [isUserTurn, currentTurn, onTurnComplete]);

  const handleStartConversation = useCallback(() => {
    setConversationState('user-speaking');
  }, []);

  const handleEndConversation = useCallback(() => {
    setConversationState('idle');
    setCurrentTurn(1);
    setIsUserTurn(true);
  }, []);

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Voice Survey with Audio Capture
        </h2>
        <p className="text-gray-600">
          Turn {currentTurn} - {isUserTurn ? 'Your Turn' : 'Agent Turn'}
        </p>
      </div>

      {/* Conversation State Indicator */}
      <div className="mb-6">
        <div className="flex items-center justify-center space-x-4">
          <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
            conversationState === 'user-speaking' 
              ? 'bg-red-100 text-red-700' 
              : 'bg-gray-100 text-gray-500'
          }`}>
            <Mic className="h-4 w-4" />
            <span className="text-sm font-medium">User Speaking</span>
          </div>
          
          <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
            conversationState === 'agent-speaking' 
              ? 'bg-blue-100 text-blue-700' 
              : 'bg-gray-100 text-gray-500'
          }`}>
            <Play className="h-4 w-4" />
            <span className="text-sm font-medium">Agent Speaking</span>
          </div>
        </div>
      </div>

      {/* Audio Recorder */}
      {conversationState !== 'idle' && (
        <div className="mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {isUserTurn ? 'Record Your Response' : 'Agent Response'}
            </h3>
            
            <AudioRecorder
              conversationId={conversationId}
              turnNumber={currentTurn}
              speaker={isUserTurn ? 'user' : 'agent'}
              onAudioRecorded={handleAudioRecorded}
              onUploadComplete={handleUploadComplete}
              disabled={!isUserTurn}
            />
          </div>
        </div>
      )}

      {/* Conversation Controls */}
      <div className="flex justify-center space-x-4">
        {conversationState === 'idle' ? (
          <button
            onClick={handleStartConversation}
            className="flex items-center space-x-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            <Mic className="h-5 w-5" />
            <span>Start Conversation</span>
          </button>
        ) : (
          <button
            onClick={handleEndConversation}
            className="flex items-center space-x-2 px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600"
          >
            <Pause className="h-5 w-5" />
            <span>End Conversation</span>
          </button>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-8 text-sm text-gray-600">
        <h4 className="font-semibold mb-2">How it works:</h4>
        <ul className="list-disc list-inside space-y-1">
          <li>Click "Start Conversation" to begin</li>
          <li>Use the Record button to capture your audio</li>
          <li>Audio files are automatically uploaded to Supabase</li>
          <li>Each turn is stored separately for analysis</li>
          <li>Click "End Conversation" when finished</li>
        </ul>
      </div>
    </div>
  );
}
