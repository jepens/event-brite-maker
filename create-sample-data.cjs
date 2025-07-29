const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = 'http://localhost:54321';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

console.log('🔧 Creating sample data for testing...');
const supabase = createClient(supabaseUrl, supabaseKey);

async function createSampleData() {
  try {
    console.log('1. Creating sample event...');
    
    // Create a sample event
    const { data: event, error: eventError } = await supabase
      .from('events')
      .insert({
        name: 'Sample Event for Testing',
        description: 'This is a sample event for testing download functionality',
        event_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
        location: 'Sample Location, Jakarta',
        max_participants: 100,
        branding_config: {
          primaryColor: '#3B82F6'
        },
        custom_fields: [
          {
            name: 'company',
            label: 'Company Name',
            type: 'text',
            required: false,
            placeholder: 'Enter your company name'
          }
        ],
        whatsapp_enabled: true
      })
      .select()
      .single();

    if (eventError) {
      console.error('❌ Error creating event:', eventError);
      return;
    }

    console.log('✅ Event created:', event.id);

    // Create sample registrations
    console.log('2. Creating sample registrations...');
    
    const sampleRegistrations = [
      {
        participant_name: 'John Doe',
        participant_email: 'john.doe@example.com',
        phone_number: '6281234567890',
        status: 'approved',
        event_id: event.id,
        custom_data: {
          company: 'Tech Corp'
        }
      },
      {
        participant_name: 'Jane Smith',
        participant_email: 'jane.smith@example.com',
        phone_number: '6281234567891',
        status: 'pending',
        event_id: event.id,
        custom_data: {
          company: 'Design Studio'
        }
      },
      {
        participant_name: 'Bob Johnson',
        participant_email: 'bob.johnson@example.com',
        phone_number: '6281234567892',
        status: 'approved',
        event_id: event.id,
        custom_data: {
          company: 'Marketing Agency'
        }
      }
    ];

    const { data: registrations, error: regError } = await supabase
      .from('registrations')
      .insert(sampleRegistrations)
      .select();

    if (regError) {
      console.error('❌ Error creating registrations:', regError);
      return;
    }

    console.log('✅ Registrations created:', registrations.length);

    // Create sample tickets for approved registrations
    console.log('3. Creating sample tickets...');
    
    const approvedRegistrations = registrations.filter(r => r.status === 'approved');
    
    for (const registration of approvedRegistrations) {
      const { error: ticketError } = await supabase
        .from('tickets')
        .insert({
          registration_id: registration.id,
          qr_code: `QR_${registration.id}_${Date.now()}`,
          short_code: `SC${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
          qr_image_url: null,
          status: 'unused'
        });

      if (ticketError) {
        console.error('❌ Error creating ticket for registration:', registration.id, ticketError);
      }
    }

    console.log('✅ Tickets created for approved registrations');

    // Create one check-in for testing
    if (approvedRegistrations.length > 0) {
      console.log('4. Creating sample check-in...');
      
      const { error: checkinError } = await supabase
        .from('tickets')
        .update({
          status: 'used',
          used_at: new Date().toISOString(),
          checkin_at: new Date().toISOString(),
          checkin_by: '00000000-0000-0000-0000-000000000000', // Dummy user ID
          checkin_location: 'Main Entrance',
          checkin_notes: 'Checked in via QR scanner'
        })
        .eq('registration_id', approvedRegistrations[0].id);

      if (checkinError) {
        console.error('❌ Error creating check-in:', checkinError);
      } else {
        console.log('✅ Check-in created for first approved registration');
      }
    }

    console.log('\n🎉 Sample data created successfully!');
    console.log('📊 Summary:');
    console.log(`   - Event: ${event.name}`);
    console.log(`   - Registrations: ${registrations.length}`);
    console.log(`   - Approved: ${approvedRegistrations.length}`);
    console.log(`   - Pending: ${registrations.length - approvedRegistrations.length}`);
    console.log(`   - Tickets: ${approvedRegistrations.length}`);
    console.log(`   - Check-ins: 1`);

  } catch (error) {
    console.error('❌ Error creating sample data:', error);
  }
}

createSampleData(); 