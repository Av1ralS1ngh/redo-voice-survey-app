// Enhanced interfaces for prosody metrics storage
// This file extends the existing conversation-manager.ts interfaces

export interface ProsodyFeatures {
  // Fundamental frequency (pitch) features
  f0_mean?: number;        // Hz - mean fundamental frequency
  f0_std?: number;         // Hz - standard deviation of fundamental frequency
  f0_min?: number;         // Hz - minimum fundamental frequency
  f0_max?: number;         // Hz - maximum fundamental frequency
  f0_range?: number;       // Hz - range of fundamental frequency
  
  // Speech rate and rhythm features
  speech_rate?: number;     // words per minute
  articulation_rate?: number; // syllables per second
  pause_duration?: number;  // seconds
  pause_count?: number;    // number of pauses
  
  // Volume and intensity features
  intensity_mean?: number;  // dB - mean intensity
  intensity_std?: number;   // dB - standard deviation of intensity
  intensity_min?: number;   // dB - minimum intensity
  intensity_max?: number;   // dB - maximum intensity
  intensity_range?: number; // dB - range of intensity
  
  // Voice quality features
  jitter?: number;          // frequency variation (0-1)
  shimmer?: number;         // amplitude variation (0-1)
  hnr?: number;             // harmonics-to-noise ratio (dB)
  
  // Spectral features
  spectral_centroid?: number; // Hz
  spectral_rolloff?: number;  // Hz
  spectral_bandwidth?: number; // Hz
  mfcc_features?: number[];   // Mel-frequency cepstral coefficients
  
  // Timing features
  duration?: number;         // seconds
  silence_ratio?: number;    // 0-1 (silence vs speech)
  voicing_ratio?: number;    // 0-1 (voiced vs unvoiced)
  
  // Emotional features
  emotional_arousal?: number; // 0-10 scale
  emotional_valence?: number; // -10 to +10 scale
  emotional_dominance?: number; // 0-10 scale
}

export interface AudioMetadata {
  url?: string;
  duration?: number;        // seconds
  format?: string;          // mp3, wav, etc.
  sample_rate?: number;     // Hz
  bit_depth?: number;       // bits
  file_size?: number;       // bytes
}

export interface MessageMetadata {
  confidence?: number;      // transcription confidence (0-1)
  language?: string;        // detected language
  sentiment?: string;       // positive/negative/neutral
  arousal?: number;         // emotional arousal level (0-10)
  valence?: number;         // emotional valence level (-10 to +10)
}

// Enhanced ConversationTurn interface
export interface EnhancedConversationTurn {
  speaker: 'user' | 'agent';
  message: string;
  timestamp: string;
  turn_number: number;
  raw_message_type?: string;
  emotions?: any; // Existing emotion data from Hume
  
  // NEW: Enhanced prosody and audio data
  prosody?: ProsodyFeatures;
  audio?: AudioMetadata;
  metadata?: MessageMetadata;
}

// Prosody analytics for conversation-level analysis
export interface ProsodyAnalytics {
  id: string;
  session_id: string;
  conversation_id: string;
  user_uid: string;
  
  // Aggregate prosody metrics
  avg_speech_rate?: number;           // words per minute
  avg_pitch_mean?: number;            // Hz
  avg_pitch_std?: number;             // Hz
  avg_intensity_mean?: number;        // dB
  avg_intensity_std?: number;         // dB
  avg_pause_duration?: number;       // seconds
  total_silence_ratio?: number;       // 0-1
  
  // Voice quality metrics
  avg_jitter?: number;                // frequency variation
  avg_shimmer?: number;               // amplitude variation
  avg_hnr?: number;                   // harmonics-to-noise ratio
  
  // Emotional prosody indicators
  emotional_variability?: number;     // pitch/intensity variation
  stress_patterns?: any;              // stress pattern analysis
  emotional_contours?: any;           // emotional trajectory
  
  // Timing analysis
  conversation_duration?: number;     // seconds
  speaking_time?: number;             // seconds
  silence_time?: number;              // seconds
  turn_count?: number;                // number of turns
  
  // User engagement indicators
  engagement_score?: number;          // 0-10 scale
  confidence_level?: number;          // 0-10 scale
  emotional_arousal?: number;        // 0-10 scale
  emotional_valence?: number;        // -10 to +10 scale
  
  // Timestamps
  analysis_timestamp?: string;
  created_at?: string;
  updated_at?: string;
}

// Audio file storage interface
export interface ConversationAudio {
  id: string;
  session_id: string;
  conversation_id: string;
  turn_number: number;
  speaker: 'user' | 'agent';
  
  // Audio file information
  audio_url: string;
  audio_duration?: number;            // seconds
  audio_format?: string;              // mp3, wav, etc.
  sample_rate?: number;               // Hz
  bit_depth?: number;                 // bits
  file_size?: number;                 // bytes
  
  // Audio processing metadata
  transcription_confidence?: number;  // 0-1
  processing_status?: 'pending' | 'processing' | 'processed' | 'failed';
  error_message?: string;
  
