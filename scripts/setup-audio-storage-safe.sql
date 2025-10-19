-- scripts/setup-audio-storage-safe.sql
-- Safe setup for audio storage - handles existing policies

-- Create storage bucket for conversation audio files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'conversation-audio-files',
  'conversation-audio-files',
  true, -- Public access for easy playback
  52428800, -- 50MB file size limit
  ARRAY['audio/webm', 'audio/mp4', 'audio/wav', 'audio/ogg']
) ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Drop existing policies if they exist, then recreate them
DROP POLICY IF EXISTS "Allow authenticated users to upload audio" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to audio" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update audio" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete audio" ON storage.objects;

-- Create RLS policy for authenticated users to upload audio
CREATE POLICY "Allow authenticated users to upload audio" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'conversation-audio-files');

-- Create RLS policy for public read access to audio files
CREATE POLICY "Allow public read access to audio" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'conversation-audio-files');

-- Create RLS policy for authenticated users to update their own audio files
CREATE POLICY "Allow authenticated users to update audio" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'conversation-audio-files')
WITH CHECK (bucket_id = 'conversation-audio-files');

-- Create RLS policy for authenticated users to delete their own audio files
CREATE POLICY "Allow authenticated users to delete audio" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'conversation-audio-files');

-- Create conversation_audio table (simplified version)
CREATE TABLE IF NOT EXISTS conversation_audio (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL,
  turn_number INTEGER NOT NULL,
  speaker VARCHAR(10) NOT NULL CHECK (speaker IN ('user', 'agent')),
  audio_url TEXT NOT NULL,
  audio_duration INTEGER NOT NULL, -- Duration in milliseconds
  processing_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique combination of conversation, turn, and speaker
  UNIQUE(conversation_id, turn_number, speaker)
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
