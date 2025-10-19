-- Comprehensive audit of the audio pipeline infrastructure
-- Run this in Supabase SQL Editor to check what exists

-- 1. Check if conversation_audio table exists and its structure
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_name = 'conversation_audio';

-- 2. Check conversation_audio table columns (if it exists)
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'conversation_audio'
ORDER BY ordinal_position;

-- 3. Check if conversations table exists
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_name = 'conversations';

-- 4. Check conversations table structure
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'conversations'
ORDER BY ordinal_position;

-- 5. Check existing indexes on conversation_audio
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'conversation_audio';

-- 6. Check RLS policies on conversation_audio
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'conversation_audio';

-- 7. Check if RLS is enabled on conversation_audio
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'conversation_audio';

-- 8. Check sample data in conversation_audio (if any exists)
SELECT 
    COUNT(*) as total_records,
    COUNT(CASE WHEN message_id IS NOT NULL THEN 1 END) as records_with_message_id,
    COUNT(CASE WHEN storage_path IS NOT NULL THEN 1 END) as records_with_storage_path,
    COUNT(CASE WHEN speaker = 'user' THEN 1 END) as user_records,
    COUNT(CASE WHEN speaker = 'assistant' THEN 1 END) as assistant_records
FROM conversation_audio;
