import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WhatsAppWebhookEntry {
  id: string;
  changes: Array<{
    value: {
      messaging_product: string;
      metadata: {
        display_phone_number: string;
        phone_number_id: string;
      };
      statuses?: Array<{
        id: string;
        status: 'sent' | 'delivered' | 'read' | 'failed';
        timestamp: string;
        recipient_id: string;
        errors?: Array<{
          code: number;
          title: string;
          message: string;
        }>;
      }>;
      messages?: Array<{
        from: string;
        id: string;
        timestamp: string;
        type: string;
        text?: {
          body: string;
        };
      }>;
    };
    field: string;
  }>;
}

interface WhatsAppWebhookPayload {
  object: string;
  entry: WhatsAppWebhookEntry[];
}

interface StatusUpdate {
  id: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  recipient_id: string;
  errors?: Array<{
    code: number;
    title: string;
    message: string;
  }>;
}

interface IncomingMessage {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: {
    body: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Handle GET request for webhook verification
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const mode = url.searchParams.get('hub.mode');
      const token = url.searchParams.get('hub.verify_token');
      const challenge = url.searchParams.get('hub.challenge');

      // Verify the webhook (you should set WEBHOOK_VERIFY_TOKEN in your environment)
      const verifyToken = Deno.env.get('WEBHOOK_VERIFY_TOKEN') || 'your_verify_token';
      
      if (mode === 'subscribe' && token === verifyToken) {
        console.log('Webhook verified successfully');
        return new Response(challenge, {
          status: 200,
          headers: { 'Content-Type': 'text/plain' }
        });
      } else {
        console.log('Webhook verification failed');
        return new Response('Forbidden', { status: 403 });
      }
    }

    // Handle POST request for webhook events
    if (req.method === 'POST') {
      const payload: WhatsAppWebhookPayload = await req.json();
      
      console.log('Received webhook payload:', JSON.stringify(payload, null, 2));

      // Process each entry in the webhook payload
      for (const entry of payload.entry) {
        for (const change of entry.changes) {
          // Process status updates
          if (change.value.statuses) {
            for (const status of change.value.statuses) {
              await processStatusUpdate(supabaseClient, status);
            }
          }

          // Process incoming messages (for read receipts)
          if (change.value.messages) {
            for (const message of change.value.messages) {
              await processIncomingMessage(supabaseClient, message);
            }
          }
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    return new Response('Method not allowed', { status: 405 });

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})

async function processStatusUpdate(supabaseClient: SupabaseClient, status: StatusUpdate) {
  try {
    console.log('Processing status update:', status);

    const updateData: Record<string, unknown> = {
      status: status.status,
    };

    // Set timestamp based on status
    const timestamp = new Date(parseInt(status.timestamp) * 1000).toISOString();
    
    switch (status.status) {
      case 'sent':
        updateData.sent_at = timestamp;
        break;
      case 'delivered':
        updateData.delivered_at = timestamp;
        break;
      case 'read':
        updateData.read_at = timestamp;
        break;
      case 'failed':
        updateData.failed_at = timestamp;
        if (status.errors && status.errors.length > 0) {
          updateData.error_message = status.errors.map(e => `${e.title}: ${e.message}`).join('; ');
        }
        break;
    }

    // Update recipient status by message_id
    const { data, error } = await supabaseClient
      .from('whatsapp_blast_recipients')
      .update(updateData)
      .eq('message_id', status.id);

    if (error) {
      console.error('Error updating recipient status:', error);
    } else {
      console.log('Successfully updated recipient status for message:', status.id);
    }

  } catch (error) {
    console.error('Error processing status update:', error);
  }
}

async function processIncomingMessage(supabaseClient: SupabaseClient, message: IncomingMessage) {
  try {
    console.log('Processing incoming message:', message);

    // This could be used for additional tracking or auto-responses
    // For now, we'll just log it
    console.log('Received message from:', message.from, 'Content:', message.text?.body);

  } catch (error) {
    console.error('Error processing incoming message:', error);
  }
}

// Test endpoint to verify webhook connectivity
async function testWebhookConnectivity() {
  try {
    const response = await fetch('https://n8n-rag-n8n.q1opdj.easypanel.host/webhook/73d7866b-670a-44f9-b4af-9df48698e5b9/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        test: true,
        timestamp: new Date().toISOString(),
        source: 'whatsapp-webhook-function'
      })
    });

    const result = await response.text();
    console.log('Webhook connectivity test result:', result);
    return result;
  } catch (error) {
    console.error('Webhook connectivity test failed:', error);
    return null;
  }
}