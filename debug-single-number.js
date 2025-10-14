import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugSingleNumber(campaignId, phoneNumber) {
    console.log('🔍 DEBUG SINGLE NUMBER');
    console.log('═══════════════════════════════════════');
    console.log(`📱 Phone Number: ${phoneNumber}`);
    console.log(`📋 Campaign ID: ${campaignId}\n`);

    try {
        // 1. Cari recipient berdasarkan nomor telepon
        console.log('1️⃣ Searching for recipient in database...');
        const { data: recipient, error: searchError } = await supabase
            .from('whatsapp_blast_recipients')
            .select('*')
            .eq('campaign_id', campaignId)
            .eq('phone_number', phoneNumber)
            .single();

        if (searchError || !recipient) {
            console.log(`❌ Recipient not found: ${searchError?.message}`);
            return;
        }

        console.log(`✅ Recipient found:`);
        console.log(`   ID: ${recipient.id}`);
        console.log(`   Name: ${recipient.name}`);
        console.log(`   Phone: ${recipient.phone_number}`);
        console.log(`   Status: ${recipient.status}`);
        console.log(`   Error: ${recipient.error_message || 'None'}\n`);

        // 2. Test direct call ke WhatsApp API
        console.log('2️⃣ Testing direct call to WhatsApp API...');
        
        const response = await fetch(`${supabaseUrl}/functions/v1/whatsapp-blast`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${supabaseServiceKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                recipientId: recipient.id
            })
        });

        console.log(`📡 Response Status: ${response.status} ${response.statusText}`);
        
        const responseText = await response.text();
        console.log(`📄 Raw Response: ${responseText}\n`);

        let result;
        try {
            result = JSON.parse(responseText);
            console.log('📋 Parsed Response:');
            console.log(JSON.stringify(result, null, 2));
        } catch (parseError) {
            console.log('⚠️  Could not parse response as JSON');
            console.log(`Raw text: ${responseText}`);
        }

        // 3. Analisis format nomor
        console.log('\n3️⃣ Analyzing phone number format...');
        console.log(`   Original: ${phoneNumber}`);
        console.log(`   Length: ${phoneNumber.length}`);
        console.log(`   Starts with 62: ${phoneNumber.startsWith('62')}`);
        console.log(`   Is numeric: ${/^\d+$/.test(phoneNumber)}`);
        
        // Format alternatif
        const formats = [
            phoneNumber,
            phoneNumber.startsWith('0') ? '62' + phoneNumber.substring(1) : phoneNumber,
            phoneNumber.startsWith('62') ? phoneNumber : '62' + phoneNumber,
            phoneNumber.startsWith('+62') ? phoneNumber.substring(1) : phoneNumber
        ];
        
        console.log('\n   Possible formats:');
        formats.forEach((format, index) => {
            console.log(`   ${index + 1}. ${format}`);
        });

        // 4. Cek campaign details
        console.log('\n4️⃣ Campaign details...');
        const { data: campaign, error: campaignError } = await supabase
            .from('whatsapp_blast_campaigns')
            .select('*')
            .eq('id', campaignId)
            .single();

        if (campaign) {
            console.log(`   Campaign: ${campaign.name}`);
            console.log(`   Status: ${campaign.status}`);
            console.log(`   Template: ${campaign.template_name || 'Not set'}`);
            console.log(`   Message: ${campaign.message?.substring(0, 100)}...`);
        }

    } catch (error) {
        console.error('❌ Error during debug:', error.message);
        console.error(error.stack);
    }
}

// Ambil parameter dari command line
const campaignId = process.argv[2];
const phoneNumber = process.argv[3];

if (!campaignId || !phoneNumber) {
    console.log('Usage: node debug-single-number.js <campaignId> <phoneNumber>');
    console.log('Example: node debug-single-number.js 4f2f6c48-d810-45ae-9e3d-a2e1aeb5f85e 6285795522562');
    process.exit(1);
}

debugSingleNumber(campaignId, phoneNumber);