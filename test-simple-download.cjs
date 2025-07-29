const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = 'http://localhost:54321';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

console.log('Testing with local Supabase...');
const supabase = createClient(supabaseUrl, supabaseKey);

async function testSimple() {
  try {
    console.log('1. Testing basic registrations query...');
    
    const { data, error } = await supabase
      .from('registrations')
      .select('*')
      .limit(3);

    if (error) {
      console.error('Error:', error);
      return;
    }

    console.log('Data found:', data?.length || 0);
    if (data && data.length > 0) {
      console.log('First registration:', data[0]);
    } else {
      console.log('No registrations found');
    }

  } catch (err) {
    console.error('Test failed:', err);
  }
}

testSimple(); 