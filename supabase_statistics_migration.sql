-- Migration to add user statistics tracking
-- Run this in Supabase SQL Editor

-- Add statistics columns to user_profiles table
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS deepfake_scans_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS posts_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_likes_received INTEGER DEFAULT 0;

-- Create deepfake_scans table to track scan history
CREATE TABLE IF NOT EXISTS public.deepfake_scans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email TEXT NOT NULL,
  scan_result TEXT NOT NULL, -- 'REAL', 'FAKE', 'SUSPECT'
  file_type TEXT NOT NULL, -- 'image', 'video', 'audio'
  risk_score INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.deepfake_scans ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own scans
CREATE POLICY "Users can view own scans"
ON public.deepfake_scans
FOR SELECT
TO authenticated
USING (auth.email() = user_email);

-- Allow users to insert their own scans
CREATE POLICY "Users can insert own scans"
ON public.deepfake_scans
FOR INSERT
TO authenticated
WITH CHECK (auth.email() = user_email);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_deepfake_scans_user_email ON public.deepfake_scans(user_email);
CREATE INDEX IF NOT EXISTS idx_deepfake_scans_created_at ON public.deepfake_scans(created_at DESC);

-- Function to update user statistics after deepfake scan
CREATE OR REPLACE FUNCTION update_deepfake_scan_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Update user_profiles scan count
  INSERT INTO public.user_profiles (email, deepfake_scans_count, updated_at)
  VALUES (NEW.user_email, 1, NOW())
  ON CONFLICT (email)
  DO UPDATE SET 
    deepfake_scans_count = user_profiles.deepfake_scans_count + 1,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-update scan count
DROP TRIGGER IF EXISTS trigger_update_deepfake_scan_count ON public.deepfake_scans;
CREATE TRIGGER trigger_update_deepfake_scan_count
AFTER INSERT ON public.deepfake_scans
FOR EACH ROW
EXECUTE FUNCTION update_deepfake_scan_count();

-- Function to update user statistics after post creation
CREATE OR REPLACE FUNCTION update_post_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Update user_profiles post count
  INSERT INTO public.user_profiles (email, posts_count, updated_at)
  VALUES (NEW.user_email, 1, NOW())
  ON CONFLICT (email)
  DO UPDATE SET 
    posts_count = user_profiles.posts_count + 1,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-update post count
DROP TRIGGER IF EXISTS trigger_update_post_count ON public.community_posts;
CREATE TRIGGER trigger_update_post_count
AFTER INSERT ON public.community_posts
FOR EACH ROW
EXECUTE FUNCTION update_post_count();

-- Function to update user statistics when post is deleted
CREATE OR REPLACE FUNCTION update_post_count_on_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Decrease user_profiles post count
  UPDATE public.user_profiles
  SET 
    posts_count = GREATEST(posts_count - 1, 0),
    updated_at = NOW()
  WHERE email = OLD.user_email;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-update post count on delete
DROP TRIGGER IF EXISTS trigger_update_post_count_on_delete ON public.community_posts;
CREATE TRIGGER trigger_update_post_count_on_delete
AFTER DELETE ON public.community_posts
FOR EACH ROW
EXECUTE FUNCTION update_post_count_on_delete();

-- Function to recalculate total likes for a user
CREATE OR REPLACE FUNCTION recalculate_user_likes(user_email_param TEXT)
RETURNS INTEGER AS $$
DECLARE
  total_likes INTEGER;
BEGIN
  -- Sum all likes from user's posts
  SELECT COALESCE(SUM(likes), 0)
  INTO total_likes
  FROM public.community_posts
  WHERE user_email = user_email_param;
  
  -- Update user_profiles
  UPDATE public.user_profiles
  SET 
    total_likes_received = total_likes,
    updated_at = NOW()
  WHERE email = user_email_param;
  
  RETURN total_likes;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update total likes when post likes change
CREATE OR REPLACE FUNCTION update_total_likes()
RETURNS TRIGGER AS $$
DECLARE
  likes_diff INTEGER;
BEGIN
  -- Calculate the difference in likes
  IF TG_OP = 'UPDATE' THEN
    likes_diff := NEW.likes - OLD.likes;
    
    -- Update user_profiles total likes
    UPDATE public.user_profiles
    SET 
      total_likes_received = total_likes_received + likes_diff,
      updated_at = NOW()
    WHERE email = NEW.user_email;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-update total likes
DROP TRIGGER IF EXISTS trigger_update_total_likes ON public.community_posts;
CREATE TRIGGER trigger_update_total_likes
AFTER UPDATE OF likes ON public.community_posts
FOR EACH ROW
WHEN (OLD.likes IS DISTINCT FROM NEW.likes)
EXECUTE FUNCTION update_total_likes();

-- Initialize statistics for existing users (one-time operation)
-- This will calculate current stats based on existing data
DO $$
DECLARE
  user_record RECORD;
BEGIN
  -- Loop through all unique users who have posted
  FOR user_record IN 
    SELECT DISTINCT user_email 
    FROM public.community_posts
  LOOP
    -- Recalculate their stats
    PERFORM recalculate_user_likes(user_record.user_email);
    
    -- Update post count
    UPDATE public.user_profiles
    SET posts_count = (
      SELECT COUNT(*)
      FROM public.community_posts
      WHERE user_email = user_record.user_email
    )
    WHERE email = user_record.user_email;
  END LOOP;
END $$;

-- Verify migration
SELECT 'Statistics migration completed successfully' AS status;

-- Show example of user statistics
SELECT 
  email,
  deepfake_scans_count,
  posts_count,
  total_likes_received,
  profile_image_url,
  updated_at
FROM public.user_profiles
LIMIT 5;
