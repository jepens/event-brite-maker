import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');

// Rate limiting configuration - More lenient for batch operations
// Optimized rate limits for large-scale campaigns (up to 1000 recipients)
const RATE_LIMITS = {
  messages_per_second: 3, // Conservative rate to avoid API throttling
  messages_per_minute: 80, // Reduced to ensure stability
  messages_per_hour: 1200, // Increased to support 1000+ messages
  batch_size: 50, // Process in batches of 50
  batch_delay_seconds: 60, // 1 minute delay between batches
  retry_after_seconds: 30,
  max_retries: 3,
  // Dynamic delay configuration
  base_delay_ms: 1000, // Base delay between messages
  adaptive_delay_multiplier: 1.5, // Increase delay on errors
  max_delay_ms: 10000, // Maximum delay cap
  cooldown_period_ms: 300000 // 5 minutes cooldown after errors
};

// Enhanced rate limiting with batch tracking
const rateLimitStore = new Map();
const batchTracker = new Map();
const errorTracker = new Map();

// Batch processing queue
class BatchQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.currentBatch = 0;
    this.totalBatches = 0;
  }

  addRecipients(recipients) {
    // Split recipients into batches
    const batches = [];
    for (let i = 0; i < recipients.length; i += RATE_LIMITS.batch_size) {
      batches.push(recipients.slice(i, i + RATE_LIMITS.batch_size));
    }
    this.queue = batches;
    this.totalBatches = batches.length;
    this.currentBatch = 0;
    console.log(`📦 Created ${this.totalBatches} batches of ${RATE_LIMITS.batch_size} recipients each`);
  }

  hasNext() {
    return this.currentBatch < this.totalBatches;
  }

  getNext() {
    if (this.hasNext()) {
      const batch = this.queue[this.currentBatch];
      this.currentBatch++;
      return {
        batch,
        batchNumber: this.currentBatch,
        totalBatches: this.totalBatches,
        progress: ((this.currentBatch / this.totalBatches) * 100).toFixed(2)
      };
    }
    return null;
  }

  reset() {
    this.queue = [];
    this.processing = false;
    this.currentBatch = 0;
    this.totalBatches = 0;
  }
}

// Enhanced rate limiting with adaptive delays
function isRateLimited(phoneNumber) {
  const now = Date.now();
  const key = phoneNumber || 'global';
  
  if (!rateLimitStore.has(key)) {
    rateLimitStore.set(key, {
      messages: [],
      lastMessage: 0,
      errorCount: 0,
      lastError: 0
    });
  }

  const data = rateLimitStore.get(key);
  
  // Clean old messages (older than 1 hour)
  data.messages = data.messages.filter(timestamp => now - timestamp < 3600000);
  
  // Check various rate limits
  const recentMessages = data.messages.filter(timestamp => now - timestamp < 60000); // Last minute
  const veryRecentMessages = data.messages.filter(timestamp => now - timestamp < 1000); // Last second
  
  // Apply rate limits
  if (veryRecentMessages.length >= RATE_LIMITS.messages_per_second) {
    console.log(`⚠️ Rate limit hit: ${veryRecentMessages.length} messages in last second`);
    return true;
  }
  
  if (recentMessages.length >= RATE_LIMITS.messages_per_minute) {
    console.log(`⚠️ Rate limit hit: ${recentMessages.length} messages in last minute`);
    return true;
  }
  
  if (data.messages.length >= RATE_LIMITS.messages_per_hour) {
    console.log(`⚠️ Rate limit hit: ${data.messages.length} messages in last hour`);
    return true;
  }

  // Check error-based cooldown
  if (data.errorCount > 0 && now - data.lastError < RATE_LIMITS.cooldown_period_ms) {
    console.log(`⚠️ Cooldown period active due to previous errors`);
    return true;
  }

  return false;
}

// Adaptive delay calculation based on current conditions
function calculateAdaptiveDelay(errorCount: number, progressPercentage: number): number {
  const baseDelay = RATE_LIMITS.base_delay_ms;
  const adaptiveMultiplier = RATE_LIMITS.adaptive_multiplier;
  const maxDelay = RATE_LIMITS.max_delay_ms;
  
  // Calculate error-based multiplier (more errors = longer delays)
  const errorMultiplier = Math.min(1 + (errorCount * 0.1), 3); // Max 3x multiplier
  
  // Calculate progress-based multiplier (slower at the beginning, faster later)
  const progressMultiplier = progressPercentage < 20 ? 1.5 : 
                           progressPercentage < 50 ? 1.2 : 
                           progressPercentage < 80 ? 1.0 : 0.8;
  
  // Calculate final delay
  const calculatedDelay = baseDelay * adaptiveMultiplier * errorMultiplier * progressMultiplier;
  
  // Ensure delay doesn't exceed maximum
  return Math.min(calculatedDelay, maxDelay);
}

