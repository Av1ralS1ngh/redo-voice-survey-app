-- scripts/setup-audio-integration.sql
-- Setup for audio integration with existing conversation system

-- The conversation_audio table is optional - audio URLs are stored in conversation turns
-- But we can create it for additional audio metadata if needed

-- Create conversation_audio table (optional - for additional audio metadata)
CREATE TABLE IF NOT EXISTS conversation_audio (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL,
  turn_number INTEGER NOT NULL,
  speaker VARCHAR(10) NOT NULL CHECK (speaker IN ('user', 'agent')),
  audio_url TEXT NOT NULL,
  audio_duration INTEGER NOT NULL, -- Duration in milliseconds
  processing_status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Create unique constraint inline
  CONSTRAINT conversation_audio_unique_turn UNIQUE (conversation_id, turn_number, speaker)
);

-- Create basic indexes
CREATE INDEX IF NOT EXISTS idx_conversation_audio_conversation_id ON conversation_audio(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_audio_turn_number ON conversation_audio(turn_number);

-- Enable RLS
ALTER TABLE conversation_audio ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, then recreate them
DROP POLICY IF EXISTS "Allow authenticated users to read audio records" ON conversation_audio;
DROP POLICY IF EXISTS "Allow authenticated users to insert audio records" ON conversation_audio;
DROP POLICY IF EXISTS "Allow authenticated users to update audio records" ON conversation_audio;

-- Create RLS policies
CREATE POLICY "Allow authenticated users to read audio records" ON conversation_audio
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to insert audio records" ON conversation_audio
FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update audio records" ON conversation_audio
FOR UPDATE TO authenticated
USING (true)
WITH CHECK (true);

-- Verify the conversations table has the right structure
-- (This should already exist from previous setup)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'conversations'
  ) THEN
    RAISE EXCEPTION 'conversations table does not exist. Please run the main database setup first.';
  END IF;
END $$;
