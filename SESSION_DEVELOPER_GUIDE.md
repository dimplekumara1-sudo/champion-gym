# Session Management & Auth Recovery - Developer Guide

## Overview
The application now has a robust session management system that prevents data loss due to auth failures and ensures users skip unnecessary approval pages.

## Core Files Modified/Added

### Modified Files
1. **lib/supabase.ts** - Enhanced with session persistence and auto-refresh
2. **screens/ApplicationStatus.tsx** - Skip page for already-approved users
3. **App.tsx** - Improved navigation logic for approved users

### New Files
1. **lib/sessionService.ts** - Core session management service
2. **lib/useSafeFetch.ts** - React hooks for safe data fetching
3. **lib/sessionErrorHandler.ts** - Error handling utilities

## Key Features Implemented

### 1. Automatic Session Recovery ✅
When auth fails:
- Session is validated automatically every 30 seconds
- Failed auth is detected and recovery is attempted
- Background monitoring ensures session stays alive
- User data is preserved across session recovery

### 2. Direct Navigation for Verified Users ✅
Users who are verified by admin and completed onboarding:
- Skip ApplicationStatus page entirely
- Directly navigate to Dashboard
- No delays or unnecessary screens

### 3. Smart Retry Logic ✅
API calls automatically retry on session errors:
- Up to 3 attempts per request
- Exponential backoff between retries
- Clear error messages on final failure

### 4. Session State Caching ✅
Reduces unnecessary validation calls:
- Caches validation for 5 seconds
- Periodic validation every 30 seconds
- Smart background monitoring

## Integration Guide

### For Components Fetching Data

**Before:**
```tsx
const [data, setData] = useState(null);

useEffect(() => {
  supabase
    .from('table')
    .select('*')
    .then(({ data, error }) => {
      if (error) console.error(error);
      setData(data);
    });
}, []);
```

**After (Recommended):**
```tsx
import { useSafeFetch } from '../lib/useSafeFetch';

const { data, loading, error, retry } = useSafeFetch(
  () => supabase.from('table').select('*'),
  [] // dependencies
);

if (error) return <button onClick={retry}>Retry</button>;
```

### For Custom Queries

**Using withSessionRecovery:**
```tsx
import { withSessionRecovery } from '../lib/sessionErrorHandler';

const fetchUserData = async (userId: string) => {
  const { data, error } = await withSessionRecovery(
    () => supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
  );

  if (error) {
    console.error('Failed to fetch user:', error);
    return null;
  }

  return data;
};
```

### For Manual Session Operations

```tsx
import {
  validateSession,
  forceSessionRefresh,
  getSessionState
} from '../lib/sessionService';

// Check if session is valid
const isValid = await validateSession();

// Force refresh
const refreshed = await forceSessionRefresh();

// Get current state (for debugging)
const state = getSessionState();
console.log('Session state:', state);
```

### Error Handling

```tsx
import {
  isSessionError,
  handleSessionError,
  getErrorMessage
} from '../lib/sessionErrorHandler';

try {
  const { data, error } = await supabase.from('users').select();
  
  if (error) {
    if (isSessionError(error)) {
      const recovered = await handleSessionError(error);
      if (recovered) {
        // Retry the operation
        return;
      }
    }
    
    const userMessage = getErrorMessage(error);
    alert(userMessage);
  }
} catch (error) {
  const message = getErrorMessage(error);
  alert(message);
}
```

## Configuration

### Session Validation Interval
**File:** `lib/sessionService.ts` (Line 20)
```ts
const SESSION_VALIDATION_INTERVAL = 30000; // Every 30 seconds
```

### Session Cache Duration
**File:** `lib/sessionService.ts` (Line 21)
```ts
const SESSION_CACHE_DURATION = 5000; // Cache for 5 seconds
```

### Auth Refresh Interval
**File:** `lib/supabase.ts` (Line 28)
```ts
setInterval(() => {
  validateAndRecoverSession();
}, 60000); // Every 60 seconds
```

## Troubleshooting

### Session Not Refreshing
1. Check browser console for errors
2. Verify Supabase credentials in `lib/supabase.ts`
3. Check network connectivity
4. Try manual refresh: `forceSessionRefresh()`

### Data Still Lost After Refresh
1. Verify using `useSafeFetch` hook
2. Check that queries include proper error handling
3. Use `withSessionRecovery` for complex queries
4. Check Network tab in DevTools for 401 responses

### Users Still See ApplicationStatus
1. Ensure `onboarding_completed` is true in database
2. Ensure `approval_status` is 'approved' in database
3. Clear browser cache and localStorage
4. Check that App.tsx updated successfully
5. Verify user profile data with: `getSessionState()`

## Performance Considerations

- **Session monitoring:** 30-second interval (adjustable)
- **Auto-refresh:** Every 60 seconds
- **Cache duration:** 5 seconds (reduces validation frequency)
- **Retry attempts:** 2-3 per request (fast failure on non-recoverable errors)

## Best Practices

1. **Always use `useSafeFetch` for queries**
   - Automatic session validation
   - Built-in error handling
   - Proper cleanup

2. **Use `withSessionRecovery` for complex operations**
   - Multiple sequential queries
   - Critical data fetches
   - Mutation operations

3. **Handle session errors explicitly**
   - Check with `isSessionError()`
   - Show meaningful messages with `getErrorMessage()`
   - Attempt recovery with `handleSessionError()`

4. **Monitor session state in development**
   - Use `getSessionState()` for debugging
   - Check browser DevTools Network tab
   - Log session validation results

5. **Test session recovery**
   - Open DevTools Network tab
   - Throttle/block network
   - Release throttle and verify recovery
   - No page refresh should be needed

## API Reference

### sessionService.ts
- `validateSession()` - Check and cache validation
- `getValidSession()` - Get session with guarantee
- `safeFetch()` - Fetch with auto-retry
- `startSessionMonitoring()` - Start background monitoring
- `stopSessionMonitoring()` - Stop background monitoring
- `forceSessionRefresh()` - Manual refresh
- `getSessionState()` - Get current state
- `clearSessionState()` - Clear on logout

### useSafeFetch.ts
- `useSafeFetch()` - Query hook with retry
- `useSafeMutation()` - Mutation hook

### sessionErrorHandler.ts
- `isSessionError()` - Check error type
- `handleSessionError()` - Recovery logic
- `withSessionRecovery()` - Query wrapper
- `getErrorMessage()` - User-friendly messages

## Migration Checklist

For existing screens that fetch data:
- [ ] Replace direct `supabase` calls with `useSafeFetch`
- [ ] Add error handling with `isSessionError`
- [ ] Test with network throttling
- [ ] Test with auth expiry simulation
- [ ] Verify no manual page refresh needed

## Support

For issues or questions:
1. Check this guide first
2. Review SESSION_FIXES_SUMMARY.md
3. Check browser console for errors
4. Verify Supabase connection
5. Test with fresh session (incognito window)