// Enhanced logging for batch processing
function logBatchStatistics(batchNumber: number, totalBatches: number, batchSize: number, 
                          successCount: number, failureCount: number, startTime: number) {
  const elapsedTime = (Date.now() - startTime) / 1000;
  const successRate = (successCount / (successCount + failureCount)) * 100;
  const messagesPerSecond = successCount / elapsedTime;
  
  console.log(`\n📊 === BATCH ${batchNumber}/${totalBatches} STATISTICS ===`);
  console.log(`📦 Batch size: ${batchSize}`);
  console.log(`✅ Success: ${successCount}`);
  console.log(`❌ Failures: ${failureCount}`);
  console.log(`📈 Success rate: ${successRate.toFixed(2)}%`);
  console.log(`⏱️ Elapsed time: ${elapsedTime.toFixed(2)} seconds`);
  console.log(`🚀 Rate: ${messagesPerSecond.toFixed(2)} messages/second`);
}

// Progress tracking utility
function calculateProgress(currentIndex: number, total: number): string {
  return ((currentIndex / total) * 100).toFixed(2);
}

// Enhanced error handling for different error types
function handleSpecificError(error: Error | unknown, recipient: Record<string, unknown>): { shouldRetry: boolean, cooldownMs: number } {
  const errorMessage = (error instanceof Error ? error.message : String(error))?.toLowerCase() || '';
  
  if (errorMessage.includes('rate limit') || errorMessage.includes('throttle')) {
    return { shouldRetry: true, cooldownMs: RATE_LIMITS.cooldown_period_ms };
  }
  
  if (errorMessage.includes('invalid number') || errorMessage.includes('not found')) {
    return { shouldRetry: false, cooldownMs: 0 };
  }
  
  if (errorMessage.includes('network') || errorMessage.includes('timeout')) {
    return { shouldRetry: true, cooldownMs: 5000 };
  }
  
  // Default handling
  return { shouldRetry: recipient.retry_count < 3, cooldownMs: 2000 };
}

// Memory cleanup utility
function cleanupMemory() {
  if (global.gc) {
    global.gc();
    console.log('🧹 Memory cleanup performed');
  }
}

// Record message sending
function recordMessage(phoneNumber, success = true) {
  const now = Date.now();
  const key = phoneNumber || 'global';
  
  if (!rateLimitStore.has(key)) {
    rateLimitStore.set(key, {
      messages: [],
      lastMessage: 0,
      errorCount: 0,
      lastError: 0
    });
  }

  const data = rateLimitStore.get(key);
  data.messages.push(now);
  data.lastMessage = now;
  
  if (!success) {
    data.errorCount++;
    data.lastError = now;
  } else {
    // Reset error count on success
    data.errorCount = Math.max(0, data.errorCount - 1);
  }
}

function validatePhoneNumber(phone: string): boolean {
  if (!phone || typeof phone !== 'string' || phone.trim() === '') {
    return false;
  }
  
  const digitsOnly = phone.replace(/\D/g, '');
  
  // Check if it's already in correct format: 62xxxxxxxxx (11-15 digits for international format)
  if (digitsOnly.startsWith('62') && digitsOnly.length >= 11 && digitsOnly.length <= 15) {
    return true;
  }
  
  // Check if it can be converted to correct format (local format with 0)
  if (digitsOnly.startsWith('08') && digitsOnly.length >= 10 && digitsOnly.length <= 13) {
    return true;
  }
  
  // Check if it's a local number without prefix (8xxxxxxxxx)
  if (digitsOnly.startsWith('8') && digitsOnly.length >= 9 && digitsOnly.length <= 12) {
    return true;
  }
  
  return false;
}

function formatDate(dateString: string): string {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    const options = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      timeZone: 'Asia/Jakarta'
    };
    return date.toLocaleDateString('id-ID', options as Intl.DateTimeFormatOptions);
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString;
  }
}

function formatTime(timeString: string): string {
  if (!timeString) return '';
  
  try {
    // If it's just time (HH:MM), create a date object for today
    if (timeString.match(/^\d{2}:\d{2}$/)) {
      const today = new Date();
      const [hours, minutes] = timeString.split(':');
      today.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      return today.toLocaleTimeString('id-ID', { 
        hour: '2-digit', 
        minute: '2-digit',
        timeZone: 'Asia/Jakarta'
      });
    }
    
    // If it's a full datetime string
    const date = new Date(timeString);
    return date.toLocaleTimeString('id-ID', { 
      hour: '2-digit', 
      minute: '2-digit',
      timeZone: 'Asia/Jakarta'
    });
  } catch (error) {
    console.error('Error formatting time:', error);
    return timeString;
  }
}

