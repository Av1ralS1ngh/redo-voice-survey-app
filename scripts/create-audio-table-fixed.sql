-- scripts/create-audio-table-fixed.sql
-- Fixed version with proper unique constraint

-- Create conversation_audio table (simplified version)
CREATE TABLE IF NOT EXISTS conversation_audio (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL,
  turn_number INTEGER NOT NULL,
  speaker VARCHAR(10) NOT NULL CHECK (speaker IN ('user', 'agent')),
  audio_url TEXT NOT NULL,
  audio_duration INTEGER NOT NULL, -- Duration in milliseconds
  processing_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create the unique constraint separately (this is the key fix)
ALTER TABLE conversation_audio 
ADD CONSTRAINT conversation_audio_unique_turn 
UNIQUE (conversation_id, turn_number, speaker);

-- Create basic indexes
CREATE INDEX IF NOT EXISTS idx_conversation_audio_conversation_id ON conversation_audio(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_audio_turn_number ON conversation_audio(turn_number);

-- Enable RLS
ALTER TABLE conversation_audio ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, then recreate them
DROP POLICY IF EXISTS "Allow authenticated users to read audio records" ON conversation_audio;
DROP POLICY IF EXISTS "Allow authenticated users to insert audio records" ON conversation_audio;
DROP POLICY IF EXISTS "Allow authenticated users to update audio records" ON conversation_audio;

-- Allow authenticated users to read all audio records
CREATE POLICY "Allow authenticated users to read audio records" ON conversation_audio
FOR SELECT TO authenticated
USING (true);

-- Allow authenticated users to insert audio records
CREATE POLICY "Allow authenticated users to insert audio records" ON conversation_audio
FOR INSERT TO authenticated
WITH CHECK (true);

-- Allow authenticated users to update audio records
CREATE POLICY "Allow authenticated users to update audio records" ON conversation_audio
FOR UPDATE TO authenticated
USING (true)
WITH CHECK (true);
