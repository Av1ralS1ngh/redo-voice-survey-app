# Database Migration Guide - Multi-Agent Interview Platform

## Overview

This directory contains database migration scripts to support the multi-agent interview platform architecture.

## Migration Order

**IMPORTANT:** Run migrations in this exact order:

1. ✅ `add-product-feedback-category.sql` (Already exists)
2. ✅ `add-agent-fields-to-interviews.sql` (New)
3. ✅ `create-interview-responses-table.sql` (New)

**OR** run the master migration script:

```sql
-- Run all migrations at once
\i migrate-multi-agent-schema.sql
```

---

## Migration Details

### 1. Add Product Feedback Category

**File:** `add-product-feedback-category.sql`

**Purpose:** Updates database constraints to allow `product_feedback` as a valid interview category.

**Changes:**
- Drops existing category CHECK constraints
- Adds new constraints including `product_feedback`
- Affects: `projects.category` and `interviews.category`

**SQL to run:**
```sql
\i scripts/add-product-feedback-category.sql
```

---

### 2. Add Agent Fields to Interviews

**File:** `add-agent-fields-to-interviews.sql`

**Purpose:** Adds columns to support multi-agent architecture and workflow state tracking.

**New Columns:**
- `agent_type` (TEXT) - Type of agent (custom, product_feedback, nps, etc.)
- `agent_config` (JSONB) - Runtime configuration overrides
- `research_brief` (JSONB) - Structured research brief
- `hume_system_prompt` (TEXT) - Generated Hume AI prompt
- `workflow_state` (JSONB) - Wizard progress tracking

**Indexes:**
- `idx_interviews_agent_type` - Faster queries by agent type
- `idx_interviews_workflow_state` - GIN index for JSONB queries

**SQL to run:**
```sql
\i scripts/add-agent-fields-to-interviews.sql
```

---

### 3. Create Interview Responses Table

**File:** `create-interview-responses-table.sql`

**Purpose:** Creates a new table to store participant conversation sessions and responses.

**Schema:**
```sql
interview_responses (
  id UUID PRIMARY KEY,
  interview_id UUID (FK to interviews),
  participant_id TEXT,
  participant_email TEXT,
  participant_metadata JSONB,
  session_id UUID,
  conversation_data JSONB,
  brief_used JSONB,
  hume_prompt_used TEXT,
  audio_url TEXT,
  audio_duration_seconds INTEGER,
  transcript JSONB,
  sentiment_analysis JSONB,
  key_insights JSONB,
  status TEXT,
  completion_rate INTEGER,
  engagement_score INTEGER,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

**Indexes:**
- `idx_interview_responses_interview_id`
- `idx_interview_responses_participant_id`
- `idx_interview_responses_session_id`
- `idx_interview_responses_status`
- `idx_interview_responses_created_at`
- `idx_interview_responses_conversation_data` (GIN)
- `idx_interview_responses_participant_metadata` (GIN)

**Features:**
- Row Level Security (RLS) enabled
- Automatic `updated_at` trigger
- Cascade delete when interview is deleted

**SQL to run:**
```sql
\i scripts/create-interview-responses-table.sql
```

---

## Quick Start

### Option 1: Run Master Migration (Recommended)

```bash
# In your Supabase SQL Editor or psql
\i scripts/migrate-multi-agent-schema.sql
```

This single command runs all migrations in the correct order with verification.

### Option 2: Run Individual Migrations

```bash
# Step 1
\i scripts/add-product-feedback-category.sql

# Step 2
\i scripts/add-agent-fields-to-interviews.sql

# Step 3
\i scripts/create-interview-responses-table.sql
```

---

## Verification

After running migrations, verify the changes:

```sql
-- Check if agent_type column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'interviews' 
AND column_name IN ('agent_type', 'agent_config', 'research_brief', 'hume_system_prompt', 'workflow_state');

-- Check if interview_responses table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'interview_responses';

-- Check constraints
SELECT conname, contype, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'interviews'::regclass 
AND conname LIKE '%category%';
```

---

## Rollback Instructions

### Rollback Migration 3 (interview_responses table)

```sql
DROP TABLE IF EXISTS interview_responses CASCADE;
DROP FUNCTION IF EXISTS update_interview_responses_updated_at() CASCADE;
```

### Rollback Migration 2 (agent fields)

```sql
ALTER TABLE interviews DROP COLUMN IF EXISTS agent_type;
ALTER TABLE interviews DROP COLUMN IF EXISTS agent_config;
ALTER TABLE interviews DROP COLUMN IF EXISTS research_brief;
ALTER TABLE interviews DROP COLUMN IF EXISTS hume_system_prompt;
ALTER TABLE interviews DROP COLUMN IF EXISTS workflow_state;

DROP INDEX IF EXISTS idx_interviews_agent_type;
DROP INDEX IF EXISTS idx_interviews_workflow_state;
```

### Rollback Migration 1 (product_feedback category)

```sql
-- Re-create constraints without product_feedback
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_category_check;
ALTER TABLE projects 
ADD CONSTRAINT projects_category_check 
CHECK (category IN ('custom', 'nps', 'lost_deals', 'won_deals', 'churn', 'renewal'));

ALTER TABLE interviews DROP CONSTRAINT IF EXISTS interviews_category_check;
ALTER TABLE interviews 
ADD CONSTRAINT interviews_category_check 
CHECK (category IN ('nps', 'won_deals', 'lost_deals', 'churn', 'renewal', 'custom'));
```

---

## Testing

After migration, test the changes:

```sql
-- Test 1: Insert interview with product_feedback type
INSERT INTO interviews (
  project_id, 
  name, 
  category, 
  agent_type
) VALUES (
  '00000000-0000-0000-0000-000000000000', -- Replace with valid project_id
  'Test Product Feedback Interview',
  'product_feedback',
  'product_feedback'
);

-- Test 2: Query workflow state
SELECT id, name, agent_type, workflow_state 
FROM interviews 
WHERE agent_type = 'product_feedback';

-- Test 3: Insert interview response
INSERT INTO interview_responses (
  interview_id,
  participant_id,
  status
) VALUES (
  (SELECT id FROM interviews WHERE agent_type = 'product_feedback' LIMIT 1),
  'test_participant_001',
  'in_progress'
);
```

---

## Troubleshooting

### Error: "column already exists"

This is safe - it means the column was already added. The migrations use `IF NOT EXISTS` clauses.

### Error: "constraint already exists"

Drop the existing constraint first:
```sql
ALTER TABLE interviews DROP CONSTRAINT interviews_category_check;
-- Then re-run the migration
```

### Error: "permission denied"

Ensure you have sufficient database privileges:
```sql
-- Grant necessary permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO your_user;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO your_user;
```

---

## Support

For issues or questions:
1. Check the verification queries above
2. Review the rollback instructions if needed
3. Consult the main implementation doc: `MULTI_AGENT_IMPLEMENTATION.md`

---

## Migration Status

- ✅ Migration 1: Product Feedback Category - **Ready**
- ✅ Migration 2: Agent Fields - **Ready**
- ✅ Migration 3: Interview Responses Table - **Ready**
- ✅ Master Migration Script - **Ready**

**All migrations are ready to run in Supabase!**
