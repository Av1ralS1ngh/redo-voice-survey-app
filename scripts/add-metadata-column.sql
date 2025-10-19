-- Add metadata column to conversations table for storing Hume chat IDs
-- This is the missing link between our WebSocket sessions and Hume's REST API

DO $$ 
BEGIN
    -- Check if metadata column exists, if not add it
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'conversations' 
        AND column_name = 'metadata'
    ) THEN
        ALTER TABLE conversations 
        ADD COLUMN metadata JSONB;
        
        RAISE NOTICE 'Added metadata column to conversations table';
    ELSE
        RAISE NOTICE 'metadata column already exists in conversations table';
    END IF;
END $$;

-- Create index on metadata for faster queries
CREATE INDEX IF NOT EXISTS idx_conversations_metadata_hume_chat_id 
ON conversations USING GIN ((metadata->>'hume_chat_id'));

-- Create index on metadata for chat group queries
CREATE INDEX IF NOT EXISTS idx_conversations_metadata_hume_chat_group_id 
ON conversations USING GIN ((metadata->>'hume_chat_group_id'));

COMMENT ON COLUMN conversations.metadata IS 'JSON metadata including Hume chat IDs for audio reconstruction';
