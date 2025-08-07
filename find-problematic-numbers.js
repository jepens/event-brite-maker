// Find problematic phone numbers and suggest validation improvements
const phones = [
  '08128351406', '08158835728', '0895328708034', '081219055159', '08161923257',
  '081909010759', '08111373343', '081323920006', '081586535488', '08129534855',
  '085693412767', '087788534882', '085771266053', '081808511166', '08161908613',
  '08811298405', '081315559199', '081317585373', '087860111177', '081318757230',
  '0816703115', '081805254558', '081578896577', '081365393376', '08129356787',
  '081298967699', '081342969239', '082213276726', '087781969050', '085776063286',
  '08111702808', '0817191117', '081213675730', '08161447295', '082110174632',
  '08128194654', '082208239992', '08158859966', '081511492910', '08118114986',
  '081218680962', '087880986953', '087889092999', '0818427376', '08121053401',
  '08561015028', '08121220260', '081290429053', '08113038279', '085691213697',
  '081315450295', '081212122186', '08158978880', '08978249795', '085161141312',
  '08989231747', '085640892120', '081317747989', '082185629649', '081284523700',
  '0818198193', '085729512679', '081287552597', '081388323270', '081298192148',
  '0813233488496', '081905055397', '087765973071', '08999085989', '081390291953',
  '08119629996', '081808189779', '085717283637', '0816750560', '0818880593',
  '0818192683', '087812312310', '08158830827', '081380095600', '08567867724',
  '081318207438', '08561999600', '0816980036', '082111229029', '087888776100',
  '081286809765', '085959202192', '08111082423', '08159170978', '62816721116',
  '08159336180', '081310339455', '08112281628', '082122036092', '081806018293',
  '08128223326', '085175051697', '08118771277', '081320480526', '081296475101',
  '0818677776', '081231667241', '08118077794', '085288850508', '081298184607',
  '083874169334', '081287732152', '08161600060', '081285096994', '081293716116',
  '085716150068', '081807811487', '08176671883', '08197561575', '081287561092',
  '085274415500', '087725402220', '08123891999', '081295523995', '085156715869',
  '081311341234', '081314545317', '085715337369', '087777007582', '08551122113',
  '081213710006', '08119999356', '085882640106', '082114145547', '081212340257',
  '087878169773', '082111311951', '0817737077', '081287519128', '081288000916',
  '08121000090', '081281289499', '085883147431', '082136436622', '081519459797',
  '0812 977 8705', '08111288266', '081905857574', '081388122192', '08111634170',
  '081221809355', '087876992805', '085778554535', '081294040144', '081399424239',
  '0818727932', '085262424370', '085695755232', '081218061936', '081295304012',
  '081286861585', '081282248342', '087781802925', '0817881138', '0818730393',
  '082114175038', '081574038889', '08111929468', '08161123179', '0816777669',
  '08170013680', '085714338648', '081808430284', '081329083576', '08161962638',
  '082210113221', '087888865872', '08983312921', '085311996296', '081315732959',
  '085719452785', '08563136261', '08118770050', '081314524580', '085286458867',
  '081510008231', '081808232808', '08129296866', '081298236634', '08176700868',
  '081287179165', '081286153722', '085218556546', '087880336489', '082383568472',
  '085697638100', '087776111135', '0811801402', '08129954800', '08121404545',
  '08161613100', '081386256625', '087781256327', '081111801623', '082298532020',
  '08159936319', '081289785928', '081212772247', '085692829477', '087871049689',
  '087855819353', '085159090009', '081288698425', '081219102021', '08567718737',
  '081517169797', '081288618651', '087716103813', '087780483453', '081267438093',
  '087777888078', '081388373009', '08119000591', '08122028035', '081585555819',
  '08161885667', '081288000531', '085714116719', '081917091107', '089636392629',
  '089616789350', '0818928609', '08158200053', '081514311833', '081210699218',
  '08558205771', '08159356887'
];

console.log('🔍 Analyzing Phone Numbers for Validation Issues\n');

