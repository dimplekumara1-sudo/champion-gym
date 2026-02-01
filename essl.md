# ESSL Attendance Setup Documentation

This document outlines the complete setup process for ESSL biometric attendance integration in the Powerflex Elite Fitness Coach application.

## Current Architecture Overview

### 1. ESSL Device Configuration
- **Endpoint**: `https://osjvvcbcvlcdmqxczttf.supabase.co/functions/v1/essl-attendance`
- **Method**: POST
- **Port**: 443 (HTTPS)
- **Format**: JSON

### 2. Data Flow Architecture
```
ESSL Device → Supabase Function → Database Tables → Application UI
```

### 3. Database Schema

#### Profiles Table
- `essl_id` (TEXT UNIQUE): Maps biometric device ID to user profile

#### Attendance Table
- `user_id`: References profiles.id
- `check_in`: Timestamp for check-in
- `check_out`: Timestamp for check-out  
- `device_id`: Source device identifier
- `raw_data`: Complete ESSL payload for debugging

## Implementation Components

### 1. Supabase Function (`supabase/functions/essl-attendance/index.ts`)
- Handles incoming ESSL webhook requests
- Maps device user ID to system user profile via `essl_id`
- Inserts attendance records with device metadata
- Provides CORS support for cross-origin requests

### 2. Admin User Management (`screens/AdminUsers.tsx`)
- ESSL ID field in user profile editor
- Mapping between biometric device ID and system users
- Real-time updates to user profiles

### 3. Attendance Management (`screens/AdminAttendance.tsx`)
- Daily attendance view with filtering
- User-specific attendance tracking
- Grace period management
- Device log integration

### 4. Member Attendance View (`screens/AttendanceScreen.tsx`)
- Personal attendance history
- Monthly/weekly views
- Check-in/check-out duration tracking

## Logging and Monitoring

### 1. Server-Side Logging
- All ESSL payloads logged to Supabase function console
- Error tracking for unmapped user IDs
- Success/failure response logging

### 2. Data Storage
- Complete raw ESSL payload stored in `attendance.raw_data`
- Device ID tracking for source identification
- Timestamp validation and normalization

### 3. Debug Information
- Console logs for user mapping failures
- Payload structure validation
- Response status tracking

## Setup Process

### Step 1: Device Configuration
1. Access eSSL device admin panel
2. Navigate to Web Server/ADMS settings
3. Configure:
   - Server URL: `https://osjvvcbcvlcdmqxczttf.supabase.co/functions/v1/essl-attendance`
   - Port: 443
   - Protocol: HTTPS
   - Request format: JSON

### Step 2: User Mapping
1. Access Admin Dashboard → Members
2. Select user profile
3. Enter ESSL ID (numeric ID from biometric device)
4. Save mapping

### Step 3: Testing
1. Test biometric scan on device
2. Verify webhook receipt in function logs
3. Confirm attendance record creation
4. Check UI display in admin panel

## Expected Payload Format

### Standard ESSL Payload
```json
{
  "UserId": "12345",
  "LogTime": "2026-02-01T09:30:00Z",
  "DeviceId": "ESSL001",
  "Status": "IN"
}
```

### Alternative Payload Formats Supported
- `userId` (camelCase)
- `ID` (uppercase)
- `timestamp` instead of `LogTime`
- `device_id` instead of `DeviceId`

## Error Handling

### Common Issues
1. **User Not Found**: ESSL ID not mapped in user profile
2. **Connection Refused**: Device network connectivity issues
3. **Invalid Payload**: Malformed JSON from device

### Debugging Steps
1. Check Supabase function logs for webhook receipts
2. Verify ESSL ID mapping in user profiles
3. Test device network connectivity
4. Validate payload structure

## Security Considerations

- HTTPS-only communication
- No sensitive data in logs
- Device ID validation
- Request payload sanitization

## Monitoring Metrics

- Successful attendance logs
- Failed user mappings
- Device response times
- Error rates by device

This setup provides a robust attendance tracking system with complete audit trails and real-time monitoring capabilities.