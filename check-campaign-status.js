import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ Missing Supabase credentials in .env file');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkCampaignStatus(campaignId) {
    try {
        console.log('🔍 Checking Campaign Status...');
        console.log('═══════════════════════════════════════');

        // Get campaign details
        const { data: campaign, error: campaignError } = await supabase
            .from('whatsapp_blast_campaigns')
            .select('*')
            .eq('id', campaignId)
            .single();

        if (campaignError) {
            throw new Error(`Error fetching campaign: ${campaignError.message}`);
        }

        if (!campaign) {
            throw new Error('Campaign not found');
        }

        console.log(`📋 Campaign: ${campaign.name}`);
        console.log(`📊 Status: ${campaign.status}`);
        console.log(`📅 Created: ${new Date(campaign.created_at).toLocaleString()}`);
        console.log(`🔄 Updated: ${new Date(campaign.updated_at).toLocaleString()}`);
        console.log('');

        // Get recipient statistics
        const { data: recipients, error: recipientsError } = await supabase
            .from('whatsapp_blast_recipients')
            .select('status, error_message, sent_at, failed_at')
            .eq('campaign_id', campaignId);

        if (recipientsError) {
            throw new Error(`Error fetching recipients: ${recipientsError.message}`);
        }

        // Calculate statistics
        const stats = {
            total: recipients.length,
            sent: recipients.filter(r => r.status === 'sent').length,
            pending: recipients.filter(r => r.status === 'pending').length,
            failed: recipients.filter(r => r.status === 'failed').length
        };

        console.log('📊 CURRENT STATISTICS:');
        console.log(`   📱 Total Recipients: ${stats.total}`);
        console.log(`   ✅ Sent: ${stats.sent}`);
        console.log(`   ⏳ Pending: ${stats.pending}`);
        console.log(`   ❌ Failed: ${stats.failed}`);
        console.log(`   🎯 Success Rate: ${stats.total > 0 ? ((stats.sent / stats.total) * 100).toFixed(2) : 0}%`);
        console.log('');

        // Show recent activity (last 10 sent messages)
        const recentSent = recipients
            .filter(r => r.status === 'sent' && r.sent_at)
            .sort((a, b) => new Date(b.sent_at) - new Date(a.sent_at))
            .slice(0, 5);

        if (recentSent.length > 0) {
            console.log('📤 RECENT SENT MESSAGES:');
            recentSent.forEach((recipient, index) => {
                console.log(`   ${index + 1}. Sent at: ${new Date(recipient.sent_at).toLocaleString()}`);
            });
            console.log('');
        }

        // Show recent failures
        const recentFailed = recipients
            .filter(r => r.status === 'failed')
            .slice(0, 5);

        if (recentFailed.length > 0) {
            console.log('❌ RECENT FAILURES:');
            recentFailed.forEach((recipient, index) => {
                console.log(`   ${index + 1}. Error: ${recipient.error_message || 'Unknown error'}`);
            });
            console.log('');
        }

        // Campaign status analysis
        if (stats.pending > 0) {
            console.log('⏳ Campaign is still processing...');
            console.log('💡 Recommendation: Wait for Edge Function to complete processing');
        } else if (stats.failed > 0 && stats.sent === 0) {
            console.log('❌ Campaign has issues - all messages failed');
            console.log('💡 Recommendation: Check error messages and retry');
        } else if (stats.sent > 0) {
            console.log('✅ Campaign is running normally');
            if (stats.pending > 0) {
                console.log('💡 Recommendation: Wait for remaining messages to be processed');
            } else {
                console.log('🎉 Campaign completed!');
            }
        }

    } catch (error) {
        console.error('❌ Error checking campaign status:', error.message);
        process.exit(1);
    }
}

// Get campaign ID from command line arguments
const campaignId = process.argv[2];

if (!campaignId) {
    console.error('❌ Please provide campaign ID as argument');
    console.log('Usage: node check-campaign-status.js <campaign-id>');
    process.exit(1);
}

checkCampaignStatus(campaignId);