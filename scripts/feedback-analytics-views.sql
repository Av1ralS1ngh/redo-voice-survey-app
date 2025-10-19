-- ===================================================================
-- FEEDBACK ANALYTICS VIEWS
-- ===================================================================
-- These views make it easy to analyze feedback with user and session context

-- 1. Complete feedback overview with user details
CREATE OR REPLACE VIEW feedback_overview AS
SELECT 
  cf.id as feedback_id,
  cf.session_id,
  cf.user_uid,
  cf.is_positive,
  cf.feedback_type,
  cf.additional_notes,
  cf.submitted_at,
  
  -- User information
  u.name as user_name,
  u.email as user_email,
  u.created_at as user_created_at,
  
  -- Conversation information  
  c.user_name as conversation_user_name,
  c.status as conversation_status,
  c.started_at as conversation_started_at,
  c.completed_at as conversation_completed_at,
  
  -- Derived fields
  CASE WHEN cf.is_positive THEN 'Positive' ELSE 'Negative' END as feedback_sentiment,
  EXTRACT(EPOCH FROM (c.completed_at - c.started_at))/60 as conversation_duration_minutes,
  EXTRACT(EPOCH FROM (cf.submitted_at - c.completed_at)) as feedback_delay_seconds

FROM conversation_feedback cf
LEFT JOIN users u ON u.uid = cf.user_uid
LEFT JOIN conversations c ON c.session_id = cf.session_id;

-- 2. User feedback summary
CREATE OR REPLACE VIEW user_feedback_summary AS
SELECT 
  cf.user_uid,
  u.name as user_name,
  u.email as user_email,
  
  -- Feedback metrics
  COUNT(*) as total_feedback_given,
  SUM(CASE WHEN cf.is_positive THEN 1 ELSE 0 END) as positive_feedback_count,
  SUM(CASE WHEN NOT cf.is_positive THEN 1 ELSE 0 END) as negative_feedback_count,
  ROUND(AVG(CASE WHEN cf.is_positive THEN 1.0 ELSE 0.0 END) * 100, 1) as satisfaction_percentage,
  
  -- Timing metrics
  MIN(cf.submitted_at) as first_feedback_date,
  MAX(cf.submitted_at) as latest_feedback_date,
  COUNT(DISTINCT cf.session_id) as unique_sessions_with_feedback

FROM conversation_feedback cf
LEFT JOIN users u ON u.uid = cf.user_uid
GROUP BY cf.user_uid, u.name, u.email;

-- 3. Daily feedback trends
CREATE OR REPLACE VIEW daily_feedback_trends AS
SELECT 
  DATE(cf.submitted_at) as feedback_date,
  COUNT(*) as total_feedback,
  SUM(CASE WHEN cf.is_positive THEN 1 ELSE 0 END) as positive_count,
  SUM(CASE WHEN NOT cf.is_positive THEN 1 ELSE 0 END) as negative_count,
  ROUND(AVG(CASE WHEN cf.is_positive THEN 1.0 ELSE 0.0 END) * 100, 1) as daily_satisfaction_percentage,
  COUNT(DISTINCT cf.user_uid) as unique_users_giving_feedback

FROM conversation_feedback cf
GROUP BY DATE(cf.submitted_at)
ORDER BY feedback_date DESC;

-- 4. Recent feedback with context (last 30 days)
CREATE OR REPLACE VIEW recent_feedback_with_context AS
SELECT 
  cf.id,
  cf.session_id,
  cf.user_uid,
  u.name as user_name,
  cf.is_positive,
  cf.submitted_at,
  c.conversation_data->>'turn_count' as conversation_turns,
  c.summary,
  CASE WHEN cf.is_positive THEN '👍' ELSE '👎' END as feedback_emoji,
  EXTRACT(EPOCH FROM (c.completed_at - c.started_at))/60 as duration_minutes

FROM conversation_feedback cf
LEFT JOIN users u ON u.uid = cf.user_uid
LEFT JOIN conversations c ON c.session_id = cf.session_id
WHERE cf.submitted_at >= NOW() - INTERVAL '30 days'
ORDER BY cf.submitted_at DESC;

-- ===================================================================
-- SAMPLE QUERIES
-- ===================================================================

-- Get all feedback with user context
-- SELECT * FROM feedback_overview ORDER BY submitted_at DESC LIMIT 20;

-- Get user satisfaction summary  
-- SELECT * FROM user_feedback_summary ORDER BY satisfaction_percentage DESC;

-- Get daily trends
-- SELECT * FROM daily_feedback_trends ORDER BY feedback_date DESC LIMIT 7;

-- Get recent feedback
-- SELECT * FROM recent_feedback_with_context LIMIT 10;
