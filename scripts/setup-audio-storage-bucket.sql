-- Create and configure the conversation-audio storage bucket in Supabase

-- Create the storage bucket for conversation audio files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'conversation-audio',
  'conversation-audio', 
  true,  -- Make bucket public for easy access to audio files
  52428800,  -- 50MB file size limit
  ARRAY['audio/webm', 'audio/wav', 'audio/mp4', 'audio/mpeg', 'audio/ogg']
)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policy for the storage bucket
-- Allow authenticated users to insert/select/update their own conversation audio
CREATE POLICY "Users can upload conversation audio" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'conversation-audio' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = 'conversations'
);

CREATE POLICY "Users can view conversation audio" ON storage.objects
FOR SELECT USING (
  bucket_id = 'conversation-audio'
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can update conversation audio" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'conversation-audio'
  AND auth.uid() IS NOT NULL
);

-- Verify the bucket was created
SELECT * FROM storage.buckets WHERE id = 'conversation-audio';
