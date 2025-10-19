-- Run this script in Supabase SQL Editor to update conversation_audio table
-- Fixed version with proper type handling

-- First, let's check the current schema
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'conversation_audio' 
ORDER BY ordinal_position;

-- Also check conversations table to understand the relationship
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'conversations'
AND column_name IN ('id', 'session_id', 'user_uid')
ORDER BY ordinal_position;

-- Add message_id column
ALTER TABLE conversation_audio 
ADD COLUMN IF NOT EXISTS message_id TEXT;

-- Add storage_path column 
ALTER TABLE conversation_audio 
ADD COLUMN IF NOT EXISTS storage_path TEXT;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversation_audio_message_id 
ON conversation_audio(message_id);

CREATE INDEX IF NOT EXISTS idx_conversation_audio_conversation_speaker 
ON conversation_audio(conversation_id, speaker);

-- Update RLS policy with proper type casting
DROP POLICY IF EXISTS "Users can access their own conversation audio" ON conversation_audio;

CREATE POLICY "Users can access their own conversation audio" ON conversation_audio
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM conversations 
    WHERE conversations.id = conversation_audio.conversation_id 
    AND conversations.user_uid::text = auth.uid()::text
  )
);

-- Add documentation
COMMENT ON COLUMN conversation_audio.message_id IS 'Hume AI message ID for linking audio to specific messages';
COMMENT ON COLUMN conversation_audio.storage_path IS 'Full storage path in Supabase Storage bucket';

-- Verify the update was successful
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'conversation_audio' 
ORDER BY ordinal_position;
