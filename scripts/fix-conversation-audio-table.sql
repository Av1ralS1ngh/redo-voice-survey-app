-- Fix conversation_audio table to make conversation_id nullable
-- Since we're indexing by session_id, conversation_id is optional

-- Drop the NOT NULL constraint on conversation_id
ALTER TABLE conversation_audio 
ALTER COLUMN conversation_id DROP NOT NULL;

-- Add index on session_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_conversation_audio_session 
ON conversation_audio(session_id);

-- Add index on turn_number for ordering
CREATE INDEX IF NOT EXISTS idx_conversation_audio_turn 
ON conversation_audio(session_id, turn_number);

-- Verify the changes
SELECT column_name, is_nullable, data_type 
FROM information_schema.columns 
WHERE table_name = 'conversation_audio'
ORDER BY ordinal_position;
