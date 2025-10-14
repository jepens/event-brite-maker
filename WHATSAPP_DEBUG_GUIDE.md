# WhatsApp Debugging Guide

Panduan lengkap untuk mendiagnosis dan memperbaiki masalah pengiriman WhatsApp.

## 🔍 Tools Debugging yang Tersedia

### 1. Debug Endpoint di Edge Function
Endpoint khusus untuk memeriksa konfigurasi dan koneksi:

```bash
# Test debug endpoint
node test-debug-endpoint.js
```

### 2. WhatsApp API Direct Test
Skrip untuk menguji API WhatsApp secara langsung:

```bash
# Set environment variables
export WHATSAPP_ACCESS_TOKEN="your_token"
export WHATSAPP_PHONE_NUMBER_ID="your_phone_id"
export WHATSAPP_TEMPLATE_NAME="your_template"
export TEST_PHONE_NUMBER="628123456789"

# Run test
node debug-whatsapp-api.js
```

### 3. Supabase Environment Check
Skrip untuk memeriksa koneksi Supabase:

```bash
# Set environment variables
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your_service_key"

# Run check
node check-supabase-env.js
```

## 🚨 Common Issues & Solutions

### Issue 1: Environment Variables Missing

**Symptoms:**
- Error: "Missing required environment variable"
- Debug endpoint shows false for environment variables

**Solution:**
1. Go to Supabase Dashboard
2. Navigate to Settings > Edge Functions > Environment Variables
3. Add the following variables:
   ```
   WHATSAPP_ACCESS_TOKEN=your_facebook_access_token
   WHATSAPP_PHONE_NUMBER_ID=your_whatsapp_phone_number_id
   WHATSAPP_TEMPLATE_NAME=your_approved_template_name
   ```

### Issue 2: Invalid Access Token

**Symptoms:**
- HTTP 401 Unauthorized
- Error: "Invalid access token"
- WhatsApp API test fails

**Solution:**
1. Check if token is expired in Facebook Business Manager
2. Generate new token with proper permissions:
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`
3. Update token in Supabase environment variables

### Issue 3: Phone Number Format Issues

**Symptoms:**
- Error: "Invalid phone number"
- Messages not delivered

**Solution:**
1. Ensure phone numbers are in format: `628xxxxxxxxxx`
2. Use the validation function:
   ```javascript
   function validatePhoneNumber(phone) {
     const digitsOnly = phone.replace(/\D/g, '');
     return digitsOnly.startsWith('62') && digitsOnly.length >= 11;
   }
   ```

### Issue 4: Template Not Found

**Symptoms:**
- Error: "Template does not exist"
- HTTP 400 Bad Request

**Solution:**
1. Check template status in WhatsApp Business Manager
2. Ensure template is approved
3. Verify template name matches exactly (case-sensitive)
4. Use debug endpoint to list available templates

### Issue 5: Rate Limiting

**Symptoms:**
- Error code 80004
- "Rate limit exceeded" messages
- Some messages fail randomly

**Solution:**
1. Current rate limits in code:
   ```javascript
   const RATE_LIMITS = {
     messages_per_second: 2,
     messages_per_minute: 80,
     messages_per_hour: 400,
     batch_delay_ms: 1500
   };
   ```
2. Reduce sending rate if needed
3. Implement exponential backoff (already implemented)

### Issue 6: Database Connection Issues

**Symptoms:**
- Error: "Failed to fetch campaign"
- Database connection test fails

**Solution:**
1. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
2. Verify database tables exist:
   ```sql
   SELECT * FROM whatsapp_blast_campaigns LIMIT 1;
   SELECT * FROM whatsapp_blast_recipients LIMIT 1;
   ```

## 📊 Monitoring & Logging

### Edge Function Logs
View logs in Supabase Dashboard > Edge Functions > Logs

Key log patterns to look for:
```
✅ WhatsApp message sent successfully
❌ WhatsApp API error
⏳ Rate limit detected
🔄 Network/Parse error
💾 Updating recipient status
```

### Database Status Tracking
Monitor campaign and recipient status:

```sql
-- Campaign status overview
SELECT status, COUNT(*) 
FROM whatsapp_blast_campaigns 
GROUP BY status;

-- Recipient status overview
SELECT status, COUNT(*) 
FROM whatsapp_blast_recipients 
GROUP BY status;

