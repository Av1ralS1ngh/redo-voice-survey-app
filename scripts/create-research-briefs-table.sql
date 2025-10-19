-- Migration: create research_briefs table
CREATE TABLE IF NOT EXISTS research_briefs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  interview_id uuid REFERENCES interviews(id) ON DELETE SET NULL,
  content text NOT NULL,
  metadata jsonb,
  version integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Backfill columns if the table already existed without them
ALTER TABLE research_briefs
  ADD COLUMN IF NOT EXISTS metadata jsonb,
  ADD COLUMN IF NOT EXISTS version integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Ensure version has a default value
ALTER TABLE research_briefs
  ALTER COLUMN version SET DEFAULT 1;

-- Helpful lookup indexes
CREATE INDEX IF NOT EXISTS research_briefs_project_idx ON research_briefs(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS research_briefs_interview_idx ON research_briefs(interview_id, created_at DESC);

-- Prevent multiple entries for the same interview
ALTER TABLE research_briefs
  ADD CONSTRAINT research_briefs_unique_interview UNIQUE (interview_id);

-- Update updated_at automatically whenever a row changes
CREATE OR REPLACE FUNCTION set_research_briefs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_research_briefs_updated_at ON research_briefs;
CREATE TRIGGER trigger_set_research_briefs_updated_at
  BEFORE UPDATE ON research_briefs
  FOR EACH ROW
  EXECUTE FUNCTION set_research_briefs_updated_at();
