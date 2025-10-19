# Prosody Metrics Storage Plan

## Current Database Structure Analysis

### Existing Tables:
1. **`sessions`** - Basic session tracking
2. **`conversations`** - Main conversation storage with JSONB fields
3. **`conversation_feedback`** - Post-survey feedback
4. **`users`** - User information

### Current Data Flow:
```
Hume EVI → VoiceSurveyClient → /api/response → conversationManager → Database
```

### Current Storage (Limited):
- ✅ **Emotions**: `message.emotions` → `conversation_data.turns[].emotions`
- ❌ **Prosody**: Not captured
- ❌ **Audio**: Detected but not stored
- ✅ **Metadata**: Message types, timestamps, turn numbers

## Proposed Prosody Storage Architecture

### Phase 1: Enhanced Data Capture

#### 1.1 Update ConversationTurn Interface
```typescript
export interface ConversationTurn {
  speaker: 'user' | 'agent';
  message: string;
  timestamp: string;
  turn_number: number;
  raw_message_type?: string;
  emotions?: any;
  
  // NEW: Prosody Data
  prosody?: {
    // Fundamental frequency (pitch)
    f0_mean?: number;        // Hz
    f0_std?: number;         // Hz
    f0_min?: number;         // Hz
    f0_max?: number;         // Hz
    
    // Speech rate and rhythm
    speech_rate?: number;     // words per minute
    pause_duration?: number;  // seconds
    articulation_rate?: number; // syllables per second
    
    // Volume and intensity
    intensity_mean?: number;  // dB
    intensity_std?: number;   // dB
    intensity_min?: number;   // dB
    intensity_max?: number;   // dB
    
    // Voice quality
    jitter?: number;          // frequency variation
    shimmer?: number;         // amplitude variation
    hnr?: number;             // harmonics-to-noise ratio
    
    // Spectral features
    spectral_centroid?: number; // Hz
    spectral_rolloff?: number;  // Hz
    mfcc?: number[];            // Mel-frequency cepstral coefficients
    
    // Timing features
    duration?: number;         // seconds
    silence_ratio?: number;    // 0-1
    voicing_ratio?: number;    // 0-1
  };
  
  // NEW: Audio Data
  audio?: {
    url?: string;
    duration?: number;
    format?: string;
    sample_rate?: number;
    bit_depth?: number;
    file_size?: number;
  };
  
  // NEW: Additional Metadata
  metadata?: {
    confidence?: number;       // transcription confidence
    language?: string;         // detected language
    sentiment?: string;        // positive/negative/neutral
    arousal?: number;          // emotional arousal level
    valence?: number;          // emotional valence level
  };
}
```

#### 1.2 Update API Response Handler
```typescript
// In /api/response/route.ts
await conversationManager.addMessage(
  sessionId,
  role,
  content,
  message.type,
  {
    emotions: message.emotions,
    prosody: message.prosody,     // NEW
    audio: message.audio,         // NEW
    metadata: {                   // NEW
      confidence: message.transcript?.confidence,
      language: message.language,
      sentiment: message.sentiment
    }
  }
);
```

### Phase 2: Database Schema Enhancements

#### 2.1 Add Prosody-Specific Columns
```sql
-- Add prosody analytics table for detailed analysis
CREATE TABLE IF NOT EXISTS prosody_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_uid TEXT NOT NULL,
  
  -- Aggregate prosody metrics per conversation
  avg_speech_rate DECIMAL(5,2),           -- words per minute
  avg_pitch_mean DECIMAL(8,2),            -- Hz
  avg_intensity_mean DECIMAL(6,2),        -- dB
  avg_pause_duration DECIMAL(6,3),       -- seconds
  total_silence_ratio DECIMAL(4,3),       -- 0-1
  
  -- Voice quality metrics
  avg_jitter DECIMAL(8,6),                -- frequency variation
  avg_shimmer DECIMAL(8,6),               -- amplitude variation
  avg_hnr DECIMAL(6,2),                   -- harmonics-to-noise ratio
  
  -- Emotional prosody indicators
  emotional_variability DECIMAL(6,3),     -- pitch/intensity variation
  stress_patterns JSONB,                  -- stress pattern analysis
  emotional_contours JSONB,               -- emotional trajectory
  
  -- Timing analysis
  conversation_duration DECIMAL(8,2),     -- seconds
  speaking_time DECIMAL(8,2),             -- seconds
  silence_time DECIMAL(8,2),              -- seconds
  
  -- Metadata
  analysis_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for prosody analytics
CREATE INDEX IF NOT EXISTS idx_prosody_analytics_session_id 
  ON prosody_analytics(session_id);
CREATE INDEX IF NOT EXISTS idx_prosody_analytics_user_uid 
  ON prosody_analytics(user_uid);
CREATE INDEX IF NOT EXISTS idx_prosody_analytics_timestamp 
  ON prosody_analytics(analysis_timestamp);
```

