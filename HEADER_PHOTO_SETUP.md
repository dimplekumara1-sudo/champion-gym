# User Profile Photo Header Implementation

## Overview
Implemented a new Header component that displays user profile photos in the header across the application. The header intelligently loads profile photos with the following priority:
1. Google OAuth profile photo (if user logged in via Google)
2. User-uploaded custom profile photo (stored in Supabase)
3. Default placeholder icon (if neither exists)

## Changes Made

### 1. New Header Component (`components/Header.tsx`)
**Features:**
- **Smart Photo Loading**: Checks for Google photo first, then falls back to uploaded photo
- **Photo Upload**: Click the photo area to upload a custom photo if using email/password login
- **Branding**: Displays POWERFLEX logo and "Elite Coach" subtitle
- **Cache Integration**: Uses caching for better performance
- **Responsive Design**: Mobile-optimized header with gradient background

**Key Functionality:**
- Automatically loads Google profile photo from OAuth metadata
- Allows manual photo upload via file input
- Validates file type (images only) and size (max 5MB)
- Updates profile in Supabase and caches the result
- Shows upload indicator badge for non-Google users

### 2. Updated Screens to Use Header
- **Dashboard** - Main home screen
- **ExploreScreen** - Video exploration screen
- **TrainersScreen** - Personal trainers listing
- **StoreScreen** - Gym products marketplace
- **ProfileScreen** - User profile details

## How It Works

### For Google OAuth Users:
1. User logs in with Google account
2. Header automatically pulls photo from Google OAuth metadata
3. No additional setup needed
4. Photo displays in the header immediately

### For Email/Password Users:
1. User sees placeholder icon in header
2. Can click the photo area to upload custom photo
3. Upload indicator (blue badge with + icon) shows availability
4. Photo is stored in Supabase storage and database
5. Photo is cached for performance

## File Structure
```
components/
├── Header.tsx          (NEW - Profile photo header component)
├── StatusBar.tsx
├── BottomNav.tsx

screens/
├── Dashboard.tsx       (UPDATED - uses Header)
├── ExploreScreen.tsx   (UPDATED - uses Header)
├── TrainersScreen.tsx  (UPDATED - uses Header)
├── StoreScreen.tsx     (UPDATED - uses Header)
├── ProfileScreen.tsx   (UPDATED - uses Header)
```

## User Experience Flow

```
Login Success
    ↓
Check for Google Photo
    ├── YES → Display Google photo in header
    └── NO → Check for uploaded photo
        ├── YES → Display uploaded photo in header
        └── NO → Show placeholder + upload indicator
            ↓
        User clicks photo
            ↓
        File upload dialog
            ↓
        Photo stored in Supabase
            ↓
        Photo cached and displayed
```

## Technical Details

### Photo Sources:
1. **Google Photo**: `session.user.user_metadata.avatar_url`
2. **Uploaded Photo**: `profiles.avatar_url` (stored in database)
3. **Cache**: `CACHE_KEYS.PROFILE_DATA` for performance

### Storage:
- Photos uploaded to: `profiles/profile-photos/` bucket in Supabase
- Database: Updated `avatar_url` field in profiles table
- Cache: 15-minute TTL for profile data

### Validation:
- File type: Must be image/* MIME type
- File size: Maximum 5MB
- File naming: `{userId}-{timestamp}.{extension}`

## Benefits
✅ Seamless Google OAuth photo integration  
✅ Custom photo upload for email users  
✅ No additional clicks/setup required  
✅ Cached for performance  
✅ Consistent header across all screens  
✅ Professional appearance with POWERFLEX branding  
✅ TypeScript type-safe implementation  

## Next Steps (Optional Enhancements)
- Add photo crop functionality
- Support for photo filters
- Photo change history/gallery
- Profile photo badges (verified, trainer, etc.)
