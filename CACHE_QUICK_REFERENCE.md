# Caching Quick Reference

## Import Cache Manager
```typescript
import { cache, CACHE_KEYS, CACHE_TTL } from '../lib/cache';
```

## Common Patterns

### Pattern 1: Check Cache, Fetch If Missing
```typescript
useEffect(() => {
  const fetchData = async () => {
    // Try cache first
    let data = cache.get(CACHE_KEYS.PROFILE_DATA);
    
    if (!data) {
      // Fetch from Supabase
      const { data: freshData } = await supabase
        .from('profiles')
        .select('*')
        .single();
      
      data = freshData;
      
      // Cache for 15 minutes
      cache.set(CACHE_KEYS.PROFILE_DATA, data, CACHE_TTL.LONG);
    }
    
    setProfile(data);
  };
  
  fetchData();
}, []);
```

### Pattern 2: Invalidate Cache After Update
```typescript
const handleUpdate = async (newData) => {
  // Update in Supabase
  await supabase
    .from('profiles')
    .update(newData)
    .eq('id', userId);
  
  // Clear related cache
  cache.remove(CACHE_KEYS.PROFILE_DATA);
  
  // Optionally refetch
  fetchProfile(); // This will now fetch fresh data
};
```

### Pattern 3: Cache Related Items
```typescript
// For items with variations (like workout details by ID)
const cacheKey = `${CACHE_KEYS.WORKOUT_DETAIL}${workoutId}`;
let workoutData = cache.get(cacheKey);

if (!workoutData) {
  workoutData = await supabase
    .from('workouts')
    .select('*')
    .eq('id', workoutId)
    .single();
  
  cache.set(cacheKey, workoutData, CACHE_TTL.MEDIUM);
}
```

## Cache TTL Reference

| TTL | Duration | Use Case |
|-----|----------|----------|
| SHORT | 1 min | Progress stats, real-time counts |
| MEDIUM | 5 min | Workout details, user programs |
| LONG | 15 min | Profile data, video lists |
| VERY_LONG | 60 min | Categories, rarely changing data |

## Screens Using Cache

### ProfileScreen
- ✅ Profile data (15 min)
- ✅ Avatar URL updates

### Dashboard
- ✅ Profile data (15 min)
- ✅ Plan details (60 min)
- ✅ Current program (5 min)

### ExploreScreen
- ✅ Categories (60 min)
- ✅ Featured videos (15 min)

### WorkoutSummary
- ✅ Workout details (5 min)
- ✅ Gym location from profile

### WorkoutFeedback
- ✅ Workout stats (5 min)
- ✅ Week progress (1 min)
- ✅ Auto-clears on completion

## Debugging Commands

### Check if data is cached
```typescript
const isCached = cache.has(CACHE_KEYS.PROFILE_DATA);
console.log('Is cached:', isCached);
```

### Get cache age
```typescript
const age = cache.getAge(CACHE_KEYS.PROFILE_DATA);
console.log(`Cache is ${age} seconds old`);
```

### Clear specific cache
```typescript
cache.remove(CACHE_KEYS.PROFILE_DATA);
```

### Clear all cache
```typescript
cache.clearAll();
```

### Clear by pattern
```typescript
// Clear all dashboard stats
cache.clearPattern(`${CACHE_KEYS.DASHBOARD_STATS}*`);

// Clear all workout details
cache.clearPattern(`${CACHE_KEYS.WORKOUT_DETAIL}*`);
```

## Browser DevTools

### View all cached data
```javascript
// In browser console
Object.keys(localStorage)
  .filter(k => k.startsWith('Challenge Gym_cache_'))
  .forEach(k => console.log(k, JSON.parse(localStorage[k])))
```

### Clear all cache
```javascript
// In browser console
cache.clearAll()
```

## Performance Tips

1. **Use SHORT TTL for**: Stats that change frequently
2. **Use LONG/VERY_LONG TTL for**: Categories, plans, rarely updated data
3. **Invalidate on mutations**: Always clear cache after creating/updating/deleting
4. **Avoid over-caching**: Don't cache everything - only frequently accessed data
5. **Test cache hits**: Monitor network tab to see cache improvements

## Common Mistakes to Avoid

❌ **Don't**: Forget to clear cache after mutations
```typescript
// Bad
await supabase.from('profiles').update(data);
// Cache now has stale data!
```

✅ **Do**: Clear cache after mutations
```typescript
// Good
await supabase.from('profiles').update(data);
cache.remove(CACHE_KEYS.PROFILE_DATA);
```

---

❌ **Don't**: Cache sensitive data permanently
```typescript
// Bad
cache.set(CACHE_KEYS.USER_ROLE, role, CACHE_TTL.VERY_LONG);
```

✅ **Do**: Use appropriate TTL for sensitive data
```typescript
// Good
cache.set(CACHE_KEYS.USER_ROLE, role, CACHE_TTL.SHORT);
```

---

❌ **Don't**: Ignore cache errors
```typescript
// Bad
const data = cache.get(CACHE_KEYS.DATA); // Silent fail if localStorage is full
```

✅ **Do**: Handle cache gracefully
```typescript
// Good
let data = cache.get(CACHE_KEYS.DATA);
if (!data) {
  // Always have fallback to fetch from DB
  data = await supabase.from('table').select('*');
}
```