#### 2.2 Add Audio Storage Table
```sql
-- Audio files storage table
CREATE TABLE IF NOT EXISTS conversation_audio (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  turn_number INTEGER NOT NULL,
  speaker TEXT NOT NULL CHECK (speaker IN ('user', 'agent')),
  
  -- Audio file information
  audio_url TEXT NOT NULL,
  audio_duration DECIMAL(8,3),            -- seconds
  audio_format TEXT,                      -- mp3, wav, etc.
  sample_rate INTEGER,                    -- Hz
  bit_depth INTEGER,                      -- bits
  file_size BIGINT,                       -- bytes
  
  -- Audio processing metadata
  transcription_confidence DECIMAL(4,3),  -- 0-1
  processing_status TEXT DEFAULT 'pending', -- pending, processed, failed
  error_message TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for audio storage
CREATE INDEX IF NOT EXISTS idx_conversation_audio_session_id 
  ON conversation_audio(session_id);
CREATE INDEX IF NOT EXISTS idx_conversation_audio_turn_number 
  ON conversation_audio(turn_number);
CREATE INDEX IF NOT EXISTS idx_conversation_audio_speaker 
  ON conversation_audio(speaker);
```

### Phase 3: Enhanced Analytics API

#### 3.1 Prosody Analytics Endpoint
```typescript
// /api/analytics/prosody/[sessionId]/route.ts
export async function GET(req: NextRequest, { params }: { params: { sessionId: string } }) {
  const analytics = await prosodyAnalyticsManager.getSessionProsodyAnalysis(sessionId);
  return NextResponse.json(analytics);
}
```

#### 3.2 Prosody Analytics Manager
```typescript
export class ProsodyAnalyticsManager {
  async getSessionProsodyAnalysis(sessionId: string): Promise<ProsodyAnalysis> {
    // Aggregate prosody data from conversation turns
    // Calculate conversation-level metrics
    // Generate insights about user's speaking patterns
  }
  
  async generateProsodyInsights(sessionId: string): Promise<ProsodyInsights> {
    // Analyze emotional patterns
    // Detect stress indicators
    // Identify engagement levels
  }
}
```

### Phase 4: Hume EVI Configuration Updates

#### 4.1 Enable Prosody Analysis in EVI Config
```typescript
// In pure-evi.ts createAppConfig method
const configResponse = await fetch('https://api.hume.ai/v0/evi/configs', {
  method: 'POST',
  headers: {
    'X-Hume-Api-Key': this.apiKey,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    // ... existing config
    prosody: {
      enabled: true,
      features: [
        'f0_analysis',      // Fundamental frequency
        'intensity_analysis', // Volume/intensity
        'speech_rate',      // Speaking rate
        'pause_analysis',   // Pause detection
        'voice_quality',    // Jitter, shimmer, HNR
        'spectral_features' // MFCC, spectral centroid
      ]
    },
    audio: {
      enabled: true,
      storage: {
        enabled: true,
        format: 'wav',
        sample_rate: 16000
      }
    }
  })
});
```

### Phase 5: Implementation Timeline

#### Week 1: Data Capture Enhancement
- [ ] Update ConversationTurn interface
- [ ] Modify API response handler
- [ ] Test prosody data capture

#### Week 2: Database Schema
- [ ] Create prosody_analytics table
- [ ] Create conversation_audio table
- [ ] Add indexes and constraints
- [ ] Test database performance

#### Week 3: Analytics Implementation
- [ ] Create ProsodyAnalyticsManager
- [ ] Implement prosody analysis algorithms
- [ ] Create analytics API endpoints
- [ ] Test analytics accuracy

#### Week 4: Hume Configuration
- [ ] Update EVI config to enable prosody
- [ ] Test prosody data from Hume
- [ ] Integrate with existing flow
- [ ] Performance optimization

### Phase 6: Data Privacy & Compliance

#### 6.1 Audio Data Handling
- **Retention Policy**: Audio files deleted after 30 days
- **Encryption**: All audio files encrypted at rest
- **Access Control**: Strict access controls for audio data
- **Anonymization**: Remove PII from prosody analysis

#### 6.2 GDPR Compliance
- **Right to Deletion**: Complete prosody data removal
- **Data Portability**: Export prosody analysis
- **Consent**: Clear consent for prosody analysis
- **Transparency**: Document prosody data usage

### Phase 7: Performance Considerations

#### 7.1 Database Optimization
- **Partitioning**: Partition prosody tables by date
- **Compression**: Compress JSONB prosody data
- **Archiving**: Archive old prosody data
- **Indexing**: Optimize queries for prosody analysis

#### 7.2 Storage Management
- **Audio Compression**: Compress audio files
- **CDN Integration**: Use CDN for audio delivery
- **Cleanup Jobs**: Automated cleanup of old data
- **Monitoring**: Monitor storage usage

## Expected Benefits

### 1. Enhanced User Insights
- **Emotional State Detection**: Real-time emotional analysis
- **Engagement Measurement**: Speaking pattern analysis
- **Stress Detection**: Voice stress indicators
- **Satisfaction Correlation**: Prosody vs. feedback correlation

### 2. Improved Survey Quality
- **Adaptive Responses**: Adjust based on user's emotional state
- **Quality Metrics**: Measure conversation quality
- **Engagement Optimization**: Optimize for better engagement
- **Personalization**: Tailor experience to user's speaking style

### 3. Research & Analytics
- **User Behavior Analysis**: Speaking pattern trends
- **Emotional Journey Mapping**: Track emotional progression
- **A/B Testing**: Test different approaches
- **Longitudinal Studies**: Track changes over time

## Implementation Priority

### High Priority (Phase 1-2)
1. Basic prosody data capture
2. Database schema updates
3. Audio file storage

### Medium Priority (Phase 3-4)
1. Analytics implementation
2. Hume configuration updates
3. API enhancements

### Low Priority (Phase 5-7)
1. Advanced analytics
2. Performance optimization
3. Compliance features

This plan provides a comprehensive roadmap for implementing prosody metrics storage while maintaining system performance and compliance requirements.
