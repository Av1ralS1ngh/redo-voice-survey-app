-- Update name column to contain only first name
-- This script extracts the first name from the existing name field

-- Update the name column to contain only the first name
UPDATE users 
SET name = CASE 
  WHEN name IS NOT NULL AND name != '' THEN 
    CASE 
      WHEN position(' ' in name) > 0 THEN split_part(name, ' ', 1)
      ELSE name
    END
  ELSE name
END
WHERE name IS NOT NULL AND name != '';

-- Verify the update by showing a few examples
SELECT 
  uid,
  name as first_name_only,
  email,
  created_at
FROM users 
WHERE name IS NOT NULL 
ORDER BY created_at DESC 
LIMIT 5;
