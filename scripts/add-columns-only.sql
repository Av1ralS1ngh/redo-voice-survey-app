-- Simple script to add the missing columns to conversation_audio table

-- Add message_id column (TEXT type for Hume message IDs)
ALTER TABLE conversation_audio 
ADD COLUMN IF NOT EXISTS message_id TEXT;

-- Add storage_path column (TEXT type for Supabase Storage paths)
ALTER TABLE conversation_audio 
ADD COLUMN IF NOT EXISTS storage_path TEXT;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_conversation_audio_message_id 
ON conversation_audio(message_id);

CREATE INDEX IF NOT EXISTS idx_conversation_audio_conversation_speaker 
ON conversation_audio(conversation_id, speaker);

-- Add helpful comments
COMMENT ON COLUMN conversation_audio.message_id IS 'Hume AI message ID for linking audio to specific messages';
COMMENT ON COLUMN conversation_audio.storage_path IS 'Full storage path in Supabase Storage bucket';

-- Verify the columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'conversation_audio' 
AND column_name IN ('message_id', 'storage_path');
