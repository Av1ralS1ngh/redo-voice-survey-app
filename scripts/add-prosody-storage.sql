-- ===================================================================
-- PROSODY STORAGE ENHANCEMENT
-- ===================================================================
-- This script adds comprehensive prosody metrics storage to the 
-- existing voice survey database schema.

-- ===================================================================
-- 1. ENHANCE CONVERSATION_TURN INTERFACE (via JSONB structure)
-- ===================================================================
-- The existing conversation_data JSONB field will be enhanced to include
-- prosody data in each turn. No schema change needed - just data structure.

-- ===================================================================
-- 2. CREATE PROSODY ANALYTICS TABLE
-- ===================================================================
-- Aggregate prosody metrics per conversation for efficient querying

CREATE TABLE IF NOT EXISTS prosody_analytics (
  -- Primary key
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Foreign key relationships
  session_id UUID NOT NULL,
  conversation_id UUID NOT NULL,
  user_uid TEXT NOT NULL,
  
  -- Aggregate prosody metrics per conversation
  avg_speech_rate DECIMAL(5,2),           -- words per minute
  avg_pitch_mean DECIMAL(8,2),            -- Hz (fundamental frequency)
  avg_pitch_std DECIMAL(8,2),             -- Hz (pitch variation)
  avg_intensity_mean DECIMAL(6,2),        -- dB (volume)
  avg_intensity_std DECIMAL(6,2),         -- dB (volume variation)
  avg_pause_duration DECIMAL(6,3),       -- seconds
  total_silence_ratio DECIMAL(4,3),       -- 0-1 (silence vs speech)
  
  -- Voice quality metrics
  avg_jitter DECIMAL(8,6),                -- frequency variation (0-1)
  avg_shimmer DECIMAL(8,6),               -- amplitude variation (0-1)
  avg_hnr DECIMAL(6,2),                   -- harmonics-to-noise ratio (dB)
  
  -- Emotional prosody indicators
  emotional_variability DECIMAL(6,3),     -- pitch/intensity variation
  stress_patterns JSONB,                  -- stress pattern analysis
  emotional_contours JSONB,               -- emotional trajectory over time
  
  -- Timing analysis
  conversation_duration DECIMAL(8,2),     -- seconds
  speaking_time DECIMAL(8,2),             -- seconds
  silence_time DECIMAL(8,2),              -- seconds
  turn_count INTEGER,                     -- number of turns
  
  -- User engagement indicators
  engagement_score DECIMAL(4,2),          -- 0-10 scale
  confidence_level DECIMAL(4,2),          -- 0-10 scale
  emotional_arousal DECIMAL(4,2),        -- 0-10 scale
  emotional_valence DECIMAL(4,2),        -- -10 to +10 scale
  
  -- Metadata
  analysis_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Foreign key constraints
  CONSTRAINT fk_prosody_session 
    FOREIGN KEY (session_id) 
    REFERENCES sessions(id) 
    ON DELETE CASCADE,
    
  CONSTRAINT fk_prosody_conversation
    FOREIGN KEY (conversation_id)
    REFERENCES conversations(id)
    ON DELETE CASCADE,
    
  -- Business constraints
  CONSTRAINT unique_prosody_per_conversation 
    UNIQUE (conversation_id),
    
  -- Data validation constraints
  CONSTRAINT check_speech_rate CHECK (avg_speech_rate >= 0),
  CONSTRAINT check_pitch_values CHECK (avg_pitch_mean >= 0 AND avg_pitch_std >= 0),
  CONSTRAINT check_intensity_values CHECK (avg_intensity_mean >= 0 AND avg_intensity_std >= 0),
  CONSTRAINT check_ratios CHECK (total_silence_ratio >= 0 AND total_silence_ratio <= 1),
  CONSTRAINT check_voice_quality CHECK (avg_jitter >= 0 AND avg_shimmer >= 0),
  CONSTRAINT check_engagement_scores CHECK (
    engagement_score >= 0 AND engagement_score <= 10 AND
    confidence_level >= 0 AND confidence_level <= 10 AND
    emotional_arousal >= 0 AND emotional_arousal <= 10 AND
    emotional_valence >= -10 AND emotional_valence <= 10
  )
);

