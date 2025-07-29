// Test script untuk memverifikasi library PDF di browser
const jsPDF = require('jspdf');
require('jspdf-autotable');

console.log('🧪 Testing PDF Library in Browser Environment...\n');

// Test 1: Check if jsPDF is available
console.log('📋 Test 1: jsPDF availability');
console.log('jsPDF type:', typeof jsPDF);
console.log('jsPDF constructor:', typeof jsPDF.default);
console.log('jsPDF instance:', jsPDF);

// Test 2: Create PDF instance
console.log('\n📋 Test 2: Create PDF instance');
try {
  const pdf = new jsPDF('landscape', 'mm', 'a4');
  console.log('✅ PDF instance created successfully');
  console.log('PDF type:', typeof pdf);
  console.log('PDF methods:', Object.getOwnPropertyNames(pdf).slice(0, 10));
} catch (error) {
  console.error('❌ Error creating PDF instance:', error);
}

// Test 3: Check autoTable availability
console.log('\n📋 Test 3: autoTable availability');
try {
  const pdf = new jsPDF('landscape', 'mm', 'a4');
  console.log('autoTable method type:', typeof pdf.autoTable);
  console.log('autoTable available:', !!pdf.autoTable);
  
  if (typeof pdf.autoTable === 'function') {
    console.log('✅ autoTable method is available');
  } else {
    console.log('❌ autoTable method is not available');
  }
} catch (error) {
  console.error('❌ Error checking autoTable:', error);
}

// Test 4: Test basic PDF operations
console.log('\n📋 Test 4: Basic PDF operations');
try {
  const pdf = new jsPDF('landscape', 'mm', 'a4');
  
  // Test text
  pdf.setFont('helvetica');
  pdf.setFontSize(12);
  pdf.text('Test PDF Generation', 14, 20);
  console.log('✅ Text added successfully');
  
  // Test save
  const fs = require('fs');
  const pdfBuffer = pdf.output('arraybuffer');
  fs.writeFileSync('test-basic.pdf', Buffer.from(pdfBuffer));
  console.log('✅ Basic PDF saved successfully');
  
} catch (error) {
  console.error('❌ Error in basic PDF operations:', error);
}

// Test 5: Test autoTable with minimal data
console.log('\n📋 Test 5: autoTable with minimal data');
try {
  const pdf = new jsPDF('landscape', 'mm', 'a4');
  
  const headers = ['Name', 'Email'];
  const data = [['John Doe', 'john@example.com']];
  
  if (typeof pdf.autoTable === 'function') {
    pdf.autoTable({
      head: [headers],
      body: data,
      startY: 30,
      styles: {
        fontSize: 10,
      },
    });
    
    const fs = require('fs');
    const pdfBuffer = pdf.output('arraybuffer');
    fs.writeFileSync('test-autotable.pdf', Buffer.from(pdfBuffer));
    console.log('✅ autoTable PDF saved successfully');
  } else {
    console.log('❌ autoTable method not available');
  }
  
} catch (error) {
  console.error('❌ Error in autoTable test:', error);
}

// Test 6: Check library versions
console.log('\n📋 Test 6: Library versions');
try {
  const packageJson = require('./package.json');
  console.log('jspdf version:', packageJson.dependencies?.jspdf || 'Not found');
  console.log('jspdf-autotable version:', packageJson.dependencies?.['jspdf-autotable'] || 'Not found');
} catch (error) {
  console.error('❌ Error checking versions:', error);
}

console.log('\n✅ PDF Library Test Completed!');
console.log('📄 Check generated files: test-basic.pdf, test-autotable.pdf'); 