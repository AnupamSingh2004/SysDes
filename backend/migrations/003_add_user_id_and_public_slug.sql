-- Migration: Add user_id column (alias for owner_id for compatibility)
-- Also adds public_slug column if missing

-- Add user_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'user_id') THEN
        ALTER TABLE projects ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;
        -- Copy data from owner_id to user_id if owner_id exists
        UPDATE projects SET user_id = owner_id WHERE user_id IS NULL AND owner_id IS NOT NULL;
        -- Make user_id NOT NULL after data is copied
        ALTER TABLE projects ALTER COLUMN user_id SET NOT NULL;
    END IF;
END $$;

-- Add public_slug column if it doesn't exist
ALTER TABLE projects ADD COLUMN IF NOT EXISTS public_slug VARCHAR(255) UNIQUE;

-- Create index for user_id if not exists
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);

-- Create index for public_slug if not exists
CREATE INDEX IF NOT EXISTS idx_projects_public_slug ON projects(public_slug);
