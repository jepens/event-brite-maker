import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Optimized rate limiting configuration
const RATE_LIMITING_CONFIG = {
  // Conservative settings for better delivery rates
  BATCH_SIZE: 5,           // Reduced from 10 to 5
  DELAY_BETWEEN_BATCHES: 45000,  // Increased from 30s to 45s
  DELAY_BETWEEN_MESSAGES: 2000,  // 2 seconds between individual messages
  MAX_CONCURRENT_CAMPAIGNS: 1,   // Only one campaign at a time
  
  // Retry settings
  RETRY_DELAYS: {
    1: 300000,    // 5 minutes for first retry
    2: 1800000,   // 30 minutes for second retry
    3: 7200000    // 2 hours for third retry
  },
  
  // Error-specific delays
  ERROR_SPECIFIC_DELAYS: {
    'rate_limit': 3600000,        // 1 hour for rate limit errors
    'invalid_phone': 0,           // Immediate retry for fixed phone validation
    'network_error': 600000,      // 10 minutes for network errors
    'api_error': 1800000,         // 30 minutes for API errors
    'default': 900000             // 15 minutes for other errors
  }
};

async function optimizeRateLimiting() {
  console.log('\n⚡ OPTIMIZING RATE LIMITING CONFIGURATION');
  console.log('='.repeat(60));

  try {
    // 1. Analyze current campaign performance
    console.log('\n1️⃣ Analyzing current campaign performance...');
    
    const { data: campaigns, error: campaignError } = await supabase
      .from('whatsapp_blast_campaigns')
      .select(`
        id,
        name,
        status,
        total_recipients,
        sent_count,
        delivered_count,
        failed_count,
        created_at
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    if (campaignError) {
      console.error('❌ Error fetching campaigns:', campaignError);
      return;
    }

    console.log(`📊 Analyzed ${campaigns.length} recent campaigns`);
    
    // Calculate overall success rates
    let totalRecipients = 0;
    let totalSent = 0;
    let totalDelivered = 0;
    let totalFailed = 0;

    campaigns.forEach(campaign => {
      totalRecipients += campaign.total_recipients || 0;
      totalSent += campaign.sent_count || 0;
      totalDelivered += campaign.delivered_count || 0;
      totalFailed += campaign.failed_count || 0;
    });

    const successRate = totalSent > 0 ? ((totalDelivered / totalSent) * 100).toFixed(2) : 0;
    const failureRate = totalRecipients > 0 ? ((totalFailed / totalRecipients) * 100).toFixed(2) : 0;

    console.log('\n📈 Current Performance Metrics:');
    console.log(`   Total Recipients: ${totalRecipients}`);
    console.log(`   Total Sent: ${totalSent}`);
    console.log(`   Total Delivered: ${totalDelivered}`);
    console.log(`   Total Failed: ${totalFailed}`);
    console.log(`   Success Rate: ${successRate}%`);
    console.log(`   Failure Rate: ${failureRate}%`);

    // 2. Analyze failure patterns
    console.log('\n2️⃣ Analyzing failure patterns...');
    
    const { data: failureAnalysis, error: failureError } = await supabase
      .from('whatsapp_blast_recipients')
      .select('error_message, status')
      .eq('status', 'failed')
      .limit(1000);

    if (failureError) {
      console.error('❌ Error analyzing failures:', failureError);
      return;
    }

    // Group failures by error type
    const errorGroups = {};
    failureAnalysis.forEach(failure => {
      const errorType = categorizeError(failure.error_message);
      errorGroups[errorType] = (errorGroups[errorType] || 0) + 1;
    });

    console.log('\n🔍 Failure Analysis by Error Type:');
    Object.entries(errorGroups)
      .sort(([,a], [,b]) => b - a)
      .forEach(([errorType, count]) => {
        const percentage = ((count / failureAnalysis.length) * 100).toFixed(1);
        console.log(`   ${errorType}: ${count} (${percentage}%)`);
      });

    // 3. Update Edge Function with optimized settings
    console.log('\n3️⃣ Updating Edge Function with optimized settings...');
    
    const optimizedConfig = {
      ...RATE_LIMITING_CONFIG,
      timestamp: new Date().toISOString(),
      analysis: {
        total_campaigns: campaigns.length,
        success_rate: parseFloat(successRate),
        failure_rate: parseFloat(failureRate),
        main_error_types: Object.keys(errorGroups).slice(0, 3)
      }
    };

    // Save configuration to database for Edge Function to use
    const { error: configError } = await supabase
      .from('system_config')
      .upsert({
        key: 'whatsapp_rate_limiting',
        value: optimizedConfig,
        updated_at: new Date().toISOString()
      });

    if (configError) {
      console.error('❌ Error saving configuration:', configError);
      // Continue anyway, we'll update the Edge Function directly
    }

    console.log('✅ Optimized configuration prepared:');
    console.log(`   Batch Size: ${optimizedConfig.BATCH_SIZE} messages`);
    console.log(`   Batch Delay: ${optimizedConfig.DELAY_BETWEEN_BATCHES / 1000}s`);
    console.log(`   Message Delay: ${optimizedConfig.DELAY_BETWEEN_MESSAGES / 1000}s`);
    console.log(`   Max Concurrent: ${optimizedConfig.MAX_CONCURRENT_CAMPAIGNS}`);

    // 4. Test optimized settings with a small batch
    console.log('\n4️⃣ Testing optimized settings...');
    
    const { data: testResult, error: testError } = await supabase.functions.invoke('send-whatsapp-blast', {
      body: {
        action: 'update_config',
        config: optimizedConfig
      }
    });

    if (testError) {
      console.error('❌ Error updating Edge Function config:', testError);
    } else {
      console.log('✅ Edge Function configuration updated successfully');
      console.log('📊 Test Result:', testResult);
    }

    // 5. Update retry mechanism with optimized delays
    console.log('\n5️⃣ Updating retry mechanism with optimized delays...');
    
    const { data: retryUpdate, error: retryError } = await supabase.functions.invoke('retry-whatsapp-blast', {
      body: {
        action: 'update_config',
        config: {
          retry_delays: optimizedConfig.RETRY_DELAYS,
          error_specific_delays: optimizedConfig.ERROR_SPECIFIC_DELAYS
        }
      }
    });

    if (retryError) {
      console.error('❌ Error updating retry configuration:', retryError);
    } else {
      console.log('✅ Retry mechanism configuration updated');
    }

    // 6. Recommendations
    console.log('\n6️⃣ Optimization Recommendations:');
    console.log('\n🎯 Immediate Actions:');
    console.log('   ✓ Reduced batch size to 5 messages for better control');
    console.log('   ✓ Increased delay between batches to 45 seconds');
    console.log('   ✓ Added 2-second delay between individual messages');
    console.log('   ✓ Limited to 1 concurrent campaign to avoid rate limits');

    console.log('\n📊 Monitoring Recommendations:');
    console.log('   • Monitor success rates after implementing changes');
    console.log('   • Track delivery times and adjust delays if needed');
    console.log('   • Watch for rate limit errors and increase delays if they occur');
    console.log('   • Consider A/B testing different batch sizes');

    console.log('\n🔄 Retry Strategy:');
    console.log('   • First retry: 5 minutes (for quick fixes)');
    console.log('   • Second retry: 30 minutes (for temporary issues)');
    console.log('   • Third retry: 2 hours (for persistent problems)');
    console.log('   • Rate limit errors: 1 hour delay');

    console.log('\n✅ RATE LIMITING OPTIMIZATION COMPLETED');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ OPTIMIZATION ERROR:', error);
  }
}

function categorizeError(errorMessage) {
  if (!errorMessage) return 'unknown';
  
  const message = errorMessage.toLowerCase();
  
  if (message.includes('rate limit') || message.includes('too many requests')) {
    return 'rate_limit';
  } else if (message.includes('invalid phone') || message.includes('phone number format')) {
    return 'invalid_phone';
  } else if (message.includes('network') || message.includes('timeout') || message.includes('connection')) {
    return 'network_error';
  } else if (message.includes('api') || message.includes('unauthorized') || message.includes('forbidden')) {
    return 'api_error';
  } else if (message.includes('quota') || message.includes('limit exceeded')) {
    return 'quota_exceeded';
  } else {
    return 'other';
  }
}

// Run the optimization
optimizeRateLimiting();