# WhatsApp Integration Documentation

## Overview

This document describes the WhatsApp Business API integration for sending event tickets via WhatsApp messages.

## Features

- ✅ **WhatsApp Ticket Delivery** - Send tickets via WhatsApp Business API
- ✅ **QR Code Header** - Include QR code as header image in messages
- ✅ **Beautiful Template** - Use attractive `ticket_beautiful` template
- ✅ **Rate Limiting** - Prevent API abuse with rate limiting
- ✅ **Error Handling** - Comprehensive error handling and logging
- ✅ **Admin Controls** - Enable/disable WhatsApp per event
- ✅ **Status Tracking** - Track WhatsApp delivery status in database

## Template Structure

The system uses the `ticket_beautiful` template with the following structure:

```
🎉 Hello {{1}}! 🎉

🎪 Thank you for registering for {{2}}!

📅 Date: {{3}}
📍 Location: {{4}}
🎟️ Ticket Code: {{5}}

✨ We can't wait to see you there! ✨
```

### Parameters

1. `{{1}}` - Customer Name
2. `{{2}}` - Event Name  
3. `{{3}}` - Date & Time
4. `{{4}}` - Location
5. `{{5}}` - Ticket Code

## Environment Variables

### Required Variables

Set these in Supabase Dashboard → Settings → Edge Functions:

```bash
# WhatsApp Business API
WHATSAPP_ACCESS_TOKEN=your_whatsapp_access_token
WHATSAPP_PHONE_NUMBER_ID=your_whatsapp_phone_number_id
WHATSAPP_TEMPLATE_NAME=ticket_beautiful
WHATSAPP_LANGUAGE_CODE=id
```

### Optional Variables

```bash
# Rate Limiting (defaults will be used if not set)
WHATSAPP_RATE_LIMIT_PER_MINUTE=250
WHATSAPP_RATE_LIMIT_PER_HOUR=1000
```

## Database Schema

### Events Table
```sql
ALTER TABLE events ADD COLUMN whatsapp_enabled BOOLEAN DEFAULT false;
```

### Registrations Table
```sql
ALTER TABLE registrations ADD COLUMN phone_number TEXT;
```

### Tickets Table
```sql
ALTER TABLE tickets ADD COLUMN whatsapp_sent_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE tickets ADD COLUMN whatsapp_sent BOOLEAN DEFAULT false;
```

## API Endpoints

### Send WhatsApp Ticket

**Endpoint:** `POST /functions/v1/send-whatsapp-ticket`

**Request Body:**
```json
{
  "registration_id": "uuid",
  "template_name": "ticket_beautiful", // optional
  "language_code": "id", // optional
  "include_header": true, // optional, default: true
  "custom_date_format": "DD/MM/YYYY HH:mm", // optional
  "use_short_params": false // optional, default: false
}
```

**Response:**
```json
{
  "success": true,
  "message": "WhatsApp ticket sent successfully",
  "recipient": "6281314942012",
  "message_id": "wamid.HBgNNjI4MTMxNDk0MjAxMhUCABEYEjU0MkM1RERFNjJBMTlFODdCQQA=",
  "template_used": "ticket_beautiful",
  "language_used": "id",
  "include_header": true
}
```

## Frontend Integration

### Event Registration Form

The registration form includes an optional WhatsApp number field:

```tsx
{event.whatsapp_enabled && (
  <div className="space-y-2">
    <Label htmlFor="phone">WhatsApp Number (Optional)</Label>
    <Input
      id="phone"
      type="tel"
      placeholder="6281314942011"
      value={participantPhone}
      onChange={(e) => setParticipantPhone(e.target.value)}
    />
  </div>
)}
```

### Admin Dashboard

Admins can enable/disable WhatsApp per event and view delivery status:

```tsx
// Enable WhatsApp toggle
<Switch
  checked={whatsappEnabled}
  onCheckedChange={setWhatsappEnabled}
/>

// WhatsApp status in registrations table
<TableCell>
  {registration.tickets?.whatsapp_sent ? (
    <Badge variant="success">Sent</Badge>
  ) : (
    <Badge variant="secondary">Pending</Badge>
  )}
</TableCell>
```

## Error Handling

The system handles various error scenarios:

- **Invalid Phone Number** - Validates Indonesian phone format (628...)
- **Rate Limiting** - Prevents spam with configurable limits
- **Template Errors** - Handles WhatsApp API template errors
- **Network Errors** - Retries and graceful degradation
- **Duplicate Sending** - Prevents sending same ticket twice

## Rate Limiting

Default rate limits:
- **Per Second:** 5 messages
- **Per Minute:** 250 messages  
- **Per Hour:** 1000 messages

These can be configured via environment variables.

## Testing

Use the provided test script to verify the integration:

```bash
node test-ticket-beautiful.cjs
```

## Troubleshooting

### Common Issues

1. **Template Not Found**
   - Verify template name in WhatsApp Business Manager
   - Check template approval status

2. **Invalid Parameter Format**
   - Ensure template uses numbered parameters {{1}}, {{2}}, etc.
   - Verify parameter count matches template

3. **QR Image Not Loading**
   - Check Supabase Storage permissions
   - Verify image URL accessibility

4. **Rate Limit Exceeded**
   - Wait for rate limit window to reset
   - Adjust rate limiting configuration

### Debug Steps

1. Check Supabase Edge Function logs
2. Verify environment variables are set
3. Test with minimal payload
4. Check WhatsApp Business Manager template status

## Security Considerations

- All sensitive credentials stored in Supabase secrets
- Rate limiting prevents abuse
- Phone number validation
- JWT verification for API access
- No hardcoded credentials in frontend

## Future Enhancements

- [ ] Multiple template support
- [ ] Custom message templates
- [ ] Bulk sending capabilities
- [ ] Delivery status webhooks
- [ ] Analytics and reporting 