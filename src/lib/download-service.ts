import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { createPDFWithCDN } from './pdf-fallback';
import { createPDFDirectCDN } from './pdf-cdn-direct';

export interface DownloadOptions {
  eventId?: string;
  status?: 'pending' | 'approved' | 'rejected' | 'all';
  dateFrom?: string;
  dateTo?: string;
  format: 'csv' | 'excel' | 'pdf';
}

export interface PDFOptions {
  eventId?: string;
  title?: string;
  subtitle?: string;
  includeSummary?: boolean;
}

export interface RegistrationData {
  id: string;
  participant_name: string;
  participant_email: string;
  phone_number?: string;
  status: string;
  registered_at: string;
  event_name: string;
  event_date?: string;
  event_location?: string;
  ticket_code?: string;
  ticket_short_code?: string;
  checkin_at?: string;
  checkin_location?: string;
  checkin_notes?: string;
  custom_data?: Record<string, unknown>;
}

export interface CheckinReportData {
  event_id: string;
  event_name: string;
  event_date?: string;
  event_location?: string;
  participant_name: string;
  participant_email: string;
  phone_number?: string;
  ticket_code?: string;
  ticket_short_code?: string;
  attendance_status: string;
  checkin_at?: string;
  checkin_location?: string;
  checkin_notes?: string;
  checked_in_by_name?: string;
}

// Fetch registration data for download
export async function fetchRegistrationData(options: DownloadOptions): Promise<RegistrationData[]> {
  try {
    console.log('🔍 Fetching registration data with options:', options);
    
    let query = supabase
      .from('registrations')
      .select(`
        id,
        participant_name,
        participant_email,
        phone_number,
        status,
        registered_at,
        custom_data,
        event_id,
        events (
          id,
          name,
          event_date,
          location
        ),
        tickets (
          id,
          qr_code,
          short_code,
          checkin_at,
          checkin_location,
          checkin_notes
        )
      `)
      .order('registered_at', { ascending: false });

    // Apply filters
    if (options.eventId && options.eventId !== 'all') {
      console.log('🔍 Filtering by event ID:', options.eventId);
      query = query.eq('event_id', options.eventId);
    }

    if (options.status && options.status !== 'all') {
      console.log('🔍 Filtering by status:', options.status);
      query = query.eq('status', options.status);
    }

    if (options.dateFrom) {
      console.log('🔍 Filtering by date from:', options.dateFrom);
      query = query.gte('registered_at', options.dateFrom);
    }

    if (options.dateTo) {
      console.log('🔍 Filtering by date to:', options.dateTo);
      query = query.lte('registered_at', options.dateTo);
    }

    console.log('🔍 Executing query...');
    const { data, error } = await query;

    if (error) {
      console.error('❌ Database error:', error);
      throw error;
    }

    console.log('📊 Raw data from database:', data?.length || 0, 'records');
    if (data && data.length > 0) {
      console.log('📋 Sample raw data:', data[0]);
    }

    const mappedData = (data || []).map(registration => ({
      id: registration.id,
      participant_name: registration.participant_name,
      participant_email: registration.participant_email,
      phone_number: registration.phone_number || '',
      status: registration.status,
      registered_at: registration.registered_at,
      event_name: (registration.events as { name?: string; event_date?: string; location?: string })?.name || 'Unknown Event',
      event_date: (registration.events as { name?: string; event_date?: string; location?: string })?.event_date || '',
      event_location: (registration.events as { name?: string; event_date?: string; location?: string })?.location || '',
      ticket_code: registration.tickets?.[0]?.qr_code || '',
      ticket_short_code: registration.tickets?.[0]?.short_code || '',
      checkin_at: registration.tickets?.[0]?.checkin_at || '',
      checkin_location: registration.tickets?.[0]?.checkin_location || '',
      checkin_notes: registration.tickets?.[0]?.checkin_notes || '',
      custom_data: registration.custom_data
    }));

    console.log('✅ Mapped data count:', mappedData.length);
    if (mappedData.length > 0) {
      console.log('📋 Sample mapped data:', mappedData[0]);
    }

    return mappedData;
  } catch (error) {
    console.error('❌ Error fetching registration data:', error);
    throw error;
  }
}

