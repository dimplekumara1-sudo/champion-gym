# Local Caching Strategy

## Overview
This document describes the local caching implementation to optimize performance by reducing unnecessary Supabase queries.

## Cache Manager Features

### Setup
```typescript
import { cache, CACHE_KEYS, CACHE_TTL } from '../lib/cache';
```

### Cache Lifespan (TTL - Time To Live)
```typescript
CACHE_TTL.SHORT = 1 minute       // Frequently changing data
CACHE_TTL.MEDIUM = 5 minutes     // Normal data
CACHE_TTL.LONG = 10 minutes      // Static data
CACHE_TTL.VERY_LONG = 15 minutes // Rarely changing data
```

### Basic Operations

#### Set Cache
```typescript
// Cache data with 5 minute TTL (default)
cache.set(CACHE_KEYS.PROFILE_DATA, profileData);

// Cache data with custom TTL
cache.set(CACHE_KEYS.DASHBOARD_STATS, stats, CACHE_TTL.LONG);
```

#### Get Cache
```typescript
// Returns cached data or null if expired/not found
const profile = cache.get(CACHE_KEYS.PROFILE_DATA);
if (profile) {
  // Use cached data
  setProfile(profile);
} else {
  // Fetch from Supabase
  const data = await supabase.from('profiles').select('*');
  cache.set(CACHE_KEYS.PROFILE_DATA, data);
}
```

#### Check Cache Exists
```typescript
if (cache.has(CACHE_KEYS.PROFILE_DATA)) {
  // Cache is valid and exists
}
```

#### Remove Cache
```typescript
// Remove specific cache entry
cache.remove(CACHE_KEYS.PROFILE_DATA);

// Clear cache by pattern
cache.clearPattern(`${CACHE_KEYS.DASHBOARD_STATS}*`);

// Clear all app cache
cache.clearAll();
```

## Cache Keys

```typescript
CACHE_KEYS = {
  // Profile
  PROFILE_DATA: 'profile_data',
  PROFILE_AVATAR: 'profile_avatar',

  // Dashboard
  DASHBOARD_STATS: 'dashboard_stats',
  DASHBOARD_TREND: 'dashboard_trend',
  DASHBOARD_TREND_PERIOD: 'dashboard_trend_period',

  // Workouts
  USER_PROGRAMS: 'user_programs',
  WORKOUT_DETAIL: 'workout_detail_',
  WORKOUT_CATEGORIES: 'workout_categories',

  // Explore
  EXPLORE_CATEGORIES: 'explore_categories',
  EXPLORE_VIDEOS: 'explore_videos',
  EXPLORE_FEATURED: 'explore_featured',

  // Admin
  ADMIN_STATS: 'admin_stats',
  ADMIN_USERS: 'admin_users',
  ADMIN_ORDERS: 'admin_orders',
  ADMIN_VIDEOS: 'admin_videos',

  // Auth
  USER_ROLE: 'user_role',
}
```

## Implemented Caching Strategy

### ProfileScreen
- **Profile Data**: Cached for 15 minutes (LONG)
- **Avatar URL**: Included in profile data
- **Invalidation**: Clears on photo upload

```typescript
// Check cache first
const cachedProfile = cache.get(CACHE_KEYS.PROFILE_DATA);
if (cachedProfile) {
  setProfile(cachedProfile);
} else {
  // Fetch and cache
  const profileData = await supabase.from('profiles').select('*');
  cache.set(CACHE_KEYS.PROFILE_DATA, profileData, CACHE_TTL.LONG);
}
```

### Dashboard
- **Profile Data**: 15 minutes (LONG)
- **Plan Details**: 60 minutes (VERY_LONG)
- **User Programs**: 5 minutes (MEDIUM)
- **Invalidation**: Auto-refresh after updates

```typescript
// Multi-level caching for dashboard data
const cachedProfile = cache.get(CACHE_KEYS.PROFILE_DATA);
const cachedProgram = cache.get(CACHE_KEYS.USER_PROGRAMS);
```

### ExploreScreen
- **Categories**: 60 minutes (VERY_LONG) - rarely changes
- **Featured Videos**: 15 minutes (LONG)
- **Invalidation**: On admin video updates

