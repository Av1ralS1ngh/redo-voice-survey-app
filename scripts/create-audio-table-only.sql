-- scripts/create-audio-table-only.sql
-- Just create the conversation_audio table - policies already exist

-- Create conversation_audio table (simplified version)
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

-- Enable RLS (if not already enabled)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'conversation_audio' AND n.nspname = 'public'
    AND c.relrowsecurity = true
  ) THEN
    ALTER TABLE conversation_audio ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;