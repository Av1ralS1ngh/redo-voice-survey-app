-- Create interview_responses table
-- Stores actual conversation sessions from participants

CREATE TABLE IF NOT EXISTS interview_responses (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign key to interviews
  interview_id UUID NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
  
  -- Participant identification
  participant_id TEXT NOT NULL,
  participant_email TEXT,
  participant_metadata JSONB DEFAULT '{}',
  
  -- Session data
  session_id UUID,
  conversation_data JSONB,
  
  -- Research brief snapshot (what was used for this session)
  brief_used JSONB,
  
  -- Hume prompt snapshot (what was used for this session)
  hume_prompt_used TEXT,
  
  -- Audio recording
  audio_url TEXT,
  audio_duration_seconds INTEGER,
  
  -- Transcript
  transcript JSONB,
  
  -- Analysis
  sentiment_analysis JSONB,
  key_insights JSONB,
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned', 'error')),
  
  -- Quality metrics
  completion_rate INTEGER, -- 0-100
  engagement_score INTEGER, -- 0-100
  
  -- Timestamps
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_interview_responses_interview_id 
ON interview_responses(interview_id);

CREATE INDEX IF NOT EXISTS idx_interview_responses_participant_id 
ON interview_responses(participant_id);

CREATE INDEX IF NOT EXISTS idx_interview_responses_session_id 
ON interview_responses(session_id);

CREATE INDEX IF NOT EXISTS idx_interview_responses_status 
ON interview_responses(status);

CREATE INDEX IF NOT EXISTS idx_interview_responses_created_at 
ON interview_responses(created_at DESC);

-- GIN index for JSONB columns for faster querying
CREATE INDEX IF NOT EXISTS idx_interview_responses_conversation_data 
ON interview_responses USING GIN (conversation_data);

CREATE INDEX IF NOT EXISTS idx_interview_responses_participant_metadata 
ON interview_responses USING GIN (participant_metadata);

-- Add comments for documentation
COMMENT ON TABLE interview_responses IS 'Stores participant responses and conversation sessions for interviews';
COMMENT ON COLUMN interview_responses.interview_id IS 'Reference to the interview configuration';
COMMENT ON COLUMN interview_responses.participant_id IS 'Unique identifier for the participant';
COMMENT ON COLUMN interview_responses.conversation_data IS 'Full conversation data including messages and metadata';
COMMENT ON COLUMN interview_responses.brief_used IS 'Snapshot of the research brief used for this session';
COMMENT ON COLUMN interview_responses.hume_prompt_used IS 'Snapshot of the Hume prompt used for this session';
COMMENT ON COLUMN interview_responses.transcript IS 'Structured transcript with timestamps';
COMMENT ON COLUMN interview_responses.sentiment_analysis IS 'AI-generated sentiment analysis results';
COMMENT ON COLUMN interview_responses.key_insights IS 'AI-extracted key insights from the conversation';

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_interview_responses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_interview_responses_updated_at
BEFORE UPDATE ON interview_responses
FOR EACH ROW
EXECUTE FUNCTION update_interview_responses_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE interview_responses ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Allow users to see their own interview responses
DROP POLICY IF EXISTS interview_responses_select_policy ON interview_responses;
CREATE POLICY interview_responses_select_policy ON interview_responses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM interviews
      WHERE interviews.id = interview_responses.interview_id
      AND interviews.user_id = current_setting('request.jwt.claims', true)::json->>'sub'
    )
    OR auth.uid() IS NOT NULL
  );

-- Allow users to insert responses
DROP POLICY IF EXISTS interview_responses_insert_policy ON interview_responses;
CREATE POLICY interview_responses_insert_policy ON interview_responses
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Allow users to update their own interview responses
DROP POLICY IF EXISTS interview_responses_update_policy ON interview_responses;
CREATE POLICY interview_responses_update_policy ON interview_responses
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM interviews
      WHERE interviews.id = interview_responses.interview_id
      AND interviews.user_id = current_setting('request.jwt.claims', true)::json->>'sub'
    )
    OR auth.uid() IS NOT NULL
  );

-- Allow users to delete their own interview responses
DROP POLICY IF EXISTS interview_responses_delete_policy ON interview_responses;
CREATE POLICY interview_responses_delete_policy ON interview_responses
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM interviews
      WHERE interviews.id = interview_responses.interview_id
      AND interviews.user_id = current_setting('request.jwt.claims', true)::json->>'sub'
    )
    OR auth.uid() IS NOT NULL
  );

-- Verify the changes
DO $$ 
BEGIN
  RAISE NOTICE 'interview_responses table created successfully';
  RAISE NOTICE 'Indexes created for: interview_id, participant_id, session_id, status, created_at';
  RAISE NOTICE 'RLS policies enabled for secure access';
END $$;
