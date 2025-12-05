# User Statistics Feature - Setup Guide

## Overview
Added comprehensive user statistics tracking to the profile screen:
- **Deepfake Scans**: Number of deepfake detection scans performed
- **Posts Created**: Number of community posts uploaded
- **Likes Received**: Total likes across all user's posts

## What Was Added

### 1. Database Changes (`supabase_statistics_migration.sql`)

**New Columns in `user_profiles` table:**
- `deepfake_scans_count` (INTEGER) - Total number of scans
- `posts_count` (INTEGER) - Total number of posts
- `total_likes_received` (INTEGER) - Total likes from all posts

**New Table: `deepfake_scans`**
- Tracks every deepfake scan with:
  - `user_email` - Who performed the scan
  - `scan_result` - REAL, FAKE, or SUSPECT
  - `file_type` - image, video, or audio
  - `risk_score` - 0-100 confidence score
  - `created_at` - Timestamp

**Database Triggers (Auto-Updates):**
1. **After deepfake scan**: Increments `deepfake_scans_count`
2. **After post creation**: Increments `posts_count`
3. **After post deletion**: Decrements `posts_count`
4. **After like update**: Updates `total_likes_received`

### 2. New Files Created

**`/lib/statistics.ts`**
- `trackDeepfakeScan()` - Log a deepfake scan
- `getUserScanHistory()` - Get scan history
- `getUserStatistics()` - Fetch user stats

### 3. Updated Files

**`/app/(protected)/profile.tsx`**
- Added statistics display section with 3 cards
- Shows Deepfake Scans, Posts Created, Likes Received
- Beautiful card layout with icons
- Auto-refreshes on profile load

**`/app/(protected)/deepfake.tsx`**
- Automatically tracks each scan in database
- Records result (REAL/FAKE/SUSPECT)
- Records file type (image/video)
- Records risk score
- Silent tracking - doesn't interrupt user flow

## Setup Steps

### Step 1: Run Database Migration

1. Open Supabase dashboard: https://supabase.com
2. Go to SQL Editor
3. Copy and run contents of `supabase_statistics_migration.sql`
4. This will:
   - Add new columns to user_profiles
   - Create deepfake_scans table
   - Set up triggers for auto-updates
   - Initialize stats for existing users

### Step 2: Restart Expo Server

```bash
# Stop current server (Ctrl+C)
# Clear cache and restart
npx expo start --clear
```

### Step 3: Test the Features

#### Test Profile Statistics Display
1. Open app and navigate to Profile screen
2. You should see a "My Statistics" section with 3 cards:
   - Deepfake Scans (with shield icon)
   - Posts Created (with message icon)
   - Likes Received (with heart emoji)
3. Initially all will show 0

#### Test Deepfake Scan Tracking
1. Navigate to Deepfake Detection screen
2. Upload an image or video
3. Run the analysis
4. After completion, go back to Profile
5. "Deepfake Scans" count should increase by 1

#### Test Post Count
1. Navigate to Community screen
2. Create a new post with some content
3. Publish the post
4. Go to Profile screen
5. "Posts Created" count should increase by 1

#### Test Likes Count
1. Have another user like your post
2. Go to Profile screen
3. "Likes Received" count should increase by 1

## How It Works

### Automatic Tracking Flow

```
User performs action (scan/post/like)
          ↓
Action recorded in database
          ↓
Database trigger fires automatically
          ↓
user_profiles statistics updated
          ↓
Profile screen shows updated count
```

### Deepfake Scan Tracking

```
User analyzes media in Deepfake screen
          ↓
detectDeepfake() completes successfully
          ↓
trackDeepfakeScan() called
          ↓
Insert into deepfake_scans table
          ↓
Trigger updates user_profiles.deepfake_scans_count
          ↓
Count increments by 1
```

### Post Count Tracking

```
User creates post in Community screen
          ↓
Insert into community_posts table
          ↓
Trigger updates user_profiles.posts_count
          ↓
Count increments by 1
```

### Likes Tracking

```
User likes a post
          ↓
Update community_posts.likes column
          ↓
Trigger calculates likes difference
          ↓
Update post author's total_likes_received
          ↓
Count updates automatically
```

## UI Design

### Statistics Cards
- **Layout**: 3 equal-width cards in a row
- **Background**: White with subtle shadow
- **Icons**: Colored circular backgrounds
- **Values**: Large, bold numbers
- **Labels**: Small gray text below

### Card Details
1. **Deepfake Scans**
   - Icon: Shield (blue)
   - Shows total scans performed

