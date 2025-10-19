-- Create conversations table for clean conversation-level storage
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_uid TEXT NOT NULL, -- For easy user lookup
  user_name TEXT NOT NULL,
  conversation_data JSONB NOT NULL,
  summary TEXT,
  survey_responses JSONB,
  metrics JSONB,
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'completed', 'abandoned'
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversations_session_id ON conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user_uid ON conversations(user_uid);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_completed_at ON conversations(completed_at);

-- Add GIN index for JSONB queries
CREATE INDEX IF NOT EXISTS idx_conversations_data ON conversations USING GIN (conversation_data);
CREATE INDEX IF NOT EXISTS idx_conversations_survey_responses ON conversations USING GIN (survey_responses);
CREATE INDEX IF NOT EXISTS idx_conversations_metrics ON conversations USING GIN (metrics);
