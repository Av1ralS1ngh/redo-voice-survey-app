// lib/audio-capture-service.ts
// Audio capture service based on Hume AI WebRTC patterns

export interface AudioCaptureConfig {
  sampleRate: number;
  channelCount: number;
  echoCancellation: boolean;
  noiseSuppression: boolean;
  autoGainControl: boolean;
}

export interface AudioCaptureResult {
  audioBlob: Blob;
  duration: number;
  mimeType: string;
  size: number;
}

export class AudioCaptureService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private mediaStream: MediaStream | null = null;
  private startTime: number = 0;
  private isRecording: boolean = false;

  // Default configuration matching Hume AI requirements
  private defaultConfig: AudioCaptureConfig = {
    sampleRate: 16000, // Match Hume AI requirements
    channelCount: 1,   // Mono audio
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true
  };

  /**
   * Check if audio recording is supported in the current browser
   */
  static isSupported(): boolean {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      return false;
    }
    
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }

  /**
   * Get supported MIME types for audio recording
   */
  static getSupportedMimeTypes(): string[] {
    // Check if we're in a browser environment
    if (typeof window === 'undefined' || !window.MediaRecorder) {
      return [];
    }

    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/wav'
    ];

    return types.filter(type => {
      return MediaRecorder.isTypeSupported(type);
    });
  }

  /**
   * Start recording audio with Hume AI compatible settings
   */
  async startRecording(config?: Partial<AudioCaptureConfig>): Promise<void> {
    if (this.isRecording) {
      throw new Error('Recording is already in progress');
    }

    if (!AudioCaptureService.isSupported()) {
      throw new Error('Audio recording is not supported in this browser');
    }

    try {
      // Merge provided config with defaults
      const finalConfig = { ...this.defaultConfig, ...config };

      // Request audio stream with Hume AI compatible settings
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: finalConfig.sampleRate,
          channelCount: finalConfig.channelCount,
          echoCancellation: finalConfig.echoCancellation,
          noiseSuppression: finalConfig.noiseSuppression,
          autoGainControl: finalConfig.autoGainControl
        }
      });

      // Get the best supported MIME type
      const supportedTypes = AudioCaptureService.getSupportedMimeTypes();
      const mimeType = supportedTypes[0] || 'audio/webm';

      // Create MediaRecorder with optimal settings
      this.mediaRecorder = new MediaRecorder(this.mediaStream, {
        mimeType: mimeType,
        audioBitsPerSecond: 128000 // Good quality for voice
      });

      // Reset chunks and start time
      this.audioChunks = [];
      this.startTime = Date.now();

      // Handle data available event
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      // Handle recording stop event
      this.mediaRecorder.onstop = () => {
        this.cleanup();
      };

      // Handle errors
      this.mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        this.cleanup();
        throw new Error('Recording failed');
      };

      // Start recording
      this.mediaRecorder.start(1000); // Collect data every second
      this.isRecording = true;

      console.log('🎤 Audio recording started with MIME type:', mimeType);

    } catch (error) {
      console.error('Failed to start audio recording:', error);
      this.cleanup();
      throw error;
    }
  }

  /**
   * Stop recording and return audio blob with metadata
   */
  async stopRecording(): Promise<AudioCaptureResult> {
    if (!this.isRecording || !this.mediaRecorder) {
      throw new Error('No recording in progress');
    }

    return new Promise((resolve, reject) => {
      const originalOnStop = this.mediaRecorder!.onstop;

      this.mediaRecorder!.onstop = () => {
        try {
          const duration = Date.now() - this.startTime;
          const audioBlob = new Blob(this.audioChunks, { 
            type: this.mediaRecorder!.mimeType || 'audio/webm' 
          });

          const result: AudioCaptureResult = {
            audioBlob,
            duration,
            mimeType: this.mediaRecorder!.mimeType || 'audio/webm',
            size: audioBlob.size
          };

          console.log('🎤 Audio recording stopped:', {
            duration: `${duration}ms`,
            size: `${(audioBlob.size / 1024).toFixed(2)}KB`,
            mimeType: result.mimeType
          });

          // Call original onstop handler
          if (originalOnStop) {
            originalOnStop.call(this.mediaRecorder);
          }

          resolve(result);
        } catch (error) {
          reject(error);
        }
      };

      // Stop the recording
      this.mediaRecorder!.stop();
      this.isRecording = false;
    });
  }

  /**
   * Pause recording (if supported)
   */
  pauseRecording(): void {
    if (this.mediaRecorder && this.isRecording && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.pause();
      console.log('🎤 Audio recording paused');
    }
  }

  /**
   * Resume recording (if supported)
   */
  resumeRecording(): void {
    if (this.mediaRecorder && this.isRecording && this.mediaRecorder.state === 'paused') {
      this.mediaRecorder.resume();
      console.log('🎤 Audio recording resumed');
    }
  }

  /**
   * Get current recording status
   */
  getRecordingStatus(): {
    isRecording: boolean;
    duration: number;
    state: string | null;
  } {
    return {
      isRecording: this.isRecording,
      duration: this.isRecording ? Date.now() - this.startTime : 0,
      state: this.mediaRecorder?.state || null
    };
  }

  /**
   * Get audio level for visualization (if supported)
   */
  async getAudioLevel(): Promise<number> {
    if (!this.mediaStream) return 0;

    try {
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(this.mediaStream);
      
      source.connect(analyser);
      analyser.fftSize = 256;
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(dataArray);
      
      // Calculate average volume
      const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
      
      audioContext.close();
      return average / 255; // Normalize to 0-1
    } catch (error) {
      console.warn('Could not get audio level:', error);
      return 0;
    }
  }

  /**
   * Clean up resources
   */
  private cleanup(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.isRecording = false;
    
    console.log('🎤 Audio capture service cleaned up');
  }

  /**
   * Clean up resources (public method)
   */
  destroy(): void {
    this.cleanup();
  }
}

/**
 * Utility function to create audio capture service instance
 */
export function createAudioCaptureService(): AudioCaptureService {
  return new AudioCaptureService();
}

/**
 * Utility function to check browser compatibility
 */
export function checkAudioCaptureCompatibility(): {
  supported: boolean;
  mimeTypes: string[];
  issues: string[];
} {
  const issues: string[] = [];
  
  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    issues.push('Not in browser environment');
    return {
      supported: false,
      mimeTypes: [],
      issues
    };
  }
  
  if (!AudioCaptureService.isSupported()) {
    issues.push('getUserMedia is not supported');
  }
  
  const mimeTypes = AudioCaptureService.getSupportedMimeTypes();
  if (mimeTypes.length === 0) {
    issues.push('No supported audio MIME types found');
  }
  
  return {
    supported: issues.length === 0,
    mimeTypes,
    issues
  };
}
