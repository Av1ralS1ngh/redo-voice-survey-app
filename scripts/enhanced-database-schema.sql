-- Enhanced database schema for personalized voice surveys

-- Users table (enhanced)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uid TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Survey sessions with personalization tracking
CREATE TABLE IF NOT EXISTS survey_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_uid TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  user_name TEXT NOT NULL, -- Cached for quick access
  config_id TEXT, -- Hume config ID used for this session
  chat_group_id TEXT, -- Hume chat group ID for conversation continuity
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  personalized_prompt TEXT, -- The actual prompt used (for record keeping)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  session_metadata JSONB DEFAULT '{}' -- Additional session data
);

-- Enhanced responses table with emotion and context data
CREATE TABLE IF NOT EXISTS survey_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES survey_sessions(id) ON DELETE CASCADE,
  user_uid TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'agent')),
  message_text TEXT NOT NULL,
  message_type TEXT, -- user_message, assistant_message, etc.
  emotion_scores JSONB, -- Emotion data from Hume if available
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  turn_number INTEGER NOT NULL,
  message_metadata JSONB DEFAULT '{}' -- Additional message data
);

-- Survey analytics and summaries
CREATE TABLE IF NOT EXISTS survey_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES survey_sessions(id) ON DELETE CASCADE,
  user_uid TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  total_turns INTEGER DEFAULT 0,
  user_messages INTEGER DEFAULT 0,
  agent_messages INTEGER DEFAULT 0,
  session_duration_seconds INTEGER,
  average_response_time_seconds FLOAT,
  dominant_emotions JSONB, -- Summary of emotional patterns
  sentiment_scores JSONB, -- Overall sentiment analysis
  key_topics JSONB, -- Extracted topics/themes
  completion_status TEXT DEFAULT 'incomplete',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_uid ON users(uid);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_sessions_user_uid ON survey_sessions(user_uid);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON survey_sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON survey_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_responses_session_id ON survey_responses(session_id);
CREATE INDEX IF NOT EXISTS idx_responses_user_uid ON survey_responses(user_uid);
CREATE INDEX IF NOT EXISTS idx_responses_timestamp ON survey_responses(timestamp);
CREATE INDEX IF NOT EXISTS idx_responses_turn_number ON survey_responses(turn_number);
CREATE INDEX IF NOT EXISTS idx_analytics_session_id ON survey_analytics(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_user_uid ON survey_analytics(user_uid);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies (allow all for now - customize based on your auth requirements)
CREATE POLICY IF NOT EXISTS "Allow all operations on users" ON users
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Allow all operations on survey_sessions" ON survey_sessions
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Allow all operations on survey_responses" ON survey_responses
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Allow all operations on survey_analytics" ON survey_analytics
  FOR ALL USING (true) WITH CHECK (true);

-- Functions for analytics (optional)
CREATE OR REPLACE FUNCTION calculate_session_analytics(p_session_id UUID)
RETURNS VOID AS $$
DECLARE
  session_data RECORD;
  response_data RECORD;
  start_time TIMESTAMPTZ;
  end_time TIMESTAMPTZ;
  duration_seconds INTEGER;
BEGIN
  -- Get session info
  SELECT * INTO session_data FROM survey_sessions WHERE id = p_session_id;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Calculate metrics from responses
  SELECT 
    COUNT(*) as total_turns,
    COUNT(*) FILTER (WHERE role = 'user') as user_messages,
    COUNT(*) FILTER (WHERE role = 'agent') as agent_messages,
    MIN(timestamp) as first_response,
    MAX(timestamp) as last_response
  INTO response_data
  FROM survey_responses 
  WHERE session_id = p_session_id;

  -- Calculate duration
  start_time := session_data.created_at;
  end_time := COALESCE(session_data.completed_at, response_data.last_response, NOW());
  duration_seconds := EXTRACT(EPOCH FROM (end_time - start_time))::INTEGER;

  -- Insert or update analytics
  INSERT INTO survey_analytics (
    session_id,
    user_uid,
    total_turns,
    user_messages,
    agent_messages,
    session_duration_seconds,
    completion_status
  ) VALUES (
    p_session_id,
    session_data.user_uid,
    response_data.total_turns,
    response_data.user_messages,
    response_data.agent_messages,
    duration_seconds,
    session_data.status
  )
  ON CONFLICT (session_id) 
  DO UPDATE SET
    total_turns = EXCLUDED.total_turns,
    user_messages = EXCLUDED.user_messages,
    agent_messages = EXCLUDED.agent_messages,
    session_duration_seconds = EXCLUDED.session_duration_seconds,
    completion_status = EXCLUDED.completion_status;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically calculate analytics when session is completed
CREATE OR REPLACE FUNCTION trigger_calculate_analytics()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    PERFORM calculate_session_analytics(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER session_completion_analytics
  AFTER UPDATE ON survey_sessions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_calculate_analytics();

-- Sample data for testing (optional)
INSERT INTO users (uid, name, email) VALUES 
  ('test-user-1', 'John Doe', 'john@example.com'),
  ('test-user-2', 'Jane Smith', 'jane@example.com')
ON CONFLICT (uid) DO NOTHING;
