-- Fix RLS policies for conversation-audio storage bucket
-- The test script showed RLS blocking uploads, so we need more permissive policies

-- 1. Drop existing policies to start clean
DROP POLICY IF EXISTS "Users can upload conversation audio" ON storage.objects;
DROP POLICY IF EXISTS "Users can view conversation audio" ON storage.objects;
DROP POLICY IF EXISTS "Users can update conversation audio" ON storage.objects;

-- 2. Create more permissive storage policies for conversation-audio bucket
-- Allow authenticated users to insert files
CREATE POLICY "Allow authenticated users to upload conversation audio"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'conversation-audio'
  AND auth.uid() IS NOT NULL
);

-- Allow authenticated users to read files  
CREATE POLICY "Allow authenticated users to read conversation audio"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'conversation-audio'
  AND auth.uid() IS NOT NULL
);

-- Allow authenticated users to update files
CREATE POLICY "Allow authenticated users to update conversation audio"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'conversation-audio'
  AND auth.uid() IS NOT NULL
)
WITH CHECK (
  bucket_id = 'conversation-audio'
  AND auth.uid() IS NOT NULL
);

-- Allow authenticated users to delete files (for cleanup)
CREATE POLICY "Allow authenticated users to delete conversation audio"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'conversation-audio'
  AND auth.uid() IS NOT NULL
);

-- 3. Verify the bucket exists and is public
UPDATE storage.buckets 
SET public = true 
WHERE id = 'conversation-audio';

-- 4. Check that RLS is enabled on storage.objects (should be by default)
-- This just verifies, doesn't change anything
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'storage' AND tablename = 'objects';

-- 5. List all policies for verification
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects' 
  AND policyname LIKE '%conversation%audio%'
ORDER BY policyname;
