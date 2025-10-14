import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://mjolfjoqfnszvvlbzhjn.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key-here';

const supabase = createClient(supabaseUrl, supabaseKey);

// Validate configuration
if (supabaseKey === 'your-service-role-key-here') {
  console.error('❌ Please configure VITE_SUPABASE_SERVICE_ROLE_KEY in .env file');
  process.exit(1);
}

/**
 * Get all phone numbers that have already successfully received messages
 * @param {string} campaignId - Optional campaign ID to check specific campaign
 * @returns {Promise<Set<string>>} Set of phone numbers that already received messages
 */
async function getSuccessfulRecipients(campaignId = null) {
  console.log('🔍 Checking for numbers that already received messages...');
  
  try {
    let query = supabase
      .from('whatsapp_blast_recipients')
      .select('phone_number')
      .in('status', ['sent', 'delivered', 'read']); // Status yang dianggap berhasil
    
    if (campaignId) {
      query = query.eq('campaign_id', campaignId);
    }
    
    const { data: recipients, error } = await query;
    
    if (error) {
      console.error('❌ Error fetching successful recipients:', error.message);
      return new Set();
    }
    
    const successfulNumbers = new Set(recipients.map(r => r.phone_number));
    console.log(`✅ Found ${successfulNumbers.size} numbers that already received messages`);
    
    return successfulNumbers;
  } catch (error) {
    console.error('❌ Error in getSuccessfulRecipients:', error.message);
    return new Set();
  }
}

/**
 * Filter out phone numbers that have already received messages
 * @param {Array} newRecipients - Array of new recipients to send messages to
 * @param {string} campaignId - Optional campaign ID to check specific campaign
 * @returns {Promise<Array>} Filtered array of recipients
 */
async function filterDuplicateRecipients(newRecipients, campaignId = null) {
  console.log(`📋 Filtering ${newRecipients.length} recipients for duplicates...`);
  
  const successfulNumbers = await getSuccessfulRecipients(campaignId);
  
  const filteredRecipients = newRecipients.filter(recipient => {
    const phoneNumber = recipient.phone_number || recipient.phoneNumber;
    return !successfulNumbers.has(phoneNumber);
  });
  
  const duplicateCount = newRecipients.length - filteredRecipients.length;
  
  console.log(`🚫 Filtered out ${duplicateCount} duplicate recipients`);
  console.log(`✅ ${filteredRecipients.length} new recipients ready for sending`);
  
  if (duplicateCount > 0) {
    console.log('\n📊 DUPLICATE PREVENTION SUMMARY:');
    console.log(`   Original recipients: ${newRecipients.length}`);
    console.log(`   Already received: ${duplicateCount}`);
    console.log(`   New to send: ${filteredRecipients.length}`);
  }
  
  return filteredRecipients;
}

/**
 * Check if a specific phone number has already received a message
 * @param {string} phoneNumber - Phone number to check
 * @param {string} campaignId - Optional campaign ID to check specific campaign
 * @returns {Promise<boolean>} True if number already received message
 */
async function hasReceivedMessage(phoneNumber, campaignId = null) {
  try {
    let query = supabase
      .from('whatsapp_blast_recipients')
      .select('id')
      .eq('phone_number', phoneNumber)
      .in('status', ['sent', 'delivered', 'read']);
    
    if (campaignId) {
      query = query.eq('campaign_id', campaignId);
    }
    
    const { data, error } = await query.limit(1);
    
    if (error) {
      console.error(`❌ Error checking number ${phoneNumber}:`, error.message);
      return false;
    }
    
    return data && data.length > 0;
  } catch (error) {
    console.error(`❌ Error in hasReceivedMessage for ${phoneNumber}:`, error.message);
    return false;
  }
}

/**
 * Get detailed report of successful recipients by campaign
 * @param {string} campaignId - Campaign ID to check
 * @returns {Promise<Object>} Detailed report
 */
async function getSuccessfulRecipientsReport(campaignId) {
  console.log(`📊 Generating detailed report for campaign: ${campaignId}`);
  
  try {
    const { data: recipients, error } = await supabase
      .from('whatsapp_blast_recipients')
      .select('phone_number, name, status, sent_at, delivered_at, read_at, message_id')
      .eq('campaign_id', campaignId)
      .in('status', ['sent', 'delivered', 'read'])
      .order('sent_at', { ascending: false });
    
    if (error) {
      console.error('❌ Error fetching detailed report:', error.message);
      return null;
    }
    
    const report = {
      total: recipients.length,
      sent: recipients.filter(r => r.status === 'sent').length,
      delivered: recipients.filter(r => r.status === 'delivered').length,
      read: recipients.filter(r => r.status === 'read').length,
      recipients: recipients
    };
    
    console.log('\n📈 SUCCESS REPORT:');
    console.log(`   Total successful: ${report.total}`);
    console.log(`   Sent: ${report.sent}`);
    console.log(`   Delivered: ${report.delivered}`);
    console.log(`   Read: ${report.read}`);
    
    return report;
  } catch (error) {
    console.error('❌ Error in getSuccessfulRecipientsReport:', error.message);
    return null;
  }
}

// Export functions for use in other scripts
export {
  getSuccessfulRecipients,
  filterDuplicateRecipients,
  hasReceivedMessage,
  getSuccessfulRecipientsReport
};

// CLI usage
async function runCLI() {
  const campaignId = process.argv[2];
  
  if (campaignId) {
    console.log(`🎯 Checking duplicates for campaign: ${campaignId}\n`);
    await getSuccessfulRecipientsReport(campaignId);
  } else {
    console.log('🔍 Checking all successful recipients across all campaigns\n');
    const numbers = await getSuccessfulRecipients();
    console.log('\n📋 All successful phone numbers:');
    Array.from(numbers).forEach((number, index) => {
      console.log(`   ${index + 1}. ${number}`);
    });
  }
}

// Check if this file is being run directly
if (process.argv[1].endsWith('prevent-duplicate-blast.js')) {
  runCLI().catch(console.error);
}