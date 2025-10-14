import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function analyzeFailedMessages() {
  console.log('🔍 Analyzing failed WhatsApp messages...\n');

  try {
    // Get failed recipients with error details
    const { data: failedRecipients, error } = await supabase
      .from('whatsapp_blast_recipients')
      .select(`
        *,
        whatsapp_blast_campaigns(name, created_at)
      `)
      .eq('status', 'failed')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('❌ Error fetching failed recipients:', error);
      return;
    }

    if (!failedRecipients || failedRecipients.length === 0) {
      console.log('✅ No failed messages found!');
      return;
    }

    console.log(`📊 Found ${failedRecipients.length} failed messages\n`);

    // Analyze error patterns
    const errorPatterns = {};
    const phonePatterns = {};
    const campaignStats = {};

    failedRecipients.forEach(recipient => {
      // Error message analysis
      const errorMsg = recipient.error_message || 'Unknown error';
      errorPatterns[errorMsg] = (errorPatterns[errorMsg] || 0) + 1;

      // Phone number pattern analysis
      const phone = recipient.phone_number;
      if (phone) {
        const phonePattern = analyzePhonePattern(phone);
        phonePatterns[phonePattern] = (phonePatterns[phonePattern] || 0) + 1;
      }

      // Campaign analysis
      const campaignName = recipient.whatsapp_blast_campaigns?.name || 'Unknown';
      if (!campaignStats[campaignName]) {
        campaignStats[campaignName] = { failed: 0, total: 0 };
      }
      campaignStats[campaignName].failed++;
    });

    // Display analysis results
    console.log('📈 ERROR PATTERN ANALYSIS:');
    console.log('=' .repeat(50));
    Object.entries(errorPatterns)
      .sort(([,a], [,b]) => b - a)
      .forEach(([error, count]) => {
        const percentage = ((count / failedRecipients.length) * 100).toFixed(1);
        console.log(`${count.toString().padStart(3)} (${percentage}%) - ${error}`);
      });

    console.log('\n📱 PHONE NUMBER PATTERN ANALYSIS:');
    console.log('=' .repeat(50));
    Object.entries(phonePatterns)
      .sort(([,a], [,b]) => b - a)
      .forEach(([pattern, count]) => {
        const percentage = ((count / failedRecipients.length) * 100).toFixed(1);
        console.log(`${count.toString().padStart(3)} (${percentage}%) - ${pattern}`);
      });

    // Get success rate by campaign
    console.log('\n📊 CAMPAIGN SUCCESS RATE ANALYSIS:');
    console.log('=' .repeat(50));
    
    for (const campaignName of Object.keys(campaignStats)) {
      const { data: totalRecipients } = await supabase
        .from('whatsapp_blast_recipients')
        .select('id', { count: 'exact' })
        .eq('campaign_id', failedRecipients.find(r => 
          r.whatsapp_blast_campaigns?.name === campaignName
        )?.campaign_id);

      if (totalRecipients) {
        campaignStats[campaignName].total = totalRecipients.length;
        const successRate = ((campaignStats[campaignName].total - campaignStats[campaignName].failed) / campaignStats[campaignName].total * 100).toFixed(1);
        console.log(`${campaignName}: ${successRate}% success rate (${campaignStats[campaignName].failed}/${campaignStats[campaignName].total} failed)`);
      }
    }

    // Recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    console.log('=' .repeat(50));
    
    const recommendations = generateRecommendations(errorPatterns, phonePatterns);
    recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. ${rec}`);
    });

    // Sample failed numbers for manual testing
    console.log('\n🔍 SAMPLE FAILED NUMBERS FOR MANUAL TESTING:');
    console.log('=' .repeat(50));
    const sampleNumbers = failedRecipients
      .slice(0, 10)
      .map(r => `${r.phone_number} - ${r.error_message || 'No error message'}`)
      .join('\n');
    console.log(sampleNumbers);

  } catch (error) {
    console.error('❌ Analysis failed:', error);
  }
}

function analyzePhonePattern(phone) {
  if (!phone) return 'No phone number';
  
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');
  
  if (digits.length < 10) return 'Too short (< 10 digits)';
  if (digits.length > 15) return 'Too long (> 15 digits)';
  
  if (digits.startsWith('62')) return 'Indonesia (+62)';
  if (digits.startsWith('1')) return 'US/Canada (+1)';
  if (digits.startsWith('44')) return 'UK (+44)';
  if (digits.startsWith('91')) return 'India (+91)';
  if (digits.startsWith('86')) return 'China (+86)';
  if (digits.startsWith('0')) return 'Local format (starts with 0)';
  
  return `Other country (${digits.substring(0, 2)}...)`;
}

function generateRecommendations(errorPatterns, phonePatterns) {
  const recommendations = [];
  
  // Error-based recommendations
  Object.keys(errorPatterns).forEach(error => {
    if (error.includes('rate limit') || error.includes('429')) {
      recommendations.push('Increase delay between messages (current: reduce rate limiting)');
    }
    if (error.includes('invalid phone') || error.includes('phone number')) {
      recommendations.push('Implement stricter phone number validation before sending');
    }
    if (error.includes('timeout') || error.includes('network')) {
      recommendations.push('Add retry mechanism with exponential backoff');
    }
    if (error.includes('unauthorized') || error.includes('401')) {
      recommendations.push('Check WhatsApp API credentials and permissions');
    }
    if (error.includes('template') || error.includes('message')) {
      recommendations.push('Review message template compliance with WhatsApp policies');
    }
  });

  // Phone pattern-based recommendations
  Object.keys(phonePatterns).forEach(pattern => {
    if (pattern.includes('Too short') || pattern.includes('Too long')) {
      recommendations.push('Filter out invalid phone number lengths before processing');
    }
    if (pattern.includes('Local format')) {
      recommendations.push('Convert local format numbers (0xxx) to international format (+62xxx)');
    }
  });

  // General recommendations
  recommendations.push('Implement phone number verification before adding to campaign');
  recommendations.push('Add manual retry option for failed messages');
  recommendations.push('Use smaller batch sizes (5-10 messages per batch)');
  recommendations.push('Add longer delays between batches (30-60 seconds)');
  recommendations.push('Implement message queue with priority for retries');

  return [...new Set(recommendations)]; // Remove duplicates
}

// Run analysis
analyzeFailedMessages().catch(console.error);