-- ===================================================================
-- 3. CREATE CONVERSATION AUDIO TABLE
-- ===================================================================
-- Store audio files and metadata for each conversation turn

CREATE TABLE IF NOT EXISTS conversation_audio (
  -- Primary key
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Foreign key relationships
  session_id UUID NOT NULL,
  conversation_id UUID NOT NULL,
  turn_number INTEGER NOT NULL,
  speaker TEXT NOT NULL CHECK (speaker IN ('user', 'agent')),
  
  -- Audio file information
  audio_url TEXT NOT NULL,
  audio_duration DECIMAL(8,3),            -- seconds
  audio_format TEXT DEFAULT 'wav',        -- mp3, wav, etc.
  sample_rate INTEGER DEFAULT 16000,      -- Hz
  bit_depth INTEGER DEFAULT 16,           -- bits
  file_size BIGINT,                       -- bytes
  
  -- Audio processing metadata
  transcription_confidence DECIMAL(4,3),  -- 0-1
  processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'processed', 'failed')),
  error_message TEXT,
  
  -- Prosody extraction metadata
  prosody_extracted BOOLEAN DEFAULT FALSE,
  prosody_extraction_timestamp TIMESTAMP WITH TIME ZONE,
  prosody_features JSONB,                 -- Raw prosody features
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  
  -- Foreign key constraints
  CONSTRAINT fk_audio_session 
    FOREIGN KEY (session_id) 
    REFERENCES sessions(id) 
    ON DELETE CASCADE,
    
  CONSTRAINT fk_audio_conversation
    FOREIGN KEY (conversation_id)
    REFERENCES conversations(id)
    ON DELETE CASCADE,
    
  -- Business constraints
  CONSTRAINT check_audio_duration CHECK (audio_duration > 0),
  CONSTRAINT check_file_size CHECK (file_size > 0),
  CONSTRAINT check_confidence CHECK (transcription_confidence >= 0 AND transcription_confidence <= 1),
  CONSTRAINT check_sample_rate CHECK (sample_rate > 0),
  CONSTRAINT check_bit_depth CHECK (bit_depth > 0)
);

-- ===================================================================
-- 4. CREATE PROSODY FEATURES TABLE
-- ===================================================================
-- Detailed prosody features for each turn (if needed for granular analysis)

