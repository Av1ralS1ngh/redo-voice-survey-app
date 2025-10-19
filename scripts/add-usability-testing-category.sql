-- Add 'usability_testing' category to existing database constraints
-- This script updates the CHECK constraints to include the new category
-- Run this in Supabase SQL Editor

-- Drop existing constraints
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_category_check;
ALTER TABLE interviews DROP CONSTRAINT IF EXISTS interviews_category_check;

-- Add new constraints with 'usability_testing' included
ALTER TABLE projects 
ADD CONSTRAINT projects_category_check 
CHECK (category IN ('custom', 'nps', 'lost_deals', 'won_deals', 'churn', 'renewal', 'product_feedback', 'usability_testing'));

ALTER TABLE interviews 
ADD CONSTRAINT interviews_category_check 
CHECK (category IN ('nps', 'won_deals', 'lost_deals', 'churn', 'renewal', 'product_feedback', 'usability_testing', 'custom'));

-- Verify the constraints were added
SELECT 
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conname IN ('projects_category_check', 'interviews_category_check')
ORDER BY conname;

