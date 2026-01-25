# Header Profile Photo - Quick Reference

## Component Structure

```tsx
<Header onProfileClick={() => onNavigate('PROFILE')} />
```

## Visual Layout

```
┌─────────────────────────────────────────────────┐
│  [Gym Icon] POWERFLEX              [Photo Btn]  │
│              Elite Coach                        │
└─────────────────────────────────────────────────┘
```

## Photo Display States

### 1. Google OAuth Photo Loaded
```
  [Google Photo]
  - Auto-loaded
  - Bordered with primary color
  - Click navigates to profile
  - No upload indicator
```

### 2. Custom Uploaded Photo
```
  [Custom Photo]
  - From Supabase storage
  - Bordered with primary color
  - Click navigates to profile
  - No upload indicator
```

### 3. No Photo (Default State)
```
  [Account Icon]
  - Blue "+" badge in bottom-right
  - Click opens file picker
  - Allows upload
```

### 4. Uploading State
```
  [Photo with overlay]
  - Badge shows cloud_upload icon
  - Button disabled
  - Shows progress
```

## Props

| Prop | Type | Required | Purpose |
|------|------|----------|---------|
| `onProfileClick` | `() => void` | Yes | Navigate to profile when photo clicked |

## Integration Example

```tsx
// In any screen file
import Header from '../components/Header';

const MyScreen: React.FC<{ onNavigate }> = ({ onNavigate }) => {
  return (
    <div className="min-h-screen">
      <StatusBar />
      <Header onProfileClick={() => onNavigate('PROFILE')} />
      {/* Rest of screen content */}
    </div>
  );
};
```

## Photo Priority Logic

```typescript
1. Check user.user_metadata.avatar_url (Google OAuth)
   ↓ (if exists)
   Return and set as profile photo
   
2. Check cached profile data
   ↓ (if exists and has avatar_url)
   Return and set as profile photo
   
3. Fetch from database profiles table
   ↓ (if exists in avatar_url field)
   Update cache and set as profile photo
   
4. Display placeholder icon
   ↓ (if nothing found)
   Allow user to upload
```

## Cache Keys Used

- `CACHE_KEYS.PROFILE_DATA` - Full profile data with avatar_url
- Cache TTL: 15 minutes (CACHE_TTL.LONG)

## Storage Paths

- Bucket: `profiles`
- Folder: `profile-photos/`
- File format: `{userId}-{timestamp}.{extension}`
- Max size: 5MB
- Accepted types: image/*

## Upload Trigger Points

1. **Header Component** (initial/manual):
   - File picker opens
   - User selects image
   - Uploaded to Supabase storage
   - Database updated with public URL
   - Cache invalidated and updated
   - Photo displayed immediately

2. **Profile Screen** (existing functionality):
   - Still available for users who navigate to profile
   - Separate upload button with edit icon
   - Same storage and validation

## Styling Classes

```tsx
// Header container
"px-6 py-4 flex items-center justify-between bg-gradient-to-b from-[#090E1A] to-[#0a0f1a]/80"

// Logo section
"flex items-center gap-3 flex-1"

// Photo button
"w-12 h-12 rounded-full border-2 border-primary/30 group-hover:border-primary/60"

// Upload badge
"w-12 h-12 rounded-full... -bottom-1 -right-1 bg-primary text-slate-900"
```

## Error Handling

- Invalid file type → Alert user
- File too large → Alert user with limit
- Upload failure → Alert user to try again
- Database update failure → Alert and retry option
- Network error → Graceful fallback to placeholder

## Mobile Responsive

- Header height: 72px (w/ status bar)
- Photo button: 48px diameter
- Adapts to various screen sizes
- Touch-friendly click targets

## Performance Optimizations

- **Caching**: Profile data cached for 15 minutes
- **Lazy Loading**: Photo fetched on component mount
- **Subscription**: Listens for auth state changes
- **Cleanup**: Unsubscribes from auth listener on unmount

## Dark Mode

- Background: Dark blue gradient (`#090E1A` → `#0a0f1a`)
- Text: White
- Borders: Primary color with opacity variations
- Backdrop blur: 1px for glass effect
