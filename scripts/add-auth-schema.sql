-- Authentication Schema Updates
-- This script adds authentication support to the existing voice-survey database

-- ============================================
-- PHASE 1: Update Users Table
-- ============================================

-- Add auth_id column to link to Supabase auth.users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS auth_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON users(auth_id);

-- Make auth_id unique (one auth user = one app user)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_auth_id'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT unique_auth_id UNIQUE(auth_id);
  END IF;
END $$;

COMMENT ON COLUMN users.auth_id IS 'Links to auth.users for authentication';

-- ============================================
-- PHASE 2: Update Projects Table
-- ============================================

-- Check if projects.user_id is TEXT (old format)
DO $$ 
DECLARE
  user_id_type TEXT;
BEGIN
  SELECT data_type INTO user_id_type
  FROM information_schema.columns 
  WHERE table_name = 'projects' 
  AND column_name = 'user_id';

  -- If it's TEXT, we need to migrate to UUID
  IF user_id_type = 'text' THEN
    RAISE NOTICE 'Migrating projects.user_id from TEXT to UUID...';
    
    -- 1. Add new column for auth user id
    ALTER TABLE projects ADD COLUMN IF NOT EXISTS auth_user_id UUID;
    
    -- 2. Create temporary mapping for existing users
    -- Note: This will be populated by the seed script
    RAISE NOTICE 'New auth_user_id column added. Run seed script to populate.';
    
    -- 3. We'll rename columns after seed script populates data
    -- This is handled in a separate migration after seeding
  ELSE
    RAISE NOTICE 'projects.user_id is already UUID type';
  END IF;
END $$;

-- ============================================
-- PHASE 3: Enable Row Level Security (RLS)
-- ============================================

-- Enable RLS on projects table
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to allow re-running script)
DROP POLICY IF EXISTS "Users can view own projects" ON projects;
DROP POLICY IF EXISTS "Users can create own projects" ON projects;
DROP POLICY IF EXISTS "Users can update own projects" ON projects;
DROP POLICY IF EXISTS "Users can delete own projects" ON projects;

-- Policy: Users can only see their own projects
CREATE POLICY "Users can view own projects"
ON projects FOR SELECT
USING (
  CASE 
    WHEN auth_user_id IS NOT NULL THEN auth.uid() = auth_user_id
    ELSE auth.uid()::text = user_id::text  -- Fallback for old TEXT format
  END
);

-- Policy: Users can only create projects for themselves
CREATE POLICY "Users can create own projects"
ON projects FOR INSERT
WITH CHECK (
  CASE 
    WHEN auth_user_id IS NOT NULL THEN auth.uid() = auth_user_id
    ELSE auth.uid()::text = user_id::text
  END
);

-- Policy: Users can only update their own projects
CREATE POLICY "Users can update own projects"
ON projects FOR UPDATE
USING (
  CASE 
    WHEN auth_user_id IS NOT NULL THEN auth.uid() = auth_user_id
    ELSE auth.uid()::text = user_id::text
  END
);

-- Policy: Users can only delete their own projects
CREATE POLICY "Users can delete own projects"
ON projects FOR DELETE
USING (
  CASE 
    WHEN auth_user_id IS NOT NULL THEN auth.uid() = auth_user_id
    ELSE auth.uid()::text = user_id::text
  END
);

-- ============================================
-- PHASE 4: Enable RLS on Interviews
-- ============================================

-- Enable RLS on interviews table (cascade from projects)
ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own interviews" ON interviews;
DROP POLICY IF EXISTS "Users can create own interviews" ON interviews;
DROP POLICY IF EXISTS "Users can update own interviews" ON interviews;
DROP POLICY IF EXISTS "Users can delete own interviews" ON interviews;

-- Policy: Users can only see interviews for their projects
CREATE POLICY "Users can view own interviews"
ON interviews FOR SELECT
USING (
  project_id IN (
    SELECT id FROM projects WHERE 
    CASE 
      WHEN auth_user_id IS NOT NULL THEN auth.uid() = auth_user_id
      ELSE auth.uid()::text = user_id::text
    END
  )
);

-- Policy: Users can only create interviews for their projects
CREATE POLICY "Users can create own interviews"
ON interviews FOR INSERT
WITH CHECK (
  project_id IN (
    SELECT id FROM projects WHERE 
    CASE 
      WHEN auth_user_id IS NOT NULL THEN auth.uid() = auth_user_id
      ELSE auth.uid()::text = user_id::text
    END
  )
);

-- Policy: Users can only update their own interviews
CREATE POLICY "Users can update own interviews"
ON interviews FOR UPDATE
USING (
  project_id IN (
    SELECT id FROM projects WHERE 
    CASE 
      WHEN auth_user_id IS NOT NULL THEN auth.uid() = auth_user_id
      ELSE auth.uid()::text = user_id::text
    END
  )
);

-- Policy: Users can only delete their own interviews
CREATE POLICY "Users can delete own interviews"
ON interviews FOR DELETE
USING (
  project_id IN (
    SELECT id FROM projects WHERE 
    CASE 
      WHEN auth_user_id IS NOT NULL THEN auth.uid() = auth_user_id
      ELSE auth.uid()::text = user_id::text
    END
  )
);

-- ============================================
-- Verification Queries
-- ============================================

-- Check users table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('id', 'uid', 'auth_id', 'name', 'email')
ORDER BY ordinal_position;

-- Check projects table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'projects' 
AND column_name IN ('id', 'user_id', 'auth_user_id', 'name')
ORDER BY ordinal_position;

-- Check RLS is enabled
SELECT 
  tablename, 
  rowsecurity 
FROM pg_tables 
WHERE tablename IN ('projects', 'interviews');

-- Check policies exist
SELECT 
  tablename,
  policyname,
  cmd
FROM pg_policies 
WHERE tablename IN ('projects', 'interviews')
ORDER BY tablename, policyname;

-- Summary
SELECT 'Schema update complete! Next step: Run seed-test-auth-user.ts' AS next_step;

