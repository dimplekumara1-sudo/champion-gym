# Video Playback Quick Reference

## How to Use Video Utilities in Your Components

### Import Video Utilities
```tsx
import { 
  getYoutubeId, 
  convertToEmbedUrl, 
  isYoutubeUrl,
  getYoutubeThumbnail 
} from '../lib/videoUtils';
```

### Example 1: Simple Video Embed
```tsx
const videoUrl = 'https://youtube.com/watch?v=dQw4w9WgXcQ';
const embedUrl = convertToEmbedUrl(videoUrl, true); // true = autoplay

<iframe
  src={embedUrl}
  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
  allowFullScreen
  frameBorder="0"
/>
```

### Example 2: Extract Video ID
```tsx
const videoUrl = 'https://youtube.com/watch?v=dQw4w9WgXcQ';
const videoId = getYoutubeId(videoUrl); // Returns: "dQw4w9WgXcQ"
```

### Example 3: Check if YouTube URL
```tsx
if (isYoutubeUrl(videoUrl)) {
  const embedUrl = convertToEmbedUrl(videoUrl, true);
  // Handle YouTube
} else {
  // Handle other sources
}
```

### Example 4: Auto-generate Thumbnail
```tsx
const videoUrl = 'https://youtube.com/watch?v=dQw4w9WgXcQ';
const thumbnail = getYoutubeThumbnail(videoUrl);
// Returns: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg"

<img src={thumbnail} alt="Video thumbnail" />
```

---

## Video Embed URL Parameters

```
https://www.youtube.com/embed/{VIDEO_ID}?
  ├─ controls=1          → Show player controls
  ├─ fs=1                → Enable fullscreen
  ├─ modestbranding=1    → Hide YouTube logo
  ├─ autoplay=1          → Auto-start playback
  ├─ rel=0               → Don't show related videos
  └─ showinfo=0          → Hide video info (deprecated but some use it)
```

---

## Common Video URL Formats

| Source | URL Format | Status |
|--------|-----------|--------|
| YouTube Watch | `https://youtube.com/watch?v=ID` | ✅ Supported |
| YouTube Short | `https://youtu.be/ID` | ✅ Supported |
| YouTube Embed | `https://youtube.com/embed/ID` | ✅ Supported |
| YouTube with params | `https://youtu.be/ID?t=10s` | ✅ Supported |
| Vimeo | `https://vimeo.com/ID` | ⚠️ Needs custom handler |
| Direct MP4 | `https://example.com/video.mp4` | ⚠️ Needs `<video>` tag |

---

## Best Practices

### DO ✅
- Always check `isYoutubeUrl()` before processing
- Use `convertToEmbedUrl()` for consistent formatting
- Add `allowFullScreen` permission to iframe
- Test videos in preview before saving
- Use `loading="lazy"` for performance

### DON'T ❌
- Don't hardcode YouTube embed URLs (use utilities)
- Don't forget `allow="...fullscreen"` attribute
- Don't create blob URLs for YouTube (overhead)
- Don't forget to handle URL conversion errors
- Don't assume all video URLs are YouTube

---

## Error Handling Example

```tsx
const [embedUrl, setEmbedUrl] = useState<string | null>(null);
const [error, setError] = useState<string | null>(null);

const handleVideoUrl = (url: string) => {
  try {
    if (!url) {
      setEmbedUrl(null);
      setError(null);
      return;
    }

    if (!isYoutubeUrl(url)) {
      setError('Only YouTube URLs are supported');
      setEmbedUrl(null);
      return;
    }

    const embedUrl = convertToEmbedUrl(url, true);
    if (!embedUrl) {
      setError('Invalid YouTube URL format');
      setEmbedUrl(null);
      return;
    }

    setEmbedUrl(embedUrl);
    setError(null);
  } catch (err) {
    setError('Error processing video URL');
    setEmbedUrl(null);
  }
};

return (
  <div>
    {error && <p className="text-red-500">{error}</p>}
    {embedUrl && (
      <iframe src={embedUrl} allowFullScreen />
    )}
  </div>
);
```

---

## AdminExplore Video Preview Flow

### When User Changes Video URL:
```
User enters URL
    ↓
handleVideoUrlChange() called
    ↓
isYoutubeUrl() validation
    ↓
convertToEmbedUrl() → generates preview URL
    ↓
getYoutubeThumbnail() → auto-generates thumbnail
    ↓
Preview iframe updates immediately
    ↓
User can test video plays
    ↓
If OK → Save
    ↓
If Error → Fix URL before saving
```

---

## Performance Tips

1. **Lazy Load Iframes**: Use `loading="lazy"` attribute
2. **No Blob URLs**: Use direct embeds instead
3. **Cache Thumbnails**: Store thumbnail URLs in database
4. **Avoid Auto-play on Lists**: Only autoplay in player modal
5. **Validate Before Save**: Use preview to catch errors early

---

## Troubleshooting

### Video won't load?
- Check URL format with `getYoutubeId()`
- Verify video ID is valid
- Check `allow` attribute includes `fullscreen`

### Autoplay not working?
- Make sure `convertToEmbedUrl(url, true)` has `true` flag
- Check browser autoplay policies
- Try without autoplay for fallback

### Thumbnail not showing?
- Verify video ID with `getYoutubeId()`
- Fallback: Use `getYoutubeThumbnailFallback()`
- Some videos don't have thumbnails

---

## Related Files

- `lib/videoUtils.ts` - Utility functions
- `screens/AdminExplore.tsx` - Video create/edit with preview
- `screens/CategoryVideosScreen.tsx` - Video browsing
- `screens/ExploreScreen.tsx` - Featured videos
