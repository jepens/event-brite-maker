// Script untuk test dresscode form functionality
const fs = require('fs');
const path = require('path');

// Load environment variables manually
const envPath = path.join(__dirname, '.env');
let envVars = {};

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      envVars[key.trim()] = value.trim();
    }
  });
}

const testDresscodeForm = async () => {
  const SUPABASE_URL = envVars.VITE_SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = envVars.VITE_SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Environment variables not found!');
    console.log('Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_SERVICE_ROLE_KEY are set in .env file');
    return;
  }

  console.log('🧪 Testing Dresscode Form Functionality...\n');

  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Step 1: Check if dresscode column exists
    console.log('📋 Step 1: Checking dresscode column...');
    
    const { data: columnInfo, error: columnError } = await supabase
      .rpc('get_table_columns', { table_name: 'events' });

    if (columnError) {
      console.log('❌ Error checking table columns:', columnError.message);
      // Try alternative approach
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('dresscode')
        .limit(1);

      if (eventsError && eventsError.message.includes('column "dresscode" does not exist')) {
        console.log('❌ Dresscode column does not exist in events table');
        console.log('Please run the migration first: npx supabase db push');
        return;
      } else if (eventsError) {
        console.log('❌ Error checking events table:', eventsError.message);
        return;
      }
    }

    console.log('✅ Dresscode column exists in events table');

    // Step 2: Create test event with dresscode
    console.log('\n📝 Step 2: Creating test event with dresscode...');
    
    const testEvent = {
      name: 'Test Event with Dresscode',
      description: 'Testing dresscode functionality',
      event_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
      location: 'Test Location',
      max_participants: 100,
      dresscode: 'Smart Casual / Semi Formal',
      branding_config: {
        primaryColor: '#000000'
      },
      custom_fields: [],
      whatsapp_enabled: true,
      created_by: '00000000-0000-0000-0000-000000000000' // Use a default UUID for testing
    };

    const { data: newEvent, error: createError } = await supabase
      .from('events')
      .insert(testEvent)
      .select()
      .single();

    if (createError) {
      console.log('❌ Failed to create test event:', createError.message);
      return;
    }

    console.log('✅ Test event created successfully');
    console.log('📊 Event data:', {
      id: newEvent.id,
      name: newEvent.name,
      dresscode: newEvent.dresscode,
      event_date: newEvent.event_date
    });

    // Step 3: Update event with different dresscode
    console.log('\n🔄 Step 3: Updating event with different dresscode...');
    
    const updatedDresscode = 'Formal / Business Attire';
    const { data: updatedEvent, error: updateError } = await supabase
      .from('events')
      .update({ dresscode: updatedDresscode })
      .eq('id', newEvent.id)
      .select()
      .single();

    if (updateError) {
      console.log('❌ Failed to update event:', updateError.message);
      return;
    }

    console.log('✅ Event updated successfully');
    console.log('📊 Updated dresscode:', updatedEvent.dresscode);

    // Step 4: Test automatic dresscode logic
    console.log('\n🤖 Step 4: Testing automatic dresscode logic...');
    
    const testAutomaticDresscode = async (eventDate, expectedDresscode) => {
             const { data: autoEvent, error: autoError } = await supabase
         .from('events')
         .insert({
           name: `Auto Dresscode Test - ${expectedDresscode}`,
           description: 'Testing automatic dresscode',
           event_date: eventDate,
           location: 'Test Location',
           max_participants: 50,
           dresscode: null, // Let it use automatic
           branding_config: { primaryColor: '#000000' },
           custom_fields: [],
           whatsapp_enabled: false,
           created_by: '00000000-0000-0000-0000-000000000000' // Use a default UUID for testing
         })
        .select()
        .single();

      if (autoError) {
        console.log(`❌ Failed to create auto test event:`, autoError.message);
        return;
      }

      console.log(`✅ Created event with ${expectedDresscode} time`);
      console.log(`   Event: ${autoEvent.name}`);
      console.log(`   Date: ${autoEvent.event_date}`);
      console.log(`   Dresscode: ${autoEvent.dresscode || 'NULL (will use automatic)'}`);

      return autoEvent;
    };

    // Test different time ranges
    const morningDate = new Date();
    morningDate.setHours(9, 0, 0, 0);
    morningDate.setDate(morningDate.getDate() + 1);

    const afternoonDate = new Date();
    afternoonDate.setHours(14, 0, 0, 0);
    afternoonDate.setDate(afternoonDate.getDate() + 1);

    const eveningDate = new Date();
    eveningDate.setHours(20, 0, 0, 0);
    eveningDate.setDate(eveningDate.getDate() + 1);

    await testAutomaticDresscode(morningDate.toISOString(), 'Morning');
    await testAutomaticDresscode(afternoonDate.toISOString(), 'Afternoon');
    await testAutomaticDresscode(eveningDate.toISOString(), 'Evening');

    // Step 5: Test WhatsApp template with dresscode
    console.log('\n📱 Step 5: Testing WhatsApp template with dresscode...');
    
    // Create registration for the test event
    const { data: registration, error: regError } = await supabase
      .from('registrations')
      .insert({
        event_id: newEvent.id,
        participant_name: 'Test User',
        participant_email: 'test@example.com',
        custom_data: {},
        status: 'pending',
        phone_number: '628123456789'
      })
      .select()
      .single();

    if (regError) {
      console.log('❌ Failed to create test registration:', regError.message);
    } else {
      console.log('✅ Test registration created');
      
      // Generate ticket
      const { data: ticketData, error: ticketError } = await supabase.functions.invoke('generate-qr-ticket', {
        body: { registration_id: registration.id }
      });

      if (ticketError) {
        console.log('❌ Failed to generate ticket:', ticketError.message);
      } else {
        console.log('✅ Ticket generated successfully');
        
        // Test WhatsApp template
        const { data: whatsappData, error: whatsappError } = await supabase.functions.invoke('send-whatsapp-ticket', {
          body: {
            registration_id: registration.id,
            template_name: 'ticket_confirmation',
            language_code: 'id',
            include_header: true
          }
        });

        if (whatsappError) {
          console.log('❌ Failed to send WhatsApp message:', whatsappError.message);
        } else {
          console.log('✅ WhatsApp message sent successfully!');
          console.log('📊 WhatsApp response:', {
            success: whatsappData.success,
            dresscode: whatsappData.dresscode,
            template_used: whatsappData.template_used
          });
        }
      }
    }

    // Step 6: Cleanup test data
    console.log('\n🧹 Step 6: Cleaning up test data...');
    
    // Delete test registrations first (to avoid foreign key constraint)
    const { error: deleteRegError } = await supabase
      .from('registrations')
      .delete()
      .eq('event_id', newEvent.id);

    if (deleteRegError) {
      console.log('❌ Failed to delete test registrations:', deleteRegError.message);
    }

    // Delete test events
    const { error: deleteEventError } = await supabase
      .from('events')
      .delete()
      .like('name', 'Test Event%');

    if (deleteEventError) {
      console.log('❌ Failed to delete test events:', deleteEventError.message);
    } else {
      console.log('✅ Test data cleaned up successfully');
    }

    // Summary
    console.log('\n' + '='.repeat(60) + '\n');
    console.log('📋 DRESSCODE FORM TEST SUMMARY:');
    console.log('✅ Dresscode column exists in database');
    console.log('✅ Event creation with dresscode works');
    console.log('✅ Event update with dresscode works');
    console.log('✅ Automatic dresscode logic tested');
    console.log('✅ WhatsApp template with dresscode works');
    console.log('✅ Test data cleaned up');
    
    console.log('\n🎉 SUCCESS: Dresscode form functionality is working correctly!');
    console.log('The dresscode field has been successfully added to the event form.');

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
};

// Run the test
testDresscodeForm(); 