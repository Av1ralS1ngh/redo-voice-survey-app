-- Migration: Add customer_satisfaction and usability_testing categories
-- This script updates the database constraints to include the new interview categories
-- Run this script against your Supabase database

-- ==============================================================================
-- Add customer_satisfaction and usability_testing to category constraints
-- ==============================================================================

DO $$ 
BEGIN
  RAISE NOTICE 'Starting Migration: Add customer_satisfaction and usability_testing categories...';
END $$;

-- Drop existing constraints
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_category_check;
ALTER TABLE interviews DROP CONSTRAINT IF EXISTS interviews_category_check;

-- Add new constraints with 'customer_satisfaction' and 'usability_testing' included
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
  'customer_satisfaction'
));

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
  'custom'
));

DO $$ 
BEGIN
  RAISE NOTICE '✅ Migration complete: customer_satisfaction and usability_testing categories added';
  RAISE NOTICE '';
  RAISE NOTICE 'Updated constraints:';
  RAISE NOTICE '  - projects.category: now includes customer_satisfaction, usability_testing';
  RAISE NOTICE '  - interviews.category: now includes customer_satisfaction, usability_testing';
END $$;

-- Verify the changes
DO $$
DECLARE
  projects_check TEXT;
  interviews_check TEXT;
BEGIN
  SELECT consrc INTO projects_check
  FROM pg_constraint 
  WHERE conname = 'projects_category_check';
  
  SELECT consrc INTO interviews_check
  FROM pg_constraint 
  WHERE conname = 'interviews_category_check';
  
  RAISE NOTICE '';
  RAISE NOTICE 'Verification:';
  RAISE NOTICE '  Projects constraint: %', projects_check;
  RAISE NOTICE '  Interviews constraint: %', interviews_check;
END $$;

