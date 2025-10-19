-- ===================================================================
-- CONVERSATION FEEDBACK TABLE
-- ===================================================================
-- This table stores post-survey feedback (thumbs up/down) linked to 
-- completed conversations with proper relationships and constraints.

-- Create the conversation feedback table
CREATE TABLE IF NOT EXISTS conversation_feedback (
  -- Primary key
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Foreign key relationships
  session_id UUID NOT NULL,
  user_uid TEXT NOT NULL,
  
  -- Feedback data
  is_positive BOOLEAN NOT NULL,
  feedback_type TEXT DEFAULT 'thumbs' CHECK (feedback_type IN ('thumbs', 'rating', 'comment')),
  additional_notes TEXT, -- Optional text feedback
  
  -- Timestamps
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Foreign key constraints
  CONSTRAINT fk_feedback_session 
    FOREIGN KEY (session_id) 
    REFERENCES sessions(id) 
    ON DELETE CASCADE,
    
  CONSTRAINT fk_feedback_conversation
    FOREIGN KEY (session_id)
    REFERENCES conversations(session_id)
    ON DELETE CASCADE,
    
  -- Business constraints
  CONSTRAINT unique_feedback_per_session 
    UNIQUE (session_id),
    
  -- Ensure feedback is only for completed conversations
  CONSTRAINT check_feedback_timing
    CHECK (submitted_at >= created_at)
);

-- ===================================================================
-- INDEXES FOR PERFORMANCE
-- ===================================================================

-- Core indexes for foreign key lookups
CREATE INDEX IF NOT EXISTS idx_conversation_feedback_session_id 
  ON conversation_feedback(session_id);
  
CREATE INDEX IF NOT EXISTS idx_conversation_feedback_user_uid 
  ON conversation_feedback(user_uid);

-- Time-based indexes for analytics
CREATE INDEX IF NOT EXISTS idx_conversation_feedback_submitted_at 
  ON conversation_feedback(submitted_at);
  
CREATE INDEX IF NOT EXISTS idx_conversation_feedback_created_at 
  ON conversation_feedback(created_at);

-- Feedback analysis indexes
CREATE INDEX IF NOT EXISTS idx_conversation_feedback_is_positive 
  ON conversation_feedback(is_positive);
  
CREATE INDEX IF NOT EXISTS idx_conversation_feedback_type 
  ON conversation_feedback(feedback_type);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_feedback_user_date 
  ON conversation_feedback(user_uid, submitted_at DESC);
  
CREATE INDEX IF NOT EXISTS idx_feedback_positive_date 
  ON conversation_feedback(is_positive, submitted_at DESC);

-- ===================================================================
-- ROW LEVEL SECURITY (RLS)
-- ===================================================================

-- Enable RLS
ALTER TABLE conversation_feedback ENABLE ROW LEVEL SECURITY;

-- Service role policy (full access)
CREATE POLICY "Service role can manage conversation_feedback" 
  ON conversation_feedback
  FOR ALL 
  USING (auth.role() = 'service_role');

-- Authenticated users can read their own feedback
CREATE POLICY "Users can read own feedback" 
  ON conversation_feedback
  FOR SELECT 
  USING (auth.uid()::text = user_uid);

-- ===================================================================
-- PERMISSIONS
-- ===================================================================

-- Grant permissions to service role
GRANT ALL ON conversation_feedback TO service_role;
GRANT USAGE ON SCHEMA public TO service_role;

-- Grant select permissions to authenticated users for their own data
GRANT SELECT ON conversation_feedback TO authenticated;

-- ===================================================================
-- COMMENTS FOR DOCUMENTATION
-- ===================================================================

COMMENT ON TABLE conversation_feedback IS 
  'Post-survey feedback from users (thumbs up/down, ratings, comments)';

COMMENT ON COLUMN conversation_feedback.session_id IS 
  'References both sessions.id and conversations.session_id';
  
COMMENT ON COLUMN conversation_feedback.user_uid IS 
  'User identifier for easy filtering and analytics';
  
COMMENT ON COLUMN conversation_feedback.is_positive IS 
  'TRUE for positive feedback (thumbs up), FALSE for negative (thumbs down)';
  
COMMENT ON COLUMN conversation_feedback.feedback_type IS 
  'Type of feedback: thumbs, rating, comment - allows for future expansion';
  
COMMENT ON COLUMN conversation_feedback.additional_notes IS 
  'Optional text feedback for detailed user comments';

-- ===================================================================
-- VERIFICATION
-- ===================================================================

-- Verify table creation
SELECT 
  'Conversation feedback table created successfully!' as status,
  COUNT(*) as existing_feedback_count
FROM conversation_feedback;

-- Show table structure
\d+ conversation_feedback;
