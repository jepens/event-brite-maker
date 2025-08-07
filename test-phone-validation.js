// Test script for phone number validation
// This script tests the phone number validation logic from the Edge Function

function validatePhoneNumber(phone) {
  // Handle null, undefined, or empty values
  if (!phone || typeof phone !== 'string' || phone.trim() === '') {
    return false;
  }
  
  // Trim whitespace and remove any non-digit characters
  const cleanPhone = phone.trim();
  const digitsOnly = cleanPhone.replace(/\D/g, '');
  
  console.log('Phone validation:', {
    original: phone,
    cleaned: cleanPhone,
    digitsOnly: digitsOnly,
    length: digitsOnly.length
  });
  
  // Check if it's already in correct format: 628xxxxxxxxxx (13 digits) or 628xxxxxxxxx (11 digits)
  if (digitsOnly.startsWith('62') && (digitsOnly.length === 13 || digitsOnly.length === 11)) {
    return true;
  }
  
  // Check if it can be converted to correct format
  if (digitsOnly.startsWith('08') && (digitsOnly.length >= 10 && digitsOnly.length <= 13)) {
    return true; // Can be converted to 628xxxxxxxxxx (08xxxxxxxx, 08xxxxxxxxx, 08xxxxxxxxxx, or 08xxxxxxxxxxx)
  }
  
  if (digitsOnly.startsWith('8') && digitsOnly.length === 11) {
    return true; // Can be converted to 628xxxxxxxxxx
  }
  
  if (digitsOnly.length === 10 && !digitsOnly.startsWith('0') && !digitsOnly.startsWith('8')) {
    return true; // Can be converted to 628xxxxxxxxxx (assuming it's a mobile number)
  }
  
  return false;
}

function formatPhoneNumber(phone) {
  // Handle null, undefined, or empty phone numbers
  if (!phone || typeof phone !== 'string' || phone.trim() === '') {
    throw new Error('Phone number is required');
  }
  
  // Trim whitespace and remove any non-digit characters
  const cleanPhone = phone.trim();
  const digitsOnly = cleanPhone.replace(/\D/g, '');
  
  console.log('Phone formatting details:', {
    original: phone,
    cleaned: cleanPhone,
    digitsOnly: digitsOnly,
    length: digitsOnly.length,
    startsWith62: digitsOnly.startsWith('62'),
    startsWith08: digitsOnly.startsWith('08'),
    startsWith8: digitsOnly.startsWith('8')
  });
  
  if (digitsOnly.startsWith('62') && (digitsOnly.length === 13 || digitsOnly.length === 11)) {
    return digitsOnly; // Already in correct format (628xxxxxxxxxx or 628xxxxxxxxx)
  } else if (digitsOnly.startsWith('08') && (digitsOnly.length >= 10 && digitsOnly.length <= 13)) {
    return '62' + digitsOnly.substring(1); // Convert 08xxxxxxxx, 08xxxxxxxxx, 08xxxxxxxxxx, or 08xxxxxxxxxxx to 628xxxxxxxxxx
  } else if (digitsOnly.startsWith('8') && digitsOnly.length === 11) {
    return '62' + digitsOnly; // Convert 8xxxxxxxxx to 628xxxxxxxxxx
  } else if (digitsOnly.length === 10 && !digitsOnly.startsWith('0') && !digitsOnly.startsWith('8')) {
    return '628' + digitsOnly; // Convert xxxxxxxxxx to 628xxxxxxxxxx (assuming it's a mobile number)
  }
  
  throw new Error(`Invalid phone number format: ${phone}. Expected format: 628xxxxxxxxxx, 08xxxxxxxxxx, 8xxxxxxxxx, or xxxxxxxxxx`);
}

// Test cases
const testCases = [
  // Valid cases
  '6281314942012',      // Already correct format
  '081314942012',       // 08xxxxxxxxxx format (12 digits)
  '08159356887',        // 08xxxxxxxxx format (11 digits) - problematic case
  '0895328708034',      // 08xxxxxxxxxxx format (13 digits) - problematic case
  '0813233488496',      // 08xxxxxxxxxxx format (13 digits) - problematic case
  '0816703115',         // 08xxxxxxxx format (10 digits) - problematic case
  '0817191117',         // 08xxxxxxxx format (10 digits) - problematic case
  '62816721116',        // 628xxxxxxxxx format (11 digits) - problematic case
  '81314942012',        // 8xxxxxxxxx format
  '1314942012',         // xxxxxxxxxx format
  ' 081314942012 ',     // With whitespace
  '+6281314942012',     // With plus sign
  '0813-149-42012',     // With dashes
  '0813 149 42012',     // With spaces
  
  // Invalid cases
  null,                 // null
  undefined,            // undefined
  '',                   // empty string
  '   ',                // whitespace only
  '08131494201',        // too short (11 digits)
  '0813149420123',      // too long (13 digits but wrong format)
  '08131494201a',       // contains letters
  '08131494201.',       // contains dots
  '08131494201-',       // contains dashes at end
];

console.log('🧪 Testing Phone Number Validation\n');

testCases.forEach((testCase, index) => {
  console.log(`\n--- Test Case ${index + 1}: ${JSON.stringify(testCase)} ---`);
  
  try {
    // Test validation
    const isValid = validatePhoneNumber(testCase);
    console.log(`✅ Validation: ${isValid ? 'VALID' : 'INVALID'}`);
    
    // Test formatting (only for valid cases)
    if (isValid) {
      const formatted = formatPhoneNumber(testCase);
      console.log(`📱 Formatted: ${formatted}`);
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
});

console.log('\n📋 Summary:');
console.log('- Valid formats: 628xxxxxxxxxx, 08xxxxxxxxxx, 8xxxxxxxxx, xxxxxxxxxx');
console.log('- All formats should be 10-13 digits after cleaning');
console.log('- Function handles whitespace, dashes, plus signs, and spaces');
console.log('- Function throws error for invalid formats');
