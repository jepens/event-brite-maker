// Fallback PDF service using CDN
export async function loadPDFLibraries(): Promise<boolean> {
  try {
    // Check if libraries are already loaded
    if (typeof window !== 'undefined' && (window as unknown as Record<string, unknown>).jspdf) {
      console.log('✅ PDF libraries already loaded');
      return true;
    }

    console.log('📋 Loading PDF libraries from CDN...');

    // Load jsPDF from CDN
    const jsPDFScript = document.createElement('script');
    jsPDFScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    
    // Load autoTable from CDN
    const autoTableScript = document.createElement('script');
    autoTableScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.1/jspdf.plugin.autotable.min.js';

    return new Promise((resolve) => {
      jsPDFScript.onload = () => {
        console.log('✅ jsPDF loaded from CDN');
        autoTableScript.onload = () => {
          console.log('✅ autoTable loaded from CDN');
          resolve(true);
        };
        autoTableScript.onerror = () => {
          console.error('❌ Failed to load autoTable from CDN');
          resolve(false);
        };
        document.head.appendChild(autoTableScript);
      };
      jsPDFScript.onerror = () => {
        console.error('❌ Failed to load jsPDF from CDN');
        resolve(false);
      };
      document.head.appendChild(jsPDFScript);
    });
  } catch (error) {
    console.error('❌ Error loading PDF libraries:', error);
    return false;
  }
}

