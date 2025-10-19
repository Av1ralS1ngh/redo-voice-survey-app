-- Add missing schema components for audio pipeline
-- Run this ONLY if check-audio-schema.sql shows missing components

-- 1. Add message_id column if missing
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversation_audio' AND column_name = 'message_id') THEN
        ALTER TABLE conversation_audio ADD COLUMN message_id TEXT;
        RAISE NOTICE '✅ Added message_id column';
    ELSE
        RAISE NOTICE '✅ message_id column already exists';
    END IF;
END $$;

-- 2. Add storage_path column if missing
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversation_audio' AND column_name = 'storage_path') THEN
        ALTER TABLE conversation_audio ADD COLUMN storage_path TEXT;
        RAISE NOTICE '✅ Added storage_path column';
    ELSE
        RAISE NOTICE '✅ storage_path column already exists';
    END IF;
END $$;

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversation_audio_message_id 
ON conversation_audio(message_id);

CREATE INDEX IF NOT EXISTS idx_conversation_audio_conversation_speaker 
ON conversation_audio(conversation_id, speaker);

-- 4. Add helpful comments
COMMENT ON COLUMN conversation_audio.message_id IS 'Hume AI message ID for linking audio to specific messages';
COMMENT ON COLUMN conversation_audio.storage_path IS 'Full storage path in Supabase Storage bucket';

-- 5. Create storage bucket if missing
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'conversation-audio',
  'conversation-audio', 
  true,
  52428800,  -- 50MB file size limit
  ARRAY['audio/webm', 'audio/wav', 'audio/mp4', 'audio/mpeg', 'audio/ogg']
)
ON CONFLICT (id) DO NOTHING;

-- 6. Storage policies for conversation-audio bucket
DO $$
BEGIN
    -- Insert policy
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can upload conversation audio') THEN
        EXECUTE 'CREATE POLICY "Users can upload conversation audio" ON storage.objects
        FOR INSERT WITH CHECK (
          bucket_id = ''conversation-audio'' 
          AND auth.uid() IS NOT NULL
          AND (storage.foldername(name))[1] = ''conversations''
        )';
        RAISE NOTICE '✅ Added upload policy for conversation-audio bucket';
    END IF;

    -- Select policy  
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can view conversation audio') THEN
        EXECUTE 'CREATE POLICY "Users can view conversation audio" ON storage.objects
        FOR SELECT USING (
          bucket_id = ''conversation-audio''
          AND auth.uid() IS NOT NULL
        )';
        RAISE NOTICE '✅ Added view policy for conversation-audio bucket';
    END IF;

    -- Update policy
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can update conversation audio') THEN
        EXECUTE 'CREATE POLICY "Users can update conversation audio" ON storage.objects
        FOR UPDATE USING (
          bucket_id = ''conversation-audio''
          AND auth.uid() IS NOT NULL
        )';
        RAISE NOTICE '✅ Added update policy for conversation-audio bucket';
    END IF;
END $$;

-- 7. Final verification
SELECT 
    '🎯 SCHEMA SETUP COMPLETE' as status,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'conversation_audio') as total_columns,
    (SELECT COUNT(*) FROM storage.buckets WHERE id = 'conversation-audio') as audio_buckets;
