# Image Upload Setup Guide

This guide will help you set up image upload functionality using Cloudinary for user profiles and community posts.

## Prerequisites

- Cloudinary account (already configured with cloud name: `dhvo3gnuz`)
- Supabase project with database access
- React Native app with expo-image-picker installed

## Step 1: Configure Environment Variables

1. Copy `.env.example` to `.env` if you haven't already:
   ```bash
   cp .env.example .env
   ```

2. Add/update these Cloudinary variables in your `.env` file:
   ```
   EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME=dhvo3gnuz
   EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET=ml_default
   ```

3. Verify your Cloudinary upload preset:
   - Go to https://cloudinary.com/console
   - Navigate to Settings → Upload
   - Find or create an upload preset named `ml_default`
   - Make sure it's set to "unsigned" mode
   - Recommended settings:
     - Folder: `trustlens` (optional)
     - Allowed formats: jpg, png, gif, webp
     - Max file size: 10 MB
     - Auto tagging: enabled

## Step 2: Update Supabase Database

1. Open your Supabase project at https://supabase.com
2. Go to SQL Editor
3. Run the migration script from `supabase_image_migration.sql`:
   ```sql
   -- Copy and paste contents of supabase_image_migration.sql
   ```

4. Verify the changes in Table Editor:
   - `user_profiles` table should exist with columns:
     - `email` (TEXT, PRIMARY KEY)
     - `profile_image_url` (TEXT)
     - `updated_at` (TIMESTAMP)
   
   - `community_posts` table should have new column:
     - `image_url` (TEXT)

## Step 3: Test Image Upload Flow

### Profile Picture Upload

1. Open the app and navigate to Profile screen
2. Tap the camera icon on the avatar
3. Select an image from your device
4. The image should:
   - Upload to Cloudinary (you'll see a loading indicator)
   - Store the URL in Supabase `user_profiles` table
   - Display as your profile picture

### Community Post with Image

1. Navigate to Community screen
2. Tap the "+" button to create a post
3. Enter some text content
4. Tap "Add Image" button
5. Select an image from your device
6. You should see the image preview with an X button to remove it
7. Tap "Post" to publish
8. The post should:
   - Upload image to Cloudinary
   - Store the URL in `community_posts.image_url`
   - Display in the feed with the image

## Step 4: Verify Cloudinary Dashboard

1. Go to https://cloudinary.com/console
2. Navigate to Media Library
3. You should see uploaded images with:
   - Public IDs
   - Secure HTTPS URLs
   - Upload timestamps

## Image Flow Architecture

```
User selects image
       ↓
expo-image-picker returns local URI
       ↓
uploadToCloudinary(imageUri) [/lib/cloudinary.ts]
       ↓
FormData posted to Cloudinary API
       ↓
Returns { url, secure_url, public_id }
       ↓
secure_url stored in Supabase
       ↓
Image displayed using <Image source={{ uri: imageUrl }} />
```

## Troubleshooting

### Image Not Uploading

1. Check environment variables are loaded:
   ```typescript
   console.log(process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME);
   ```

2. Verify Cloudinary upload preset is unsigned

3. Check network requests in Expo dev tools

### Image Not Displaying

1. Verify URL is HTTPS (secure_url)
2. Check Supabase table has the URL saved
3. Verify Image component has correct styling

### Database Errors

1. Ensure RLS policies allow authenticated users
2. Check user is properly authenticated
3. Verify table columns exist with correct names

## Image Permissions

The app requires camera roll permissions:

- **iOS**: Automatically requested by expo-image-picker
- **Android**: Automatically requested by expo-image-picker

If permissions are denied, the user will see an alert.

## Performance Optimization

- Images are compressed before upload (quality: 0.7)
- Aspect ratio maintained (16:9 for posts)
- Max dimensions enforced by expo-image-picker
- Cloudinary auto-optimization enabled

## Security Notes

- Upload preset is unsigned (no authentication required)
- Consider enabling moderation in Cloudinary dashboard
- URLs are public but not guessable
- RLS policies protect database operations
- Only authenticated users can upload

## Next Steps

After successful setup:
1. Test on both iOS and Android
2. Configure Cloudinary transformations for thumbnails
3. Add image compression settings
4. Implement image deletion (optional)
5. Add multiple image support (optional)

For support, check:
- Cloudinary docs: https://cloudinary.com/documentation
- expo-image-picker: https://docs.expo.dev/versions/latest/sdk/imagepicker/
- Supabase storage: https://supabase.com/docs/guides/storage
