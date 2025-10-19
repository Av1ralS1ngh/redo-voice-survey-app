-- Add recipient management columns to users table
-- This script adds columns for managing survey recipients

-- Add new columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS full_survey_url TEXT,
ADD COLUMN IF NOT EXISTS tiny_url TEXT,
ADD COLUMN IF NOT EXISTS is_recipient BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMP DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS batch_id UUID DEFAULT gen_random_uuid();

-- Create index for batch management
CREATE INDEX IF NOT EXISTS idx_users_batch_id ON users(batch_id);
CREATE INDEX IF NOT EXISTS idx_users_is_recipient ON users(is_recipient);

-- Create a view for recipient management
CREATE OR REPLACE VIEW recipient_list AS
SELECT 
    uid,
    email,
    full_survey_url,
    tiny_url,
    batch_id,
    uploaded_at,
    created_at
FROM users 
WHERE is_recipient = TRUE
ORDER BY uploaded_at DESC;

-- Add RLS policy for recipient data
DROP POLICY IF EXISTS "Allow authenticated users to manage recipients" ON users;
CREATE POLICY "Allow authenticated users to manage recipients" ON users
FOR ALL TO authenticated
USING (true);

-- Grant permissions
GRANT SELECT ON recipient_list TO authenticated;
