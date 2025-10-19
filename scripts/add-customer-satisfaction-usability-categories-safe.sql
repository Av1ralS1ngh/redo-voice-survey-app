-- Safe Migration: Add customer_satisfaction and usability_testing categories
-- This script safely updates the database constraints by handling existing data first
-- Run this script against your Supabase database

-- ==============================================================================
-- STEP 1: Check existing data
-- ==============================================================================

DO $$ 
BEGIN
  RAISE NOTICE 'Starting Safe Migration: Add customer_satisfaction and usability_testing categories...';
  RAISE NOTICE '';
  RAISE NOTICE 'Checking existing data...';
END $$;

-- Show current categories in use
DO $$
DECLARE
  rec RECORD;
BEGIN
  RAISE NOTICE 'Current project categories:';
  FOR rec IN 
    SELECT category, COUNT(*) as count 
    FROM projects 
    GROUP BY category 
    ORDER BY category
  LOOP
    RAISE NOTICE '  - %: % rows', rec.category, rec.count;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE 'Current interview categories:';
  FOR rec IN 
    SELECT category, COUNT(*) as count 
    FROM interviews 
    GROUP BY category 
    ORDER BY category
  LOOP
    RAISE NOTICE '  - %: % rows', rec.category, rec.count;
  END LOOP;
END $$;

-- ==============================================================================
-- STEP 2: Update any invalid categories (if needed)
-- ==============================================================================

DO $$ 
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE 'Updating any non-standard categories to "custom"...';
END $$;

-- Update projects with invalid categories
UPDATE projects 
SET category = 'custom' 
WHERE category NOT IN (
  'custom', 
  'nps', 
  'lost_deals', 
  'won_deals', 
  'churn', 
  'renewal', 
  'product_feedback',
  'usability_testing',
  'customer_satisfaction'
);

-- Update interviews with invalid categories
UPDATE interviews 
SET category = 'custom' 
WHERE category NOT IN (
  'nps', 
  'won_deals', 
  'lost_deals', 
  'churn', 
  'renewal', 
  'product_feedback', 
  'usability_testing',
  'customer_satisfaction',
  'custom'
);

DO $$ 
BEGIN
  RAISE NOTICE '✅ Data cleanup complete';
END $$;

-- ==============================================================================
-- STEP 3: Drop existing constraints
-- ==============================================================================

DO $$ 
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE 'Dropping existing constraints...';
END $$;

ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_category_check;
ALTER TABLE interviews DROP CONSTRAINT IF EXISTS interviews_category_check;

DO $$ 
BEGIN
  RAISE NOTICE '✅ Old constraints dropped';
END $$;

-- ==============================================================================
-- STEP 4: Add new constraints with all categories
-- ==============================================================================

DO $$ 
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE 'Adding new constraints...';
END $$;

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
  RAISE NOTICE '✅ New constraints added successfully';
END $$;

-- ==============================================================================
-- STEP 5: Verify the changes
-- ==============================================================================

DO $$
DECLARE
  projects_check TEXT;
  interviews_check TEXT;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '================================';
  RAISE NOTICE 'Migration Complete!';
  RAISE NOTICE '================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Updated constraints:';
  RAISE NOTICE '  ✅ projects.category: now includes customer_satisfaction, usability_testing';
  RAISE NOTICE '  ✅ interviews.category: now includes customer_satisfaction, usability_testing';
  RAISE NOTICE '';
  RAISE NOTICE 'You can now create interviews with these new types:';
  RAISE NOTICE '  - Usability Testing';
  RAISE NOTICE '  - Customer Satisfaction';
  RAISE NOTICE '';
END $$;

-- Final verification: show updated categories
DO $$
DECLARE
  rec RECORD;
BEGIN
  RAISE NOTICE 'Final category counts:';
  RAISE NOTICE '';
  RAISE NOTICE 'Projects:';
  FOR rec IN 
    SELECT category, COUNT(*) as count 
    FROM projects 
    GROUP BY category 
    ORDER BY category
  LOOP
    RAISE NOTICE '  - %: % rows', rec.category, rec.count;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE 'Interviews:';
  FOR rec IN 
    SELECT category, COUNT(*) as count 
    FROM interviews 
    GROUP BY category 
    ORDER BY category
  LOOP
    RAISE NOTICE '  - %: % rows', rec.category, rec.count;
  END LOOP;
END $$;

