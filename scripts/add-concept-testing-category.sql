-- Migration: Add concept_testing category to projects and interviews tables
-- Date: 2025-01-15
-- Description: Adds 'concept_testing' as a valid category for concept testing research interviews

-- First, check if there are any rows with 'concept_testing' category (shouldn't be, but safety first)
-- If there are any, we'll leave them as-is

-- Step 1: Drop the existing CHECK constraint on projects table
ALTER TABLE projects
DROP CONSTRAINT IF EXISTS projects_category_check;

-- Step 2: Recreate the CHECK constraint with 'concept_testing' included
ALTER TABLE projects
ADD CONSTRAINT projects_category_check
CHECK (category IN (
  'custom',
  'nps',
  'lost_deals',
  'won_deals',
  'churn',
  'renewal',
  'product_feedback',
  'usability_testing',
  'customer_satisfaction',
  'concept_testing'
));

-- Step 3: Drop the existing CHECK constraint on interviews table
ALTER TABLE interviews
DROP CONSTRAINT IF EXISTS interviews_category_check;

-- Step 4: Recreate the CHECK constraint with 'concept_testing' included
ALTER TABLE interviews
ADD CONSTRAINT interviews_category_check
CHECK (category IN (
  'nps',
  'won_deals',
  'lost_deals',
  'churn',
  'renewal',
  'product_feedback',
  'usability_testing',
  'customer_satisfaction',
  'concept_testing',
  'custom'
));

-- Verification query (optional - run manually to verify)
-- SELECT 
--   'projects' as table_name,
--   constraint_name,
--   check_clause
-- FROM information_schema.check_constraints
-- WHERE constraint_name = 'projects_category_check'
-- UNION ALL
-- SELECT 
--   'interviews' as table_name,
--   constraint_name,
--   check_clause
-- FROM information_schema.check_constraints
-- WHERE constraint_name = 'interviews_category_check';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE 'Added concept_testing category to projects and interviews tables';
END $$;