-- Failed recipients with reasons
SELECT phone_number, failed_reason, retry_count
FROM whatsapp_blast_recipients 
WHERE status = 'failed';
```

## 🔧 Step-by-Step Debugging Process

### Step 1: Run Debug Endpoint
```bash
node test-debug-endpoint.js
```

Check output for:
- ✅ All environment variables set
- ✅ Database connection successful
- ✅ WhatsApp API test successful

### Step 2: Test Direct API Call
```bash
node debug-whatsapp-api.js
```

This will test:
- Graph API connection
- Template availability
- Message sending
- Phone number validation

### Step 3: Check Campaign Status
```sql
SELECT * FROM whatsapp_blast_campaigns 
WHERE id = 'your_campaign_id';

SELECT status, COUNT(*) 
FROM whatsapp_blast_recipients 
WHERE campaign_id = 'your_campaign_id'
GROUP BY status;
```

### Step 4: Review Logs
1. Check Edge Function logs in Supabase Dashboard
2. Look for error patterns
3. Check timing of failures

### Step 5: Test with Small Batch
1. Create test campaign with 1-2 recipients
2. Monitor logs in real-time
3. Verify message delivery

## 📱 WhatsApp Business API Limits

### Current Limits (as of 2024)
- **Messaging Rate**: 250 messages/second (we use 2/second for safety)
- **Daily Limit**: Varies by phone number tier
- **Template Messages**: Required for business-initiated conversations

### Tier System
- **Tier 1**: 1,000 conversations/day
- **Tier 2**: 10,000 conversations/day  
- **Tier 3**: 100,000 conversations/day

## 🛠️ Advanced Debugging

### Enable Verbose Logging
Add to Edge Function for detailed debugging:

```javascript
// Add at the top of processCampaign function
console.log('=== VERBOSE DEBUG MODE ===');
console.log('Campaign details:', JSON.stringify(campaign, null, 2));
console.log('Recipients:', recipients.map(r => ({ id: r.id, phone: r.phone_number })));
```

### Test Individual Components

1. **Test Database Only:**
   ```javascript
   const { data, error } = await supabase
     .from('whatsapp_blast_campaigns')
     .select('*')
     .eq('id', 'test_id');
   ```

2. **Test WhatsApp API Only:**
   ```bash
   curl -X GET \
     "https://graph.facebook.com/v18.0/YOUR_PHONE_ID" \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

3. **Test Phone Validation:**
   ```javascript
   const testNumbers = ['08123456789', '628123456789', '+628123456789'];
   testNumbers.forEach(num => {
     console.log(`${num} -> ${formatPhoneNumber(num)} (${validatePhoneNumber(num)})`);
   });
   ```

## 📞 Support & Resources

### Facebook Developer Resources
- [WhatsApp Business API Documentation](https://developers.facebook.com/docs/whatsapp)
- [Graph API Explorer](https://developers.facebook.com/tools/explorer/)
- [WhatsApp Business Manager](https://business.facebook.com/wa/manage/)

### Error Code Reference
- **80004**: Rate limit exceeded
- **100**: Invalid parameter
- **190**: Invalid access token
- **368**: Temporarily blocked for policy violations

### Getting Help
1. Check Facebook Developer Community
2. Review WhatsApp Business API status page
3. Contact Facebook Business Support (for API issues)
4. Check Supabase Discord (for Edge Function issues)

## 🔄 Automated Monitoring

Consider implementing:
1. Health check endpoint that runs periodically
2. Alert system for failed campaigns
3. Dashboard for real-time monitoring
4. Automated retry for failed messages

## 📝 Troubleshooting Checklist

Before reporting issues, verify:

- [ ] All environment variables are set correctly
- [ ] WhatsApp Business account is verified
- [ ] Templates are approved and active
- [ ] Phone numbers are in correct format
- [ ] Rate limits are not exceeded
- [ ] Database tables exist and are accessible
- [ ] Edge Function is deployed successfully
- [ ] Network connectivity is stable

## 🎯 Performance Optimization

### Current Settings
```javascript
const RATE_LIMITS = {
  messages_per_second: 2,        // Conservative for reliability
  messages_per_minute: 80,       // Well below API limits
  messages_per_hour: 400,        // Safe daily usage
  retry_after_seconds: 30,       // Backoff period
  max_retries: 3,                // Retry attempts
  batch_delay_ms: 1500           // Delay between messages
};
```

### Optimization Tips
1. **Increase rate limits gradually** after confirming stability
2. **Batch recipients** by phone number provider for better delivery
3. **Schedule campaigns** during optimal hours
4. **Monitor delivery rates** and adjust accordingly

---

*Last updated: January 2025*