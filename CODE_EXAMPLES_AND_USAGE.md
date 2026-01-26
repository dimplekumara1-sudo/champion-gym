# Payment & Plan System - Code Examples & Usage Guide

## Quick Start Examples

### 1. Get User Notifications

```typescript
import { notificationService } from '../lib/notifications';

// In your component
const [notifications, setNotifications] = useState([]);

useEffect(() => {
  const fetchNotifications = async () => {
    const user = await supabase.auth.getUser();
    const userNotifications = await notificationService.getUserNotifications(user.data.user.id);
    setNotifications(userNotifications);
  };
  
  fetchNotifications();
}, []);

// Display notification count
console.log(`User has ${notifications.length} notifications`);
```

---

### 2. Handle Plan Approval (Admin)

```typescript
import { planService } from '../lib/planService';

const approveUser = async (userId: string, paidAmount: number, dueDate: string) => {
  try {
    // This updates the database with payment and plan info
    const success = await planService.handlePartialPayment(
      userId,
      paidAmount,
      planPrice - paidAmount,  // due amount
      new Date(dueDate)
    );
    
    if (success) {
      console.log('User approved with partial payment tracking');
    }
  } catch (error) {
    console.error('Error approving user:', error);
  }
};
```

---

### 3. Process Payment Collection

```typescript
import { planService } from '../lib/planService';

// When admin collects a due payment
const collectPayment = async (userId: string, amountCollected: number) => {
  try {
    const success = await planService.collectDuePayment(userId, amountCollected);
    
    if (success) {
      // Refresh user data
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (profile.due_amount === 0) {
        console.log('Payment complete!');
      } else {
        console.log(`Still due: $${profile.due_amount.toFixed(2)}`);
      }
    }
  } catch (error) {
    console.error('Payment collection failed:', error);
  }
};
```

---

### 4. Handle Plan Renewal

```typescript
import { planService } from '../lib/planService';

// When user's plan expires and they renew
const renewPlan = async (userId: string) => {
  try {
    // Check if plan is expired
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (profile.plan_status === 'expired') {
      const success = await planService.processPlanRenewal(userId);
      if (success) {
        console.log('Plan renewed successfully');
      }
    }
  } catch (error) {
    console.error('Renewal failed:', error);
  }
};
```

---

### 5. Display Notification Bell

```typescript
import { Header } from '../components/Header';
import { PlanNotification } from '../lib/notifications';

// In your app/screen
const [notifications, setNotifications] = useState<PlanNotification[]>([]);
const [showNotifications, setShowNotifications] = useState(false);

<Header 
  notifications={notifications}
  onNotificationsClick={() => setShowNotifications(true)}
  onProfileClick={() => navigate('PROFILE')}
/>

{/* Display modal when bell clicked */}
{showNotifications && notifications.length > 0 && (
  <div className="notification-modal">
    {notifications.map(notif => (
      <div key={notif.userId} className="notification-item">
        <h3>{notif.title}</h3>
        <p>{notif.message}</p>
        {notif.daysLeft && <p>Days left: {notif.daysLeft}</p>}
        {notif.dueAmount && <p>Due: ${notif.dueAmount.toFixed(2)}</p>}
      </div>
    ))}
  </div>
)}
```

---

### 6. Admin - Get Payment Collection List

```typescript
import { planService } from '../lib/planService';

const AdminPaymentCollectionScreen = () => {
  const [usersRequiringPayment, setUsersRequiringPayment] = useState([]);
  
  useEffect(() => {
    const fetchUsers = async () => {
      const users = await planService.getUsersRequiringPaymentCollection();
      setUsersRequiringPayment(users);
    };
    
    fetchUsers();
  }, []);
  
  return (
    <div>
      <h1>Payment Collection - {usersRequiringPayment.length} Users</h1>
      {usersRequiringPayment.map(user => (
        <div key={user.id} className="user-card">
          <h3>{user.full_name}</h3>
          <p>Phone: {user.phone_number}</p>
          <p className="due">Due: ${user.due_amount.toFixed(2)}</p>
          <p className="due-date">
            Due by: {new Date(user.payment_due_date).toLocaleDateString()}
          </p>
          <button onClick={() => callUser(user.phone_number)}>
            Call User
          </button>
        </div>
      ))}
    </div>
  );
};
```

