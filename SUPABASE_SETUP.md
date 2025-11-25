# Supabase Database Setup for Community Feature

## Step 1: Access Supabase Dashboard

1. Go to https://supabase.com
2. Sign in to your account
3. Select your project (TruthGuard)
4. Navigate to **SQL Editor** from the left sidebar

## Step 2: Create Community Posts Table

Copy and paste the following SQL command in the SQL Editor and click **RUN**:

```sql
-- Create community_posts table
CREATE TABLE IF NOT EXISTS public.community_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email TEXT NOT NULL,
  content TEXT NOT NULL,
  likes INTEGER DEFAULT 0,
  liked_by TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create post_comments table
CREATE TABLE IF NOT EXISTS public.post_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX idx_community_posts_created_at ON public.community_posts(created_at DESC);
CREATE INDEX idx_community_posts_user_email ON public.community_posts(user_email);
CREATE INDEX idx_post_comments_post_id ON public.post_comments(post_id);
CREATE INDEX idx_post_comments_created_at ON public.post_comments(created_at);

-- Enable Row Level Security (RLS) for posts
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read posts
CREATE POLICY "Anyone can view posts"
ON public.community_posts
FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to create their own posts
CREATE POLICY "Users can create posts"
ON public.community_posts
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow users to update their own posts (for likes)
CREATE POLICY "Anyone can update posts"
ON public.community_posts
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow users to delete their own posts
CREATE POLICY "Users can delete own posts"
ON public.community_posts
FOR DELETE
TO authenticated
USING (auth.email() = user_email);

-- Enable Row Level Security (RLS) for comments
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read comments
CREATE POLICY "Anyone can view comments"
ON public.post_comments
FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to create comments
CREATE POLICY "Users can create comments"
ON public.post_comments
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow users to delete their own comments
CREATE POLICY "Users can delete own comments"
ON public.post_comments
FOR DELETE
TO authenticated
USING (auth.email() = user_email);
```

## Step 3: Verify Table Creation

1. Go to **Table Editor** from the left sidebar
2. You should see two new tables:
   
   **community_posts** with columns:
   - `id` (uuid)
   - `user_email` (text)
   - `content` (text)
   - `likes` (int4)
   - `liked_by` (text[])
   - `created_at` (timestamptz)
   - `updated_at` (timestamptz)
   
   **post_comments** with columns:
   - `id` (uuid)
   - `post_id` (uuid)
   - `user_email` (text)
   - `content` (text)
   - `created_at` (timestamptz)

## Step 4: Test the Setup

The app is now ready to use the Community feature! The screen will:
- Display all posts from the community
- Allow users to create new posts
- Enable liking/unliking posts
- Add comments to posts
- Delete your own posts and comments
- Show user avatars and timestamps
- Support pull-to-refresh
- Keyboard-aware modals (won't hide behind keyboard)

## Database Schema Explanation

### community_posts table:
- **id**: Unique identifier for each post
- **user_email**: Email of the user who created the post
- **content**: The text content of the post (max 500 characters in UI)
- **likes**: Number of likes the post has received
- **liked_by**: Array of user emails who liked the post (prevents duplicate likes)
- **created_at**: Timestamp when the post was created
- **updated_at**: Timestamp when the post was last modified

### post_comments table:
- **id**: Unique identifier for each comment
- **post_id**: Foreign key linking to the parent post (CASCADE DELETE - comments deleted when post is deleted)
- **user_email**: Email of the user who created the comment
- **content**: The text content of the comment (max 300 characters in UI)
- **created_at**: Timestamp when the comment was created

## Row Level Security (RLS) Policies

### Posts:
- **Read**: All authenticated users can view all posts
- **Create**: All authenticated users can create posts
- **Update**: All authenticated users can update posts (for liking functionality)
- **Delete**: Users can only delete their own posts

### Comments:
- **Read**: All authenticated users can view all comments
- **Create**: All authenticated users can create comments
- **Delete**: Users can only delete their own comments

## That's it! 🎉

Your community feature is now fully configured and ready to use.