CREATE TABLE IF NOT EXISTS prosody_features (
  -- Primary key
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Foreign key relationships
  session_id UUID NOT NULL,
  conversation_id UUID NOT NULL,
  turn_number INTEGER NOT NULL,
  speaker TEXT NOT NULL CHECK (speaker IN ('user', 'agent')),
  
  -- Fundamental frequency (pitch) features
  f0_mean DECIMAL(8,2),                   -- Hz
  f0_std DECIMAL(8,2),                    -- Hz
  f0_min DECIMAL(8,2),                    -- Hz
  f0_max DECIMAL(8,2),                    -- Hz
  f0_range DECIMAL(8,2),                  -- Hz (max - min)
  
  -- Speech rate and rhythm features
  speech_rate DECIMAL(5,2),               -- words per minute
  articulation_rate DECIMAL(5,2),         -- syllables per second
  pause_duration DECIMAL(6,3),           -- seconds
  pause_count INTEGER,                   -- number of pauses
  
  -- Volume and intensity features
  intensity_mean DECIMAL(6,2),           -- dB
  intensity_std DECIMAL(6,2),            -- dB
  intensity_min DECIMAL(6,2),            -- dB
  intensity_max DECIMAL(6,2),            -- dB
  intensity_range DECIMAL(6,2),          -- dB (max - min)
  
  -- Voice quality features
  jitter DECIMAL(8,6),                   -- frequency variation
  shimmer DECIMAL(8,6),                  -- amplitude variation
  hnr DECIMAL(6,2),                      -- harmonics-to-noise ratio (dB)
  
  -- Spectral features
  spectral_centroid DECIMAL(8,2),        -- Hz
  spectral_rolloff DECIMAL(8,2),         -- Hz
  spectral_bandwidth DECIMAL(8,2),       -- Hz
  mfcc_features JSONB,                   -- Mel-frequency cepstral coefficients
  
  -- Timing features
  duration DECIMAL(8,3),                 -- seconds
  silence_ratio DECIMAL(4,3),            -- 0-1
  voicing_ratio DECIMAL(4,3),            -- 0-1
  
  -- Emotional features
  emotional_arousal DECIMAL(4,2),       -- 0-10 scale
  emotional_valence DECIMAL(4,2),       -- -10 to +10 scale
  emotional_dominance DECIMAL(4,2),     -- 0-10 scale
  
  -- Metadata
  extraction_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Foreign key constraints
  CONSTRAINT fk_features_session 
    FOREIGN KEY (session_id) 
    REFERENCES sessions(id) 
    ON DELETE CASCADE,
    
  CONSTRAINT fk_features_conversation
    FOREIGN KEY (conversation_id)
    REFERENCES conversations(id)
    ON DELETE CASCADE,
    
  -- Business constraints
  CONSTRAINT check_f0_values CHECK (f0_mean >= 0 AND f0_std >= 0 AND f0_min >= 0 AND f0_max >= 0),
  CONSTRAINT check_intensity_values CHECK (intensity_mean >= 0 AND intensity_std >= 0),
  CONSTRAINT check_ratios CHECK (silence_ratio >= 0 AND silence_ratio <= 1 AND voicing_ratio >= 0 AND voicing_ratio <= 1),
  CONSTRAINT check_emotional_values CHECK (
    emotional_arousal >= 0 AND emotional_arousal <= 10 AND
    emotional_valence >= -10 AND emotional_valence <= 10 AND
    emotional_dominance >= 0 AND emotional_dominance <= 10
  )
);

-- ===================================================================
-- 5. CREATE INDEXES FOR PERFORMANCE
-- ===================================================================

-- Prosody analytics indexes
CREATE INDEX IF NOT EXISTS idx_prosody_analytics_session_id 
  ON prosody_analytics(session_id);
CREATE INDEX IF NOT EXISTS idx_prosody_analytics_conversation_id 
  ON prosody_analytics(conversation_id);
CREATE INDEX IF NOT EXISTS idx_prosody_analytics_user_uid 
  ON prosody_analytics(user_uid);
CREATE INDEX IF NOT EXISTS idx_prosody_analytics_timestamp 
  ON prosody_analytics(analysis_timestamp);
CREATE INDEX IF NOT EXISTS idx_prosody_analytics_engagement 
  ON prosody_analytics(engagement_score);

-- Conversation audio indexes
CREATE INDEX IF NOT EXISTS idx_conversation_audio_session_id 
  ON conversation_audio(session_id);
