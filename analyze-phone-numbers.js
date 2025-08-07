// Script to analyze all provided phone numbers
// This will help us ensure our validation covers all formats

function validatePhoneNumber(phone) {
  // Handle null, undefined, or empty values
  if (!phone || typeof phone !== 'string' || phone.trim() === '') {
    return false;
  }
  
  // Trim whitespace and remove any non-digit characters
  const cleanPhone = phone.trim();
  const digitsOnly = cleanPhone.replace(/\D/g, '');
  
  // Check if it's already in correct format: 628xxxxxxxxxx (13 digits)
  if (digitsOnly.startsWith('62') && digitsOnly.length === 13) {
    return true;
  }
  
  // Check if it can be converted to correct format
  if (digitsOnly.startsWith('08') && (digitsOnly.length === 12 || digitsOnly.length === 11)) {
    return true; // Can be converted to 628xxxxxxxxxx (08xxxxxxxxxx or 08xxxxxxxxx)
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
  
  if (digitsOnly.startsWith('62') && digitsOnly.length === 13) {
    return digitsOnly; // Already in correct format
  } else if (digitsOnly.startsWith('08') && (digitsOnly.length === 12 || digitsOnly.length === 11)) {
    return '62' + digitsOnly.substring(1); // Convert 08xxxxxxxxxx or 08xxxxxxxxx to 628xxxxxxxxxx
  } else if (digitsOnly.startsWith('8') && digitsOnly.length === 11) {
    return '62' + digitsOnly; // Convert 8xxxxxxxxx to 628xxxxxxxxxx
  } else if (digitsOnly.length === 10 && !digitsOnly.startsWith('0') && !digitsOnly.startsWith('8')) {
    return '628' + digitsOnly; // Convert xxxxxxxxxx to 628xxxxxxxxxx (assuming it's a mobile number)
  }
  
  throw new Error(`Invalid phone number format: ${phone}. Expected format: 628xxxxxxxxxx, 08xxxxxxxxxx, 8xxxxxxxxx, or xxxxxxxxxx`);
}

// All provided phone numbers
const phoneNumbers = [
  '08128351406',
  '08158835728',
  '0895328708034',
  '081219055159',
  '08161923257',
  '081909010759',
  '08111373343',
  '081323920006',
  '081586535488',
  '08129534855',
  '085693412767',
  '087788534882',
  '085771266053',
  '081808511166',
  '085771266053',
  '08161908613',
  '08811298405',
  '081315559199',
  '081317585373',
  '087860111177',
  '081318757230',
  '0816703115',
  '081805254558',
  '081578896577',
  '081365393376',
  '08129356787',
  '081298967699',
  '081342969239',
  '082213276726',
  '087781969050',
  '085776063286',
  '08111702808',
  '0817191117',
  '081213675730',
  '08161447295',
  '082110174632',
  '08128194654',
  '082208239992',
  '08158859966',
  '081511492910',
  '08118114986',
  '081218680962',
  '087880986953',
  '087889092999',
  '0818427376',
  '08121053401',
  '08561015028',
  '08121220260',
  '081290429053',
  '08113038279',
  '085691213697',
  '081315450295',
  '081212122186',
  '08158978880',
  '08978249795',
  '085161141312',
  '08989231747',
  '085640892120',
  '081317747989',
  '082185629649',
  '08811298405',
  '081284523700',
  '0818198193',
  '085729512679',
  '087880986953',
  '081287552597',
  '081388323270',
  '081298192148',
  '0813233488496',
  '081905055397',
  '087765973071',
  '08999085989',
  '081390291953',
  '08119629996',
  '081808189779',
  '085717283637',
  '0816750560',
  '0818880593',
  '0818192683',
  '087812312310',
  '08158830827',
  '081380095600',
  '08567867724',
  '081318207438',
  '08561999600',
  '0816980036',
  '082111229029',
  '087888776100',
  '081286809765',
  '085959202192',
  '08111082423',
  '08159170978',
  '62816721116',
  '08159336180',
  '081310339455',
  '08112281628',
  '082122036092',
  '081806018293',
  '08128223326',
  '085175051697',
  '08118771277',
  '081320480526',
  '081296475101',
  '0818677776',
  '081231667241',
  '08118077794',
  '085776063286',
  '085288850508',
  '081578896577',
  '081298184607',
  '083874169334',
  '081287732152',
  '08161600060',
  '081285096994',
  '081293716116',
  '085716150068',
  '085716150068',
  '081807811487',
  '08176671883',
  '08197561575',
  '081287561092',
  '085274415500',
  '087725402220',
  '08123891999',
  '081295523995',
  '085156715869',
  '081311341234',
  '081314545317',
  '085715337369',
  '087777007582',
  '08551122113',
  '081213710006',
  '087880986953',
  '08119999356',
  '085882640106',
  '081807811487',
  '082114145547',
  '081212340257',
  '087878169773',
  '082111311951',
  '0817737077',
  '081287519128',
  '08129356787',
  '081288000916',
  '08121000090',
  '081287519128',
  '081281289499',
  '085883147431',
  '082136436622',
  '081519459797',
  '0812 977 8705',
  '08111288266',
  '081905857574',
  '081388122192',
  '08111634170',
  '081221809355',
  '087876992805',
  '085778554535',
  '081294040144',
  '081399424239',
  '0818727932',
  '085262424370',
  '085695755232',
  '081218061936',
  '081295304012',
  '081286861585',
  '081282248342',
  '087781802925',
  '0817881138',
  '0818730393',
  '082114175038',
  '081298967699',
  '081574038889',
  '08111929468',
  '08161123179',
  '0816777669',
  '08170013680',
  '085714338648',
  '081808430284',
  '081329083576',
  '08161962638',
  '082210113221',
  '085161141312',
  '087888865872',
  '08983312921',
  '085311996296',
  '081315732959',
  '085719452785',
  '08563136261',
  '08118770050',
  '081314524580',
  '085286458867',
  '081510008231',
  '081808232808',
  '08129296866',
  '081298236634',
  '08176700868',
  '081287179165',
  '081286153722',
  '085218556546',
  '087880336489',
  '082383568472',
  '085697638100',
  '087776111135',
  '0811801402',
  '08129954800',
  '08121404545',
  '08161613100',
  '081386256625',
  '087781256327',
  '081111801623',
  '082298532020',
  '08159936319',
  '081289785928',
  '081212772247',
  '085692829477',
  '087871049689',
  '087855819353',
  '085159090009',
  '081288698425',
  '081219102021',
  '08567718737',
  '081517169797',
  '081288618651',
  '087716103813',
  '087780483453',
  '081267438093',
  '087777888078',
  '081388373009',
  '08119000591',
  '08122028035',
  '081585555819',
  '08161885667',
  '081288000531',
  '085714116719',
  '081917091107',
  '089636392629',
  '089616789350',
  '0818928609',
  '08122028035',
  '08158200053',
  '081514311833',
  '081210699218',
  '08558205771',
  '08159356887'
];

console.log('📱 Analyzing Phone Numbers Database\n');

// Statistics
let totalNumbers = phoneNumbers.length;
let validNumbers = 0;
let invalidNumbers = 0;
let formatStats = {
  '628xxxxxxxxxx': 0, // 13 digits, starts with 62
  '08xxxxxxxxxx': 0,  // 12 digits, starts with 08
  '08xxxxxxxxx': 0,   // 11 digits, starts with 08
  '8xxxxxxxxx': 0,    // 11 digits, starts with 8
  'xxxxxxxxxx': 0,    // 10 digits
  'other': 0          // other formats
};

let invalidExamples = [];

phoneNumbers.forEach((phone, index) => {
  try {
    const isValid = validatePhoneNumber(phone);
    const digitsOnly = phone.replace(/\D/g, '');
    
    if (isValid) {
      validNumbers++;
      const formatted = formatPhoneNumber(phone);
      
      // Categorize format
      if (digitsOnly.startsWith('62') && digitsOnly.length === 13) {
        formatStats['628xxxxxxxxxx']++;
      } else if (digitsOnly.startsWith('08') && digitsOnly.length === 12) {
        formatStats['08xxxxxxxxxx']++;
      } else if (digitsOnly.startsWith('08') && digitsOnly.length === 11) {
        formatStats['08xxxxxxxxx']++;
      } else if (digitsOnly.startsWith('8') && digitsOnly.length === 11) {
        formatStats['8xxxxxxxxx']++;
      } else if (digitsOnly.length === 10) {
        formatStats['xxxxxxxxxx']++;
      } else {
        formatStats['other']++;
      }
      
      console.log(`✅ ${index + 1}. ${phone} → ${formatted}`);
    } else {
      invalidNumbers++;
      invalidExamples.push(phone);
      console.log(`❌ ${index + 1}. ${phone} → INVALID`);
    }
  } catch (error) {
    invalidNumbers++;
    invalidExamples.push(phone);
    console.log(`❌ ${index + 1}. ${phone} → ERROR: ${error.message}`);
  }
});

console.log('\n📊 STATISTICS:');
console.log(`Total numbers: ${totalNumbers}`);
console.log(`Valid numbers: ${validNumbers} (${((validNumbers/totalNumbers)*100).toFixed(1)}%)`);
console.log(`Invalid numbers: ${invalidNumbers} (${((invalidNumbers/totalNumbers)*100).toFixed(1)}%)`);

console.log('\n📋 FORMAT BREAKDOWN:');
Object.entries(formatStats).forEach(([format, count]) => {
  if (count > 0) {
    console.log(`${format}: ${count} numbers`);
  }
});

if (invalidExamples.length > 0) {
  console.log('\n❌ INVALID EXAMPLES:');
  invalidExamples.forEach(phone => {
    const digitsOnly = phone.replace(/\D/g, '');
    console.log(`- ${phone} (${digitsOnly.length} digits, starts with: ${digitsOnly.substring(0, 2)})`);
  });
}

console.log('\n🎯 VALIDATION COVERAGE:');
console.log('✅ 628xxxxxxxxxx (13 digits) - Already correct format');
console.log('✅ 08xxxxxxxxxx (12 digits) - Will be converted to 628xxxxxxxxxx');
console.log('✅ 08xxxxxxxxx (11 digits) - Will be converted to 628xxxxxxxxxx');
console.log('✅ 8xxxxxxxxx (11 digits) - Will be converted to 628xxxxxxxxxx');
console.log('✅ xxxxxxxxxx (10 digits) - Will be converted to 628xxxxxxxxxx');
console.log('✅ Supports: spaces, dashes, plus signs');

console.log('\n🔧 RECOMMENDATIONS:');
if (invalidNumbers === 0) {
  console.log('🎉 All phone numbers are valid! No changes needed.');
} else {
  console.log(`⚠️  Found ${invalidNumbers} invalid numbers. Check the examples above.`);
}
