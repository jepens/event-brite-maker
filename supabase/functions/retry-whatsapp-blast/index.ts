import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RetryRequest {
  campaign_id?: string;
  recipient_ids?: string[];
  max_retries?: number;
  delay_minutes?: number;
}

interface RetryStats {
  total_eligible: number;
  retried: number;
  skipped: number;
  errors: number;
  details: Array<{
    recipient_id: string;
    phone: string;
    status: 'retried' | 'skipped' | 'error';
    reason: string;
  }>;
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

    const { campaign_id, recipient_ids, max_retries = 3, delay_minutes = 5 }: RetryRequest = await req.json()

    console.log('🔄 Retry WhatsApp Blast Request:', { 
      campaign_id, 
      recipient_ids: recipient_ids?.length || 'all', 
      max_retries, 
      delay_minutes 
    })

    // Build query for failed recipients eligible for retry
    let query = supabaseClient
      .from('whatsapp_blast_recipients')
      .select('*')
      .eq('status', 'failed')
      .lt('retry_count', max_retries)

    // Filter by campaign if specified
    if (campaign_id) {
      query = query.eq('campaign_id', campaign_id)
    }

    // Filter by specific recipient IDs if specified
    if (recipient_ids && recipient_ids.length > 0) {
      query = query.in('id', recipient_ids)
    }

    // Get failed recipients
    const { data: failedRecipients, error: fetchError } = await query

    if (fetchError) {
      console.error('❌ Error fetching failed recipients:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch recipients', details: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!failedRecipients || failedRecipients.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: 'No eligible recipients found for retry',
          stats: { total_eligible: 0, retried: 0, skipped: 0, errors: 0, details: [] }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`📊 Found ${failedRecipients.length} eligible recipients for retry`)

    const stats: RetryStats = {
      total_eligible: failedRecipients.length,
      retried: 0,
      skipped: 0,
      errors: 0,
      details: []
    }

    // Process each failed recipient
    for (const recipient of failedRecipients) {
      try {
        // Check if enough time has passed since last retry
        const now = new Date()
        const lastRetry = recipient.last_retry_at ? new Date(recipient.last_retry_at) : null
        const minRetryTime = lastRetry ? new Date(lastRetry.getTime() + (delay_minutes * 60 * 1000)) : now

        if (now < minRetryTime) {
          console.log(`⏳ Skipping ${recipient.phone} - too soon for retry`)
          stats.skipped++
          stats.details.push({
            recipient_id: recipient.id,
            phone: recipient.phone,
            status: 'skipped',
            reason: `Too soon for retry (wait ${Math.ceil((minRetryTime.getTime() - now.getTime()) / 60000)} more minutes)`
          })
          continue
        }

        // Determine retry strategy based on error type
        let retryDelay = delay_minutes
        let shouldRetry = true

        if (recipient.error_message) {
          const errorMsg = recipient.error_message.toLowerCase()
          
          // Phone validation errors - retry immediately with fixed validation
          if (errorMsg.includes('invalid phone number format')) {
            retryDelay = 0 // Retry immediately
          }
          // Rate limit errors - longer delay
          else if (errorMsg.includes('rate limit') || errorMsg.includes('too many requests')) {
            retryDelay = delay_minutes * 2
          }
          // Network/timeout errors - standard delay
          else if (errorMsg.includes('timeout') || errorMsg.includes('network')) {
            retryDelay = delay_minutes
          }
          // Permanent errors - don't retry
          else if (errorMsg.includes('invalid number') || errorMsg.includes('blocked')) {
            shouldRetry = false
          }
        }

        if (!shouldRetry) {
          console.log(`🚫 Skipping ${recipient.phone} - permanent error`)
          stats.skipped++
          stats.details.push({
            recipient_id: recipient.id,
            phone: recipient.phone,
            status: 'skipped',
            reason: 'Permanent error - not retryable'
          })
          continue
        }

        // Calculate next retry time
        const nextRetryAt = new Date(now.getTime() + (retryDelay * 60 * 1000))

        // Update recipient for retry
        const { error: updateError } = await supabaseClient
          .from('whatsapp_blast_recipients')
          .update({
            status: 'pending',
            retry_count: (recipient.retry_count || 0) + 1,
            last_retry_at: now.toISOString(),
            next_retry_at: nextRetryAt.toISOString(),
            retry_reason: `Retry attempt ${(recipient.retry_count || 0) + 1} - ${recipient.error_message || 'Unknown error'}`,
            error_message: null // Clear previous error
          })
          .eq('id', recipient.id)

        if (updateError) {
          console.error(`❌ Error updating recipient ${recipient.phone}:`, updateError)
          stats.errors++
          stats.details.push({
            recipient_id: recipient.id,
            phone: recipient.phone,
            status: 'error',
            reason: `Update failed: ${updateError.message}`
          })
          continue
        }

        console.log(`✅ Scheduled retry for ${recipient.phone} (attempt ${(recipient.retry_count || 0) + 1})`)
        stats.retried++
        stats.details.push({
          recipient_id: recipient.id,
          phone: recipient.phone,
          status: 'retried',
          reason: `Scheduled for retry in ${retryDelay} minutes`
        })

      } catch (error) {
        console.error(`❌ Error processing recipient ${recipient.phone}:`, error)
        stats.errors++
        stats.details.push({
          recipient_id: recipient.id,
          phone: recipient.phone,
          status: 'error',
          reason: `Processing error: ${error.message}`
        })
      }
    }

    // If we have recipients scheduled for retry, trigger the blast function
    if (stats.retried > 0) {
      try {
        console.log(`🚀 Triggering blast for ${stats.retried} retried recipients`)
        
        // Call the main blast function to process pending recipients
        const blastResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-whatsapp-blast`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            campaign_id: campaign_id,
            retry_mode: true,
            batch_size: Math.min(stats.retried, 5), // Smaller batch for retries
            delay_seconds: 30 // Longer delay for retries
          })
        })

        if (!blastResponse.ok) {
          console.warn('⚠️ Blast trigger failed, but recipients are scheduled for retry')
        } else {
          console.log('✅ Blast triggered successfully for retry')
        }
      } catch (error) {
        console.warn('⚠️ Failed to trigger blast, but recipients are scheduled:', error)
      }
    }

    const response = {
      message: `Retry process completed`,
      stats,
      summary: {
        total_eligible: stats.total_eligible,
        retried: stats.retried,
        skipped: stats.skipped,
        errors: stats.errors,
        success_rate: stats.total_eligible > 0 ? Math.round((stats.retried / stats.total_eligible) * 100) : 0
      }
    }

    console.log('📈 Retry Summary:', response.summary)

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Retry function error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})