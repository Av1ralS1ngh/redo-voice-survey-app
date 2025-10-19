-- Add first_name and last_name columns to users table
-- This script splits the name field into first and last name

-- Step 1: Add new columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT;

-- Step 2: Update existing records to split name into first_name and last_name
-- Only update records where first_name is NULL (newly added column)
UPDATE users 
SET 
  first_name = CASE 
    WHEN name IS NOT NULL AND name != '' THEN 
      CASE 
        WHEN position(' ' in name) > 0 THEN split_part(name, ' ', 1)
        ELSE name
      END
    ELSE NULL
  END,
  last_name = CASE 
    WHEN name IS NOT NULL AND name != '' THEN 
      CASE 
        WHEN position(' ' in name) > 0 THEN substring(name from position(' ' in name) + 1)
        ELSE ''
      END
    ELSE NULL
  END
WHERE first_name IS NULL;

-- Create index for first name searches
CREATE INDEX IF NOT EXISTS idx_users_first_name ON users(first_name);
CREATE INDEX IF NOT EXISTS idx_users_last_name ON users(last_name);

-- Drop and recreate the recipient_list view to include first_name and last_name
DROP VIEW IF EXISTS recipient_list;

CREATE VIEW recipient_list AS
SELECT 
    uid,
    first_name,
    last_name,
    name,
    email,
    full_survey_url,
    tiny_url,
    batch_id,
    uploaded_at,
    created_at
FROM users 
WHERE is_recipient = TRUE
ORDER BY uploaded_at DESC;
