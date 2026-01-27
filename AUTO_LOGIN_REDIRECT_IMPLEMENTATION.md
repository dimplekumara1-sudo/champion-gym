# Auto-Redirect Implementation for Approved Users

## Overview
When a user logs in or the app reloads, if they are **approved and have completed onboarding**, they will be **automatically redirected to the Dashboard** without needing to click any button or view the Application Status page.

## Implementation Flow

### 1. **Page Load / App Initialization** (`App.tsx`)
```typescript
supabase.auth.getSession().then(({ data: { session } }) => {
  if (session) {
    // isInitialLoad = true (important for admin redirect logic)
    checkOnboardingStatus(session.user.id, true);
  }
});
```

### 2. **User Login** (`LoginScreen.tsx` → `App.tsx`)
```
User fills email/password
    ↓
Clicks "Sign In"
    ↓
supabase.auth.signInWithPassword() succeeds
    ↓
onLogin() callback triggered
    ↓
checkOnboardingStatus(session.user.id, true) called
    ↓
Checks approval_status & onboarding_completed in database
    ↓
If approved & completed → navigate to DASHBOARD ✅
If pending approval → navigate to APPLICATION_STATUS ⏳
If new user → navigate to ONBOARDING_GOAL 🚀
```

### 3. **User Signup** (`SignupScreen.tsx` → `App.tsx`)
```
User enters details
    ↓
Clicks "Create Account"
    ↓
supabase.auth.signUp() succeeds
    ↓
onSignup() callback triggered
    ↓
checkOnboardingStatus(session.user.id, true) called
    ↓
Same logic as login applies
```

### 4. **Auth State Change Listener** (Supabase event)
```typescript
supabase.auth.onAuthStateChange((event, session) => {
  if (session) {
    // isInitialLoad = false (for non-initial changes)
    checkOnboardingStatus(session.user.id, false);
  }
});
```

## Decision Tree in `checkOnboardingStatus()`

```
Query user profile data
    ↓
┌─────────────────────────────────────────────────────────┐
│                                                          │
├─→ Is Admin? ──→ ADMIN_DASHBOARD (only on initial load)  │
│                                                          │
├─→ Plan Expired? ──→ ONBOARDING_PLAN                    │
│                                                          │
├─→ Approved + Onboarding Completed? ──→ DASHBOARD ✅     │
│   (This is the key redirect for active users)           │
│                                                          │
├─→ Onboarding Completed (but not approved)? ──→ APP_STATUS │
│                                                          │
├─→ Has Selected Plan? ──→ APPLICATION_STATUS             │
│                                                          │
└─→ New User? ──→ ONBOARDING_GOAL                         │
                                                           
└─────────────────────────────────────────────────────────┘
```

## Database Fields Checked

The system checks these fields in the `profiles` table:

| Field | Type | Purpose |
|-------|------|---------|
| `approval_status` | text | 'pending', 'approved', 'rejected' |
| `onboarding_completed` | boolean | Has user completed all onboarding steps |
| `plan` | text | Selected plan (if any) |
| `plan_expiry_date` | timestamp | When plan expires |
| `role` | text | 'user', 'admin' |
| `has_password` | boolean | Does Google auth user have password set |

## Key Scenarios

### ✅ Scenario 1: Approved User Logs In
1. User enters email/password
2. Logs in successfully
3. System checks: `onboarding_completed = true` AND `approval_status = 'approved'`
4. **Result**: Direct redirect to DASHBOARD (no Application Status page)

### ✅ Scenario 2: Approved User Refreshes Page
1. User is already logged in
2. User presses F5 to reload
3. Session is restored from Supabase
4. `checkOnboardingStatus()` is called
5. System checks approval status
6. **Result**: Direct redirect to DASHBOARD

### ⏳ Scenario 3: Pending User Logs In
1. User enters email/password
2. Logs in successfully
3. System checks: `onboarding_completed = true` BUT `approval_status = 'pending'`
4. **Result**: Shows APPLICATION_STATUS page with "In Progress" message
5. Polling continues every 5 seconds to check for approval

### ⏳ Scenario 4: New User After Signup
1. User signs up
2. Onboarding is not yet started
3. System checks: `onboarding_completed = false` AND `plan = null`
4. **Result**: Redirected to ONBOARDING_GOAL to start the flow

## Debugging

### Console Logs
Look for these logs to verify the flow:

```
[Navigation] Checking onboarding status for user [UUID], isInitialLoad=true
[Navigation] User profile: { onboarding_completed: true, approval_status: 'approved', ... }
[Navigation] User approved and onboarding completed - DIRECT TO DASHBOARD
```

### Network Check
1. Open DevTools → Network tab
2. Filter for requests to `profiles` table
3. Verify the query returns correct `approval_status` and `onboarding_completed`

### Auth State
1. Open DevTools → Console
2. Run: `supabase.auth.getSession()`
3. Verify user session exists

## Related Components

- **App.tsx** - Main navigation logic
- **screens/LoginScreen.tsx** - Login form with onLogin callback
- **screens/SignupScreen.tsx** - Signup form with onSignup callback
- **screens/ApplicationStatus.tsx** - Backup redirect for approved users
- **lib/sessionService.ts** - Session monitoring

## Edge Cases Handled

1. **Google Auth without Password** - Shows password setup screen first
2. **Expired Plan** - Redirects to renewal flow
3. **Admin Users** - Shows admin dashboard (only on initial load)
4. **Missing Profile** - Defaults to ONBOARDING_GOAL for new users
5. **Session Errors** - Attempts recovery via `validateAndRecoverSession()`

## Testing Checklist

- [ ] Login with an approved user → goes directly to Dashboard
- [ ] Refresh page while logged in as approved user → stays on Dashboard
- [ ] Login with pending user → shows Application Status page
- [ ] Admin user login → shows Admin Dashboard
- [ ] New user signup → starts onboarding flow
- [ ] Google auth user → shows password setup if needed
- [ ] Expired plan user → shows plan renewal screen
