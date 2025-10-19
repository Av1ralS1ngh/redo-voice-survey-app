-- Add interview_guide column to interviews table
-- This stores the stakeholder-ready interview guide in markdown format
-- Run this migration in Supabase SQL Editor

-- Note: The following columns should already exist from previous migrations:
-- - research_brief (JSONB) - Structured research brief
-- - hume_system_prompt (TEXT) - Generated Hume AI prompt
-- This migration adds the missing interview_guide column

-- Add the column
ALTER TABLE interviews
ADD COLUMN IF NOT EXISTS interview_guide TEXT;

-- Add comment
COMMENT ON COLUMN interviews.interview_guide IS 
'Stakeholder-ready interview guide generated from research brief (markdown format)';

-- Verify all AI-generated artifact columns exist
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'interviews' 
  AND column_name IN ('research_brief', 'interview_guide', 'hume_system_prompt')
ORDER BY column_name;

-- Expected output:
-- hume_system_prompt   | text  | YES | 
-- interview_guide      | text  | YES |
-- research_brief       | jsonb | YES |

-- Show full AI artifact flow in comments:
COMMENT ON TABLE interviews IS 
'Interviews table stores complete AI-generated workflow:
1. research_brief (JSONB) - Structured brief from research brief agent
2. interview_guide (TEXT) - Stakeholder-ready markdown guide from guide generator agent
3. hume_system_prompt (TEXT) - Hume AI voice prompt generated from interview guide';

-- Show sample of the table structure
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'interviews'
ORDER BY ordinal_position;

