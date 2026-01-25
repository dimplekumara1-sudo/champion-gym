# Quick Deployment Guide - Explore Management

## 🚀 Ready to Deploy

Your Explore Management system is complete and ready for use. Follow these simple steps:

## Step 1: Deploy Database Migration

**In Supabase Dashboard:**

1. Go to **SQL Editor**
2. Click **New Query**
3. Copy and paste the contents of `migration_explore_videos.sql`
4. Click **Run**
5. Verify success - you should see:
   - ✅ Table `explore_videos` created
   - ✅ 5 indexes created
   - ✅ RLS policies enabled

**Or via CLI:**
```bash
supabase db push
```

## Step 2: Verify Implementation

✅ **Types**: `AppScreen` type includes `'ADMIN_EXPLORE'`
✅ **Routing**: `App.tsx` imports AdminExplore and has route
✅ **Navigation**: AdminDashboard has Explore Content button
✅ **Component**: AdminExplore.tsx fully implemented (600+ lines)

## Step 3: Test in App

1. **Login as Admin**
2. **Go to Admin Dashboard**
3. **Click "Explore Content"** - Should navigate to AdminExplore page
4. **Test Each Tab:**
   - **Categories Tab**: View/Add/Edit categories
   - **Videos Tab**: Add a sample video
   - **Featured Tab**: Mark video as featured, verify it appears

## Step 4: Create Sample Content

### Sample Video to Add:

**Tab: Videos**
- Title: `Beginner Yoga Flexibility`
- Description: `A 20-minute yoga session focused on flexibility and breathing exercises`
- Video URL: `https://youtube.com/watch?v=dQw4w9WgXcQ`
- Thumbnail URL: `https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg`
- Type: `Yoga`
- Difficulty: `Beginner`
- Duration: `20`
- Badges: `New, Popular`
- Premium: Unchecked
- Featured: Checked

Click **Save** → Should appear in Videos list and Featured tab

## Step 5: Optional - User-Facing Integration

To show videos to users, update `ExploreScreen.tsx`:

```typescript
// Fetch featured videos
const { data: featuredVideos } = await supabase
  .from('explore_videos')
  .select('*')
  .eq('is_featured', true)
  .order('created_at', { ascending: false });

// Filter by type
const { data: yogaVideos } = await supabase
  .from('explore_videos')
  .select('*')
  .eq('type', 'yoga')
  .limit(10);
```

Display in card grid with:
- Thumbnail image
- Type badge (colored)
- Title & description
- Badges (New, Popular, etc)
- Duration & difficulty
- Premium badge if applicable
- Click to play video modal

## 📋 Feature Checklist

### Admin Features (Live):
- ✅ Manage categories
- ✅ Add/edit/delete videos
- ✅ Set video metadata (type, difficulty, duration, badges)
- ✅ Mark videos as featured/premium
- ✅ View featured content curation
- ✅ Real-time updates

### User Features (Ready to Implement):
- ⏳ View featured videos
- ⏳ Filter by video type (yoga, weight-loss, tips, strength, lesson, training)
- ⏳ Watch video with iframe player
- ⏳ See badges and metadata
- ⏳ Premium content gating

## 🎨 Video Types with Icons & Colors

| Type | Icon | Color | Category |
|------|------|-------|----------|
| Yoga | 🧘 | Purple | Flexibility & mindfulness |
| Weight Loss | 📉 | Orange | Weight management |
| Tips | 💡 | Blue | Fitness tips & tricks |
| Strength | 💪 | Red | Strength training |
| Lesson | 📚 | Green | Educational modules |
| Training | 🏋️ | Indigo | General workouts |

## 🏷️ Badge System

Badges are comma-separated strings that display as individual tags.

**Examples:**
- `New, Popular` → Shows "New" and "Popular" badges
- `Trending, Hot` → Shows "Trending" and "Hot" badges
- `Beginner Friendly` → Shows single badge
- Can use any custom text

## 🔐 Security

Database RLS policies automatically:
- Allow **all users** to view explore videos
- Allow **only admins** to create/edit/delete
- Automatically filtered based on role

## 📊 Database Stats

After deployment, you'll have:
- `explore_videos` table with video content
- 5 performance indexes
- RLS policies for security
- Automatic timestamps (created_at, updated_at)

## ⚠️ Important Notes

1. **YouTube URL Format**: Both formats work:
   - `https://youtube.com/watch?v=VIDEO_ID`
   - `https://youtu.be/VIDEO_ID`

2. **Badges Input**: Use comma-separated format in modal
   - Input: `New, Popular, Trending`
   - Stored: `["New", "Popular", "Trending"]`

3. **Featured Content**: Star button toggles featured status
   - Featured videos appear in Featured tab
   - Used for homepage promotion

4. **Category Assignment**: Optional field
   - Videos can exist without category
   - Useful for grouping by type (yoga, training, etc)

## 🐛 Troubleshooting

**Videos not saving:**
- Check network tab for API errors
- Verify auth token is valid
- Ensure RLS policies are applied

**Can't access AdminExplore:**
- Verify user role is 'admin' in profiles table
- Clear browser cache and reload
- Check types.ts includes 'ADMIN_EXPLORE'

**Images not loading:**
- Use full HTTPS URLs for thumbnails
- Test URL in browser directly
- YouTube thumbnails: `https://img.youtube.com/vi/VIDEO_ID/maxresdefault.jpg`

## 📞 Support

All files are properly integrated and ready to use. If you need to:
- Add more video types: Edit the type validation in AdminExplore.tsx
- Change colors: Update getVideoTypeBadgeColor() function
- Add more metadata: Add columns to explore_videos table migration

---

**Status**: 🚀 Ready for Production
**Last Updated**: Today
**Version**: 1.0
