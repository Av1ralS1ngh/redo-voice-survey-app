-- Create dedicated table for conversation chat metadata
-- This separates chat metadata from conversation turns for cleaner data management

-- First, let's check what the actual primary key is in conversations table
-- Option 1: If conversations has 'id' as primary key, reference that
-- Option 2: If conversations has 'session_id' as unique, we need to add unique constraint

-- Create the conversation_chat_metadata table
CREATE TABLE IF NOT EXISTS conversation_chat_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL UNIQUE,
  hume_chat_id TEXT NOT NULL,
  hume_chat_group_id TEXT,
  hume_session_id TEXT,
  captured_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
  
  -- Note: Foreign key constraint removed temporarily
  -- We'll add it after confirming the conversations table structure
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversation_chat_metadata_hume_chat_id 
  ON conversation_chat_metadata(hume_chat_id);

CREATE INDEX IF NOT EXISTS idx_conversation_chat_metadata_session_id 
  ON conversation_chat_metadata(session_id);

-- Enable RLS (Row Level Security) for the table
ALTER TABLE conversation_chat_metadata ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for authenticated users
CREATE POLICY "conversation_chat_metadata_policy" 
  ON conversation_chat_metadata
  FOR ALL 
  TO authenticated
  USING (true) 
  WITH CHECK (true);

-- Add helpful comments
COMMENT ON TABLE conversation_chat_metadata IS 'Stores Hume chat metadata for conversations, linking our session IDs to Hume chat IDs for audio reconstruction';
COMMENT ON COLUMN conversation_chat_metadata.session_id IS 'References conversations.session_id - our internal session identifier';
COMMENT ON COLUMN conversation_chat_metadata.hume_chat_id IS 'Hume chat ID for audio reconstruction API calls';
COMMENT ON COLUMN conversation_chat_metadata.hume_chat_group_id IS 'Hume chat group ID for conversation continuity';
COMMENT ON COLUMN conversation_chat_metadata.hume_session_id IS 'Hume session/request ID for tracking';

-- Optional: Add foreign key constraint after confirming conversations table structure
-- ALTER TABLE conversation_chat_metadata 
-- ADD CONSTRAINT fk_conversation_chat_metadata_session 
-- FOREIGN KEY (session_id) REFERENCES conversations(session_id) ON DELETE CASCADE;
