-- Refresh Supabase PostgREST schema cache
-- Run this after adding new columns to fix PGRST204 errors

-- Method 1: Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';

-- Method 2: If Method 1 doesn't work, check if columns exist
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'interviews'
  AND column_name IN (
    'workflow_state',
    'research_brief',
    'hume_system_prompt',
    'interview_guide',
    'agent_type',
    'agent_config'
  )
ORDER BY column_name;

-- Expected output (verify these columns exist):
-- agent_config       | jsonb | YES
-- agent_type         | text  | NO
-- hume_system_prompt | text  | YES
-- interview_guide    | text  | YES
-- research_brief     | jsonb | YES
-- workflow_state     | jsonb | YES

-- If columns are missing, run the appropriate migration scripts:
-- 1. scripts/add-agent-fields-to-interviews.sql (for workflow_state, research_brief, hume_system_prompt)
-- 2. scripts/add-interview-guide-column.sql (for interview_guide)

