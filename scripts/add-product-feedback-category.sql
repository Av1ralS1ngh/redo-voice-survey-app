-- Add 'product_feedback' category to existing database constraints
-- This script updates the CHECK constraints to include the new category

-- Drop existing constraints
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_category_check;
ALTER TABLE interviews DROP CONSTRAINT IF EXISTS interviews_category_check;

-- Add new constraints with 'product_feedback' included
ALTER TABLE projects 
ADD CONSTRAINT projects_category_check 
CHECK (category IN ('custom', 'nps', 'lost_deals', 'won_deals', 'churn', 'renewal', 'product_feedback'));

ALTER TABLE interviews 
ADD CONSTRAINT interviews_category_check 
CHECK (category IN ('nps', 'won_deals', 'lost_deals', 'churn', 'renewal', 'product_feedback', 'custom'));
