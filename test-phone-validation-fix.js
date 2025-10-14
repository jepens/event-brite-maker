// Test script for phone number validation fix

function validatePhoneNumber(phone) {
  if (!phone || typeof phone !== 'string' || phone.trim() === '') {
    return false;
  }
  
  const digitsOnly = phone.replace(/\D/g, '');
  
  // Check if it's already in correct format: 62xxxxxxxxx (11-15 digits for international format)
  if (digitsOnly.startsWith('62') && digitsOnly.length >= 11 && digitsOnly.length <= 15) {
    return true;
  }
  
  // Check if it can be converted to correct format (local format with 0)
  if (digitsOnly.startsWith('08') && digitsOnly.length >= 10 && digitsOnly.length <= 13) {
    return true;
  }
  
  // Check if it's a local number without prefix (8xxxxxxxxx)
  if (digitsOnly.startsWith('8') && digitsOnly.length >= 9 && digitsOnly.length <= 12) {
    return true;
  }
  
  return false;
}

// Test with the failed numbers from analysis
const failedNumbers = [
  '628181918197',
  '628174142444', 
  '628122188338',
  '628112394950',
  '628977051805',
  '628122303029',
  '628197719865',
  '628986706829',
  '628122304251',
  '628122396351'
];

console.log('🧪 Testing Phone Number Validation Fix\n');
console.log('=' .repeat(50));

let passedCount = 0;
let failedCount = 0;

failedNumbers.forEach((phone, index) => {
  const isValid = validatePhoneNumber(phone);
  const status = isValid ? '✅ PASS' : '❌ FAIL';
  const length = phone.replace(/\D/g, '').length;
  
  console.log(`${(index + 1).toString().padStart(2)}. ${phone} (${length} digits) - ${status}`);
  
  if (isValid) {
    passedCount++;
  } else {
    failedCount++;
  }
});

console.log('\n' + '=' .repeat(50));
console.log(`📊 Results: ${passedCount}/${failedNumbers.length} numbers now pass validation`);
console.log(`✅ Passed: ${passedCount}`);
console.log(`❌ Failed: ${failedCount}`);

if (passedCount === failedNumbers.length) {
  console.log('\n🎉 All previously failed numbers now pass validation!');
} else {
  console.log('\n⚠️ Some numbers still fail validation. Review needed.');
}

// Test edge cases
console.log('\n🔍 Testing Edge Cases:');
console.log('=' .repeat(30));

const edgeCases = [
  { phone: '62811234567', expected: true, desc: 'Min length (11 digits)' },
  { phone: '628123456789012', expected: true, desc: 'Max length (15 digits)' },
  { phone: '6281234567890123', expected: false, desc: 'Too long (16 digits)' },
  { phone: '6281234567', expected: false, desc: 'Too short (10 digits)' },
  { phone: '081234567890', expected: true, desc: 'Local format with 0' },
  { phone: '81234567890', expected: true, desc: 'Local format without 0' },
  { phone: '+62 812 3456 7890', expected: true, desc: 'With formatting' },
  { phone: '', expected: false, desc: 'Empty string' },
  { phone: null, expected: false, desc: 'Null value' }
];

edgeCases.forEach(testCase => {
  const result = validatePhoneNumber(testCase.phone);
  const status = result === testCase.expected ? '✅' : '❌';
  console.log(`${status} ${testCase.desc}: "${testCase.phone}" -> ${result}`);
});