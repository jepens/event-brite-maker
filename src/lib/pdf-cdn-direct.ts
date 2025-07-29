// Direct CDN PDF service - loads libraries on demand
export function createPDFDirectCDN(data: unknown[], headers: string[], filename: string, options: Record<string, unknown> = {}) {
  return new Promise<void>((resolve, reject) => {
    console.log('📄 Creating PDF with direct CDN loading...');
    
    // Check if libraries are already loaded
    if (typeof window !== 'undefined' && (window as unknown as Record<string, unknown>).jspdf && ((window as unknown as Record<string, unknown>).jspdf as Record<string, unknown>).jsPDF) {
      console.log('✅ Libraries already loaded, using existing');
      createPDFWithExistingLibraries(data, headers, filename, options, resolve, reject);
      return;
    }
    
    console.log('📋 Loading libraries from CDN...');
    
    // Load jsPDF first
    const jsPDFScript = document.createElement('script');
    jsPDFScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    
    jsPDFScript.onload = () => {
      console.log('✅ jsPDF loaded from CDN');
      
      // Load autoTable after jsPDF
      const autoTableScript = document.createElement('script');
      autoTableScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.1/jspdf.plugin.autotable.min.js';
      
      autoTableScript.onload = () => {
        console.log('✅ autoTable loaded from CDN');
        
        // Wait a bit for libraries to initialize
        setTimeout(() => {
          console.log('📋 Creating PDF with loaded libraries...');
          createPDFWithExistingLibraries(data, headers, filename, options, resolve, reject);
        }, 100);
      };
      
      autoTableScript.onerror = (error) => {
        console.error('❌ Failed to load autoTable from CDN:', error);
        reject(new Error('Failed to load autoTable from CDN'));
      };
      
      document.head.appendChild(autoTableScript);
    };
    
    jsPDFScript.onerror = (error) => {
      console.error('❌ Failed to load jsPDF from CDN:', error);
      reject(new Error('Failed to load jsPDF from CDN'));
    };
    
    document.head.appendChild(jsPDFScript);
  });
}

function createPDFWithExistingLibraries(
  data: unknown[], 
  headers: string[], 
  filename: string, 
  options: Record<string, unknown>, 
  resolve: () => void, 
  reject: (error: Error) => void
) {
  try {
    console.log('🔍 Checking library availability...');
    
    if (!(window as unknown as Record<string, unknown>).jspdf) {
      throw new Error('jsPDF not available');
    }
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { jsPDF } = (window as any).jspdf;
    console.log('📋 jsPDF constructor type:', typeof jsPDF);
    
    if (typeof jsPDF !== 'function') {
      throw new Error('jsPDF constructor not available');
    }
    
    console.log('📋 Creating PDF instance...');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdf = new jsPDF('landscape', 'mm', 'a4') as any;
    
    console.log('📋 Checking autoTable availability...');
    console.log('📋 autoTable type:', typeof pdf.autoTable);
    
    if (typeof pdf.autoTable !== 'function') {
      throw new Error('autoTable method not available');
    }
    
    console.log('✅ All libraries available, creating PDF...');
    
    // Add title
    const title = options.title || 'Laporan Registrasi Event';
    const subtitle = options.subtitle || `Dibuat pada: ${new Date().toLocaleDateString('id-ID')}`;
    
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text(title, 14, 20);
    
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.text(subtitle, 14, 30);
    
    // Add event details if this is a check-in report with event info
    if (data && data.length > 0) {
      const firstRow = data[0] as Record<string, unknown>;
      if (firstRow.event_name && firstRow.event_date && firstRow.event_location) {
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Tanggal Event: ${new Date(firstRow.event_date as string).toLocaleDateString('id-ID', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}`, 14, 40);
        pdf.text(`Lokasi Event: ${firstRow.event_location}`, 14, 47);
      }
    }

    // Add summary if requested
    if (options.includeSummary && data && data.length > 0) {
      const totalRegistrations = data.length;
      const isCheckinReport = data[0] && typeof data[0] === 'object' && data[0] !== null && 'attendance_status' in (data[0] as Record<string, unknown>);
      
      if (isCheckinReport) {
        const checkedInCount = data.filter((row: Record<string, unknown>) => row.attendance_status === 'checked_in').length;
        const notCheckedInCount = data.filter((row: Record<string, unknown>) => row.attendance_status === 'not_checked_in').length;
        const attendanceRate = totalRegistrations > 0 ? Math.round((checkedInCount / totalRegistrations) * 100) : 0;
        
        pdf.setFontSize(10);
        pdf.text(`Total Registrasi: ${totalRegistrations}`, 14, 55);
        pdf.text(`Sudah Check-in: ${checkedInCount}`, 14, 62);
        pdf.text(`Belum Check-in: ${notCheckedInCount}`, 14, 69);
        pdf.text(`Tingkat Kehadiran: ${attendanceRate}%`, 14, 76);
        
        console.log('📊 Check-in Report Summary added');
      } else {
        const approvedCount = data.filter((row: Record<string, unknown>) => row.status === 'approved').length;
        const pendingCount = data.filter((row: Record<string, unknown>) => row.status === 'pending').length;
        const checkedInCount = data.filter((row: Record<string, unknown>) => row.checkin_at).length;
        
        pdf.setFontSize(10);
        pdf.text(`Total Registrasi: ${totalRegistrations}`, 14, 55);
        pdf.text(`Disetujui: ${approvedCount}`, 14, 62);
        pdf.text(`Menunggu: ${pendingCount}`, 14, 69);
        pdf.text(`Sudah Check-in: ${checkedInCount}`, 14, 76);
        
        console.log('📊 Registration Summary added');
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

    console.log('📋 Preparing table data...');
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

    console.log('📋 Creating table...');
    const tableStartY = options.includeSummary ? 90 : 55;
    
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
    
    console.log('✅ Table created successfully');

    // Save PDF
    console.log('💾 Saving PDF...');
    pdf.save(`${filename}.pdf`);
    
    console.log('✅ PDF created and saved successfully');
    resolve();
    
  } catch (error) {
    console.error('❌ Error creating PDF:', error);
    reject(error instanceof Error ? error : new Error('Unknown error creating PDF'));
  }
} 