-- create-user-projects.sql (safe-mode)
--
-- This version avoids privileged DO blocks and trigger creation on
-- `auth.users` so it can be run from the Supabase SQL editor without
-- requiring DB-owner permissions. If you have DB-owner access and prefer
-- the automatic DB trigger approach, see the commented "privileged" section
-- at the bottom of this file.

-- Note: if your database already provides gen_random_uuid(), this is fine.
-- If not, enable the pgcrypto extension (may require privileges):
-- CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create the projects table
CREATE TABLE IF NOT EXISTS public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner uuid,
  name text NOT NULL DEFAULT 'Untitled project',
  description text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Ensure owner column exists (useful if the table was created previously
-- without the owner column). We avoid adding NOT NULL here to keep this
-- migration idempotent and safe for existing rows.
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS owner uuid;
-- Add commonly used app columns for compatibility with existing API and types
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS settings jsonb DEFAULT '{}'::jsonb;

-- Optional: foreign key to auth.users(id). Uncomment if desired and if
-- your environment allows referencing the auth schema.
-- ALTER TABLE public.projects
--   ADD CONSTRAINT projects_owner_fkey FOREIGN KEY (owner)
--   REFERENCES auth.users(id) ON DELETE CASCADE;

-- Index to quickly look up a user's projects
CREATE INDEX IF NOT EXISTS idx_projects_owner ON public.projects(owner);

-- Keep updated_at current on update
CREATE OR REPLACE FUNCTION public.update_timestamp()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create/replace the trigger that keeps updated_at current. PostgreSQL does
-- not support CREATE TRIGGER IF NOT EXISTS, so drop it first if present.
DROP TRIGGER IF EXISTS trg_projects_updated_at ON public.projects;
CREATE TRIGGER trg_projects_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

-- Enable Row Level Security and create policies so each authenticated
-- user can only read/modify their own rows.
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Policy: allow authenticated users to SELECT their own projects
DROP POLICY IF EXISTS projects_select_owner_only ON public.projects;
CREATE POLICY projects_select_owner_only
  ON public.projects
  FOR SELECT
  USING (auth.uid() = owner);

-- Policy: allow authenticated users to INSERT only rows where owner = auth.uid()
DROP POLICY IF EXISTS projects_insert_owner_only ON public.projects;
CREATE POLICY projects_insert_owner_only
  ON public.projects
  FOR INSERT
  WITH CHECK (auth.uid() = owner);

-- Policy: allow authenticated users to UPDATE only their own rows
DROP POLICY IF EXISTS projects_update_owner_only ON public.projects;
CREATE POLICY projects_update_owner_only
  ON public.projects
  FOR UPDATE
  USING (auth.uid() = owner)
  WITH CHECK (auth.uid() = owner);

-- Policy: allow authenticated users to DELETE only their own rows
DROP POLICY IF EXISTS projects_delete_owner_only ON public.projects;
CREATE POLICY projects_delete_owner_only
  ON public.projects
  FOR DELETE
  USING (auth.uid() = owner);

-- -------------------------------
-- Optional privileged section
-- -------------------------------
-- The following function + trigger will auto-create a starter project when
-- a new row is inserted into auth.users. Creating triggers on `auth.users`
-- generally requires DB-owner privileges. If you have DB-owner access, you
-- can run the lines below (uncomment them) and then run the subsequent
-- ALTER FUNCTION ... OWNER TO postgres; step as the DB owner.
--
-- CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
-- RETURNS trigger
-- LANGUAGE plpgsql
-- SECURITY DEFINER
-- AS $$
-- BEGIN
--   INSERT INTO public.projects (owner, name, description, metadata)
--   VALUES (NEW.id, 'Getting started', 'This is your starter project. Edit or delete it.',
--           jsonb_build_object('auto_created', true));
--   RETURN NEW;
-- END;
-- $$;
--
-- -- If desired, set the function owner to the DB owner so it can bypass RLS:
-- -- ALTER FUNCTION public.handle_new_auth_user() OWNER TO postgres;
--
-- -- Create trigger on auth.users (run as DB owner):
-- -- CREATE TRIGGER trg_auth_user_after_insert
-- --   AFTER INSERT ON auth.users
-- --   FOR EACH ROW
-- --   EXECUTE FUNCTION public.handle_new_auth_user();

-- End of create-user-projects.sql