function formatPhoneNumber(phone: string): string {
  const digitsOnly = phone.replace(/\D/g, '');
  
  // If already in correct format
  if (digitsOnly.startsWith('62')) {
    return digitsOnly;
  }
  
  // Convert 08xxxxxxxxxx to 628xxxxxxxxxx
  if (digitsOnly.startsWith('08')) {
    return '62' + digitsOnly.substring(1);
  }
  
  // Convert 8xxxxxxxxxx to 628xxxxxxxxxx
  if (digitsOnly.startsWith('8')) {
    return '62' + digitsOnly;
  }
  
  return digitsOnly;
}

async function sendWhatsAppMessage(
  phoneNumber, 
  templateName, 
  templateParams = {}
) {
  const formattedPhoneNumber = formatPhoneNumber(phoneNumber);
  
  // Prepare WhatsApp payload using the same structure as working send-whatsapp-ticket
  const whatsappPayload = {
    messaging_product: "whatsapp",
    to: formattedPhoneNumber,
    type: "template",
    template: {
      name: templateName,
      language: {
        code: "id" // Indonesian language
      },
      components: [
        {
          type: "header",
          parameters: []
        },
        {
          type: "body",
          parameters: [
            {
              type: "text",
              text: templateParams?.participant_name || "Peserta"
            },
            {
              type: "text", 
              text: templateParams?.location || "TBA"
            },
            {
              type: "text",
              text: templateParams?.address || "TBA"
            },
            {
              type: "text",
              text: templateParams?.date || "TBA"
            },
            {
              type: "text",
              text: templateParams?.time || "TBA"
            }
          ]
        }
      ]
    }
  };

  console.log('=== WHATSAPP MESSAGE DEBUG ===');
  console.log('Original phone number:', phoneNumber);
  console.log('Formatted phone number:', formattedPhoneNumber);
  console.log('Template name:', templateName);
  console.log('WhatsApp Phone Number ID:', Deno.env.get('WHATSAPP_PHONE_NUMBER_ID'));
  console.log('Access Token exists:', !!Deno.env.get('WHATSAPP_ACCESS_TOKEN'));
  console.log('Payload:', JSON.stringify(whatsappPayload, null, 2));

  try {
    const whatsappResponse = await fetch(
      `https://graph.facebook.com/v18.0/${Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('WHATSAPP_ACCESS_TOKEN')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(whatsappPayload)
      }
    );
    
    const whatsappResult = await whatsappResponse.json();
    
    console.log('=== WHATSAPP RESPONSE DEBUG ===');
    console.log('Response status:', whatsappResponse.status);
    console.log('Response headers:', Object.fromEntries(whatsappResponse.headers.entries()));
    console.log('Response body:', JSON.stringify(whatsappResult, null, 2));
    
    if (whatsappResponse.ok) {
      console.log("✅ WhatsApp message sent successfully");
      console.log('Message ID:', whatsappResult.messages?.[0]?.id);
      console.log('Contact WA ID:', whatsappResult.contacts?.[0]?.wa_id);
      return whatsappResult;
    } else {
      console.error('❌ WhatsApp API error:');
      console.error('Error details:', JSON.stringify(whatsappResult, null, 2));
      throw new Error(`WhatsApp API error: ${whatsappResult.error?.message || 'Unknown error'}`);
    }
  } catch (error) {
    console.error('❌ Error sending WhatsApp message:', error);
    throw error;
  }
}

async function processBatchRecipients(campaignId: string, recipientIds: string[], batchSize: number) {
  try {
    console.log('=== MANUAL BATCH PROCESSING START ===');
    console.log('Campaign ID:', campaignId);
    console.log('Recipient IDs:', recipientIds);
    console.log('Batch Size:', batchSize);
    console.log('Timestamp:', new Date().toISOString());

    // Get campaign details
    const { data: campaign, error: campaignError } = await supabase
      .from('whatsapp_blast_campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      console.error('❌ Campaign fetch error:', campaignError);
      throw new Error(`Campaign not found: ${campaignError?.message}`);
    }

    // Get specific recipients by IDs
    const { data: recipients, error: recipientsError } = await supabase
      .from('whatsapp_blast_recipients')
      .select('*')
      .eq('campaign_id', campaignId)
      .in('id', recipientIds)
      .eq('status', 'pending');

    if (recipientsError) {
      console.error('❌ Recipients fetch error:', recipientsError);
      throw new Error(`Failed to fetch recipients: ${recipientsError.message}`);
    }

    if (!recipients || recipients.length === 0) {
      console.log('⚠️ No pending recipients found for the specified IDs');
      return { processed: 0, success: 0, failed: 0 };
    }

    console.log(`📊 Processing ${recipients.length} recipients for manual batch`);
    
    let successCount = 0;
    let failureCount = 0;
    let globalErrorCount = 0;

    // Process recipients in the batch
    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i];
      
      console.log(`\n📱 === PROCESSING RECIPIENT ${i + 1}/${recipients.length} ===`);
      console.log('🆔 Recipient ID:', recipient.id);
      console.log('📞 Phone number:', recipient.phone_number);
      console.log('👤 Name:', recipient.name || 'No name');
      
      try {
        // Check rate limiting before processing
        if (isRateLimited(recipient.phone_number)) {
          console.log('⚠️ Rate limit detected, applying extended delay...');
          const extendedDelay = calculateAdaptiveDelay(globalErrorCount, (i / recipients.length) * 100);
          console.log(`⏱️ Extended delay: ${extendedDelay}ms`);
          await new Promise(resolve => setTimeout(resolve, extendedDelay));
        }

        // Validate phone number
        console.log('🔍 Validating phone number...');
        if (!validatePhoneNumber(recipient.phone_number)) {
          console.error('❌ Phone number validation failed');
          throw new Error('Invalid phone number format');
        }
        console.log('✅ Phone number validation passed');

        // Apply delay between messages (except for first message)
        if (i > 0) {
          const adaptiveDelay = calculateAdaptiveDelay(globalErrorCount, (i / recipients.length) * 100);
          console.log(`⏱️ Applying adaptive delay: ${adaptiveDelay}ms`);
          await new Promise(resolve => setTimeout(resolve, adaptiveDelay));
        }

        // Send WhatsApp message with template parameters
        console.log('📤 Sending WhatsApp message...');
        const templateParams = campaign.template_params || {
          participant_name: "Peserta",
          location: "TBA",
          address: "TBA", 
          date: "TBA",
          time: "TBA"
        };
        
        // Use recipient name if available, otherwise use default from template params
        const finalParams = {
          ...templateParams,
          participant_name: recipient.name || templateParams.participant_name
        };
        
        console.log('📝 Template parameters:', finalParams);
        const result = await sendWhatsAppMessage(recipient.phone_number, campaign.template_name, finalParams);
        
        // Record successful message
        recordMessage(recipient.phone_number, true);
        
        console.log('✅ WhatsApp message sent successfully!');
        console.log('📧 Message ID:', result.messages?.[0]?.id);
        
        // Update recipient status to sent
        console.log('💾 Updating recipient status to sent...');
        const { error: updateError } = await supabase
          .from('whatsapp_blast_recipients')
          .update({
            status: 'sent',
            message_id: result.messages?.[0]?.id,
            sent_at: new Date().toISOString(),
            error_message: null
          })
          .eq('id', recipient.id);

        if (updateError) {
          console.error('❌ Failed to update recipient status:', updateError);
        } else {
          console.log('✅ Recipient status updated successfully');
        }

        successCount++;
        
        // Reset global error count on success
        globalErrorCount = Math.max(0, globalErrorCount - 1);
        
        console.log(`✅ SUCCESS: Message sent to ${recipient.phone_number}`);
        console.log(`📊 Progress: ${successCount} sent, ${failureCount} failed`);

      } catch (error) {
        // Record failed message
        recordMessage(recipient.phone_number, false);
        globalErrorCount++;
        
        console.error(`❌ FAILED: Error sending to ${recipient.phone_number}:`);
        console.error('💬 Error message:', error.message);
        
        // Update recipient status to failed
        const { error: updateError } = await supabase
          .from('whatsapp_blast_recipients')
          .update({
            status: 'failed',
            error_message: error.message,
            failed_at: new Date().toISOString(),
            retry_count: (recipient.retry_count || 0) + 1
          })
          .eq('id', recipient.id);

        if (updateError) {
          console.error('❌ Failed to update recipient status:', updateError);
        }

        failureCount++;
        console.log(`📊 Progress: ${successCount} sent, ${failureCount} failed`);
      }
    }

    console.log('\n=== MANUAL BATCH PROCESSING COMPLETED ===');
    console.log(`📊 Final Results: ${successCount} sent, ${failureCount} failed`);
    
    return {
      processed: recipients.length,
      success: successCount,
      failed: failureCount
    };

  } catch (error) {
    console.error('❌ Manual batch processing error:', error);
    throw error;
  }
}

async function processCampaign(campaignId: string) {
  const batchQueue = new BatchQueue();
  const campaignStartTime = Date.now();
  
  try {
    console.log('=== OPTIMIZED CAMPAIGN PROCESSING START ===');
    console.log('Campaign ID:', campaignId);
    console.log('Timestamp:', new Date().toISOString());
    console.log('Rate Limits Configuration:', RATE_LIMITS);

    // Get campaign details
    const { data: campaign, error: campaignError } = await supabase
      .from('whatsapp_blast_campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      console.error('❌ Campaign fetch error:', campaignError);
      throw new Error(`Campaign not found: ${campaignError?.message}`);
    }

    console.log('📋 Campaign details:');
    console.log('- Name:', campaign.name);
    console.log('- Template:', campaign.template_name);
    console.log('- Status:', campaign.status);
    console.log('- Created at:', campaign.created_at);

    // Update campaign status to sending
    await supabase
      .from('whatsapp_blast_campaigns')
      .update({ 
        status: 'sending', 
        started_at: new Date().toISOString() 
      })
      .eq('id', campaignId);

    // Get pending recipients
    const { data: recipients, error: recipientsError } = await supabase
      .from('whatsapp_blast_recipients')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (recipientsError) {
      console.error('❌ Recipients fetch error:', recipientsError);
      throw new Error(`Failed to fetch recipients: ${recipientsError.message}`);
    }

    if (!recipients || recipients.length === 0) {
      console.log('⚠️ No pending recipients found for campaign:', campaignId);
      await supabase
        .from('whatsapp_blast_campaigns')
        .update({ 
          status: 'completed', 
          completed_at: new Date().toISOString() 
        })
        .eq('id', campaignId);
      return;
    }

    console.log(`📊 Processing ${recipients.length} recipients for campaign:`, campaignId);
    
    // Initialize batch queue
    batchQueue.addRecipients(recipients);
    
    let totalSuccessCount = 0;
    let totalFailureCount = 0;
    let globalErrorCount = 0;

    // Process batches
    while (batchQueue.hasNext()) {
      const batchInfo = batchQueue.getNext();
      const { batch, batchNumber, totalBatches, progress } = batchInfo;
      
      console.log(`\n🚀 === PROCESSING BATCH ${batchNumber}/${totalBatches} (${progress}%) ===`);
      console.log(`📦 Batch size: ${batch.length} recipients`);
      console.log(`⏱️ Estimated time for this batch: ${(batch.length * RATE_LIMITS.base_delay_ms / 1000).toFixed(1)} seconds`);
      
      let batchSuccessCount = 0;
      let batchFailureCount = 0;
      
      // Process recipients in current batch
      for (let i = 0; i < batch.length; i++) {
        const recipient = batch[i];
        const recipientIndex = (batchNumber - 1) * RATE_LIMITS.batch_size + i + 1;
        const totalRecipients = recipients.length;
        
        console.log(`\n📱 === PROCESSING RECIPIENT ${recipientIndex}/${totalRecipients} ===`);
        console.log(`📋 Batch: ${batchNumber}/${totalBatches}, Position in batch: ${i + 1}/${batch.length}`);
        console.log('🆔 Recipient ID:', recipient.id);
        console.log('📞 Phone number:', recipient.phone_number);
        console.log('👤 Name:', recipient.name || 'No name');
        console.log('📊 Current status:', recipient.status);
        console.log('🔄 Retry count:', recipient.retry_count);
        
        try {
          // Check rate limiting before processing
          if (isRateLimited(recipient.phone_number)) {
            console.log('⚠️ Rate limit detected, applying extended delay...');
            const extendedDelay = calculateAdaptiveDelay(globalErrorCount, parseFloat(progress));
            console.log(`⏱️ Extended delay: ${extendedDelay}ms`);
            await new Promise(resolve => setTimeout(resolve, extendedDelay));
          }

          // Validate phone number
          console.log('🔍 Validating phone number...');
          if (!validatePhoneNumber(recipient.phone_number)) {
            console.error('❌ Phone number validation failed');
            throw new Error('Invalid phone number format');
          }
          console.log('✅ Phone number validation passed');

          // Calculate adaptive delay based on current conditions
          const adaptiveDelay = calculateAdaptiveDelay(globalErrorCount, parseFloat(progress));
          
          // Apply delay before sending (except for first message)
          if (recipientIndex > 1) {
            console.log(`⏱️ Applying adaptive delay: ${adaptiveDelay}ms`);
            await new Promise(resolve => setTimeout(resolve, adaptiveDelay));
          }

          // Send WhatsApp message with template parameters
          console.log('📤 Sending WhatsApp message...');
          const templateParams = campaign.template_params || {
            participant_name: "Peserta",
            location: "TBA",
            address: "TBA", 
            date: "TBA",
            time: "TBA"
          };
          
          // Use recipient name if available, otherwise use default from template params
          const finalParams = {
            ...templateParams,
            participant_name: recipient.name || templateParams.participant_name
          };
          
          console.log('📝 Template parameters:', finalParams);
          const result = await sendWhatsAppMessage(recipient.phone_number, campaign.template_name, finalParams);
          
          // Record successful message
          recordMessage(recipient.phone_number, true);
          
          console.log('✅ WhatsApp message sent successfully!');
          console.log('📧 Message ID:', result.messages?.[0]?.id);
          console.log('📱 Contact WA ID:', result.contacts?.[0]?.wa_id);
          
          // Update recipient status to sent
          console.log('💾 Updating recipient status to sent...');
          const { error: updateError } = await supabase
            .from('whatsapp_blast_recipients')
            .update({
              status: 'sent',
              message_id: result.messages?.[0]?.id,
              sent_at: new Date().toISOString(),
              error_message: null
            })
            .eq('id', recipient.id);

          if (updateError) {
            console.error('❌ Failed to update recipient status:', updateError);
          } else {
            console.log('✅ Recipient status updated successfully');
          }

          batchSuccessCount++;
          totalSuccessCount++;
          
          // Reset global error count on success
          globalErrorCount = Math.max(0, globalErrorCount - 1);
          
          console.log(`✅ SUCCESS: Message sent to ${recipient.phone_number}`);
          console.log(`📊 Batch Progress: ${batchSuccessCount} sent, ${batchFailureCount} failed`);
          console.log(`📊 Total Progress: ${totalSuccessCount} sent, ${totalFailureCount} failed (${((totalSuccessCount / totalRecipients) * 100).toFixed(2)}%)`);

        } catch (error) {
          // Record failed message
          recordMessage(recipient.phone_number, false);
          globalErrorCount++;
          
          console.error(`❌ FAILED: Error sending to ${recipient.phone_number}:`);
          console.error('🔍 Error type:', error.constructor.name);
          console.error('💬 Error message:', error.message);
          console.error('📚 Error stack:', error.stack);
          
          // Update recipient status to failed
          console.log('💾 Updating recipient status to failed...');
          const { error: updateError } = await supabase
            .from('whatsapp_blast_recipients')
            .update({
              status: 'failed',
              failed_at: new Date().toISOString(),
              error_message: error.message,
              retry_count: recipient.retry_count + 1
            })
            .eq('id', recipient.id);

          if (updateError) {
            console.error('❌ Failed to update recipient status:', updateError);
          } else {
            console.log('✅ Recipient failure status updated successfully');
          }

          batchFailureCount++;
          totalFailureCount++;
          
          console.log(`📊 Batch Progress: ${batchSuccessCount} sent, ${batchFailureCount} failed`);
          console.log(`📊 Total Progress: ${totalSuccessCount} sent, ${totalFailureCount} failed (${((totalSuccessCount / totalRecipients) * 100).toFixed(2)}%)`);
          
          // Apply error-based cooldown for severe errors
          if (error.message.includes('rate limit') || error.message.includes('throttle')) {
            console.log('🚨 Rate limiting detected, applying cooldown...');
            const cooldownDelay = RATE_LIMITS.cooldown_period_ms / 10; // Shorter cooldown for batch processing
            await new Promise(resolve => setTimeout(resolve, cooldownDelay));
          }
        }
      }
      
      // Batch completion summary
      console.log(`\n📋 === BATCH ${batchNumber}/${totalBatches} COMPLETED ===`);
      console.log(`✅ Batch Success: ${batchSuccessCount}/${batch.length}`);
      console.log(`❌ Batch Failures: ${batchFailureCount}/${batch.length}`);
      console.log(`📊 Batch Success Rate: ${((batchSuccessCount / batch.length) * 100).toFixed(2)}%`);
      console.log(`⏱️ Batch Processing Time: ${((Date.now() - campaignStartTime) / 1000 / 60).toFixed(2)} minutes`);
      
      // Inter-batch delay (except for last batch)
      if (batchQueue.hasNext()) {
        console.log(`⏸️ Inter-batch delay: ${RATE_LIMITS.batch_delay_seconds} seconds...`);
        await new Promise(resolve => setTimeout(resolve, RATE_LIMITS.batch_delay_seconds * 1000));
        
        // Update campaign progress
        await supabase
          .from('whatsapp_blast_campaigns')
          .update({
            sent_count: totalSuccessCount,
            failed_count: totalFailureCount,
            progress_percentage: parseFloat(progress)
          })
          .eq('id', campaignId);
      }
    }

    const totalProcessingTime = (Date.now() - campaignStartTime) / 1000 / 60; // in minutes
    
    console.log('\n🎉 === OPTIMIZED CAMPAIGN PROCESSING COMPLETED ===');
    console.log('📊 Total recipients processed:', recipients.length);
    console.log('✅ Successfully sent:', totalSuccessCount);
    console.log('❌ Failed to send:', totalFailureCount);
    console.log('📈 Success rate:', `${((totalSuccessCount / recipients.length) * 100).toFixed(2)}%`);
    console.log('⏱️ Total processing time:', `${totalProcessingTime.toFixed(2)} minutes`);
    console.log('🚀 Average rate:', `${(totalSuccessCount / totalProcessingTime).toFixed(2)} messages/minute`);
    console.log('📦 Total batches processed:', batchQueue.totalBatches);

    // Update campaign status to completed
    console.log('💾 Updating campaign status to completed...');
    const { error: campaignUpdateError } = await supabase
      .from('whatsapp_blast_campaigns')
      .update({ 
        status: 'completed', 
        completed_at: new Date().toISOString(),
        sent_count: totalSuccessCount,
        failed_count: totalFailureCount,
        progress_percentage: 100,
        processing_time_minutes: totalProcessingTime
      })
      .eq('id', campaignId);

    if (campaignUpdateError) {
      console.error('❌ Failed to update campaign status:', campaignUpdateError);
    } else {
      console.log('✅ Campaign status updated to completed');
    }

    console.log(`🎉 Campaign ${campaignId} completed successfully!`);
    console.log(`📊 Final stats - Success: ${totalSuccessCount}, Failed: ${totalFailureCount}`);
    console.log(`⚡ Performance: ${(totalSuccessCount / totalProcessingTime).toFixed(2)} messages/minute`);

  } catch (error) {
    console.error('\n❌ OPTIMIZED CAMPAIGN PROCESSING ERROR:');
    console.error('🔍 Error type:', error.constructor.name);
    console.error('💬 Error message:', error.message);
    console.error('📚 Error stack:', error.stack);
    console.error('🆔 Campaign ID:', campaignId);
    
    // Update campaign status to failed
    console.log('💾 Updating campaign status to failed...');
    const { error: campaignUpdateError } = await supabase
      .from('whatsapp_blast_campaigns')
      .update({ 
        status: 'failed', 
        completed_at: new Date().toISOString(),
        error_message: error.message,
        processing_time_minutes: (Date.now() - campaignStartTime) / 1000 / 60
      })
      .eq('id', campaignId);

    if (campaignUpdateError) {
      console.error('❌ Failed to update campaign status to failed:', campaignUpdateError);
    } else {
      console.log('✅ Campaign status updated to failed');
    }
  } finally {
    // Clean up batch queue
    batchQueue.reset();
    console.log('🧹 Batch queue cleaned up');
  }
}

const handler = async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    const { campaign_id, action = 'start' } = requestBody;
    
    // Debug logging
    console.log('=== REQUEST DEBUG ===');
    console.log('Request body:', JSON.stringify(requestBody, null, 2));
    console.log('Campaign ID:', campaign_id);
    console.log('Action:', action);
    console.log('==================');

    // Debug endpoint untuk memeriksa environment variables dan konfigurasi
    if (action === 'debug' || action === 'check_env') {
      console.log('=== DEBUG ENDPOINT CALLED ===');
      console.log('Timestamp:', new Date().toISOString());
      console.log('Request body:', JSON.stringify(requestBody, null, 2));
      
      const debugInfo = {
        timestamp: new Date().toISOString(),
        environment_variables: {
          SUPABASE_URL: !!Deno.env.get('SUPABASE_URL'),
          SUPABASE_SERVICE_ROLE_KEY: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
          WHATSAPP_ACCESS_TOKEN: !!Deno.env.get('WHATSAPP_ACCESS_TOKEN'),
          WHATSAPP_PHONE_NUMBER_ID: !!Deno.env.get('WHATSAPP_PHONE_NUMBER_ID'),
          WHATSAPP_TEMPLATE_NAME: Deno.env.get('WHATSAPP_TEMPLATE_NAME') || 'not_set'
        },
        environment_values: {
          SUPABASE_URL: Deno.env.get('SUPABASE_URL')?.substring(0, 30) + '...',
          WHATSAPP_PHONE_NUMBER_ID: Deno.env.get('WHATSAPP_PHONE_NUMBER_ID'),
          WHATSAPP_ACCESS_TOKEN_LENGTH: Deno.env.get('WHATSAPP_ACCESS_TOKEN')?.length || 0,
          WHATSAPP_ACCESS_TOKEN_PREVIEW: Deno.env.get('WHATSAPP_ACCESS_TOKEN')?.substring(0, 20) + '...'
        },
        rate_limits: RATE_LIMITS,
        deno_version: Deno.version,
        request_headers: Object.fromEntries(req.headers.entries())
      };

      // Test database connection
      try {
        const { data: testQuery, error: dbError } = await supabase
          .from('whatsapp_blast_campaigns')
          .select('count')
          .limit(1);
        
        debugInfo.database_connection = {
          success: !dbError,
          error: dbError?.message || null
        };
      } catch (dbTestError) {
        debugInfo.database_connection = {
          success: false,
          error: dbTestError.message
        };
      }

      // Test WhatsApp API connection if credentials are available
      if (Deno.env.get('WHATSAPP_ACCESS_TOKEN') && Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')) {
        try {
          const whatsappTestResponse = await fetch(
            `https://graph.facebook.com/v18.0/${Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')}`,
            {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${Deno.env.get('WHATSAPP_ACCESS_TOKEN')}`,
                'Content-Type': 'application/json'
              }
            }
          );
          
          const whatsappTestResult = await whatsappTestResponse.json();
          
          debugInfo.whatsapp_api_test = {
            success: whatsappTestResponse.ok,
            status_code: whatsappTestResponse.status,
            response: whatsappTestResult
          };
        } catch (whatsappTestError) {
          debugInfo.whatsapp_api_test = {
            success: false,
            error: whatsappTestError.message
          };
        }
      } else {
        debugInfo.whatsapp_api_test = {
          success: false,
          error: 'Missing WhatsApp credentials'
        };
      }

      // Add campaign information if campaign_id is provided
      if (campaign_id) {
        try {
          const { data: campaign, error: campaignError } = await supabase
            .from('whatsapp_blast_campaigns')
            .select('*')
            .eq('id', campaign_id)
            .single();

          if (!campaignError && campaign) {
            debugInfo.campaign_info = campaign;

            // Get recipients info
            const { data: recipients, error: recipientsError } = await supabase
              .from('whatsapp_blast_recipients')
              .select('status, COUNT(*)')
              .eq('campaign_id', campaign_id)
              .group('status');

            if (!recipientsError && recipients) {
              debugInfo.recipients_status = recipients;
            }

            // Get recent recipients with details
            const { data: recentRecipients, error: recentError } = await supabase
              .from('whatsapp_blast_recipients')
              .select('phone_number, status, message_id, sent_at, delivered_at, read_at, failed_at, error_message')
              .eq('campaign_id', campaign_id)
              .order('created_at', { ascending: false })
              .limit(10);

            if (!recentError && recentRecipients) {
              debugInfo.recent_recipients = recentRecipients;
            }
          } else {
            debugInfo.campaign_info = { error: campaignError?.message || 'Campaign not found' };
          }
        } catch (campaignDebugError) {
          debugInfo.campaign_info = { error: campaignDebugError.message };
        }
      }

      console.log('Debug info:', JSON.stringify(debugInfo, null, 2));

      return new Response(
        JSON.stringify({ 
          success: true, 
          debug_info: debugInfo 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!campaign_id) {
      return new Response(
        JSON.stringify({ error: 'campaign_id is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate UUID format for campaign_id
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(campaign_id)) {
      console.error('❌ Invalid campaign_id format:', campaign_id);
      return new Response(
        JSON.stringify({ error: 'campaign_id must be a valid UUID' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate action parameter
    if (!['start', 'create', 'batch'].includes(action)) {
      return new Response(
        JSON.stringify({ error: 'action must be either "start", "create", or "batch"' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate environment variables only when starting campaign or batch processing
    if (action === 'start' || action === 'batch') {
      const requiredEnvVars = ['WHATSAPP_ACCESS_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID'];
      for (const envVar of requiredEnvVars) {
        if (!Deno.env.get(envVar)) {
          throw new Error(`Missing required environment variable: ${envVar}`);
        }
      }
    }

    if (action === 'start') {
      // Start processing campaign asynchronously
      processCampaign(campaign_id).catch(error => {
        console.error('Async campaign processing error:', error);
      });

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Campaign processing started',
          campaign_id 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    } else if (action === 'batch') {
      // Handle manual batch processing
      const { recipients, batch_size } = requestBody;
      
      console.log('=== BATCH VALIDATION ===');
      console.log('Recipients:', recipients);
      console.log('Recipients type:', typeof recipients);
      console.log('Is array:', Array.isArray(recipients));
      console.log('Batch size:', batch_size);
      console.log('========================');
      
      if (!recipients || !Array.isArray(recipients)) {
        console.error('❌ Recipients validation failed');
        return new Response(
          JSON.stringify({ error: 'recipients array is required for batch processing' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      // Process the specific batch of recipients (recipients is array of IDs)
      const result = await processBatchRecipients(campaign_id, recipients, batch_size || recipients.length);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Batch processing completed',
          campaign_id,
          processed: result.processed,
          success: result.success,
          failed: result.failed
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    } else {
      // For 'create' action, just acknowledge the campaign creation
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Campaign created successfully. Use action "start" to begin sending messages.',
          campaign_id 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

  } catch (error) {
    console.error('Handler error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
};

serve(handler);