// Fetch check-in report data
export async function fetchCheckinReportData(eventId?: string): Promise<CheckinReportData[]> {
  try {
    let query = supabase
      .from('checkin_reports')
      .select('*')
      .order('event_name', { ascending: true })
      .order('participant_name', { ascending: true });

    if (eventId && eventId !== 'all') {
      query = query.eq('event_id', eventId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map(report => ({
      event_id: report.event_id,
      event_name: report.event_name,
      event_date: report.event_date,
      event_location: report.event_location,
      participant_name: report.participant_name,
      participant_email: report.participant_email,
      phone_number: report.phone_number || '',
      ticket_code: report.qr_code || '',
      ticket_short_code: report.short_code || '',
      attendance_status: report.attendance_status,
      checkin_at: report.checkin_at,
      checkin_location: report.checkin_location || '',
      checkin_notes: report.checkin_notes || '',
      checked_in_by_name: report.checked_in_by_name || ''
    }));
  } catch (error) {
    console.error('Error fetching check-in report data:', error);
    throw error;
  }
}

// Convert data to CSV format
export function convertToCSV(data: unknown[], headers: string[]): string {
  console.log('🔧 Converting to CSV...');
  console.log('📊 Data count:', data?.length || 0);
  console.log('📋 Headers:', headers);
  
  // Create mapping from Indonesian headers to English data keys
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
    // For check-in reports
    'ID Event': 'event_id',
    'Status Kehadiran': 'attendance_status',
    'Checked-in Oleh': 'checked_in_by_name'
  };
  
  const csvHeaders = headers.join(',');
  
  if (!data || data.length === 0) {
    console.log('⚠️ No data to convert, returning headers only');
    return csvHeaders + '\n'; // Return headers with empty row
  }
  
  const csvRows = data.map((row, index) => {
    console.log(`🔍 Processing row ${index + 1}:`, row);
    
    const rowData = headers.map(header => {
      const dataKey = headerMapping[header];
      if (!dataKey) {
        console.warn(`⚠️ No mapping found for header: ${header}`);
        return '';
      }
      
      const value = (row as Record<string, unknown>)[dataKey] || '';
      console.log(`  ${header} (${dataKey}): ${value}`);
      
      // Escape commas and quotes in CSV
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(',');
    
    console.log(`📝 Row ${index + 1}:`, rowData);
    return rowData;
  });
  
  const csv = [csvHeaders, ...csvRows].join('\n');
  console.log('✅ CSV conversion completed');
  return csv;
}

// Download data as CSV file
export function downloadCSV(data: unknown[], headers: string[], filename: string) {
  const csv = convertToCSV(data, headers);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

// Download data as Excel file using XLSX library
export function downloadExcel(data: unknown[], headers: string[], filename: string) {
  console.log('📊 Creating Excel file...');
  console.log('📋 Data count:', data?.length || 0);
  console.log('📋 Headers:', headers);
  
  try {
    // Create mapping from Indonesian headers to English data keys
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
      // For check-in reports
      'ID Event': 'event_id',
      'Status Kehadiran': 'attendance_status',
      'Checked-in Oleh': 'checked_in_by_name'
    };

    // Prepare data for Excel
    const excelData = [];
    
    // Add headers as first row
    excelData.push(headers);
    
    // Add data rows
    if (data && data.length > 0) {
      data.forEach((row, index) => {
        console.log(`🔍 Processing Excel row ${index + 1}:`, row);
        
        const rowData = headers.map(header => {
          const dataKey = headerMapping[header];
          if (!dataKey) {
            console.warn(`⚠️ No mapping found for header: ${header}`);
            return '';
          }
          
          const value = (row as Record<string, unknown>)[dataKey] || '';
          console.log(`  ${header} (${dataKey}): ${value}`);
          return value;
        });
        
        console.log(`📝 Excel row ${index + 1}:`, rowData);
        excelData.push(rowData);
      });
    } else {
      console.log('⚠️ No data to export, creating Excel with headers only');
      // Add empty row to show headers
      excelData.push(headers.map(() => ''));
    }

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(excelData);

    // Set column widths based on content
    const columnWidths = headers.map(header => ({
      wch: Math.max(header.length, 15) // Minimum width 15, or header length
    }));

    // Apply column widths
    worksheet['!cols'] = columnWidths;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Registrations');

    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, { 
      bookType: 'xlsx', 
      type: 'array',
      bookSST: false
    });

    // Create blob and download
    const blob = new Blob([excelBuffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.xlsx`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log('✅ Excel file created and downloaded successfully');
  } catch (error) {
    console.error('❌ Error creating Excel file:', error);
    throw error;
  }
}

// Download data as PDF file
export async function downloadPDF(data: unknown[], headers: string[], filename: string, options: PDFOptions = {}) {
  console.log('📄 Creating PDF file...');
  console.log('📋 Data count:', data?.length || 0);
  console.log('📋 Headers:', headers);
  console.log('📋 PDF Options:', options);
  
  try {
    // Create mapping from Indonesian headers to English data keys
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
      // For check-in reports
      'ID Event': 'event_id',
      'Status Kehadiran': 'attendance_status',
      'Checked-in Oleh': 'checked_in_by_name'
    };

    // Initialize PDF
    const pdf = new jsPDF('landscape', 'mm', 'a4');
    
    // Set font for better Indonesian character support
    pdf.setFont('helvetica');
    
    // Add beautiful header with gradient effect
    pdf.setFillColor(41, 128, 185); // Blue background
    pdf.rect(0, 0, 297, 25, 'F'); // Full width header
    
    // Add white title
    const title = options.title || 'Laporan Registrasi Event';
    const subtitle = options.subtitle || `Dibuat pada: ${format(new Date(), 'dd MMMM yyyy, HH:mm')}`;
    
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
    
    // Add event details with better styling
    if (data && data.length > 0) {
      const firstRow = data[0] as Record<string, unknown>;
      if (firstRow.event_name && firstRow.event_date && firstRow.event_location) {
        // Event details box
        pdf.setFillColor(245, 245, 245);
        pdf.rect(14, 30, 120, 20, 'F');
        pdf.setDrawColor(200, 200, 200);
        pdf.rect(14, 30, 120, 20, 'S');
        
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(41, 128, 185);
        pdf.text('📅 Event Details', 16, 37);
        
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(0, 0, 0);
        pdf.text(`Tanggal: ${format(new Date(firstRow.event_date as string), 'dd/MM/yyyy HH:mm')}`, 16, 44);
        pdf.text(`Lokasi: ${firstRow.event_location}`, 16, 51);
      }
    }
    
    // Add summary if requested
    if (options.includeSummary && data && data.length > 0) {
      const totalRegistrations = data.length;
      
      // Check if this is check-in report data (has attendance_status) or registration data (has status)
      const isCheckinReport = data[0] && typeof data[0] === 'object' && data[0] !== null && 'attendance_status' in (data[0] as Record<string, unknown>);
      
      if (isCheckinReport) {
        // For check-in reports
        const checkedInCount = data.filter((row: Record<string, unknown>) => row.attendance_status === 'checked_in').length;
        const notCheckedInCount = data.filter((row: Record<string, unknown>) => row.attendance_status === 'not_checked_in').length;
        const attendanceRate = totalRegistrations > 0 ? Math.round((checkedInCount / totalRegistrations) * 100) : 0;
        
        // Summary box with better styling
        pdf.setFillColor(240, 248, 255);
        pdf.rect(150, 30, 120, 20, 'F');
        pdf.setDrawColor(41, 128, 185);
        pdf.rect(150, 30, 120, 20, 'S');
        
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(41, 128, 185);
        pdf.text('📊 Summary', 152, 37);
        
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(0, 0, 0);
        pdf.text(`Total: ${totalRegistrations}`, 152, 44);
        pdf.text(`Hadir: ${checkedInCount} | Tidak Hadir: ${notCheckedInCount}`, 152, 51);
        
        // Simple attendance rate bar
        const barWidth = 100;
        const barHeight = 4;
        const barX = 152;
        const barY = 56;
        
        // Background bar
        pdf.setFillColor(220, 220, 220);
        pdf.rect(barX, barY, barWidth, barHeight, 'F');
        
        // Progress bar
        const progressWidth = (attendanceRate / 100) * barWidth;
        pdf.setFillColor(46, 204, 113); // Green for attendance
        pdf.rect(barX, barY, progressWidth, barHeight, 'F');
        
        // Attendance rate text
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(46, 204, 113);
        pdf.text(`${attendanceRate}% Attendance Rate`, barX, barY + 8);
        
        console.log('📊 Check-in Report Summary:');
        console.log(`  Total: ${totalRegistrations}`);
        console.log(`  Checked-in: ${checkedInCount}`);
        console.log(`  Not checked-in: ${notCheckedInCount}`);
        console.log(`  Attendance rate: ${attendanceRate}%`);
      } else {
        // For registration data
        const approvedCount = data.filter((row: Record<string, unknown>) => row.status === 'approved').length;
        const pendingCount = data.filter((row: Record<string, unknown>) => row.status === 'pending').length;
        const checkedInCount = data.filter((row: Record<string, unknown>) => row.checkin_at).length;
        
        pdf.setFontSize(10);
        pdf.text(`Total Registrasi: ${totalRegistrations}`, 14, 55);
        pdf.text(`Disetujui: ${approvedCount}`, 14, 62);
        pdf.text(`Menunggu: ${pendingCount}`, 14, 69);
        pdf.text(`Sudah Check-in: ${checkedInCount}`, 14, 76);
        
        console.log('📊 Registration Summary:');
        console.log(`  Total: ${totalRegistrations}`);
        console.log(`  Approved: ${approvedCount}`);
        console.log(`  Pending: ${pendingCount}`);
        console.log(`  Checked-in: ${checkedInCount}`);
      }
    }
    
    // Prepare table data
    const tableData = [];
    if (data && data.length > 0) {
      data.forEach((row, index) => {
        console.log(`🔍 Processing PDF row ${index + 1}:`, row);
        
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
          
          if (!dataKey) {
            console.warn(`⚠️ No mapping found for header: ${header}`);
            return '';
          }
          
          const value = (row as Record<string, unknown>)[dataKey] || '';
          console.log(`  ${header} (${dataKey}): ${value}`);
          
          // Format dates for better readability
          if (header.includes('Tanggal') || header.includes('Waktu')) {
            if (value && typeof value === 'string') {
              try {
                return format(new Date(value), 'dd/MM/yyyy HH:mm');
              } catch {
                return value;
              }
            }
          }
          
          return value;
        });
        
        console.log(`📝 PDF row ${index + 1}:`, rowData);
        tableData.push(rowData);
      });
    } else {
      console.log('⚠️ No data to export, creating PDF with headers only');
      tableData.push(headers.map(() => 'Tidak ada data'));
    }

    // Create table
    const tableStartY = options.includeSummary ? 70 : 55;
    
    console.log('🔧 Creating PDF table...');
    console.log('📋 Table start Y:', tableStartY);
    console.log('📋 Headers for table:', headers);
    console.log('📋 Table data count:', tableData.length);
    
    try {
      // Check if we're in browser environment
      if (typeof window === 'undefined') {
        throw new Error('PDF generation is only available in browser environment');
      }
      
      console.log('🔍 Checking autoTable availability...');
      
      // Use autoTable method directly
      const autoTable = (pdf as unknown as Record<string, unknown>).autoTable;
      console.log('📋 autoTable type:', typeof autoTable);
      console.log('📋 autoTable available:', !!autoTable);
      
      if (typeof autoTable !== 'function') {
        console.error('❌ autoTable method not available. This might be a library loading issue.');
        console.error('📋 Available PDF methods:', Object.getOwnPropertyNames(pdf).slice(0, 20));
        throw new Error('autoTable method not available - please check if jspdf-autotable is properly loaded');
      }
      
      console.log('✅ autoTable method is available, calling it...');
      
      console.log('📋 Calling autoTable with config...');
      
      try {
        autoTable({
          head: [headers],
          body: tableData,
          startY: tableStartY,
          styles: {
            fontSize: 9,
            cellPadding: 4,
            lineColor: [200, 200, 200],
            lineWidth: 0.2,
            textColor: [0, 0, 0],
          },
          headStyles: {
            fillColor: [41, 128, 185],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 10,
            halign: 'center',
          },
          alternateRowStyles: {
            fillColor: [248, 249, 250],
          },
          bodyStyles: {
            fontSize: 8,
            halign: 'left',
          },
          // Optimized column widths for 5 columns
          columnStyles: {
            0: { cellWidth: 35 }, // Nama Peserta
            1: { cellWidth: 55 }, // Email
            2: { cellWidth: 30 }, // Nomor Telepon
            3: { cellWidth: 30 }, // Status Kehadiran
            4: { cellWidth: 35 }, // Waktu Check-in
          },
          margin: { top: 5, right: 10, bottom: 10, left: 10 },
          didDrawPage: function (data) {
            try {
              // Add footer with styling
              const pageCount = pdf.getNumberOfPages();
              const footerY = pdf.internal.pageSize.height - 15;
              
              // Footer background
              pdf.setFillColor(245, 245, 245);
              pdf.rect(0, footerY - 5, 297, 20, 'F');
              
              // Footer border
              pdf.setDrawColor(200, 200, 200);
              pdf.line(0, footerY - 5, 297, footerY - 5);
              
              // Page number
              pdf.setFontSize(8);
              pdf.setFont('helvetica', 'normal');
              pdf.setTextColor(100, 100, 100);
              pdf.text(`Halaman ${data.pageNumber} dari ${pageCount}`, 14, footerY);
              
              // Generated info
              pdf.text(`Dibuat dengan Event Management System`, 150, footerY);
              
              // Date and time
              const now = new Date();
              const dateStr = now.toLocaleDateString('id-ID');
              const timeStr = now.toLocaleTimeString('id-ID');
              pdf.text(`${dateStr} ${timeStr}`, 250, footerY);
              
            } catch (pageError) {
              console.warn('⚠️ Error adding footer:', pageError);
            }
          }
        });
        
              console.log('✅ autoTable call completed successfully');
    } catch (autoTableError) {
      console.error('❌ Error in autoTable call:', autoTableError);
      console.error('❌ Error details:', {
        message: autoTableError instanceof Error ? autoTableError.message : 'Unknown error',
        stack: autoTableError instanceof Error ? autoTableError.stack : 'No stack trace'
      });
      
      // Try fallback with CDN
      console.log('🔄 Trying fallback with CDN...');
      try {
        await createPDFWithCDN(data, headers, filename, options);
        console.log('✅ PDF created successfully with CDN fallback');
        return;
      } catch (cdnError) {
        console.error('❌ CDN fallback failed:', cdnError);
        
        // Try direct CDN as last resort
        console.log('🔄 Trying direct CDN as last resort...');
        try {
          await createPDFDirectCDN(data, headers, filename, options);
          console.log('✅ PDF created successfully with direct CDN');
          return;
        } catch (directCdnError) {
          console.error('❌ Direct CDN also failed:', directCdnError);
          throw new Error(`All PDF methods failed. NPM error: ${autoTableError instanceof Error ? autoTableError.message : 'Unknown error'}. CDN error: ${cdnError instanceof Error ? cdnError.message : 'Unknown error'}. Direct CDN error: ${directCdnError instanceof Error ? directCdnError.message : 'Unknown error'}`);
        }
      }
    }
    
    console.log('✅ PDF table created successfully');
  } catch (tableError) {
    console.error('❌ Error creating PDF table:', tableError);
    
    // Try fallback with CDN
    console.log('🔄 Trying fallback with CDN...');
    try {
      await createPDFWithCDN(data, headers, filename, options);
      console.log('✅ PDF created successfully with CDN fallback');
      return;
    } catch (cdnError) {
      console.error('❌ CDN fallback failed:', cdnError);
      
      // Try direct CDN as last resort
      console.log('🔄 Trying direct CDN as last resort...');
      try {
        await createPDFDirectCDN(data, headers, filename, options);
        console.log('✅ PDF created successfully with direct CDN');
        return;
      } catch (directCdnError) {
        console.error('❌ Direct CDN also failed:', directCdnError);
        throw new Error(`All PDF methods failed. NPM error: ${tableError instanceof Error ? tableError.message : 'Unknown error'}. CDN error: ${cdnError instanceof Error ? cdnError.message : 'Unknown error'}. Direct CDN error: ${directCdnError instanceof Error ? directCdnError.message : 'Unknown error'}`);
      }
    }
  }

    // Save PDF
    console.log('💾 Saving PDF file...');
    try {
      pdf.save(`${filename}.pdf`);
      console.log('✅ PDF file saved successfully');
    } catch (saveError) {
      console.error('❌ Error saving PDF file:', saveError);
      throw new Error(`Failed to save PDF file: ${saveError instanceof Error ? saveError.message : 'Unknown error'}`);
    }
    
    console.log('✅ PDF file created and downloaded successfully');
  } catch (error) {
    console.error('❌ Error creating PDF file:', error);
    throw error;
  }
}

// Get registration headers for CSV/Excel
export function getRegistrationHeaders(): string[] {
  return [
    'ID',
    'Nama Peserta',
    'Email',
    'Nomor Telepon',
    'Status',
    'Tanggal Registrasi',
    'Nama Event',
    'Tanggal Event',
    'Lokasi Event',
    'Kode Tiket',
    'Kode Pendek',
    'Waktu Check-in',
    'Lokasi Check-in',
    'Catatan Check-in'
  ];
}

// Get check-in report headers for CSV/Excel
export function getCheckinReportHeaders(): string[] {
  return [
    'Nama Peserta',
    'Email',
    'Nomor Telepon',
    'Status Kehadiran',
    'Waktu Check-in'
  ];
}

// Main download function for registrations
export async function downloadRegistrations(options: DownloadOptions) {
  try {
    console.log('🔍 Downloading registrations with options:', options);
    
    const data = await fetchRegistrationData(options);
    const headers = getRegistrationHeaders();
    
    console.log('📊 Fetched data count:', data?.length || 0);
    console.log('📋 Headers:', headers);
    
    const filename = `registrations_${format(new Date(), 'yyyy-MM-dd_HH-mm')}`;
    
    // Check if we have data
    if (!data || data.length === 0) {
      console.log('⚠️ No data found, creating CSV with headers only');
      // Create CSV with headers only
      const csvHeaders = headers.join(',');
      const csv = csvHeaders + '\n'; // Add empty row to show headers
      
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${filename}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log('✅ Downloaded empty CSV with headers');
      return { success: true, count: 0, message: 'No data found, downloaded headers only' };
    }
    
    if (options.format === 'csv') {
      downloadCSV(data, headers, filename);
    } else if (options.format === 'excel') {
      downloadExcel(data, headers, filename);
    } else if (options.format === 'pdf') {
      await downloadPDF(data, headers, filename, {
        title: 'Laporan Registrasi Event',
        subtitle: `Dibuat pada: ${format(new Date(), 'dd MMMM yyyy, HH:mm')}`,
        includeSummary: true
      });
    }
    
    console.log('✅ Download completed successfully');
    return { success: true, count: data.length };
  } catch (error) {
    console.error('❌ Error downloading registrations:', error);
    throw error;
  }
}

// Main download function for check-in reports
export async function downloadCheckinReport(eventId?: string, formatType: 'csv' | 'excel' | 'pdf' = 'csv') {
  try {
    console.log('🔍 Downloading check-in report with event filter:', eventId || 'all events');
    
    const data = await fetchCheckinReportData(eventId);
    const headers = getCheckinReportHeaders();
    
    // Create filename with event info if specific event is selected
    let filename = `checkin_report_${format(new Date(), 'yyyy-MM-dd_HH-mm')}`;
    if (eventId && data.length > 0) {
      const eventName = data[0]?.event_name || 'event';
      const sanitizedEventName = eventName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      filename = `checkin_report_${sanitizedEventName}_${format(new Date(), 'yyyy-MM-dd_HH-mm')}`;
    }
    
    if (formatType === 'csv') {
      downloadCSV(data, headers, filename);
    } else if (formatType === 'excel') {
      downloadExcel(data, headers, filename);
    } else if (formatType === 'pdf') {
      // Create title with event info if specific event is selected
      let title = 'Laporan Check-in Event';
      let subtitle = `Dibuat pada: ${format(new Date(), 'dd MMMM yyyy, HH:mm')}`;
      
      if (eventId && data.length > 0) {
        const eventName = data[0]?.event_name || 'Event';
        title = `Laporan Check-in Event: ${eventName}`;
        subtitle = `${eventName} - Dibuat pada: ${format(new Date(), 'dd MMMM yyyy, HH:mm')}`;
      }
      
      await downloadPDF(data, headers, filename, {
        title: title,
        subtitle: subtitle,
        includeSummary: true
      });
    }
    
    return { success: true, count: data.length };
  } catch (error) {
    console.error('Error downloading check-in report:', error);
    throw error;
  }
} 