# Testing Guide: Auto-Redirect for Approved Users

## Quick Test (60 seconds)

### Test 1: Approved User Login
1. **Setup**: Have a user in the database that is approved and has completed onboarding
   - `approval_status = 'approved'`
   - `onboarding_completed = true`

2. **Action**: 
   - Open the app in a fresh incognito window
   - Click "Sign In"
   - Enter credentials for the approved user
   - Click "Sign In" button

3. **Expected Result**:
   - ✅ Dashboard loads DIRECTLY (no Application Status page shown)
   - ✅ No need to click "Go to Dashboard" button
   - ✅ Console shows: `[Navigation] User approved and onboarding completed - DIRECT TO DASHBOARD`

---

### Test 2: Approved User Page Reload
1. **Setup**: User is already logged in and on Dashboard

2. **Action**:
   - Press F5 to reload the page
   - Wait for app to initialize

3. **Expected Result**:
   - ✅ Dashboard loads immediately
   - ✅ No Application Status page shown
   - ✅ User stays logged in

---

### Test 3: Pending User Login
1. **Setup**: Have a user that completed onboarding but NOT yet approved
   - `approval_status = 'pending'`
   - `onboarding_completed = true`

2. **Action**:
   - Click "Sign In"
   - Enter pending user credentials
   - Click "Sign In"

3. **Expected Result**:
   - ✅ Application Status page shown with "Account Activated!" header
   - ✅ Status shows "Approved" as pending
   - ✅ "In Progress" button is disabled
   - ✅ Console shows: `[ApplicationStatus] User status: pending`

---

### Test 4: Admin Approves User (Real-time Redirect)
1. **Setup**:
   - Have a pending user logged in viewing Application Status
   - Have admin access to database

2. **Action**:
   - In pending user's browser: See "In Progress" message
   - In database: Update user's `approval_status` to 'approved'
   - Wait 3-5 seconds (polling interval)

3. **Expected Result**:
   - ✅ Polling detects the approval
   - ✅ Application Status screen shows "Redirecting to Dashboard..."
   - ✅ Dashboard loads automatically (no button click needed)
   - ✅ Console shows: `[ApplicationStatus] Polling - approval detected`

---

## Console Logs to Look For

### Successful Auto-Redirect Logs
```
[Navigation] Checking onboarding status for user [UUID], isInitialLoad=true
[Navigation] User profile: {
  onboarding_completed: true,
  approval_status: 'approved'
}
[Navigation] User approved and onboarding completed - DIRECT TO DASHBOARD
```

### Pending User Logs
```
[Navigation] Onboarding completed, waiting for approval - navigating to APPLICATION_STATUS
[ApplicationStatus] User status: pending Onboarding completed: true
[ApplicationStatus] Polling check 1...
[ApplicationStatus] Polling check 2...
```

### Approval Detected Logs
```
[ApplicationStatus] Polling check 5...
[ApplicationStatus] User status: approved Onboarding completed: true
[ApplicationStatus] ✅ User approved and onboarding completed - AUTO-REDIRECTING TO DASHBOARD
[ApplicationStatus] Status effect: Detected approved status, redirecting
```

---

## Testing Checklist

### Basic Flow Tests
- [ ] **New User**: Signup → Onboarding → Shows Application Status ✓
- [ ] **Pending User**: Shows Application Status with "In Progress" ✓
- [ ] **Approved User**: Shows Dashboard directly (no Application Status) ✓

### Auto-Redirect Tests
- [ ] **Login**: Approved user → Direct Dashboard (no button click) ✓
- [ ] **Reload**: Approved user refreshes → Dashboard loads ✓
- [ ] **Polling**: Pending user approved by admin → Auto-redirect detected ✓
- [ ] **Refresh Button**: Pending user → Approved → Status updates automatically ✓

### Edge Cases
- [ ] **Fast Approval**: Admin approves during user signup flow ✓
- [ ] **Tab Switch**: Approved user switches browser tabs → Dashboard ✓
- [ ] **Session Expired**: Auto-recover and retry → Dashboard ✓
- [ ] **Network Slow**: Polling continues every 3 seconds ✓

### UI/UX Tests
- [ ] **No Flash**: Approved users don't briefly see Application Status ✓
- [ ] **Loading Message**: During redirect shows "Redirecting to Dashboard..." ✓
- [ ] **Button Works**: Manual "Go to Dashboard" button still works ✓
- [ ] **Back Button**: Back button returns to previous screen ✓

---

## Database Query for Testing

### Check User Approval Status
```sql
SELECT id, email, approval_status, onboarding_completed, plan
FROM profiles
WHERE id = '[USER_ID]';
```

### Update User to Approved
```sql
UPDATE profiles
SET approval_status = 'approved'
WHERE id = '[USER_ID]';
```

### Create Test User (Pending)
```sql
INSERT INTO profiles (
  id, email, approval_status, onboarding_completed, plan
) VALUES (
  'test-pending-user', 'pending@test.com', 'pending', true, 'starter'
);
```

---

## Troubleshooting

### Issue: User still sees Application Status after approval
**Check**:
1. Open DevTools Console
2. Look for `[ApplicationStatus]` logs
3. Verify approval_status in database is actually 'approved'
4. Check polling is running (log appears every 3 seconds)

### Issue: Auto-redirect not happening on login
**Check**:
1. Verify session is being established
2. Look for `[Navigation]` logs in console
3. Check profile query returned `approval_status = 'approved'`
4. Verify `onHome` callback is being called

### Issue: "Redirecting..." message appears but doesn't go to Dashboard
**Check**:
1. Check for JavaScript errors in console
2. Verify navigate('DASHBOARD') is working
3. Check if Dashboard component has any errors
4. Try refreshing the page

---

## Performance Notes

- **Approval Check**: < 100ms (database query)
- **Polling Interval**: 3 seconds (optimized for UX)
- **Redirect Time**: < 500ms (after approval detected)
- **Session Recovery**: < 2 seconds (if session error)

---

## Files That Were Changed

These files contain the auto-redirect logic:

1. **App.tsx**
   - Lines 105-195: `checkOnboardingStatus()` function
   - Lines 200-210: LOGIN/SIGNUP screen callbacks

2. **ApplicationStatus.tsx**
   - Lines 17-85: useEffect with auto-redirect logic
   - Lines 89-91: Safety hook for status changes
   - Lines 148-164: Conditional rendering (hasRedirected)

---

## Success Criteria

✅ **The fix is working if:**
1. Approved users go directly to Dashboard (no Application Status shown)
2. Pending users see Application Status with "In Progress"
3. When admin approves, user is automatically redirected (no manual action needed)
4. No console errors related to navigation
5. All transitions are smooth without UI flashing
