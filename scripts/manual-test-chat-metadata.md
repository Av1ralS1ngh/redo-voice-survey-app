# 🧪 Manual Test Plan: Chat Metadata Table Integration

## Prerequisites
1. ✅ Execute `create-chat-metadata-table.sql` in Supabase SQL Editor
2. ✅ Verify `conversation_chat_metadata` table exists
3. ✅ Code updated to use new table

## Test 1: Table Creation Verification

### In Supabase SQL Editor:
```sql
-- Check table exists
SELECT table_name, column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'conversation_chat_metadata'
ORDER BY ordinal_position;

-- Check indexes
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'conversation_chat_metadata';

-- Check RLS policy
SELECT policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'conversation_chat_metadata';
```

**Expected Results:**
- Table has columns: `id`, `session_id`, `hume_chat_id`, `hume_chat_group_id`, `hume_session_id`, `captured_at`, `updated_at`
- Indexes on `hume_chat_id` and `session_id`
- RLS policy exists

## Test 2: End-to-End Conversation Flow

### Step 1: Start a New Conversation
1. Go to `http://localhost:3000/s/bc820345`
2. Wait for connection
3. **Check Terminal Logs** for:
   ```
   ✅ Created conversation record for Piyush (session: [UUID])
   🔗 Storing chat metadata: { chat_id: '[CHAT_ID]', ... }
   ✅ Successfully stored chat metadata in dedicated table
   ```

### Step 2: Verify Chat Metadata Storage
**In Supabase Table Editor:**
1. Go to `conversation_chat_metadata` table
2. Look for the latest record with your session ID
3. **Expected:** Record with `hume_chat_id`, `hume_chat_group_id`, `hume_session_id`

**Or via SQL:**
```sql
SELECT * FROM conversation_chat_metadata 
ORDER BY captured_at DESC 
LIMIT 1;
```

### Step 3: Have a Short Conversation
1. Say: "Hi, how are you?"
2. Wait for agent response
3. Say: "I'm doing well, thanks"
4. Let conversation complete naturally (or disconnect manually)

### Step 4: Verify Audio Reconstruction
**Check Terminal Logs for:**
```
🎯 Triggering audio reconstruction for session: [SESSION_ID]
✅ Found stored chat ID: [CHAT_ID]
🎵 Audio reconstruction initiated: {success: true, ...}
```

**NOT:**
```
❌ No matching chat found for session [SESSION_ID]
⚠️ No stored chat metadata found, falling back to time matching
```

## Test 3: Database Integrity

### Check Relationships:
```sql
-- Verify session_id exists in conversations table
SELECT c.session_id, cm.hume_chat_id, cm.captured_at
FROM conversations c
LEFT JOIN conversation_chat_metadata cm ON c.session_id = cm.session_id
WHERE cm.session_id IS NOT NULL
ORDER BY cm.captured_at DESC
LIMIT 5;
```

### Check Data Quality:
```sql
-- Verify no duplicate session_ids
SELECT session_id, COUNT(*) as count
FROM conversation_chat_metadata
GROUP BY session_id
HAVING COUNT(*) > 1;

-- Verify all required fields are populated
SELECT COUNT(*) as total_records,
       COUNT(hume_chat_id) as has_chat_id,
       COUNT(hume_chat_group_id) as has_group_id,
       COUNT(hume_session_id) as has_session_id
FROM conversation_chat_metadata;
```

## Test 4: Error Handling

### Test Missing Session:
```sql
-- Try to insert metadata for non-existent session
INSERT INTO conversation_chat_metadata (session_id, hume_chat_id)
VALUES ('00000000-0000-0000-0000-000000000000', 'test-chat-id');
```
**Expected:** Should succeed (no foreign key constraint yet)

### Test Duplicate Session:
```sql
-- Try to insert duplicate session_id
INSERT INTO conversation_chat_metadata (session_id, hume_chat_id)
VALUES ((SELECT session_id FROM conversation_chat_metadata LIMIT 1), 'duplicate-test');
```
**Expected:** Should fail due to UNIQUE constraint on session_id

## Test 5: Performance

### Check Query Performance:
```sql
EXPLAIN ANALYZE 
SELECT hume_chat_id 
FROM conversation_chat_metadata 
WHERE session_id = (SELECT session_id FROM conversation_chat_metadata LIMIT 1);
```
**Expected:** Should use index scan, not sequential scan

## Success Criteria ✅

- [ ] Table created successfully with all columns and indexes
- [ ] RLS policy allows authenticated access
- [ ] Chat metadata stored correctly during conversation
- [ ] Audio reconstruction finds stored chat ID (no fallback to time matching)
- [ ] No duplicate session_ids allowed
- [ ] Query performance uses indexes
- [ ] Terminal logs show success messages, not error messages

## Troubleshooting

### If chat metadata not stored:
1. Check terminal for error messages
2. Verify table permissions in Supabase
3. Check if `conversation_chat_metadata` table exists

### If audio reconstruction fails:
1. Verify chat metadata exists in table
2. Check session_id matches between tables
3. Look for Supabase connection errors

### If performance issues:
1. Verify indexes were created
2. Check query execution plans
3. Monitor Supabase dashboard for slow queries
