import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

const campaignId = '4f2f6c48-d810-45ae-9e3d-a2e1aeb5f85e';

async function checkRecentActivity() {
  try {
    console.log('🔍 Checking recent message activity...\n');

    // Get recent messages with timestamps
    const { data: recentMessages, error } = await supabase
      .from('whatsapp_blast_recipients')
      .select('phone_number, status, sent_at, created_at')
      .eq('campaign_id', campaignId)
      .in('status', ['sent', 'pending', 'failed'])
      .order('sent_at', { ascending: false, nullsLast: true })
      .limit(10);

    if (error) {
      console.error('❌ Error fetching data:', error);
      return;
    }

    console.log('📊 RECENT MESSAGE ACTIVITY:');
    console.log('════════════════════════════════════════');

    if (recentMessages && recentMessages.length > 0) {
      recentMessages.forEach((msg, index) => {
        const createdTime = new Date(msg.created_at).toLocaleString('id-ID');
        console.log(`${index + 1}. ${msg.phone_number} - ${msg.status}`);
        console.log(`   Created: ${createdTime}`);
        if (msg.sent_at) {
          const sentTime = new Date(msg.sent_at).toLocaleString('id-ID');
          console.log(`   Sent: ${sentTime}`);
        }
        console.log('');
      });
      
      // Check time difference from last sent message
      const lastSentMessage = recentMessages.find(msg => msg.sent_at);
      if (lastSentMessage) {
        const lastSent = new Date(lastSentMessage.sent_at);
        const now = new Date();
        const timeDiff = Math.floor((now - lastSent) / (1000 * 60)); // minutes
      
        console.log(`⏰ Last sent message: ${timeDiff} minutes ago`);
        
        if (timeDiff > 15) {
          console.log('⚠️  WARNING: No recent activity detected!');
          console.log('   Campaign might be stuck and need restart.');
          console.log('\n🔄 RECOMMENDATION: Restart the campaign');
          console.log('   Command: node restart-campaign.js 4f2f6c48-d810-45ae-9e3d-a2e1aeb5f85e');
        } else {
          console.log('✅ Campaign is actively processing messages.');
          console.log('   No restart needed at this time.');
        }
      } else {
        console.log('⚠️  No sent messages found in recent activity.');
        console.log('   Campaign might be stuck and need restart.');
        console.log('\n🔄 RECOMMENDATION: Restart the campaign');
        console.log('   Command: node restart-campaign.js 4f2f6c48-d810-45ae-9e3d-a2e1aeb5f85e');
      }
    } else {
      console.log('❌ No recent messages found');
    }

    // Get current stats
    const { data: stats } = await supabase
      .from('whatsapp_blast_recipients')
      .select('status')
      .eq('campaign_id', campaignId);

    if (stats) {
      const statusCount = stats.reduce((acc, msg) => {
        acc[msg.status] = (acc[msg.status] || 0) + 1;
        return acc;
      }, {});

      console.log('\n📈 CURRENT STATISTICS:');
      console.log('────────────────────────────────────────');
      console.log(`⏳ Pending: ${statusCount.pending || 0}`);
      console.log(`✅ Sent: ${statusCount.sent || 0}`);
      console.log(`📨 Delivered: ${statusCount.delivered || 0}`);
      console.log(`👁️ Read: ${statusCount.read || 0}`);
      console.log(`❌ Failed: ${statusCount.failed || 0}`);
      
      const total = stats.length;
      const sent = statusCount.sent || 0;
      const successRate = total > 0 ? ((sent / total) * 100).toFixed(2) : 0;
      console.log(`📊 Success Rate: ${successRate}%`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkRecentActivity();