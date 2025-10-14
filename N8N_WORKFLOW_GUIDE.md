# N8N WhatsApp Webhook Router - Panduan Setup

## Overview
Workflow n8n ini berfungsi sebagai router untuk webhook WhatsApp yang dapat mengirim data ke multiple endpoints secara parallel, termasuk fungsi Supabase Anda.

## Fitur Workflow

### 1. **Webhook Receiver**
- Menerima webhook POST dari WhatsApp Business API
- Path: `/whatsapp-webhook`
- Method: POST

### 2. **Message Filter**
- Memfilter hanya pesan teks
- Mengabaikan pesan media, status, dll.

### 3. **Data Parser**
- Mengekstrak data penting dari webhook WhatsApp:
  - Message ID, From, Timestamp
  - Message Text, Contact Name
  - Business Phone Number ID
  - Metadata lainnya

### 4. **Multiple Endpoints (Parallel Processing)**
- **Supabase Webhook**: Mengirim ke fungsi `whatsapp-webhook`
- **Auto Response**: Mengirim ke fungsi `send-whatsapp-ticket`
- **Analytics Tracking**: Mengirim data ke service analytics
- **Logging Service**: Mengirim log ke service logging

### 5. **Response Aggregation**
- Mengumpulkan response dari semua endpoints
- Memberikan summary status

### 6. **Error Handling**
- Menangani error dengan graceful
- Memberikan response yang sesuai

## Setup Instructions

### 1. Import Workflow ke N8N
```bash
# Copy file n8n-whatsapp-router-workflow.json
# Import melalui N8N UI: Settings > Import from file
```

### 2. Konfigurasi Credentials

#### Supabase API Credential
```json
{
  "name": "Supabase API",
  "type": "supabaseApi",
  "data": {
    "host": "https://mjolfjoqfnszvvlbzhjn.supabase.co",
    "serviceRole": "YOUR_SUPABASE_SERVICE_ROLE_KEY"
  }
}
```

### 3. Update Endpoints

#### A. Supabase Endpoints
Ganti `YOUR_SUPABASE_ANON_KEY` dengan key yang sebenarnya:
```
Authorization: Bearer YOUR_SUPABASE_ANON_KEY
```

#### B. Analytics Endpoint
Update URL dan API key:
```
URL: https://your-analytics-endpoint.com/webhook
X-API-Key: YOUR_ANALYTICS_API_KEY
```

#### C. Logging Service
Update URL sesuai service logging Anda:
```
URL: https://your-logging-service.com/logs
```

### 4. Activate Workflow
- Pastikan workflow dalam status "Active"
- Test webhook URL: `https://your-n8n-instance.com/webhook/whatsapp-webhook`

## Webhook URL untuk WhatsApp Business API

Setelah workflow aktif, gunakan URL ini di WhatsApp Business API:
```
https://your-n8n-instance.com/webhook/whatsapp-webhook
```

## Testing

### 1. Test dengan cURL
```bash
curl -X POST https://your-n8n-instance.com/webhook/whatsapp-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "entry": [{
      "changes": [{
        "value": {
          "messages": [{
            "id": "test123",
            "from": "6281234567890",
            "timestamp": "1673123456",
            "type": "text",
            "text": {
              "body": "Hello test"
            }
          }],
          "contacts": [{
            "profile": {
              "name": "Test User"
            },
            "wa_id": "6281234567890"
          }],
          "metadata": {
            "phone_number_id": "123456789",
            "display_phone_number": "62812345678"
          }
        }
      }]
    }]
  }'
```

### 2. Expected Response
```json
{
  "success": true,
  "message": "WhatsApp webhook processed successfully",
  "timestamp": "2025-01-13T18:45:00.000Z",
  "endpoints_called": 4,
  "responses": [
    {
      "endpoint": 1,
      "status": "completed",
      "response_time": "unknown"
    }
  ]
}
```

## Monitoring

### 1. N8N Execution Log
- Monitor di N8N UI: Executions tab
- Check untuk errors atau failed executions

### 2. Endpoint Monitoring
- Monitor response dari masing-masing endpoint
- Setup alerts untuk failed requests

## Customization

### 1. Menambah Endpoint Baru
1. Duplicate node "Analytics Tracking"
2. Update URL dan headers
3. Connect ke "Parse WhatsApp Data" dan "Aggregate Responses"

### 2. Mengubah Filter Logic
Edit node "Filter Messages" untuk:
- Support message types lain (image, document, dll)
- Add custom filtering logic

### 3. Custom Data Processing
Edit node "Parse WhatsApp Data" untuk:
- Extract data tambahan
- Transform data format
- Add business logic

## Troubleshooting

### 1. Webhook Tidak Menerima Data
- Check webhook URL di WhatsApp Business API
- Verify n8n instance accessible dari internet
- Check firewall/security groups

### 2. Endpoint Failures
- Check credentials dan API keys
- Verify endpoint URLs
- Monitor network connectivity

### 3. Performance Issues
- Monitor execution time
- Consider adding timeout settings
- Optimize parallel processing

## Security Considerations

1. **API Keys**: Store di n8n credentials, jangan hardcode
2. **HTTPS**: Pastikan semua endpoints menggunakan HTTPS
3. **Rate Limiting**: Implement rate limiting di endpoints
4. **Validation**: Add input validation untuk webhook data
5. **Monitoring**: Setup monitoring untuk detect anomalies

## Next Steps

1. Deploy n8n instance (cloud atau self-hosted)
2. Import dan configure workflow
3. Update WhatsApp Business API webhook URL
4. Monitor dan optimize performance
5. Add additional endpoints sesuai kebutuhan