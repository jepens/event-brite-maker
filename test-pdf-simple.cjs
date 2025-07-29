// Simple test untuk PDF generation
const { jsPDF } = require('jspdf');
require('jspdf-autotable');

console.log('🧪 Simple PDF Test...');

try {
  // Create PDF
  const pdf = new jsPDF('landscape', 'mm', 'a4');
  console.log('✅ PDF created');
  
  // Add text
  pdf.text('Hello World', 10, 10);
  console.log('✅ Text added');
  
  // Add table
  pdf.autoTable({
    head: [['Name', 'Email']],
    body: [['John', 'john@example.com']],
    startY: 20
  });
  console.log('✅ Table added');
  
  // Save
  const fs = require('fs');
  const buffer = pdf.output('arraybuffer');
  fs.writeFileSync('simple-test.pdf', Buffer.from(buffer));
  console.log('✅ PDF saved as simple-test.pdf');
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('Stack:', error.stack);
} 