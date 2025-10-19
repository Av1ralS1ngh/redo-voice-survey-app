/**
 * Test script to log ALL Hume WebSocket message types
 * Run this during a test conversation to see if user audio exists
 */

import { useVoice } from '@humeai/voice-react';

export function TestHumeMessages() {
  const { messages } = useVoice();

  React.useEffect(() => {
    messages.forEach((msg: any) => {
      console.log('📨 MESSAGE TYPE:', msg.type);
      console.log('📦 MESSAGE KEYS:', Object.keys(msg));
      
      // Check for any audio-related fields
      if (msg.audio || msg.audio_output || msg.audio_input || msg.user_audio) {
        console.log('🎵 AUDIO FOUND IN MESSAGE:', {
          type: msg.type,
          hasAudio: !!msg.audio,
          hasAudioOutput: !!msg.audio_output,
          hasAudioInput: !!msg.audio_input,
          hasUserAudio: !!msg.user_audio,
          audioKeys: msg.audio ? Object.keys(msg.audio) : [],
        });
      }
    });
  }, [messages]);

  return null;
}