// Current validation function
function currentValidatePhoneNumber(phone) {
  if (!phone || typeof phone !== 'string' || phone.trim() === '') {
    return false;
  }
  
  const cleanPhone = phone.trim();
  const digitsOnly = cleanPhone.replace(/\D/g, '');
  
  if (digitsOnly.startsWith('62') && digitsOnly.length === 13) {
    return true;
  }
  
  if (digitsOnly.startsWith('08') && (digitsOnly.length === 12 || digitsOnly.length === 11)) {
    return true;
  }
  
  if (digitsOnly.startsWith('8') && digitsOnly.length === 11) {
    return true;
  }
  
  if (digitsOnly.length === 10 && !digitsOnly.startsWith('0') && !digitsOnly.startsWith('8')) {
    return true;
  }
  
  return false;
}

// Analyze all numbers
let problematic = [];
let formatAnalysis = {};

phones.forEach((phone, i) => {
  const digitsOnly = phone.replace(/\D/g, '');
  const length = digitsOnly.length;
  const prefix = digitsOnly.substring(0, 2);
  const isValid = currentValidatePhoneNumber(phone);
  
  // Create format key
  const formatKey = `${prefix}${'x'.repeat(length-2)} (${length} digits)`;
  if (!formatAnalysis[formatKey]) {
    formatAnalysis[formatKey] = [];
  }
  formatAnalysis[formatKey].push(phone);
  
  if (!isValid) {
    problematic.push({
      phone,
      index: i + 1,
      digitsOnly,
      length,
      prefix,
      format: formatKey
    });
  }
});

console.log('📊 FORMAT ANALYSIS:');
Object.entries(formatAnalysis).forEach(([format, numbers]) => {
  console.log(`${format}: ${numbers.length} numbers`);
  if (numbers.length <= 5) {
    console.log(`  Examples: ${numbers.join(', ')}`);
  }
});

console.log('\n❌ PROBLEMATIC NUMBERS:');
if (problematic.length === 0) {
  console.log('✅ No problematic numbers found!');
} else {
  problematic.forEach(p => {
    console.log(`${p.index}. ${p.phone} → ${p.digitsOnly} (${p.format})`);
  });
}

console.log('\n🔧 SUGGESTED VALIDATION IMPROVEMENTS:');

// Find unique problematic patterns
const problematicPatterns = [...new Set(problematic.map(p => p.format))];
console.log('Current validation needs to support these additional patterns:');
problematicPatterns.forEach(pattern => {
  console.log(`- ${pattern}`);
});

// Suggest new validation logic
console.log('\n📝 PROPOSED VALIDATION LOGIC:');
console.log('```javascript');
console.log('function validatePhoneNumber(phone) {');
console.log('  if (!phone || typeof phone !== "string" || phone.trim() === "") {');
console.log('    return false;');
console.log('  }');
console.log('  ');
console.log('  const cleanPhone = phone.trim();');
console.log('  const digitsOnly = cleanPhone.replace(/\\D/g, "");');
console.log('  ');
console.log('  // Already correct format');
console.log('  if (digitsOnly.startsWith("62") && digitsOnly.length === 13) {');
console.log('    return true;');
console.log('  }');
console.log('  ');
console.log('  // Indonesian mobile numbers with 08 prefix');
console.log('  if (digitsOnly.startsWith("08") && digitsOnly.length >= 11 && digitsOnly.length <= 13) {');
console.log('    return true; // Support 08xxxxxxxxx, 08xxxxxxxxxx, 08xxxxxxxxxxx');
console.log('  }');
console.log('  ');
console.log('  // Indonesian mobile numbers with 8 prefix');
console.log('  if (digitsOnly.startsWith("8") && digitsOnly.length === 11) {');
console.log('    return true;');
console.log('  }');
console.log('  ');
console.log('  // 10-digit numbers (assume mobile)');
console.log('  if (digitsOnly.length === 10 && !digitsOnly.startsWith("0") && !digitsOnly.startsWith("8")) {');
console.log('    return true;');
console.log('  }');
console.log('  ');
console.log('  return false;');
console.log('}');
console.log('```');

console.log('\n🎯 SUMMARY:');
console.log(`Total numbers: ${phones.length}`);
console.log(`Valid with current logic: ${phones.length - problematic.length}`);
console.log(`Problematic numbers: ${problematic.length}`);
console.log(`Coverage: ${((phones.length - problematic.length) / phones.length * 100).toFixed(1)}%`);