---

### 7. Upcoming Renewals Report (Admin)

```typescript
import { planService } from '../lib/planService';

const AdminRenewalsScreen = () => {
  const [upcomingRenewals, setUpcomingRenewals] = useState([]);
  
  useEffect(() => {
    const fetchRenewals = async () => {
      const users = await planService.getUsersWithUpcomingRenewals();
      setUpcomingRenewals(users);
    };
    
    fetchRenewals();
  }, []);
  
  const daysUntilExpiry = (expiryDate: string) => {
    const days = Math.ceil(
      (new Date(expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    return days;
  };
  
  return (
    <div>
      <h1>Upcoming Renewals (Next 7 Days)</h1>
      {upcomingRenewals.map(user => (
        <div key={user.id} className="renewal-card">
          <h3>{user.full_name}</h3>
          <p>Plan: {user.plan}</p>
          <p className="warning">
            Expires in {daysUntilExpiry(user.plan_expiry_date)} days
          </p>
          <p>Expiry: {new Date(user.plan_expiry_date).toLocaleDateString()}</p>
        </div>
      ))}
    </div>
  );
};
```

---

### 8. Cache Management

```typescript
import { cache, CACHE_KEYS } from '../lib/cache';

// Clear notification cache when approving user
const approveUserAndClear = async (userId: string) => {
  // ... approval logic ...
  
  // Invalidate caches
  cache.remove(`${CACHE_KEYS.PROFILE_DATA}_expiring_notifications`);
  cache.remove(`${CACHE_KEYS.PROFILE_DATA}_expired_notifications`);
  cache.remove(`${CACHE_KEYS.PROFILE_DATA}_payment_due_notifications`);
};

// Check if cache exists
if (cache.has('some_key')) {
  const data = cache.get('some_key');
}

// Clear all cache
cache.clearAll();
```

---

### 9. Profile Update with Phone Number

```typescript
import { cache, CACHE_KEYS, CACHE_TTL } from '../lib/cache';

const updateUserProfile = async (userId: string, updateData: any) => {
  try {
    const { error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId);
    
    if (error) throw error;
    
    // Update cache
    const currentProfile = cache.get(CACHE_KEYS.PROFILE_DATA) || {};
    cache.set(
      CACHE_KEYS.PROFILE_DATA,
      { ...currentProfile, ...updateData },
      CACHE_TTL.LONG  // 15 minutes
    );
    
    return true;
  } catch (error) {
    console.error('Update failed:', error);
    return false;
  }
};

// Usage
updateUserProfile(userId, {
  phone_number: '+1234567890',
  full_name: 'John Doe',
  height: 180,
  weight: 75
});
```

---

### 10. Notification Types & Responses

```typescript
// Handle different notification types
const handleNotification = (notification: PlanNotification) => {
  switch (notification.type) {
    case 'expiring_soon':
      // Show renewal prompt
      console.log(`${notification.daysLeft} days left to renew`);
      navigateToRenewal();
      break;
      
    case 'expired':
      // Show urgent renewal
      console.log('Plan expired - renew now to continue');
      navigateToRenewal();
      break;
      
    case 'payment_due':
      // Show payment info
      console.log(`Outstanding payment: $${notification.dueAmount}`);
      navigateToPaymentInfo();
      break;
  }
};
```

---

### 11. Phone Number Input Modal

```typescript
// Already implemented in ProfileScreen.tsx
// Shows automatically if phone_number is missing

// To trigger manually:
const [showPhoneModal, setShowPhoneModal] = useState(false);

const handlePhoneNumberSave = async (phoneNumber: string) => {
  const { error } = await supabase
    .from('profiles')
    .update({ phone_number: phoneNumber })
    .eq('id', userId);
  
  if (!error) {
    setShowPhoneModal(false);
    alert('Phone number saved!');
  }
};
```

---

### 12. Approval Modal Implementation

