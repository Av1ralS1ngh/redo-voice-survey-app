-- Quick check of conversation_audio table schema and missing components
-- Run this in Supabase SQL Editor to see current state

-- 1. Check if conversation_audio table exists
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'conversation_audio')
        THEN '✅ conversation_audio table EXISTS'
        ELSE '❌ conversation_audio table MISSING'
    END as table_status;

-- 2. Check current columns in conversation_audio table
SELECT 
    column_name,
    data_type,
    is_nullable,
    CASE 
        WHEN column_name = 'message_id' THEN '🎯 message_id column'
        WHEN column_name = 'storage_path' THEN '📁 storage_path column'
        ELSE '📋 standard column'
    END as column_type
FROM information_schema.columns 
WHERE table_name = 'conversation_audio'
ORDER BY ordinal_position;

-- 3. Check specific columns we need
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversation_audio' AND column_name = 'message_id')
        THEN '✅ message_id column EXISTS'
        ELSE '❌ message_id column MISSING'
    END as message_id_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversation_audio' AND column_name = 'storage_path')
        THEN '✅ storage_path column EXISTS'
        ELSE '❌ storage_path column MISSING'
    END as storage_path_status;

-- 4. Check storage buckets
SELECT 
    id as bucket_name,
    name,
    public,
    CASE 
        WHEN id = 'conversation-audio' THEN '✅ CORRECT bucket name'
        WHEN id LIKE '%conversation%audio%' THEN '⚠️ SIMILAR bucket name'
        ELSE '📦 OTHER bucket'
    END as bucket_status
FROM storage.buckets
WHERE id LIKE '%conversation%' OR id LIKE '%audio%'
ORDER BY id;

-- 5. Sample conversation_audio records (if any)
SELECT 
    COUNT(*) as total_records,
    COUNT(CASE WHEN message_id IS NOT NULL THEN 1 END) as records_with_message_id,
    COUNT(CASE WHEN storage_path IS NOT NULL THEN 1 END) as records_with_storage_path
FROM conversation_audio;
