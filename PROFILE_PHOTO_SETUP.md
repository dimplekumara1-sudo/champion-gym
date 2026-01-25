# Profile Photo Upload - Setup Guide

## 🚨 Issue Fixed

The error **"Bucket not found"** occurs because the Supabase Storage bucket for profile photos doesn't exist yet. I've also fixed the React warning about empty image src attributes.

## ✅ What Was Fixed

### ProfileScreen.tsx
- Changed `profilePhoto` state from empty string to `null`
- Now uses conditional rendering instead of passing empty string to `src`
- Shows a default avatar icon when no photo is uploaded
- Properly handles missing/null photo URLs

### New Migration File
- Created `fix5_storage_setup.sql` with RLS policies for storage bucket
- Sets up proper access controls for profile photos
- Adds `avatar_url` column to profiles table
- Creates indexes for performance

## 📋 Setup Steps

### Step 1: Create Storage Bucket in Supabase Dashboard

1. Go to **Supabase Dashboard**
2. Select your project
3. Go to **Storage** (left sidebar)
4. Click **Create New Bucket**
5. Name it: `profiles`
6. Set **Access Control** to: **Public**
7. Click **Create Bucket**

**Result:**
- Bucket name: `profiles`
- Visibility: Public (anyone can read files)
- Auto-generated: public folder for storage

### Step 2: Run SQL Migration

**In Supabase SQL Editor:**

1. Go to **SQL Editor**
2. Click **New Query**
3. Copy contents of `fix5_storage_setup.sql`
4. Click **Run**

**What it does:**
- Sets up RLS (Row Level Security) policies
- Users can upload to their own folder
- All users can view profile photos (public read)
- Only bucket owner can modify/delete their own photos
- Adds `avatar_url` column to profiles table
- Creates index for faster queries

### Step 3: Test Profile Photo Upload

1. **Login as a user**
2. Go to **Profile** screen
3. Click the **edit** button on the profile photo
4. Select an image file (JPG, PNG, WebP, etc.)
5. ✅ Photo uploads and displays immediately

## 🔒 Storage Security

The setup creates this permission model:

| Action | Authenticated Users | Anonymous Users |
|--------|-------------------|-----------------|
| Upload | ✅ Own photos only | ❌ No |
| View | ✅ All photos | ✅ All photos |
| Update | ✅ Own photos only | ❌ No |
| Delete | ✅ Own photos only | ❌ No |

## 🎯 File Organization

Uploaded photos are stored as:
```
profiles/
  └── profile-photos/
      ├── user-id-1234567890.jpg
      ├── user-id-1234567891.png
      └── user-id-1234567892.jpg
```

Each file is named: `{userId}-{timestamp}.{extension}`

## 💾 Photo URLs

Public URLs are automatically generated:
```
https://your-project.supabase.co/storage/v1/object/public/profiles/profile-photos/user-id-timestamp.jpg
```

These URLs are stored in `profiles.avatar_url` and displayed on profile screen.

## ⚠️ Troubleshooting

### "Bucket not found" Error
- **Cause**: Storage bucket "profiles" doesn't exist
- **Fix**: Create bucket in Supabase Dashboard (Step 1 above)

### Empty string image warning
- **Fixed**: ProfileScreen now uses null instead of empty string
- **Result**: Default avatar icon shows when no photo uploaded

### File upload fails
1. Check bucket exists and is PUBLIC
2. Verify file size < 5MB
3. Check file is valid image format
4. Ensure user is authenticated

### Photo doesn't display
1. Check `profiles.avatar_url` has correct URL
2. Verify public bucket policies are enabled
3. Try refreshing page
4. Check browser console for network errors

## 📊 Database Changes

```sql
-- New column added to profiles table
ALTER TABLE profiles ADD COLUMN avatar_url TEXT;

-- Index for faster lookups
CREATE INDEX idx_profiles_avatar_url ON profiles(avatar_url);
```

## 🔗 Related Files

- **ProfileScreen.tsx** - Upload UI and form handling
- **fix5_storage_setup.sql** - RLS policies and database schema
- **Supabase Storage** - File storage backend

## ✨ Features

✅ Click edit button to upload photo
✅ Automatic file validation (type, size)
✅ Stores in cloud (Supabase Storage)
✅ Updates profile database
✅ Public view for all users
✅ Shows default avatar if no photo
✅ Security: Only owner can modify their photo
✅ Loading state during upload
✅ Error handling with alerts

## 🚀 Next Steps

1. Create "profiles" bucket in Supabase
2. Run `fix5_storage_setup.sql` in SQL Editor
3. Test by uploading a profile photo
4. Photo will appear on profile screen

---

**Status**: ✅ Ready to Deploy
**Estimated Time**: 5 minutes
**Difficulty**: Easy