```typescript
// In AdminUsers.tsx - Already implemented
// Shows when admin clicks "Approve" on pending user

const approvalModal = {
  open: true,
  user: selectedUser,
  onConfirm: (paidAmount, dueDate) => {
    // Calculate due amount
    const planPrice = selectedPlan.price;
    const dueAmount = Math.max(0, planPrice - paidAmount);
    
    // Update database
    supabase
      .from('profiles')
      .update({
        paid_amount: paidAmount,
        due_amount: dueAmount,
        payment_due_date: dueDate,
        approval_status: 'approved',
        plan_status: 'active'
      })
      .eq('id', selectedUser.id);
  },
  onCancel: () => {
    // Close modal
  }
};
```

---

### 13. Filtering Expired/Expiring Users

```typescript
// Already implemented in AdminUsers.tsx
// Shows users expiring in 5 days or already expired

const isExpiringSoon = (expiryDate: string) => {
  const days = Math.ceil(
    (new Date(expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );
  return days > 0 && days <= 5;
};

const isExpired = (expiryDate: string) => {
  return Math.ceil(
    (new Date(expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  ) <= 0;
};

// Use in filter
const filteredUsers = users.filter(u => {
  if (showExpiredFilter) {
    return isExpired(u.plan_expiry_date) || isExpiringSoon(u.plan_expiry_date);
  }
  return true;
});
```

---

### 14. Call Integration (Phone Icon)

```typescript
// In AdminUsers.tsx - Phone number shows with call icon

// Make a phone call (native behavior)
const callUser = (phoneNumber: string) => {
  window.location.href = `tel:${phoneNumber}`;
};

// In JSX:
{user.phone_number && (
  <a href={`tel:${user.phone_number}`} onClick={(e) => e.stopPropagation()}>
    <span className="material-symbols-rounded">call</span>
    {user.phone_number}
  </a>
)}
```

---

### 15. Plan Status Automatic Update

```typescript
// Trigger created in database automatically updates plan_status
// Check current status:

const checkPlanStatus = async (userId: string) => {
  const { data: profile } = await supabase
    .from('profiles')
    .select('plan_status, plan_expiry_date')
    .eq('id', userId)
    .single();
  
  console.log('Current status:', profile.plan_status);
  console.log('Expiry:', new Date(profile.plan_expiry_date).toLocaleDateString());
  
  // Status should be:
  // - 'active' if date is in future
  // - 'expired' if date is in past
  // - 'free' if no plan
};
```

---

## Common Workflows

### Workflow 1: Complete User Approval
```
1. User signs up and selects plan
2. Admin sees user in pending list
3. Admin clicks "Approve"
4. Modal asks for payment details
5. Admin enters: Paid Amount, Due Date
6. System saves: plan_status='active', calculates due_amount
7. User can now see plan active with expiry date
8. 5 days before expiry: Notification sent
9. After expiry: Plan marked as expired for payment collection
```

### Workflow 2: Partial Payment Collection
```
1. Admin collects partial payment
2. Updates due_amount in system
3. Sets payment_due_date
4. After collection date: Sends payment reminder
5. When full payment made: due_amount becomes 0
6. User can continue using plan
```

### Workflow 3: Plan Renewal
```
1. Plan expires (plan_status='expired')
2. User gets notification
3. User renews plan
4. New dates set (plan_start_date = old expiry_date)
5. plan_status changes back to 'active'
6. Cycle repeats
```

---

## Database Queries Included

The system includes these optimized queries:

- **Expiring plans (5 days)**: Uses idx_profiles_plan_expiry_date
- **Expired plans**: Uses idx_profiles_plan_status and idx_profiles_plan_expiry_date
- **Payment due**: Uses idx_profiles_payment_due_date
- **Status filtering**: Uses idx_profiles_plan_status

All queries are optimized for performance on large user bases.

---

## Integration Checklist

- [ ] Run fix7_payment_and_plan_tracking.sql migration
- [ ] Update TypeScript types (done in types.ts)
- [ ] Test AdminUsers.tsx approval flow
- [ ] Test ProfileScreen.tsx phone number popup
- [ ] Verify Dashboard notifications appear
- [ ] Test notification bell with count badge
- [ ] Test notification modal displays correctly
- [ ] Test call icon functionality
- [ ] Test expired user filtering
- [ ] Test payment due date saving
- [ ] Clear browser cache to see updates

---

This completes the implementation guide for the payment and plan management system!
