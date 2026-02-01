# ESSL Edge Function Testing Guide

This document provides instructions and examples for testing the ESSL attendance edge function.

## Edge Function Endpoint
- **URL**: `https://osjvvcbcvlcdmqxczttf.supabase.co/functions/v1/essl-attendance`
- **Method**: POST
- **Headers**: 
  - `Content-Type: application/json`
- **Authentication**: If you get a `401 Unauthorized` error, you must redeploy the function to allow public access (required for most ESSL devices):
  ```bash
  npx supabase functions deploy essl-attendance --no-verify-jwt
  ```

## Test Cases

### 1. Standard Attendance Log
This simulates a biometric scan. All logs are recorded as "one-way" entries in the `check_in` column.

```bash
curl -X POST https://osjvvcbcvlcdmqxczttf.supabase.co/functions/v1/essl-attendance \
  -H "Content-Type: application/json" \
  -d '{
    "EmployeeCode": "1",
    "LogTime": "2026-02-01T09:30:00Z",
    "DeviceId": "TEST_DEVICE_001"
  }'
```

### 2. Alternative Payload Format (UserId)
The function also supports `UserId` or `ID` for flexibility.

```bash
curl -X POST https://osjvvcbcvlcdmqxczttf.supabase.co/functions/v1/essl-attendance \
  -H "Content-Type: application/json" \
  -d '{
    "UserId": "1",
    "timestamp": "2026-02-01T10:00:00Z",
    "device_id": "TEST_DEVICE_002"
  }'
```

### 4. Missing User ID (Error Case)
Test how the function handles missing required fields.

```bash
curl -X POST https://osjvvcbcvlcdmqxczttf.supabase.co/functions/v1/essl-attendance \
  -H "Content-Type: application/json" \
  -d '{
    "LogTime": "2026-02-01T10:00:00Z",
    "Status": "IN"
  }'
```

## Verification Steps

1. **HTTP Status Code**: A successful request should return `200 OK`.
2. **Response Body**: Should be `{"success": true, "message": "Attendance logged"}`.
3. **Database Check**:
   - Query the `attendance` table to ensure the record was inserted.
   - If the `UserId` matches an `essl_id` in the `profiles` table, the `user_id` field should be populated.
   - If no match is found, `user_id` will be `null` but the record will still be created with `raw_data`.
4. **Function Logs**:
   - Check the Supabase Dashboard -> Edge Functions -> essl-attendance -> Logs to see the received payload and any internal processing messages.

## Pre-requisites for Mapping
To ensure the attendance maps to a specific user:
1. Go to the Admin Dashboard in the application.
2. Edit a user profile.
3. Set the **ESSL ID** to "12345" (or whatever ID you use in tests).
4. Run the test command again.
