-- Fix user isolation and sync auth users to custom users table
-- This script should be run after users have signed up

-- 1. Update projects table to use UUID for user_id to match auth.uid()
-- First, check if we need to convert existing TEXT user_ids to UUID
-- For now, we'll assume user_ids are already UUID strings

-- 2. Fix RLS policies to properly isolate users
-- Drop the permissive policies and create proper user-based policies
DROP POLICY IF EXISTS "projects_policy" ON projects;
CREATE POLICY "projects_select_policy" ON projects
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "projects_insert_policy" ON projects
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "projects_update_policy" ON projects
  FOR UPDATE USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "projects_delete_policy" ON projects
  FOR DELETE USING (auth.uid()::text = user_id);

-- Fix RLS policies for interviews table
DROP POLICY IF EXISTS "interviews_policy" ON interviews;
CREATE POLICY "interviews_select_policy" ON interviews
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = interviews.project_id
      AND projects.user_id = auth.uid()::text
    )
  );

CREATE POLICY "interviews_insert_policy" ON interviews
  FOR INSERT WITH CHECK (
    project_id IS NULL OR
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = interviews.project_id
      AND projects.user_id = auth.uid()::text
    )
  );

CREATE POLICY "interviews_update_policy" ON interviews
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = interviews.project_id
      AND projects.user_id = auth.uid()::text
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = interviews.project_id
      AND projects.user_id = auth.uid()::text
    )
  );

CREATE POLICY "interviews_delete_policy" ON interviews
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = interviews.project_id
      AND projects.user_id = auth.uid()::text
    )
  );

-- 3. Create or update custom users table to sync with auth.users
-- First, drop and recreate the table to ensure clean structure
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT UNIQUE NOT NULL,
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Function to sync auth.users to custom users table
CREATE OR REPLACE FUNCTION sync_auth_user_to_custom_users()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert or update the custom users table when auth.users changes
  INSERT INTO users (user_id, full_name, email, created_at, updated_at)
  VALUES (
    NEW.id::text,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'Unknown'),
    NEW.email,
    NEW.created_at,
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, users.full_name),
    email = COALESCE(EXCLUDED.email, users.email),
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create trigger to automatically sync users (requires DB owner privileges)
-- Note: This may not work in all Supabase environments due to privilege restrictions
-- DROP TRIGGER IF EXISTS sync_auth_user_trigger ON auth.users;
-- CREATE TRIGGER sync_auth_user_trigger
--   AFTER INSERT OR UPDATE ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION sync_auth_user_to_custom_users();

-- 6. Manually sync existing auth users to custom users table
INSERT INTO users (user_id, full_name, email, created_at)
SELECT
  au.id::text as user_id,
  COALESCE(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name', 'Unknown') as full_name,
  au.email,
  au.created_at
FROM auth.users au
ON CONFLICT (user_id) DO UPDATE SET
  full_name = COALESCE(EXCLUDED.full_name, users.full_name),
  email = COALESCE(EXCLUDED.email, users.email),
  updated_at = NOW();

-- 7. Enable RLS on users table and create policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_select_policy" ON users;
CREATE POLICY "users_select_policy" ON users
  FOR SELECT USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "users_insert_policy" ON users;
CREATE POLICY "users_insert_policy" ON users
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "users_update_policy" ON users;
CREATE POLICY "users_update_policy" ON users
  FOR UPDATE USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

-- 8. Clean up any projects that don't belong to real users
-- (Optional: uncomment if you want to remove orphaned projects)
-- DELETE FROM projects WHERE user_id NOT IN (
--   SELECT user_id FROM users
-- );

-- 9. Update any existing projects to use correct user_id format
-- This assumes user_ids are already UUID strings
UPDATE projects SET user_id = user_id WHERE user_id IS NOT NULL;