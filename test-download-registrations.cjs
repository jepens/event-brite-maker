const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

console.log('🔧 Initializing Supabase client...');
console.log('URL:', supabaseUrl);
console.log('Key configured:', !!supabaseKey);

const supabase = createClient(supabaseUrl, supabaseKey);

async function testRegistrationData() {
  console.log('\n🔍 Testing Registration Data Download...\n');

  try {
    // Test 1: Check if registrations table has data
    console.log('1. Checking registrations table...');
    const { data: registrations, error: regError } = await supabase
      .from('registrations')
      .select('*')
      .limit(5);

    if (regError) {
      console.error('❌ Error fetching registrations:', regError);
      return;
    }

    console.log(`✅ Found ${registrations?.length || 0} registrations`);
    if (registrations && registrations.length > 0) {
      console.log('Sample registration:', registrations[0]);
    } else {
      console.log('⚠️ No registrations found in database');
    }

    // Test 2: Check if events table has data
    console.log('\n2. Checking events table...');
    const { data: events, error: eventError } = await supabase
      .from('events')
      .select('*')
      .limit(5);

    if (eventError) {
      console.error('❌ Error fetching events:', eventError);
      return;
    }

    console.log(`✅ Found ${events?.length || 0} events`);
    if (events && events.length > 0) {
      console.log('Sample event:', events[0]);
    } else {
      console.log('⚠️ No events found in database');
    }

    // Test 3: Check if tickets table has data
    console.log('\n3. Checking tickets table...');
    const { data: tickets, error: ticketError } = await supabase
      .from('tickets')
      .select('*')
      .limit(5);

    if (ticketError) {
      console.error('❌ Error fetching tickets:', ticketError);
      return;
    }

    console.log(`✅ Found ${tickets?.length || 0} tickets`);
    if (tickets && tickets.length > 0) {
      console.log('Sample ticket:', tickets[0]);
    } else {
      console.log('⚠️ No tickets found in database');
    }

    // Test 4: Test the actual query used in download service
    console.log('\n4. Testing download service query...');
    const { data: downloadData, error: downloadError } = await supabase
      .from('registrations')
      .select(`
        id,
        participant_name,
        participant_email,
        phone_number,
        status,
        registered_at,
        custom_data,
        event_id,
        events (
          id,
          name,
          event_date,
          location
        ),
        tickets (
          id,
          qr_code,
          short_code,
          checkin_at,
          checkin_location,
          checkin_notes
        )
      `)
      .order('registered_at', { ascending: false })
      .limit(5);

    if (downloadError) {
      console.error('❌ Error in download query:', downloadError);
      return;
    }

    console.log(`✅ Download query returned ${downloadData?.length || 0} records`);
    if (downloadData && downloadData.length > 0) {
      console.log('Sample download data:', JSON.stringify(downloadData[0], null, 2));
    } else {
      console.log('⚠️ No data returned from download query');
    }

    // Test 5: Test checkin_reports view
    console.log('\n5. Testing checkin_reports view...');
    const { data: checkinReports, error: checkinError } = await supabase
      .from('checkin_reports')
      .select('*')
      .limit(5);

    if (checkinError) {
      console.error('❌ Error fetching checkin reports:', checkinError);
      console.log('This might be because the view or migration is not applied yet.');
    } else {
      console.log(`✅ Found ${checkinReports?.length || 0} check-in reports`);
      if (checkinReports && checkinReports.length > 0) {
        console.log('Sample check-in report:', checkinReports[0]);
      } else {
        console.log('⚠️ No check-in reports found');
      }
    }

    // Test 6: Generate sample CSV data
    console.log('\n6. Testing CSV generation...');
    if (downloadData && downloadData.length > 0) {
      const sampleData = downloadData.map(registration => ({
        id: registration.id,
        participant_name: registration.participant_name,
        participant_email: registration.participant_email,
        phone_number: registration.phone_number || '',
        status: registration.status,
        registered_at: registration.registered_at,
        event_name: registration.events?.name || 'Unknown Event',
        event_date: registration.events?.event_date || '',
        event_location: registration.events?.location || '',
        ticket_code: registration.tickets?.[0]?.qr_code || '',
        ticket_short_code: registration.tickets?.[0]?.short_code || '',
        checkin_at: registration.tickets?.[0]?.checkin_at || '',
        checkin_location: registration.tickets?.[0]?.checkin_location || '',
        checkin_notes: registration.tickets?.[0]?.checkin_notes || ''
      }));

      const headers = [
        'ID', 'Nama Peserta', 'Email', 'Nomor Telepon', 'Status', 
        'Tanggal Registrasi', 'Nama Event', 'Tanggal Event', 'Lokasi Event',
        'Kode Tiket', 'Kode Pendek', 'Waktu Check-in', 'Lokasi Check-in', 'Catatan Check-in'
      ];

      const csvHeaders = headers.join(',');
      const csvRows = sampleData.map(row => 
        headers.map(header => {
          const key = header.toLowerCase().replace(/\s+/g, '_');
          const value = row[key] || '';
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      );
      
      const csv = [csvHeaders, ...csvRows].join('\n');
      console.log('✅ Generated CSV sample:');
      console.log(csv);
    } else {
      console.log('⚠️ No data available for CSV generation');
    }

    // Test 7: Check if we need to create sample data
    console.log('\n7. Summary:');
    if (!registrations || registrations.length === 0) {
      console.log('❌ No registrations found - this is why CSV is empty');
      console.log('💡 You need to create some registrations first');
    } else {
      console.log('✅ Data exists, but there might be an issue with the download logic');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testRegistrationData().then(() => {
  console.log('\n🏁 Test completed');
}).catch(error => {
  console.error('❌ Test failed with error:', error);
}); 