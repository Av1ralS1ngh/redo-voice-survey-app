-- scripts/recreate-audio-table.sql
-- Drop and recreate the conversation_audio table with proper constraints

-- Drop the table if it exists (this will also drop all policies and constraints)
DROP TABLE IF EXISTS conversation_audio CASCADE;

-- Create conversation_audio table with proper unique constraint
CREATE TABLE conversation_audio (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL,
  turn_number INTEGER NOT NULL,
  speaker VARCHAR(10) NOT NULL CHECK (speaker IN ('user', 'agent')),
  audio_url TEXT NOT NULL,
  audio_duration INTEGER NOT NULL, -- Duration in milliseconds
  processing_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Create unique constraint inline
  CONSTRAINT conversation_audio_unique_turn UNIQUE (conversation_id, turn_number, speaker)
);

-- Create basic indexes
CREATE INDEX idx_conversation_audio_conversation_id ON conversation_audio(conversation_id);
CREATE INDEX idx_conversation_audio_turn_number ON conversation_audio(turn_number);

-- Enable RLS
ALTER TABLE conversation_audio ENABLE ROW LEVEL SECURITY;

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