2. **Posts Created**
   - Icon: MessageSquare (purple)
   - Shows total posts uploaded

3. **Likes Received**
   - Icon: Heart emoji ❤️
   - Shows sum of likes from all posts

## Database Schema

### user_profiles Table
```sql
email TEXT PRIMARY KEY
profile_image_url TEXT
deepfake_scans_count INTEGER DEFAULT 0
posts_count INTEGER DEFAULT 0
total_likes_received INTEGER DEFAULT 0
updated_at TIMESTAMP
```

### deepfake_scans Table
```sql
id UUID PRIMARY KEY
user_email TEXT NOT NULL
scan_result TEXT NOT NULL
file_type TEXT NOT NULL
risk_score INTEGER DEFAULT 0
created_at TIMESTAMP
```

### Indexes Created
- `idx_deepfake_scans_user_email` - Fast user scan lookups
- `idx_deepfake_scans_created_at` - Ordered scan history

## Features Implemented

### ✅ Real-time Statistics
- Counts update immediately after actions
- No manual refresh needed
- Database triggers handle updates

### ✅ Persistent Storage
- All statistics stored in Supabase
- Survives app restarts
- Synced across devices

### ✅ Historical Tracking
- `deepfake_scans` table keeps full scan history
- Can view past scans (feature ready for future UI)
- Useful for analytics and debugging

### ✅ Error Handling
- Graceful fallbacks if tracking fails
- Doesn't break main app flow
- Logs errors for debugging

### ✅ Performance Optimized
- Database triggers (no API calls)
- Efficient queries with indexes
- Single query loads all stats

## Verification

### Check Database Directly

```sql
-- View user statistics
SELECT 
  email,
  deepfake_scans_count,
  posts_count,
  total_likes_received
FROM user_profiles;

-- View recent scans
SELECT *
FROM deepfake_scans
ORDER BY created_at DESC
LIMIT 10;

-- Verify triggers are working
SELECT trigger_name, event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public';
```

### Check in App

1. Profile screen shows statistics section
2. Numbers update after performing actions
3. No errors in Expo dev console
4. Smooth UI with no delays

## Troubleshooting

### Statistics Not Updating

**Issue**: Counts remain at 0 after actions
- ✅ Solution: Run migration SQL in Supabase
- Check triggers exist: `\d+ user_profiles` in SQL editor
- Verify user_profiles table has new columns

### Error: Column Does Not Exist

**Issue**: `deepfake_scans_count does not exist`
- ✅ Solution: Run migration SQL completely
- Check column exists: `SELECT * FROM user_profiles LIMIT 1`

### Error: Table Does Not Exist

**Issue**: `relation "deepfake_scans" does not exist`
- ✅ Solution: Run migration SQL to create table
- Verify: `SELECT * FROM deepfake_scans LIMIT 1`

### Statistics Not Visible in Profile

**Issue**: No statistics section shown
- ✅ Solution: Restart Expo with `--clear` flag
- Check console for fetch errors
- Verify user is authenticated

### Likes Count Not Updating

**Issue**: Likes received stays at 0
- ✅ Solution: Like a post and check community_posts
- Verify trigger: `trigger_update_total_likes`
- Manually recalculate: `SELECT recalculate_user_likes('user@email.com')`

## Future Enhancements (Optional)

- [ ] Scan history view (list of past scans)
- [ ] Statistics graphs/charts
- [ ] Weekly/monthly stats comparison
- [ ] Achievement badges based on stats
- [ ] Leaderboard (most scans/posts/likes)
- [ ] Export statistics as PDF
- [ ] Share statistics on social media

## Security & Privacy

### Row Level Security (RLS)
- ✅ Users can only view their own scans
- ✅ Users can only insert their own scans
- ✅ Statistics are public (visible to all authenticated users)

### Data Retention
- Scan history stored indefinitely
- Can add auto-deletion policy (e.g., delete scans older than 1 year)
- Statistics persist even if scan history deleted

## Testing Checklist

- [ ] Run migration SQL successfully
- [ ] Profile screen shows statistics section
- [ ] All 3 statistics cards display correctly
- [ ] Perform deepfake scan → count increases
- [ ] Create community post → count increases
- [ ] Delete post → count decreases
- [ ] Receive like on post → count increases
- [ ] Statistics persist after app restart
- [ ] No TypeScript errors
- [ ] No runtime errors in console

---

**Status**: ✅ COMPLETE - Ready for testing
**Migration File**: `supabase_statistics_migration.sql`
**Files Modified**: 3 (profile.tsx, deepfake.tsx, statistics.ts)
