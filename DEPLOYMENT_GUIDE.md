# Supabase Edge Functions Deployment Guide

This guide covers deploying and managing Supabase Edge Functions in this project.

## Prerequisites

- [Supabase CLI](https://supabase.com/docs/reference/cli) installed
- Local Supabase project initialized
- Environment variables configured

## Available Functions

### 1. FatSecret API Proxy
- **Path**: `supabase/functions/fatsecret-proxy/index.ts`
- **Purpose**: Proxy for FatSecret nutrition API with OAuth token caching
- **Environment Variables**:
  ```
  FATSECRET_CLIENT_ID=your_fatsecret_client_id
  FATSECRET_CLIENT_SECRET=your_fatsecret_client_secret
  ```

### 2. eSSL Attendance Webhook
- **Path**: `supabase/functions/essl-attendance/index.ts`
- **Purpose**: Handle eSSL device attendance webhooks
- **Environment Variables**:
  ```
  SUPABASE_URL=your_supabase_url
  SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
  ```

## Deployment Steps

### 1. Initialize Supabase Project
```bash
# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Start local development (optional)
supabase start
```

### 2. Deploy Functions

#### Deploy Individual Functions
```bash
# Deploy FatSecret proxy
supabase functions deploy fatsecret-proxy

# Deploy eSSL attendance
supabase functions deploy essl-attendance
```

#### Deploy All Functions
```bash
supabase functions deploy
```

### 3. Set Environment Variables

#### For FatSecret Proxy
```bash
supabase secrets set FATSECRET_CLIENT_ID=your_fatsecret_client_id
supabase secrets set FATSECRET_CLIENT_SECRET=your_fatsecret_client_secret
```

#### For eSSL Attendance (usually inherited)
```bash
supabase secrets set SUPABASE_URL=your_supabase_url
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 4. Verify Deployment
```bash
# List deployed functions
supabase functions list

# Check function logs
supabase functions logs fatsecret-proxy
supabase functions logs essl-attendance
```

## Local Development

### Run Functions Locally
```bash
# Start local Supabase
supabase start

# Serve functions locally
supabase functions serve --env-file .env.local
```

### Test Functions
```bash
# Test FatSecret proxy
curl -X POST http://localhost:54321/functions/v1/fatsecret-proxy \
  -H "Content-Type: application/json" \
  -d '{"action": "search", "query": "apple"}'

# Test eSSL attendance
curl -X POST http://localhost:54321/functions/v1/essl-attendance \
  -H "Content-Type: application/json" \
  -d '{"UserId": "123", "LogTime": "2024-01-01T09:00:00Z", "DeviceId": "device1"}'
```

## Function URLs

After deployment, your functions will be available at:
- `https://your-project-ref.supabase.co/functions/v1/fatsecret-proxy`
- `https://your-project-ref.supabase.co/functions/v1/essl-attendance`

## Monitoring and Troubleshooting

### View Logs
```bash
# Real-time logs
supabase functions logs --follow

# Specific function logs
supabase functions logs fatsecret-proxy
supabase functions logs essl-attendance
```

### Common Issues

1. **CORS Errors**: Functions include CORS headers by default
2. **Missing Environment Variables**: Use `supabase secrets list` to verify
3. **Function Timeouts**: Edge Functions have a 30-second timeout limit
4. **Memory Limits**: Functions have 150MB memory limit

### Debug Tips

- Check the Deno runtime logs for errors
- Verify environment variables are properly set
- Test with simple payloads first
- Use `console.log()` for debugging (visible in logs)

## Security Best Practices

1. **Environment Variables**: Never commit secrets to git
2. **CORS**: Configure appropriate origins for production
3. **Input Validation**: Functions include basic validation
4. **Error Handling**: Sensitive data is not exposed in error messages

## CI/CD Integration

### GitHub Actions Example
```yaml
name: Deploy Edge Functions
on:
  push:
    paths:
      - 'supabase/functions/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: supabase/cli-action@v1
        with:
          args: functions deploy
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
```

## Performance Optimization

- Functions are automatically cold-start optimized
- Implement caching where possible (like FatSecret token cache)
- Use environment-specific configurations
- Monitor function usage and execution times

## Backup and Recovery

- Function code is stored in your repository
- Environment variables backed up separately
- Use `supabase db dump` for database backup
- Functions can be redeployed from source code at any time

## Support

- [Supabase Documentation](https://supabase.com/docs/reference)
- [Edge Functions Guide](https://supabase.com/docs/guides/functions)
- [Deno Documentation](https://deno.land/doc)