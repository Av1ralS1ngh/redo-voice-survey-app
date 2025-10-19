-- Add conversation feedback table
CREATE TABLE IF NOT EXISTS conversation_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL,
  user_uid TEXT NOT NULL,
  is_positive BOOLEAN NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Foreign key constraints
  CONSTRAINT fk_feedback_session 
    FOREIGN KEY (session_id) 
    REFERENCES conversations(session_id) 
    ON DELETE CASCADE,
    
  -- Ensure one feedback per session
  CONSTRAINT unique_feedback_per_session 
    UNIQUE (session_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversation_feedback_session_id ON conversation_feedback(session_id);
CREATE INDEX IF NOT EXISTS idx_conversation_feedback_user_uid ON conversation_feedback(user_uid);
CREATE INDEX IF NOT EXISTS idx_conversation_feedback_submitted_at ON conversation_feedback(submitted_at);

-- Add RLS (Row Level Security)
ALTER TABLE conversation_feedback ENABLE ROW LEVEL SECURITY;

-- Allow service role to do anything
CREATE POLICY "Service role can manage conversation_feedback" ON conversation_feedback
FOR ALL USING (auth.role() = 'service_role');

-- Grant permissions
GRANT ALL ON conversation_feedback TO service_role;
GRANT USAGE ON SCHEMA public TO service_role;
