# 🔧 **PDF Troubleshooting Guide**

## 🚨 **Error: "Failed to download check-in report"**

### **Penyebab Umum:**

1. **Library Loading Issue** - `jspdf-autotable` tidak ter-load dengan benar
2. **Browser Environment** - PDF generation hanya tersedia di browser
3. **Import Issue** - Import library yang tidak tepat
4. **Data Processing Error** - Error saat memproses data

## 🔍 **Diagnosis Steps**

### **1. Periksa Console Log**
```
📄 Creating PDF file...
📋 Data count: 1
📋 Headers: Array(14)
📋 PDF Options: Object
🔍 Processing PDF row 1: Object
📝 PDF row 1: Array(14)
```

**Jika log berhenti di sini**, kemungkinan masalah di:
- `autoTable` method tidak tersedia
- Error saat membuat table
- Error saat save PDF

### **2. Periksa Library Installation**
```bash
npm list jspdf jspdf-autotable
```

**Expected output:**
```
├── jspdf@3.0.1
└── jspdf-autotable@5.0.2
```

### **3. Periksa Import Statement**
```typescript
// ✅ Correct import
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

// ❌ Wrong import
import jsPDF from 'jspdf';
```

## 🛠️ **Solutions**

### **Solution 1: Fix Import Statement**
```typescript
// Update src/lib/download-service.ts
import { jsPDF } from 'jspdf';  // Use destructuring
import 'jspdf-autotable';
```

### **Solution 2: Check Browser Environment**
```typescript
// Add this check in downloadPDF function
if (typeof window === 'undefined') {
  throw new Error('PDF generation is only available in browser environment');
}
```

### **Solution 3: Verify Library Loading**
```typescript
// Add this check before using autoTable
const autoTable = (pdf as any).autoTable;
if (typeof autoTable !== 'function') {
  console.error('❌ autoTable method not available');
  throw new Error('autoTable method not available - please check if jspdf-autotable is properly loaded');
}
```

### **Solution 4: Reinstall Libraries**
```bash
npm uninstall jspdf jspdf-autotable
npm install jspdf jspdf-autotable
```

### **Solution 5: Clear Cache and Restart**
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Restart development server
npm run dev
```

## 🧪 **Testing Steps**

### **1. Test Basic PDF Generation**
```javascript
// In browser console
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

const pdf = new jsPDF('landscape', 'mm', 'a4');
pdf.text('Test', 10, 10);
pdf.save('test.pdf');
```

### **2. Test autoTable Method**
```javascript
// In browser console
const pdf = new jsPDF('landscape', 'mm', 'a4');
console.log('autoTable available:', typeof pdf.autoTable === 'function');

if (typeof pdf.autoTable === 'function') {
  pdf.autoTable({
    head: [['Name', 'Email']],
    body: [['John', 'john@example.com']],
    startY: 20
  });
  pdf.save('test-table.pdf');
}
```

### **3. Test with Sample Data**
```javascript
// Test with the same data structure as your app
const sampleData = [{
  event_id: '123',
  event_name: 'Test Event',
  participant_name: 'John Doe',
  attendance_status: 'checked_in'
}];

const headers = ['ID Event', 'Nama Event', 'Nama Peserta', 'Status Kehadiran'];
// ... test PDF generation
```

## 🔄 **Alternative Solutions**

### **Option 1: Use Different PDF Library**
```bash
npm uninstall jspdf jspdf-autotable
npm install pdfmake
```

### **Option 2: Use HTML to PDF**
```bash
npm install html2canvas jsPDF
```

### **Option 3: Server-side PDF Generation**
```bash
npm install puppeteer
```

## 📋 **Debug Checklist**

- [ ] Library terinstall dengan benar
- [ ] Import statement benar
- [ ] Browser environment tersedia
- [ ] autoTable method tersedia
- [ ] Data berhasil diproses
- [ ] No JavaScript errors di console
- [ ] File PDF berhasil dibuat
- [ ] Download dialog muncul

## 🚨 **Common Error Messages**

### **"autoTable is not a function"**
- **Cause**: Library tidak ter-load dengan benar
- **Solution**: Reinstall libraries, check import

### **"PDF generation is only available in browser environment"**
- **Cause**: Code dijalankan di Node.js
- **Solution**: Pastikan code dijalankan di browser

### **"Failed to create PDF table"**
- **Cause**: Error saat membuat table
- **Solution**: Check data format, column styles

### **"Failed to save PDF file"**
- **Cause**: Error saat save file
- **Solution**: Check browser permissions, file system

## 📞 **Getting Help**

Jika masalah masih berlanjut:

1. **Check browser console** untuk error details
2. **Test dengan sample data** yang sederhana
3. **Verify library versions** kompatibel
4. **Try different browser** untuk isolate issue
5. **Check network tab** untuk library loading

## 🔧 **Quick Fix Commands**

```bash
# Fix import issue
npm install jspdf@latest jspdf-autotable@latest

# Clear and reinstall
rm -rf node_modules package-lock.json
npm install

# Restart dev server
npm run dev
```

## 📝 **Expected Behavior**

### **Successful PDF Generation:**
```
📄 Creating PDF file...
📋 Data count: 1
📋 Headers: Array(14)
📋 PDF Options: Object
🔍 Processing PDF row 1: Object
📝 PDF row 1: Array(14)
🔧 Creating PDF table...
📋 Table start Y: 80
📋 Headers for table: Array(14)
📋 Table data count: 1
✅ PDF table created successfully
💾 Saving PDF file...
✅ PDF file saved successfully
✅ PDF file created and downloaded successfully
```

### **File Downloaded:**
- **Name**: `checkin_report_2025-01-29_10-30.pdf`
- **Type**: PDF Document
- **Size**: ~50KB
- **Opens**: In browser PDF viewer 