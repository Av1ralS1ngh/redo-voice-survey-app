-- Fix users table schema to match application requirements
-- This script adds the missing 'uid' column and ensures all required fields exist

-- 1. Add 'uid' column if it doesn't exist (this is the user-facing identifier like 'bc820345')
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'uid'
    ) THEN
        ALTER TABLE users ADD COLUMN uid TEXT UNIQUE;
        
        -- Create index for faster lookups
        CREATE INDEX IF NOT EXISTS idx_users_uid ON users(uid);
        
        RAISE NOTICE 'Added uid column to users table';
    ELSE
        RAISE NOTICE 'uid column already exists';
    END IF;
END $$;

-- 2. Add 'name' column if it doesn't exist (for display purposes)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'name'
    ) THEN
        ALTER TABLE users ADD COLUMN name TEXT;
        RAISE NOTICE 'Added name column to users table';
    ELSE
        RAISE NOTICE 'name column already exists';
    END IF;
END $$;

-- 3. Ensure email column exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'email'
    ) THEN
        ALTER TABLE users ADD COLUMN email TEXT;
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        RAISE NOTICE 'Added email column to users table';
    ELSE
        RAISE NOTICE 'email column already exists';
    END IF;
END $$;

-- 4. Update existing users to have uid based on their id or create from existing data
-- If users have data in 'full_name', copy it to 'name'
UPDATE users 
SET name = full_name 
WHERE name IS NULL AND full_name IS NOT NULL;

-- 5. Display final schema
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- 6. Show sample data
SELECT * FROM users LIMIT 3;
