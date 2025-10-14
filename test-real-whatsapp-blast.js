import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase configuration - using service role for testing to bypass RLS
const supabaseUrl = 'https://mjolfjoqfnszvvlbzhjn.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key-here';

const supabase = createClient(supabaseUrl, supabaseKey);

// Validate configuration
if (supabaseKey === 'your-service-role-key-here') {
  console.error('❌ Please configure VITE_SUPABASE_SERVICE_ROLE_KEY in .env file');
  process.exit(1);
}

// Test configuration
const TEST_CONFIG = {
  csvFile: 'test-recipients-1000.csv',
  templateName: 'event_details_reminder_duage', // Default template from schema
  campaignName: 'Test Campaign - 1000 Recipients',
  dryRun: true, // Set to false for actual sending
  batchSize: 50,
  maxRecipients: 1000
};

/**
 * Parse CSV file and return recipients array
 */
function parseCSV(filePath) {
  try {
    const csvContent = fs.readFileSync(filePath, 'utf-8');
    const lines = csvContent.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
    
    const recipients = [];
    for (let i = 1; i < lines.length && i <= TEST_CONFIG.maxRecipients; i++) {
      const values = lines[i].split(',').map(v => v.replace(/"/g, '').trim());
      const recipient = {};
      
      headers.forEach((header, index) => {
        recipient[header] = values[index] || '';
      });
      
      // Validate required fields
      if (recipient.phone_number && recipient.name) {
        recipients.push(recipient);
      }
    }
    
    return recipients;
  } catch (error) {
    console.error('❌ Error parsing CSV:', error.message);
    return [];
  }
}

/**
 * Create a WhatsApp blast campaign in database
 */
async function createCampaign(recipients) {
  try {
    console.log('📝 Creating campaign in database...');
    
    // Create campaign record
    const { data: campaign, error: campaignError } = await supabase
      .from('whatsapp_blast_campaigns')
      .insert({
        name: TEST_CONFIG.campaignName,
        template_name: TEST_CONFIG.templateName,
        status: 'draft',
        total_recipients: recipients.length,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (campaignError) {
      throw new Error(`Campaign creation failed: ${campaignError.message}`);
    }

    console.log(`✅ Campaign created with ID: ${campaign.id}`);

    // Create recipient records
    console.log('👥 Adding recipients to campaign...');
    const recipientRecords = recipients.map(recipient => ({
      campaign_id: campaign.id,
      phone_number: recipient.phone_number,
      name: recipient.name,
      status: 'pending'
    }));

    // Insert recipients in batches
    const batchSize = 100;
    for (let i = 0; i < recipientRecords.length; i += batchSize) {
      const batch = recipientRecords.slice(i, i + batchSize);
      const { error: recipientError } = await supabase
        .from('whatsapp_blast_recipients')
        .insert(batch);

      if (recipientError) {
        throw new Error(`Recipient insertion failed: ${recipientError.message}`);
      }

      console.log(`✅ Added batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(recipientRecords.length/batchSize)} (${batch.length} recipients)`);
    }

    return campaign;
  } catch (error) {
    console.error('❌ Error creating campaign:', error.message);
    throw error;
  }
}

/**
 * Start the WhatsApp blast campaign
 */
async function startBlastCampaign(campaignId) {
  try {
    console.log('\n🚀 Starting WhatsApp blast campaign...');
    console.log(`Campaign ID: ${campaignId}`);
    
    if (TEST_CONFIG.dryRun) {
      console.log('🧪 DRY RUN MODE - No actual messages will be sent');
      console.log('💡 To send real messages, set dryRun: false in TEST_CONFIG');
      return { success: true, message: 'Dry run completed' };
    }

    // Call the Supabase function
    const { data, error } = await supabase.functions.invoke('send-whatsapp-blast', {
      body: {
        campaign_id: campaignId,
        action: 'start'
      }
    });

    if (error) {
      throw new Error(`Function call failed: ${error.message}`);
    }

    console.log('✅ Campaign started successfully');
    return data;
  } catch (error) {
    console.error('❌ Error starting campaign:', error.message);
    throw error;
  }
}

/**
 * Monitor campaign progress
 */
async function monitorCampaign(campaignId) {
  try {
    console.log('\n📊 Monitoring campaign progress...');
    
    const { data: campaign, error } = await supabase
      .from('whatsapp_blast_campaigns')
      .select(`
        *,
        whatsapp_blast_recipients(*)
      `)
      .eq('id', campaignId)
      .single();

    if (error) {
      throw new Error(`Failed to fetch campaign: ${error.message}`);
    }

    const recipients = campaign.whatsapp_blast_recipients || [];
    const stats = {
      total: recipients.length,
      pending: recipients.filter(r => r.status === 'pending').length,
      sent: recipients.filter(r => r.status === 'sent').length,
      failed: recipients.filter(r => r.status === 'failed').length,
      processing: recipients.filter(r => r.status === 'processing').length
    };

    console.log('\n📈 Campaign Statistics:');
    console.log(`📊 Total Recipients: ${stats.total}`);
    console.log(`⏳ Pending: ${stats.pending}`);
    console.log(`✅ Sent: ${stats.sent}`);
    console.log(`❌ Failed: ${stats.failed}`);
    console.log(`🔄 Processing: ${stats.processing}`);
    console.log(`📈 Success Rate: ${((stats.sent / stats.total) * 100).toFixed(2)}%`);
    console.log(`📅 Campaign Status: ${campaign.status}`);

    return stats;
  } catch (error) {
    console.error('❌ Error monitoring campaign:', error.message);
    throw error;
  }
}

/**
 * Main test function
 */
async function runWhatsAppBlastTest() {
  console.log('🚀 === WHATSAPP BLAST TEST - 1000 RECIPIENTS ===\n');
  
  try {
    // Step 1: Parse CSV file
    console.log('📂 Step 1: Loading test data...');
    const csvPath = path.join(__dirname, TEST_CONFIG.csvFile);
    
    if (!fs.existsSync(csvPath)) {
      throw new Error(`CSV file not found: ${csvPath}`);
    }

    const recipients = parseCSV(csvPath);
    console.log(`✅ Loaded ${recipients.length} recipients from CSV`);

    if (recipients.length === 0) {
      throw new Error('No valid recipients found in CSV file');
    }

    // Step 2: Create campaign
    console.log('\n📝 Step 2: Creating campaign...');
    const campaign = await createCampaign(recipients);

    // Step 3: Start blast (or dry run)
    console.log('\n🚀 Step 3: Starting blast campaign...');
    const result = await startBlastCampaign(campaign.id);

    // Step 4: Monitor progress
    console.log('\n📊 Step 4: Initial campaign status...');
    await monitorCampaign(campaign.id);

    // Summary
    console.log('\n✅ === TEST COMPLETED SUCCESSFULLY ===');
    console.log(`📋 Campaign ID: ${campaign.id}`);
    console.log(`👥 Recipients: ${recipients.length}`);
    console.log(`🎯 Template: ${TEST_CONFIG.templateName}`);
    console.log(`🧪 Dry Run: ${TEST_CONFIG.dryRun ? 'Yes' : 'No'}`);
    
    if (TEST_CONFIG.dryRun) {
      console.log('\n💡 To run actual test:');
      console.log('1. Set dryRun: false in TEST_CONFIG');
      console.log('2. Ensure WhatsApp API credentials are configured');
      console.log('3. Run the script again');
    } else {
      console.log('\n📱 Real messages are being sent!');
      console.log('📊 Monitor progress in your admin dashboard');
      console.log(`🔗 Campaign ID: ${campaign.id}`);
    }

    return {
      success: true,
      campaignId: campaign.id,
      recipientCount: recipients.length,
      dryRun: TEST_CONFIG.dryRun
    };

  } catch (error) {
    console.error('\n❌ === TEST FAILED ===');
    console.error('Error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// Execute the test
runWhatsAppBlastTest()
  .then(result => {
    if (result.success) {
      console.log('\n🎉 Test completed successfully!');
      process.exit(0);
    } else {
      console.log('\n💥 Test failed!');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });

export { runWhatsAppBlastTest, parseCSV, createCampaign, startBlastCampaign, monitorCampaign };