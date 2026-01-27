# Auto-Redirect for Approved Users - Implementation Guide

## Overview
When a user reloads the page (or returns to the app), if they are an **active approved user** with completed onboarding, they will be **automatically redirected to the Dashboard** instead of showing the Application Status page.

## How It Works

### 1. **Initial App Load** (`App.tsx`)
When the app loads or the user navigates, the `checkOnboardingStatus()` function runs:

```typescript
// Check if user is already approved and onboarding completed
if (data?.onboarding_completed && data?.approval_status === 'approved') {
  setCurrentScreen('DASHBOARD');  // Skip ApplicationStatus, go directly to Dashboard
  return;
}

// Only show ApplicationStatus if user is pending approval
if (data?.onboarding_completed) {
  setCurrentScreen('APPLICATION_STATUS');
}
```

**Key Logic:**
- ✅ **Approved + Onboarding Complete** → **DASHBOARD** (auto-redirect)
- ⏳ **Onboarding Complete + Pending Approval** → **APPLICATION_STATUS** (waiting screen)
- 🔄 **New User** → **ONBOARDING_GOAL** (onboarding flow)

### 2. **Application Status Screen** (`screens/ApplicationStatus.tsx`)
If a user somehow reaches the ApplicationStatus screen, it has a double-check:

```typescript
// Auto-redirect immediately if already approved and onboarding completed
if (userStatus === 'approved' && data?.onboarding_completed && !hasRedirected) {
  setHasRedirected(true);
  console.log('User is approved and onboarding completed, redirecting to dashboard');
  onHome();  // Calls the redirect callback
  return;
}
```

**Backup Redirect:** Even if the first check misses, the component will auto-detect the approved status and redirect.

## Flow Diagram

```
PAGE RELOAD
    ↓
Session Check (getSession)
    ↓
checkOnboardingStatus(userId, isInitialLoad=true)
    ↓
Query Profile Data
    ↓
┌─────────────────────────────────────────┐
│   Is Admin? ──→ ADMIN_DASHBOARD         │
│   Plan Expired? ──→ ONBOARDING_PLAN     │
│   Approved + Onboarding? ──→ DASHBOARD  │ ✅ AUTO-REDIRECT
│   Onboarding Done? ──→ APPLICATION_STATUS
│   Has Plan? ──→ APPLICATION_STATUS      │
│   Else ──→ ONBOARDING_GOAL              │
└─────────────────────────────────────────┘
```

## Benefits

1. **Better UX:** Approved users don't see unnecessary loading screens
2. **Faster Dashboard Access:** Direct navigation for active users
3. **Session Recovery:** Automatic session validation before redirect
4. **Fallback Redirect:** Double-check in ApplicationStatus component

## Testing the Feature

### Test Scenario 1: Approved User Page Reload
1. User is approved and logged in
2. Opens Dashboard
3. Press **F5** to reload
4. ✅ **Expected:** Redirected directly to Dashboard (no ApplicationStatus page shown)

### Test Scenario 2: Pending User Page Reload
1. User completed onboarding but waiting for approval
2. Showing ApplicationStatus page
3. Press **F5** to reload
4. ✅ **Expected:** Still shows ApplicationStatus with polling for approval

### Test Scenario 3: Direct URL Navigation
1. Approved user tries to navigate directly to `/application-status`
2. ✅ **Expected:** Auto-detects approval and redirects to Dashboard

## Related Files Modified

- **App.tsx** - Main navigation logic with auto-redirect check
- **screens/ApplicationStatus.tsx** - Backup redirect logic with logging
- **lib/sessionService.ts** - Session validation and recovery

## Console Logs for Debugging

When auto-redirect happens, you'll see:
```
User is approved and onboarding completed, redirecting to dashboard
```

This helps verify the redirect is working correctly during testing.
