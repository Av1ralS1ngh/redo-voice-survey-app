-- Complete migration from fragmented responses to conversation-level storage
-- This script will drop the old table and create the new one

-- Step 1: Drop the old fragmented responses table
DROP TABLE IF EXISTS responses CASCADE;

-- Step 2: Create the new conversations table for clean conversation-level storage
CREATE TABLE conversations (
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
CREATE INDEX idx_conversations_session_id ON conversations(session_id);
CREATE INDEX idx_conversations_user_uid ON conversations(user_uid);
CREATE INDEX idx_conversations_status ON conversations(status);
CREATE INDEX idx_conversations_completed_at ON conversations(completed_at);

-- Add GIN indexes for JSONB queries
CREATE INDEX idx_conversations_data ON conversations USING GIN (conversation_data);
CREATE INDEX idx_conversations_survey_responses ON conversations USING GIN (survey_responses);
CREATE INDEX idx_conversations_metrics ON conversations USING GIN (metrics);

-- Add comments for documentation
COMMENT ON TABLE conversations IS 'Conversation-level storage for complete survey interactions';
COMMENT ON COLUMN conversations.conversation_data IS 'Complete conversation with turns, participants, and metadata';
COMMENT ON COLUMN conversations.survey_responses IS 'Extracted survey responses in structured format';
COMMENT ON COLUMN conversations.metrics IS 'Conversation metrics like duration, turn counts, completion status';

-- Verify the table was created successfully
SELECT 'Migration completed successfully. Conversations table created.' AS status;