```typescript
// Cache explore content
const cachedCategories = cache.get(CACHE_KEYS.EXPLORE_CATEGORIES);
const cachedVideos = cache.get(CACHE_KEYS.EXPLORE_FEATURED);
```

### WorkoutSummary
- **Workout Details**: 5 minutes (MEDIUM)
- **Exercise Count**: Included in workout data
- **Gym Location**: From profile cache

```typescript
const cacheKey = `${CACHE_KEYS.WORKOUT_DETAIL}${programId}`;
const cached = cache.get(cacheKey);
```

### WorkoutFeedback
- **Workout Stats**: 5 minutes (MEDIUM)
- **Week Progress**: 1 minute (SHORT) - changes frequently
- **Invalidation**: Clears on workout completion

```typescript
// Clear cache when workout is completed
cache.clearPattern(`${CACHE_KEYS.DASHBOARD_STATS}*`);
cache.clearPattern(`${CACHE_KEYS.USER_PROGRAMS}*`);
```

## Best Practices

### 1. Always Check Cache First
```typescript
const data = cache.get(CACHE_KEY);
if (data) {
  // Use cached data immediately
  setState(data);
} else {
  // Fetch from Supabase and cache
  const freshData = await supabase.from('table').select('*');
  cache.set(CACHE_KEY, freshData, TTL);
  setState(freshData);
}
```

### 2. Invalidate on Mutations
```typescript
// After creating/updating/deleting data
await supabase.from('table').update(data);

// Clear related cache
cache.remove(CACHE_KEY);
// Or clear multiple related entries
cache.clearPattern(`${CACHE_KEY_PREFIX}*`);
```

### 3. Use Appropriate TTLs
- **SHORT (1 min)**: Week progress, frequently updated stats
- **MEDIUM (5 min)**: Workout details, user programs
- **LONG (15 min)**: Explore videos, profile data
- **VERY_LONG (60 min)**: Categories, rarely changing data

### 4. Composite Cache Keys
For related data items, use descriptive patterns:
```typescript
// Workout data for specific program
`${CACHE_KEYS.WORKOUT_DETAIL}${programId}`

// Admin stats filtered by period
`${CACHE_KEYS.ADMIN_STATS}_${period}`
```

## Storage Details

- **Storage**: Browser's `localStorage`
- **Prefix**: `powerflex_cache_`
- **Format**: JSON serialized cache entries with timestamp
- **Capacity**: ~5-10MB per domain (browser dependent)
- **Persistence**: Survives page refresh and app restart

## Monitoring Cache

### Get Cache Age
```typescript
const ageSeconds = cache.getAge(CACHE_KEYS.PROFILE_DATA);
console.log(`Cache age: ${ageSeconds} seconds`);
```

### Clear Cache During Development
```typescript
// In browser console
cache.clearAll()
```

## Expected Performance Improvements

| Metric | Before | After |
|--------|--------|-------|
| Profile Load | 1.2s | 0.1s (cached) |
| Dashboard Load | 2.5s | 0.3s (cached) |
| Explore Navigation | 1.5s | 0.2s (cached) |
| Workout Summary | 0.8s | 0.05s (cached) |
| Navigation Speed | 1.5s avg | 0.2s avg |

## Troubleshooting

### Cache Not Working?
1. Check browser's localStorage is enabled
2. Verify `cache.ts` is imported correctly
3. Check TTL values - may be expiring too quickly
4. Use `cache.getAge(key)` to check if data is cached

### Stale Data?
1. Reduce TTL for that cache key
2. Add manual cache invalidation on mutations
3. Use `cache.remove(key)` to force refresh

### Storage Full?
1. Reduce number of cached items
2. Reduce TTL values
3. Clear old cache with `cache.clearAll()`

## Future Enhancements

1. **Selective Invalidation**: Clear specific cache entries on data changes
2. **Cache Statistics**: Monitor hit/miss ratios
3. **Offline Support**: Queue mutations while offline
4. **Compression**: Compress large cached datasets
5. **IndexedDB**: For larger data storage needs