export function createPDFWithCDN(data: unknown[], headers: string[], filename: string, options: Record<string, unknown> = {}) {
  return new Promise<void>((resolve, reject) => {
    try {
      console.log('📄 Creating PDF with CDN libraries...');
      
      // Check if CDN libraries are available
      if (typeof window === 'undefined') {
        console.error('❌ Window object not available');
        reject(new Error('Window object not available'));
        return;
      }
      
      console.log('🔍 Checking CDN libraries availability...');
      console.log('📋 window.jspdf available:', !!(window as unknown as Record<string, unknown>).jspdf);
      console.log('📋 window.jspdf type:', typeof (window as unknown as Record<string, unknown>).jspdf);
      
      if (!(window as unknown as Record<string, unknown>).jspdf) {
        console.error('❌ CDN libraries not loaded yet');
        reject(new Error('CDN libraries not loaded yet - please wait for libraries to load'));
        return;
      }

      console.log('📋 Extracting jsPDF from window.jspdf...');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { jsPDF } = (window as any).jspdf;
      console.log('📋 jsPDF constructor type:', typeof jsPDF);
      
      if (typeof jsPDF !== 'function') {
        console.error('❌ jsPDF constructor not available');
        reject(new Error('jsPDF constructor not available from CDN'));
        return;
      }
      
      console.log('📋 Creating PDF instance...');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pdf = new jsPDF('landscape', 'mm', 'a4') as any;
      console.log('📋 PDF instance created, checking methods...');
      console.log('📋 PDF methods available:', Object.getOwnPropertyNames(pdf).slice(0, 10));
      
      console.log('✅ PDF instance created with CDN');

          // Add beautiful header with gradient effect
    pdf.setFillColor(41, 128, 185); // Blue background
    pdf.rect(0, 0, 297, 25, 'F'); // Full width header
    
    // Add white title
    const title = options.title || 'Laporan Registrasi Event';
    const subtitle = options.subtitle || `Dibuat pada: ${new Date().toLocaleDateString('id-ID')}`;
    
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(255, 255, 255);
    pdf.text(title, 14, 15);
    
    // Add subtitle with lighter color
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(240, 240, 240);
    pdf.text(subtitle, 14, 22);
    
    // Reset text color for rest of content
    pdf.setTextColor(0, 0, 0);

      // Add summary if requested
      if (options.includeSummary && data && data.length > 0) {
        const totalRegistrations = data.length;
        const isCheckinReport = data[0] && typeof data[0] === 'object' && data[0] !== null && 'attendance_status' in (data[0] as Record<string, unknown>);
        
        if (isCheckinReport) {
          const checkedInCount = data.filter((row: Record<string, unknown>) => row.attendance_status === 'checked_in').length;
          const notCheckedInCount = data.filter((row: Record<string, unknown>) => row.attendance_status === 'not_checked_in').length;
          const attendanceRate = totalRegistrations > 0 ? Math.round((checkedInCount / totalRegistrations) * 100) : 0;
          
          pdf.setFontSize(10);
          pdf.text(`Total Registrasi: ${totalRegistrations}`, 14, 45);
          pdf.text(`Sudah Check-in: ${checkedInCount}`, 14, 52);
          pdf.text(`Belum Check-in: ${notCheckedInCount}`, 14, 59);
          pdf.text(`Tingkat Kehadiran: ${attendanceRate}%`, 14, 66);
        } else {
          const approvedCount = data.filter((row: Record<string, unknown>) => row.status === 'approved').length;
          const pendingCount = data.filter((row: Record<string, unknown>) => row.status === 'pending').length;
          const checkedInCount = data.filter((row: Record<string, unknown>) => row.checkin_at).length;
          
          pdf.setFontSize(10);
          pdf.text(`Total Registrasi: ${totalRegistrations}`, 14, 45);
          pdf.text(`Disetujui: ${approvedCount}`, 14, 52);
          pdf.text(`Menunggu: ${pendingCount}`, 14, 59);
          pdf.text(`Sudah Check-in: ${checkedInCount}`, 14, 66);
        }
      }

      // Prepare table data
      const headerMapping: Record<string, string> = {
        'ID': 'id',
        'Nama Peserta': 'participant_name',
        'Email': 'participant_email',
        'Nomor Telepon': 'phone_number',
        'Status': 'status',
        'Tanggal Registrasi': 'registered_at',
        'Nama Event': 'event_name',
        'Tanggal Event': 'event_date',
        'Lokasi Event': 'event_location',
        'Kode Tiket': 'ticket_code',
        'Kode Pendek': 'ticket_short_code',
        'Waktu Check-in': 'checkin_at',
        'Lokasi Check-in': 'checkin_location',
        'Catatan Check-in': 'checkin_notes',
        'ID Event': 'event_id',
        'Status Kehadiran': 'attendance_status',
        'Checked-in Oleh': 'checked_in_by_name'
      };

      const tableData = [];
      if (data && data.length > 0) {
        data.forEach((row, index) => {
                  const rowData = headers.map(header => {
          // Dynamic mapping based on available headers
          let dataKey = headerMapping[header];
          if (!dataKey) {
            // Try alternative mappings for simplified headers
            const alternativeMappings: Record<string, string> = {
              'Nama Peserta': 'participant_name',
              'Email': 'participant_email',
              'Nomor Telepon': 'phone_number',
              'Status Kehadiran': 'attendance_status',
              'Waktu Check-in': 'checkin_at'
            };
            dataKey = alternativeMappings[header];
          }
          
          if (!dataKey) return '';
          
          const value = (row as Record<string, unknown>)[dataKey] || '';
            
            // Format dates
            if (header.includes('Tanggal') || header.includes('Waktu')) {
              if (value && typeof value === 'string') {
                try {
                  return new Date(value).toLocaleDateString('id-ID', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  });
                } catch {
                  return value;
                }
              }
            }
            
            return value;
          });
          tableData.push(rowData);
        });
      } else {
        tableData.push(headers.map(() => 'Tidak ada data'));
      }

      console.log('📋 Creating table with CDN...');
      
      const tableStartY = options.includeSummary ? 80 : 45;
      
      // Check if autoTable is available
      console.log('🔍 Checking autoTable availability in CDN version...');
      console.log('📋 autoTable type:', typeof pdf.autoTable);
      console.log('📋 autoTable available:', !!pdf.autoTable);
      
      if (typeof pdf.autoTable === 'function') {
        console.log('✅ autoTable available in CDN, creating table...');
        pdf.autoTable({
          head: [headers],
          body: tableData,
          startY: tableStartY,
          styles: {
            fontSize: 8,
            cellPadding: 2,
            lineColor: [0, 0, 0],
            lineWidth: 0.1,
            textColor: [0, 0, 0],
          },
          headStyles: {
            fillColor: [41, 128, 185],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 9,
          },
          alternateRowStyles: {
            fillColor: [245, 245, 245],
          },
          margin: { top: 10, right: 10, bottom: 10, left: 10 }
        });
        
        console.log('✅ Table created with CDN');
      } else {
        console.error('❌ autoTable not available in CDN version');
        reject(new Error('autoTable method not available in CDN version'));
        return;
      }

      // Save PDF
      console.log('💾 Saving PDF with CDN...');
      pdf.save(`${filename}.pdf`);
      
      console.log('✅ PDF created and saved with CDN');
      resolve();
      
    } catch (error) {
      console.error('❌ Error creating PDF with CDN:', error);
      reject(error);
    }
  });
} 