CREATE INDEX IF NOT EXISTS idx_conversation_audio_conversation_id 
  ON conversation_audio(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_audio_turn_number 
  ON conversation_audio(turn_number);
CREATE INDEX IF NOT EXISTS idx_conversation_audio_speaker 
  ON conversation_audio(speaker);
CREATE INDEX IF NOT EXISTS idx_conversation_audio_status 
  ON conversation_audio(processing_status);
CREATE INDEX IF NOT EXISTS idx_conversation_audio_prosody_extracted 
  ON conversation_audio(prosody_extracted);

-- Prosody features indexes
CREATE INDEX IF NOT EXISTS idx_prosody_features_session_id 
  ON prosody_features(session_id);
CREATE INDEX IF NOT EXISTS idx_prosody_features_conversation_id 
  ON prosody_features(conversation_id);
CREATE INDEX IF NOT EXISTS idx_prosody_features_turn_number 
  ON prosody_features(turn_number);
CREATE INDEX IF NOT EXISTS idx_prosody_features_speaker 
  ON prosody_features(speaker);
CREATE INDEX IF NOT EXISTS idx_prosody_features_timestamp 
  ON prosody_features(extraction_timestamp);

-- ===================================================================
-- 6. CREATE GIN INDEXES FOR JSONB QUERIES
-- ===================================================================

-- GIN indexes for JSONB fields
CREATE INDEX IF NOT EXISTS idx_prosody_analytics_stress_patterns 
  ON prosody_analytics USING GIN (stress_patterns);
CREATE INDEX IF NOT EXISTS idx_prosody_analytics_emotional_contours 
  ON prosody_analytics USING GIN (emotional_contours);
CREATE INDEX IF NOT EXISTS idx_conversation_audio_prosody_features 
  ON conversation_audio USING GIN (prosody_features);
CREATE INDEX IF NOT EXISTS idx_prosody_features_mfcc_features 
  ON prosody_features USING GIN (mfcc_features);

-- ===================================================================
-- 7. CREATE VIEWS FOR COMMON QUERIES
-- ===================================================================

-- View for conversation prosody summary
CREATE OR REPLACE VIEW conversation_prosody_summary AS
SELECT 
  c.id as conversation_id,
  c.session_id,
  c.user_uid,
  c.user_name,
  pa.avg_speech_rate,
  pa.avg_pitch_mean,
  pa.avg_intensity_mean,
  pa.engagement_score,
  pa.confidence_level,
  pa.emotional_arousal,
  pa.emotional_valence,
  pa.conversation_duration,
  pa.turn_count,
  pa.analysis_timestamp
FROM conversations c
LEFT JOIN prosody_analytics pa ON c.id = pa.conversation_id
WHERE c.status = 'completed';

-- View for user prosody trends
CREATE OR REPLACE VIEW user_prosody_trends AS
SELECT 
  user_uid,
  COUNT(*) as conversation_count,
  AVG(avg_speech_rate) as avg_speech_rate_overall,
  AVG(avg_pitch_mean) as avg_pitch_overall,
  AVG(engagement_score) as avg_engagement_overall,
  AVG(confidence_level) as avg_confidence_overall,
  MIN(analysis_timestamp) as first_conversation,
  MAX(analysis_timestamp) as last_conversation
FROM prosody_analytics
GROUP BY user_uid;

-- ===================================================================
-- 8. CREATE FUNCTIONS FOR PROSODY ANALYSIS
-- ===================================================================

-- Function to calculate engagement score from prosody features
CREATE OR REPLACE FUNCTION calculate_engagement_score(
  speech_rate DECIMAL,
  pitch_variation DECIMAL,
  intensity_variation DECIMAL,
  pause_ratio DECIMAL
) RETURNS DECIMAL AS $$
BEGIN
  -- Simple engagement scoring algorithm
  -- Higher speech rate, pitch variation, intensity variation = higher engagement
  -- Lower pause ratio = higher engagement
  RETURN LEAST(10.0, GREATEST(0.0, 
    (speech_rate / 200.0) * 3.0 +  -- Normalize speech rate
    (pitch_variation / 100.0) * 3.0 +  -- Normalize pitch variation
    (intensity_variation / 20.0) * 2.0 +  -- Normalize intensity variation
    ((1.0 - pause_ratio) * 2.0)  -- Invert pause ratio
  ));
END;
$$ LANGUAGE plpgsql;

-- Function to detect stress patterns
CREATE OR REPLACE FUNCTION detect_stress_patterns(
  f0_mean DECIMAL,
  f0_std DECIMAL,
  intensity_mean DECIMAL,
  intensity_std DECIMAL
) RETURNS TEXT AS $$
BEGIN
  -- Simple stress detection based on pitch and intensity variation
  IF f0_std > 50.0 AND intensity_std > 10.0 THEN
    RETURN 'high_stress';
  ELSIF f0_std > 30.0 AND intensity_std > 5.0 THEN
    RETURN 'moderate_stress';
  ELSE
    RETURN 'low_stress';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ===================================================================
-- 9. CREATE TRIGGERS FOR AUTOMATIC UPDATES
-- ===================================================================

-- Trigger to update prosody analytics when conversation is completed
CREATE OR REPLACE FUNCTION update_prosody_analytics_on_completion()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process when conversation status changes to 'completed'
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Insert or update prosody analytics
    INSERT INTO prosody_analytics (
      session_id, conversation_id, user_uid,
      conversation_duration, turn_count,
      analysis_timestamp
    )
    VALUES (
      NEW.session_id, NEW.id, NEW.user_uid,
      EXTRACT(EPOCH FROM (NEW.completed_at - NEW.started_at)),
      (NEW.metrics->>'total_turns')::INTEGER,
      NOW()
    )
    ON CONFLICT (conversation_id) 
    DO UPDATE SET
      conversation_duration = EXTRACT(EPOCH FROM (NEW.completed_at - NEW.started_at)),
      turn_count = (NEW.metrics->>'total_turns')::INTEGER,
      updated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_update_prosody_analytics ON conversations;
CREATE TRIGGER trigger_update_prosody_analytics
  AFTER UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_prosody_analytics_on_completion();

-- ===================================================================
-- 10. ADD COMMENTS FOR DOCUMENTATION
-- ===================================================================

COMMENT ON TABLE prosody_analytics IS 'Aggregate prosody metrics per conversation for efficient analysis';
COMMENT ON TABLE conversation_audio IS 'Audio files and metadata for each conversation turn';
COMMENT ON TABLE prosody_features IS 'Detailed prosody features for granular analysis';

COMMENT ON COLUMN prosody_analytics.avg_speech_rate IS 'Average words per minute across conversation';
COMMENT ON COLUMN prosody_analytics.avg_pitch_mean IS 'Average fundamental frequency in Hz';
COMMENT ON COLUMN prosody_analytics.avg_intensity_mean IS 'Average volume/intensity in dB';
COMMENT ON COLUMN prosody_analytics.engagement_score IS 'Calculated engagement score (0-10)';
COMMENT ON COLUMN prosody_analytics.emotional_arousal IS 'Emotional arousal level (0-10)';
COMMENT ON COLUMN prosody_analytics.emotional_valence IS 'Emotional valence (-10 to +10)';

COMMENT ON COLUMN conversation_audio.audio_url IS 'URL to the audio file';
COMMENT ON COLUMN conversation_audio.prosody_extracted IS 'Whether prosody features have been extracted';
COMMENT ON COLUMN conversation_audio.prosody_features IS 'Raw prosody features as JSONB';

COMMENT ON COLUMN prosody_features.f0_mean IS 'Mean fundamental frequency in Hz';
COMMENT ON COLUMN prosody_features.speech_rate IS 'Words per minute';
COMMENT ON COLUMN prosody_features.jitter IS 'Frequency variation measure';
COMMENT ON COLUMN prosody_features.shimmer IS 'Amplitude variation measure';
COMMENT ON COLUMN prosody_features.hnr IS 'Harmonics-to-noise ratio in dB';

-- ===================================================================
-- 11. VERIFICATION QUERIES
-- ===================================================================

-- Verify tables were created successfully
SELECT 'Prosody storage tables created successfully' AS status;

-- Show table information
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name IN ('prosody_analytics', 'conversation_audio', 'prosody_features')
ORDER BY table_name, ordinal_position;

-- Show indexes
SELECT 
  indexname,
  tablename,
  indexdef
FROM pg_indexes 
WHERE tablename IN ('prosody_analytics', 'conversation_audio', 'prosody_features')
ORDER BY tablename, indexname;
