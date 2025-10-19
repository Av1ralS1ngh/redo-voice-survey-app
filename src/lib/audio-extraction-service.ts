// src/lib/audio-extraction-service.ts
// Audio Extraction Service - Extract individual turn audio from full conversation audio

import { ConversationTurn } from './conversation-manager';

/**
 * Represents a time range for audio extraction
 */
export interface AudioSegment {
  turn_number: number;
  speaker: 'user' | 'agent';
  startMs: number;  // Milliseconds from start of audio file
  endMs: number;    // Milliseconds from start of audio file
  durationMs: number;
}

/**
 * Calculate time ranges for each turn based on timestamps
 * 
 * Strategy (from Hume Support):
 * - Use Chat Events timestamps (Unix epoch seconds)
 * - Calculate delta between consecutive message timestamps
 * - Map deltas to audio file positions
 */
export function calculateTurnTimeRanges(
  turns: ConversationTurn[],
  conversationStartTime: Date
): AudioSegment[] {
  if (!turns || turns.length === 0) {
    console.warn('No turns provided for time range calculation');
    return [];
  }

  const startTimeMs = conversationStartTime.getTime();
  const segments: AudioSegment[] = [];

  console.log(`🎵 Calculating time ranges for ${turns.length} turns`);
  console.log(`📅 Conversation start: ${conversationStartTime.toISOString()}`);

  for (let i = 0; i < turns.length; i++) {
    const turn = turns[i];
    const nextTurn = turns[i + 1];

    let turnStartMs: number;
    let turnEndMs: number;

    // 🎯 PRIORITY 1: Use Hume's time.begin and time.end (most accurate!)
    if (turn.metadata?.time_begin !== undefined && turn.metadata?.time_end !== undefined) {
      turnStartMs = turn.metadata.time_begin;
      turnEndMs = turn.metadata.time_end;
      console.log(`  ✅ Turn ${turn.turn_number} using Hume time.begin/end: ${turnStartMs}ms - ${turnEndMs}ms`);
    }
    // PRIORITY 2: Use prosody duration for agent turns
    else if (turn.prosody?.duration) {
      const turnTime = new Date(turn.timestamp).getTime();
      turnStartMs = turnTime - startTimeMs;
      turnEndMs = turnStartMs + (turn.prosody.duration * 1000);
      console.log(`  📊 Turn ${turn.turn_number} using prosody duration: ${turnStartMs}ms - ${turnEndMs}ms`);
    } 
    // PRIORITY 3: Fallback to timestamp calculation
    else {
      const turnTime = new Date(turn.timestamp).getTime();
      turnStartMs = turnTime - startTimeMs;
      
      if (nextTurn) {
        const nextTurnTime = new Date(nextTurn.timestamp).getTime();
        turnEndMs = nextTurnTime - startTimeMs;
      } else {
        turnEndMs = turnStartMs + 2000;
      }
      console.log(`  ⚠️  Turn ${turn.turn_number} using timestamp fallback: ${turnStartMs}ms - ${turnEndMs}ms`);
    }

    const segment: AudioSegment = {
      turn_number: turn.turn_number,
      speaker: turn.speaker,
      startMs: Math.max(0, turnStartMs),
      endMs: turnEndMs,
      durationMs: turnEndMs - turnStartMs
    };

    segments.push(segment);

    console.log(`  Turn ${segment.turn_number} (${segment.speaker}): ${segment.startMs}ms - ${segment.endMs}ms (${segment.durationMs}ms)`);
  }

  return segments;
}

/**
 * Extract a single audio segment from a full audio buffer
 * Uses FFmpeg for audio slicing (server-side)
 * 
 * @param audioFilePath - Path to the complete audio file
 * @param startMs - Start time in milliseconds
 * @param endMs - End time in milliseconds
 * @param outputPath - Path where the extracted segment should be saved
 * @returns Path to extracted audio file
 */
export async function extractTurnAudio(
  audioFilePath: string,
  startMs: number,
  endMs: number,
  outputPath: string
): Promise<string> {
  const ffmpeg = require('fluent-ffmpeg');
  const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
  
  ffmpeg.setFfmpegPath(ffmpegPath);
  
  const startSeconds = startMs / 1000;
  const durationSeconds = (endMs - startMs) / 1000;
  
  console.log(`🎵 Extracting audio segment: ${startSeconds}s for ${durationSeconds}s`);
  
  return new Promise((resolve, reject) => {
    ffmpeg(audioFilePath)
      .setStartTime(startSeconds)
      .setDuration(durationSeconds)
      .output(outputPath)
      .audioCodec('libmp3lame') // Convert to MP3
      .audioBitrate('128k')
      .on('start', (commandLine: string) => {
        console.log('🔧 FFmpeg command:', commandLine);
      })
      .on('end', () => {
        console.log(`✅ Extracted segment saved to: ${outputPath}`);
        resolve(outputPath);
      })
      .on('error', (err: Error) => {
        console.error('❌ FFmpeg extraction error:', err);
        reject(err);
      })
      .run();
  });
}