  // Prosody extraction metadata
  prosody_extracted?: boolean;
  prosody_extraction_timestamp?: string;
  prosody_features?: ProsodyFeatures; // Raw prosody features
  
  // Timestamps
  created_at?: string;
  processed_at?: string;
}

// Detailed prosody features for granular analysis
export interface DetailedProsodyFeatures {
  id: string;
  session_id: string;
  conversation_id: string;
  turn_number: number;
  speaker: 'user' | 'agent';
  
  // Fundamental frequency features
  f0_mean?: number;                   // Hz
  f0_std?: number;                    // Hz
  f0_min?: number;                    // Hz
  f0_max?: number;                    // Hz
  f0_range?: number;                  // Hz
  
  // Speech rate and rhythm features
  speech_rate?: number;               // words per minute
  articulation_rate?: number;         // syllables per second
  pause_duration?: number;           // seconds
  pause_count?: number;              // number of pauses
  
  // Volume and intensity features
  intensity_mean?: number;           // dB
  intensity_std?: number;            // dB
  intensity_min?: number;            // dB
  intensity_max?: number;            // dB
  intensity_range?: number;          // dB
  
  // Voice quality features
  jitter?: number;                   // frequency variation
  shimmer?: number;                  // amplitude variation
  hnr?: number;                      // harmonics-to-noise ratio
  
  // Spectral features
  spectral_centroid?: number;        // Hz
  spectral_rolloff?: number;         // Hz
  spectral_bandwidth?: number;       // Hz
  mfcc_features?: number[];          // Mel-frequency cepstral coefficients
  
  // Timing features
  duration?: number;                 // seconds
  silence_ratio?: number;            // 0-1
  voicing_ratio?: number;            // 0-1
  
  // Emotional features
  emotional_arousal?: number;       // 0-10 scale
  emotional_valence?: number;       // -10 to +10 scale
  emotional_dominance?: number;     // 0-10 scale
  
  // Metadata
  extraction_timestamp?: string;
  created_at?: string;
}

// Enhanced conversation data interface
export interface EnhancedConversationData {
  participants: {
    user: string;
    agent: string;
  };
  turns: EnhancedConversationTurn[];
  survey_responses: SurveyResponses;
  metrics: ConversationMetrics;
  
  // NEW: Prosody analytics
  prosody_analytics?: ProsodyAnalytics;
  audio_files?: ConversationAudio[];
  detailed_prosody?: DetailedProsodyFeatures[];
}

// Prosody analysis results
export interface ProsodyAnalysis {
  conversation_id: string;
  session_id: string;
  user_uid: string;
  
  // Overall conversation metrics
  overall_engagement: number;        // 0-10
  overall_confidence: number;        // 0-10
  overall_emotional_state: {
    arousal: number;                // 0-10
    valence: number;                // -10 to +10
    dominance: number;              // 0-10
  };
  
  // Speaking pattern analysis
  speaking_patterns: {
    avg_speech_rate: number;        // words per minute
    pitch_variability: number;      // Hz
    intensity_variability: number;  // dB
    pause_patterns: {
      avg_pause_duration: number;   // seconds
      pause_frequency: number;      // pauses per minute
    };
  };
  
  // Voice quality analysis
  voice_quality: {
    avg_jitter: number;             // frequency variation
    avg_shimmer: number;            // amplitude variation
    avg_hnr: number;                // harmonics-to-noise ratio
    quality_score: number;           // 0-10
  };
  
  // Emotional journey analysis
  emotional_journey: {
    start_emotion: string;
    end_emotion: string;
    emotional_transitions: number;
    peak_arousal: number;
    peak_valence: number;
  };
  
  // Stress and engagement indicators
  stress_indicators: {
    stress_level: 'low' | 'moderate' | 'high';
    stress_patterns: string[];
    engagement_trend: 'increasing' | 'decreasing' | 'stable';
  };
  
  // Recommendations
  recommendations: {
    optimal_response_timing: number; // seconds
    suggested_tone: string;
    engagement_strategies: string[];
  };
}

// Hume EVI message interface with prosody data
export interface HumeMessageWithProsody {
  type: string;
  message?: {
    content: string;
    role: string;
  };
  emotions?: any;
  timestamp?: number;
  
  // NEW: Prosody data from Hume
  prosody?: {
    f0?: {
      mean: number;
      std: number;
      min: number;
      max: number;
    };
    intensity?: {
      mean: number;
      std: number;
      min: number;
      max: number;
    };
    speech_rate?: number;
    pause_duration?: number;
    jitter?: number;
    shimmer?: number;
    hnr?: number;
  };
  
  // NEW: Audio data
  audio?: {
    url?: string;
    duration?: number;
    format?: string;
    sample_rate?: number;
    bit_depth?: number;
    file_size?: number;
  };
  
  // NEW: Additional metadata
  transcript?: {
    content: string;
    confidence?: number;
    interim?: boolean;
  };
  language?: string;
  sentiment?: string;
}
