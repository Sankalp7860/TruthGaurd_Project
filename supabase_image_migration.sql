-- Migration to add image support for user profiles and community posts
-- Run this in Supabase SQL Editor

-- Create user_profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_profiles (
  email TEXT PRIMARY KEY,
  profile_image_url TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read profiles
CREATE POLICY "Anyone can view profiles"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (true);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
ON public.user_profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.email() = email);

CREATE POLICY "Users can modify own profile"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (auth.email() = email)
WITH CHECK (auth.email() = email);

-- Add image_url column to community_posts if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'community_posts' 
    AND column_name = 'image_url'
  ) THEN
    ALTER TABLE public.community_posts ADD COLUMN image_url TEXT;
  END IF;
END $$;

-- Add index for user_profiles
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);

-- Verify changes
SELECT 'Migration completed successfully' AS status;
