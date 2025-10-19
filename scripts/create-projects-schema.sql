-- Create projects and interviews database schema
-- This script creates tables for the Projects page functionality

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('custom', 'nps', 'lost_deals', 'won_deals', 'churn', 'renewal', 'product_feedback')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'draft')),
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Interviews table
CREATE TABLE IF NOT EXISTS interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('nps', 'won_deals', 'lost_deals', 'churn', 'renewal', 'product_feedback', 'custom')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'archived')),
  questions JSONB DEFAULT '[]',
  response_count INTEGER DEFAULT 0,
  target_response_count INTEGER DEFAULT 10,
  share_url TEXT UNIQUE,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_category ON projects(category);
CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON projects(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_interviews_project_id ON interviews(project_id);
CREATE INDEX IF NOT EXISTS idx_interviews_status ON interviews(status);
CREATE INDEX IF NOT EXISTS idx_interviews_category ON interviews(category);
CREATE INDEX IF NOT EXISTS idx_interviews_share_url ON interviews(share_url);
CREATE INDEX IF NOT EXISTS idx_interviews_updated_at ON interviews(updated_at DESC);

-- Enable RLS on tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for projects (drop first if exists)
DROP POLICY IF EXISTS "projects_policy" ON projects;
CREATE POLICY "projects_policy" 
  ON projects 
  FOR ALL 
  USING (auth.uid()::text = user_id) 
  WITH CHECK (auth.uid()::text = user_id);

-- Create RLS policies for interviews (drop first if exists)
DROP POLICY IF EXISTS "interviews_policy" ON interviews;
CREATE POLICY "interviews_policy" 
  ON interviews 
  FOR ALL 
  USING (
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

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to automatically update updated_at
CREATE TRIGGER update_projects_updated_at 
  BEFORE UPDATE ON projects 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_interviews_updated_at 
  BEFORE UPDATE ON interviews 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Sample data for testing
INSERT INTO projects (user_id, name, description, category, status) VALUES
  ('bc820345', 'Customer Feedback Collection', 'Gathering insights from our recent product launch', 'custom', 'active'),
  ('bc820345', 'NPS Survey Campaign', 'Monthly Net Promoter Score tracking', 'nps', 'active'),
  ('bc820345', 'Lost Deal Analysis', 'Understanding why deals fall through', 'lost_deals', 'active')
ON CONFLICT DO NOTHING;

-- Get project IDs for sample interviews
DO $$
DECLARE
    customer_feedback_id UUID;
    nps_campaign_id UUID;
    lost_deal_id UUID;
BEGIN
    SELECT id INTO customer_feedback_id FROM projects WHERE name = 'Customer Feedback Collection' AND user_id = 'bc820345' LIMIT 1;
    SELECT id INTO nps_campaign_id FROM projects WHERE name = 'NPS Survey Campaign' AND user_id = 'bc820345' LIMIT 1;
    SELECT id INTO lost_deal_id FROM projects WHERE name = 'Lost Deal Analysis' AND user_id = 'bc820345' LIMIT 1;

    -- Insert sample interviews if project IDs were found
    IF customer_feedback_id IS NOT NULL THEN
        INSERT INTO interviews (project_id, name, description, category, status, response_count, target_response_count, share_url, is_public) VALUES
          (customer_feedback_id, 'Product Launch Feedback', 'Collect feedback on our new feature release', 'custom', 'active', 15, 50, '/interview/product-launch-feedback', TRUE),
          (customer_feedback_id, 'Onboarding Experience', 'How was your onboarding experience?', 'custom', 'draft', 0, 25, '/interview/onboarding-experience', FALSE)
        ON CONFLICT (share_url) DO NOTHING;
    END IF;

    IF nps_campaign_id IS NOT NULL THEN
        INSERT INTO interviews (project_id, name, description, category, status, response_count, target_response_count, share_url, is_public) VALUES
          (nps_campaign_id, 'Monthly NPS Check', 'How likely are you to recommend us?', 'nps', 'active', 42, 100, '/interview/monthly-nps', TRUE)
        ON CONFLICT (share_url) DO NOTHING;
    END IF;

    IF lost_deal_id IS NOT NULL THEN
        INSERT INTO interviews (project_id, name, description, category, status, response_count, target_response_count, share_url, is_public) VALUES
          (lost_deal_id, 'Deal Exit Interview', 'Understanding decision factors', 'lost_deals', 'active', 8, 20, '/interview/deal-exit', FALSE)
        ON CONFLICT (share_url) DO NOTHING;
    END IF;
END $$;

-- Add helpful comments
COMMENT ON TABLE projects IS 'Projects organize related interviews and provide high-level categorization';
COMMENT ON TABLE interviews IS 'Individual interview instances within projects that collect user responses';

COMMENT ON COLUMN projects.category IS 'Project category for grouping and filtering: custom, nps, lost_deals, won_deals, churn, renewal';
COMMENT ON COLUMN projects.settings IS 'JSONB field for additional project configuration and preferences';

COMMENT ON COLUMN interviews.questions IS 'JSONB array of interview questions and configuration';
COMMENT ON COLUMN interviews.share_url IS 'Unique URL path for sharing the interview publicly';
COMMENT ON COLUMN interviews.response_count IS 'Current number of completed responses';
COMMENT ON COLUMN interviews.target_response_count IS 'Goal number of responses for this interview';
