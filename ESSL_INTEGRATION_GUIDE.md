# eSSL Biometric Integration Guide

This guide explains how to connect your eSSL/ZKTeco biometric attendance device to the Challenge Gym management system.

## 1. Server Configuration

To connect your device, you need to configure the **Web Server** or **ADMS** settings in your eSSL device menu.

### Method A: Direct Connection (If your device supports custom URLs)
- **Server URL**: `https://osjvvcbcvlcdmqxczttf.supabase.co/functions/v1/essl-attendance`
- **Port**: `443`
- **HTTPS**: ON

### Method B: Cloudflare Proxy (Recommended for ADMS devices)
If your device does not have a "Request URL" field or hides the Port/HTTPS options, use a Cloudflare Worker bridge.

**Worker Code:**
```javascript
export default {
  async fetch(request) {
    const target = "https://osjvvcbcvlcdmqxczttf.supabase.co/functions/v1/essl-attendance";
    return fetch(new Request(target, {
      method: request.method,
      headers: request.headers,
      body: request.body
    }));
  }
};
```

**Device Settings with Proxy:**
- **Server Address**: `your-worker-name.workers.dev`
- **Server Port**: `80`
- **HTTPS**: OFF
- **Proxy Server**: OFF

*Note: The endpoint expects standard ADMS payload or JSON with `EmployeeCode`, `LogTime`, and `DeviceId`.*

## 2. User Management (Mapping IDs)

For the system to recognize which member is checking in, you must map the **Biometric ID** (User ID on the device) to the member in the admin dashboard.

### Steps:
1. Open the **Admin Dashboard**.
2. Go to the **Members** section.
3. Click on a member to open their details.
4. Enter the **eSSL ID** (the numeric ID assigned to them on the biometric device).
5. Click **Save eSSL ID**.

## 3. Attendance Management

Once configured:
- Every time a user scans their finger/face, the device sends a log to the server.
- The system automatically matches the ID with the member's profile.
- Records appear instantly in the **Attendance Management** screen.
- You can filter attendance **Date-wise** using the calendar at the top of the Attendance screen.

## 4. Troubleshooting
- **Connection Refused**: Check if the device has internet access.
- **User Not Found**: Ensure the `essl_id` in the dashboard matches exactly with the ID on the device.
- **Logs not appearing**: Verify the Server URL is entered correctly in the device's ADMS/Cloud settings.