/**
 * Extract all turn audio segments from a full conversation audio file
 * 
 * @param sessionId - The conversation session ID
 * @param fullAudioUrl - URL to the complete conversation audio (MP4)
 * @param turns - Array of conversation turns with timestamps
 * @param conversationStartTime - When the conversation started
 * @returns Extraction results with success/error details
 */
export async function extractAllTurns(
  sessionId: string,
  fullAudioUrl: string,
  turns: ConversationTurn[],
  conversationStartTime: Date
): Promise<{
  success: boolean;
  extracted: number;
  failed: number;
  segments: Array<{
    turn_number: number;
    speaker: 'user' | 'agent';
    filePath?: string;
    error?: string;
  }>;
}> {
  const fs = require('fs');
  const path = require('path');
  const os = require('os');
  
  console.log(`🎵 Starting turn extraction for session ${sessionId}`);
  console.log(`📊 Total turns to extract: ${turns.length}`);
  console.log(`🔗 Full audio URL: ${fullAudioUrl}`);

  // Step 1: Calculate time ranges for all turns
  const timeRanges = calculateTurnTimeRanges(turns, conversationStartTime);

  if (timeRanges.length === 0) {
    console.error('❌ No time ranges calculated');
    return {
      success: false,
      extracted: 0,
      failed: 0,
      segments: []
    };
  }

  // Step 2: Download full audio file to temp location
  console.log('⬇️  Downloading full audio file...');
  const tempDir = path.join(os.tmpdir(), 'audio-extraction', sessionId);
  const inputAudioPath = path.join(tempDir, 'complete-audio.mp4');
  
  try {
    // Create temp directory
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Download audio file
    const response = await fetch(fullAudioUrl);
    if (!response.ok) {
      throw new Error(`Failed to download audio: ${response.status} ${response.statusText}`);
    }
    
    const audioBuffer = await response.arrayBuffer();
    fs.writeFileSync(inputAudioPath, Buffer.from(audioBuffer));
    console.log(`✅ Downloaded audio file: ${audioBuffer.byteLength} bytes`);
    console.log(`📁 Saved to: ${inputAudioPath}`);
  } catch (error) {
    console.error('❌ Failed to download audio file:', error);
    return {
      success: false,
      extracted: 0,
      failed: turns.length,
      segments: turns.map(turn => ({
        turn_number: turn.turn_number,
        speaker: turn.speaker,
        error: `Failed to download audio: ${error}`
      }))
    };
  }

  // Step 3: Extract each turn segment
  const segments = [];
  let extracted = 0;
  let failed = 0;

  for (const range of timeRanges) {
    const outputPath = path.join(
      tempDir,
      `turn-${range.turn_number}-${range.speaker}.mp3`
    );
    
    try {
      console.log(`🎵 Extracting turn ${range.turn_number} (${range.speaker})...`);
      
      const filePath = await extractTurnAudio(
        inputAudioPath,
        range.startMs,
        range.endMs,
        outputPath
      );

      segments.push({
        turn_number: range.turn_number,
        speaker: range.speaker,
        filePath
      });

      extracted++;
      console.log(`✅ Successfully extracted turn ${range.turn_number}`);
    } catch (error) {
      console.error(`❌ Failed to extract turn ${range.turn_number}:`, error);
      segments.push({
        turn_number: range.turn_number,
        speaker: range.speaker,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      failed++;
    }
  }

  console.log(`\n📊 Extraction complete: ${extracted} succeeded, ${failed} failed`);

  return {
    success: extracted > 0,
    extracted,
    failed,
    segments
  };
}

/**
 * Validate that turn timestamps are properly ordered and non-overlapping
 */
export function validateTurnTimestamps(turns: ConversationTurn[]): {
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  for (let i = 0; i < turns.length - 1; i++) {
    const currentTurn = turns[i];
    const nextTurn = turns[i + 1];

    const currentTime = new Date(currentTurn.timestamp).getTime();
    const nextTime = new Date(nextTurn.timestamp).getTime();

    if (currentTime >= nextTime) {
      issues.push(
        `Turn ${currentTurn.turn_number} timestamp (${currentTurn.timestamp}) ` +
        `is not before turn ${nextTurn.turn_number} timestamp (${nextTurn.timestamp})`
      );
    }

    if (!currentTurn.timestamp || isNaN(currentTime)) {
      issues.push(`Turn ${currentTurn.turn_number} has invalid timestamp: ${currentTurn.timestamp}`);
    }
  }

  return {
    valid: issues.length === 0,
    issues
  };
}
