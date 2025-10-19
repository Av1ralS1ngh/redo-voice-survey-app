import { ConversationResponse } from '@/types/responses';

/**
 * Download a single response (audio + transcript)
 */
export async function downloadResponse(response: ConversationResponse): Promise<void> {
  try {
    // Create a zip-like structure with multiple files
    const files: { name: string; content: string | Blob; type: string }[] = [];

    // Add transcript as JSON
    if (response.transcript && response.transcript.length > 0) {
      const transcriptData = {
        id: response.id,
        sessionId: response.sessionId,
        userName: response.userName,
        date: response.date,
        duration: response.duration,
        turnCount: response.turnCount,
        quality: response.quality,
        status: response.status,
        transcript: response.transcript.map(turn => ({
          turnNumber: turn.turnNumber,
          speaker: turn.speaker,
          message: turn.message,
          timestamp: turn.timestamp,
          duration: turn.duration
        })),
        metadata: response.metadata
      };

      files.push({
        name: `transcript-${response.id}.json`,
        content: JSON.stringify(transcriptData, null, 2),
        type: 'application/json'
      });

      // Add transcript as readable text
      const readableTranscript = response.transcript
        .map(turn => `[${formatTimestamp(turn.timestamp)}] ${turn.speaker.toUpperCase()}: ${turn.message}`)
        .join('\n\n');

      files.push({
        name: `transcript-${response.id}.txt`,
        content: readableTranscript,
        type: 'text/plain'
      });
    }

    // Add audio file if available
    if (response.audioUrl) {
      try {
        const audioResponse = await fetch(response.audioUrl);
        if (audioResponse.ok) {
          const audioBlob = await audioResponse.blob();
          files.push({
            name: `audio-${response.id}.mp3`,
            content: audioBlob,
            type: 'audio/mpeg'
          });
        }
      } catch (error) {
        console.warn('Failed to fetch audio file:', error);
      }
    }

    // If we have multiple files, create a simple download for each
    // In a real implementation, you might want to use JSZip to create a proper zip file
    if (files.length === 1) {
      downloadFile(files[0].content, files[0].name, files[0].type);
    } else {
      // Download each file separately
      for (const file of files) {
        await new Promise(resolve => setTimeout(resolve, 100)); // Small delay between downloads
        downloadFile(file.content, file.name, file.type);
      }
    }

  } catch (error) {
    console.error('Download failed:', error);
    throw new Error('Failed to download response');
  }
}

/**
 * Download multiple responses as a batch
 */
export async function downloadResponses(responses: ConversationResponse[]): Promise<void> {
  try {
    // Create a summary file
    const summary = {
      downloadDate: new Date().toISOString(),
      totalResponses: responses.length,
      responses: responses.map(r => ({
        id: r.id,
        userName: r.userName,
        date: r.date,
        duration: r.duration,
        turnCount: r.turnCount,
        quality: r.quality,
        status: r.status,
        hasAudio: !!r.audioUrl,
        hasTranscript: !!(r.transcript && r.transcript.length > 0)
      }))
    };

    // Download summary first
    downloadFile(
      JSON.stringify(summary, null, 2),
      `responses-summary-${new Date().toISOString().split('T')[0]}.json`,
      'application/json'
    );

    // Download each response individually with a small delay
    for (let i = 0; i < responses.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 200 * i)); // Staggered downloads
      await downloadResponse(responses[i]);
    }

  } catch (error) {
    console.error('Bulk download failed:', error);
    throw new Error('Failed to download responses');
  }
}

/**
 * Helper function to trigger file download
 */
function downloadFile(content: string | Blob, filename: string, mimeType: string): void {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up the URL object
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

/**
 * Format timestamp for transcript display
 */
function formatTimestamp(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}
