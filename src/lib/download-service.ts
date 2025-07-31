import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { createPDFWithCDN } from './pdf-fallback';
import { createPDFDirectCDN } from './pdf-cdn-direct';

// Define proper types for custom fields
interface CustomField {
  name: string;
  label: string;
  type: string;
  required?: boolean;
  options?: string[];
}

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
  [key: string]: unknown;
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
  event_custom_fields?: CustomField[];
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
  custom_data?: Record<string, unknown>;
  event_custom_fields?: CustomField[];
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
          location,
          custom_fields
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
      event_name: (registration.events as { name?: string; event_date?: string; location?: string; custom_fields?: CustomField[] })?.name || 'Unknown Event',
      event_date: (registration.events as { name?: string; event_date?: string; location?: string; custom_fields?: CustomField[] })?.event_date || '',
      event_location: (registration.events as { name?: string; event_date?: string; location?: string; custom_fields?: CustomField[] })?.location || '',
      ticket_code: registration.tickets?.[0]?.qr_code || '',
      ticket_short_code: registration.tickets?.[0]?.short_code || '',
      checkin_at: registration.tickets?.[0]?.checkin_at || '',
      checkin_location: registration.tickets?.[0]?.checkin_location || '',
      checkin_notes: registration.tickets?.[0]?.checkin_notes || '',
      custom_data: registration.custom_data,
      event_custom_fields: (registration.events as { name?: string; event_date?: string; location?: string; custom_fields?: CustomField[] })?.custom_fields || []
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
    // First, get the check-in report data
    let query = supabase
      .from('checkin_reports')
      .select('*')
      .order('event_name', { ascending: true })
      .order('participant_name', { ascending: true });

    if (eventId && eventId !== 'all') {
      query = query.eq('event_id', eventId);
    }

    const { data: checkinData, error: checkinError } = await query;

    if (checkinError) throw checkinError;

    // Get registration data with custom fields for each event
    const registrationQuery = supabase
      .from('registrations')
      .select(`
        id,
        custom_data,
        events (
          id,
          custom_fields
        )
      `)
      .eq('status', 'approved');

    if (eventId && eventId !== 'all') {
      registrationQuery.eq('event_id', eventId);
    }

    const { data: registrationData, error: registrationError } = await registrationQuery;

    if (registrationError) throw registrationError;

    // Create a map of registration_id to custom data and event custom fields
    const customDataMap = new Map();
    (registrationData || []).forEach(registration => {
      customDataMap.set(registration.id, {
        custom_data: registration.custom_data || {},
        event_custom_fields: (registration.events as { custom_fields?: CustomField[] })?.custom_fields || []
      });
    });

    return (checkinData || []).map(report => {
      const customInfo = customDataMap.get(report.registration_id) || {
        custom_data: {},
        event_custom_fields: []
      };

      return {
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
        checked_in_by_name: report.checked_in_by_name || '',
        custom_data: customInfo.custom_data,
        event_custom_fields: customInfo.event_custom_fields
      };
    });
  } catch (error) {
    console.error('Error fetching check-in report data:', error);
    throw error;
  }
}

// Generate column styles for PDF based on headers
export function generateColumnStyles(headers: string[]): Record<number, { cellWidth: number }> {
  const columnStyles: Record<number, { cellWidth: number }> = {};
  
  headers.forEach((header, index) => {
    let cellWidth = 30; // Default width
    
    // Set specific widths for known headers
    if (header === 'ID') {
      cellWidth = 25;
    } else if (header === 'Nama Peserta') {
      cellWidth = 35;
    } else if (header === 'Email') {
      cellWidth = 55;
    } else if (header === 'Nomor Telepon') {
      cellWidth = 30;
    } else if (header === 'Status') {
      cellWidth = 25;
    } else if (header === 'Tanggal Registrasi') {
      cellWidth = 35;
    } else if (header === 'Nama Event') {
      cellWidth = 40;
    } else if (header === 'Tanggal Event') {
      cellWidth = 35;
    } else if (header === 'Lokasi Event') {
      cellWidth = 40;
    } else if (header === 'Kode Tiket') {
      cellWidth = 35;
    } else if (header === 'Kode Pendek') {
      cellWidth = 25;
    } else if (header === 'Waktu Check-in') {
      cellWidth = 35;
    } else if (header === 'Lokasi Check-in') {
      cellWidth = 35;
    } else if (header === 'Catatan Check-in') {
      cellWidth = 40;
    } else if (header === 'ID Event') {
      cellWidth = 25;
    } else if (header === 'Status Kehadiran') {
      cellWidth = 30;
    } else if (header === 'Checked-in Oleh') {
      cellWidth = 35;
    } else {
      // For custom fields, use a reasonable default width
      cellWidth = Math.min(Math.max(header.length * 2, 25), 50);
    }
    
    columnStyles[index] = { cellWidth };
  });
  
  return columnStyles;
}

// Flatten registration data with custom fields
export function flattenRegistrationData(data: RegistrationData[]): Record<string, unknown>[] {
  return data.map(registration => {
    const baseData = {
      id: registration.id,
      participant_name: registration.participant_name,
      participant_email: registration.participant_email,
      phone_number: registration.phone_number || '',
      status: registration.status,
      registered_at: registration.registered_at,
      event_name: registration.event_name,
      event_date: registration.event_date || '',
      event_location: registration.event_location || '',
      ticket_code: registration.ticket_code || '',
      ticket_short_code: registration.ticket_short_code || '',
      checkin_at: registration.checkin_at || '',
      checkin_location: registration.checkin_location || '',
      checkin_notes: registration.checkin_notes || ''
    };

    // Add custom fields data
    const customData: Record<string, unknown> = {};
    if (registration.custom_data && registration.event_custom_fields) {
      registration.event_custom_fields.forEach((field: CustomField) => {
        const fieldName = field.name;
        const fieldValue = registration.custom_data?.[fieldName] || '';
        customData[field.label || field.name] = fieldValue;
      });
    }

    return { ...baseData, ...customData };
  });
}

// Flatten check-in report data with custom fields
export function flattenCheckinReportData(data: CheckinReportData[]): Record<string, unknown>[] {
  return data.map(report => {
    const baseData = {
      participant_name: report.participant_name,
      participant_email: report.participant_email,
      phone_number: report.phone_number || '',
      attendance_status: report.attendance_status,
      checkin_at: report.checkin_at || '',
      checkin_location: report.checkin_location || '',
      checkin_notes: report.checkin_notes || '',
      checked_in_by_name: report.checked_in_by_name || '',
      event_name: report.event_name,
      event_date: report.event_date || '',
      event_location: report.event_location || '',
      ticket_code: report.ticket_code || '',
      ticket_short_code: report.ticket_short_code || ''
    };

    // Add custom fields
    const customData: Record<string, unknown> = {};
    if (report.custom_data && report.event_custom_fields) {
      report.event_custom_fields.forEach((field: CustomField) => {
        const fieldName = field.name;
        const fieldValue = report.custom_data?.[fieldName] || '';
        customData[field.label || field.name] = fieldValue;
      });
    }

    return { ...baseData, ...customData };
  });
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
      // First try to get value using header mapping
      const dataKey = headerMapping[header];
      let value = '';
      
      if (dataKey) {
        value = String((row as Record<string, unknown>)[dataKey] || '');
      } else {
        // If no mapping found, try to get value directly using header as key
        // This handles custom fields where header is the field label
        value = String((row as Record<string, unknown>)[header] || '');
      }
      
      console.log(`  ${header} (${dataKey || header}): ${value}`);
      
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
          // First try to get value using header mapping
          const dataKey = headerMapping[header];
          let value = '';
          
          if (dataKey) {
            value = String((row as Record<string, unknown>)[dataKey] || '');
          } else {
            // If no mapping found, try to get value directly using header as key
            // This handles custom fields where header is the field label
            value = String((row as Record<string, unknown>)[header] || '');
          }
          
          console.log(`  ${header} (${dataKey || header}): ${value}`);
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

    // Set column widths based on content and custom fields
    const columnWidths = headers.map(header => {
      let width = 15; // Default minimum width
      
      // Set specific widths for known headers
      if (header === 'ID') {
        width = 10;
      } else if (header === 'Nama Peserta') {
        width = 25;
      } else if (header === 'Email') {
        width = 35;
      } else if (header === 'Nomor Telepon') {
        width = 20;
      } else if (header === 'Status') {
        width = 15;
      } else if (header === 'Tanggal Registrasi') {
        width = 20;
      } else if (header === 'Nama Event') {
        width = 30;
      } else if (header === 'Tanggal Event') {
        width = 20;
      } else if (header === 'Lokasi Event') {
        width = 30;
      } else if (header === 'Kode Tiket') {
        width = 25;
      } else if (header === 'Kode Pendek') {
        width = 15;
      } else if (header === 'Waktu Check-in') {
        width = 20;
      } else if (header === 'Lokasi Check-in') {
        width = 25;
      } else if (header === 'Catatan Check-in') {
        width = 30;
      } else if (header === 'ID Event') {
        width = 10;
      } else if (header === 'Status Kehadiran') {
        width = 20;
      } else if (header === 'Checked-in Oleh') {
        width = 25;
      } else {
        // For custom fields, use a reasonable width based on header length
        width = Math.min(Math.max(header.length, 15), 40);
      }
      
      return { wch: width };
    });

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
          // First try to get value using header mapping
          const dataKey = headerMapping[header];
          let value = '';
          
          if (dataKey) {
            value = String((row as Record<string, unknown>)[dataKey] || '');
          } else {
            // If no mapping found, try to get value directly using header as key
            // This handles custom fields where header is the field label
            value = String((row as Record<string, unknown>)[header] || '');
          }
          
          console.log(`  ${header} (${dataKey || header}): ${value}`);
          
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
          // Dynamic column widths based on headers
          columnStyles: generateColumnStyles(headers),
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

// Get registration headers for CSV/Excel with dynamic custom fields
export function getRegistrationHeaders(data?: RegistrationData[]): string[] {
  const baseHeaders = [
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

  // If no data provided, return base headers
  if (!data || data.length === 0) {
    return baseHeaders;
  }

  // Get custom fields from the first registration (assuming all registrations are from the same event)
  const firstRegistration = data[0];
  const customFields = firstRegistration.event_custom_fields || [];

  // Add custom field headers
  const customHeaders = customFields.map((field: CustomField) => field.label || field.name);

  return [...baseHeaders, ...customHeaders];
}

// Get check-in report headers for CSV/Excel
export function getCheckinReportHeaders(data?: CheckinReportData[]): string[] {
  const baseHeaders = [
    'Nama Peserta',
    'Email',
    'Nomor Telepon',
    'Status Kehadiran',
    'Waktu Check-in',
    'Lokasi Check-in',
    'Catatan Check-in',
    'Checked-in Oleh',
    'Nama Event',
    'Tanggal Event',
    'Lokasi Event',
    'Kode Tiket',
    'Kode Pendek'
  ];

  if (!data || data.length === 0) {
    return baseHeaders;
  }

  // Get custom fields from the first report
  const firstReport = data[0];
  const customFields = firstReport.event_custom_fields || [];
  const customHeaders = customFields.map((field: CustomField) => field.label || field.name);

  return [...baseHeaders, ...customHeaders];
}

// Main download function for registrations
export async function downloadRegistrations(options: DownloadOptions) {
  try {
    console.log('🔍 Downloading registrations with options:', options);
    
    const data = await fetchRegistrationData(options);
    const headers = getRegistrationHeaders(data);
    
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
    
    // Flatten data to include custom fields
    const flattenedData = flattenRegistrationData(data);
    
    if (options.format === 'csv') {
      downloadCSV(flattenedData, headers, filename);
    } else if (options.format === 'excel') {
      downloadExcel(flattenedData, headers, filename);
    } else if (options.format === 'pdf') {
      await downloadPDF(flattenedData, headers, filename, {
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
    const headers = getCheckinReportHeaders(data);
    const flattenedData = flattenCheckinReportData(data);
    
    console.log('📊 Fetched check-in data count:', data?.length || 0);
    console.log('📋 Headers:', headers);
    
    // Create filename with event info if specific event is selected
    let filename = `checkin_report_${format(new Date(), 'yyyy-MM-dd_HH-mm')}`;
    if (eventId && data.length > 0) {
      const eventName = data[0]?.event_name || 'event';
      const sanitizedEventName = eventName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      filename = `checkin_report_${sanitizedEventName}_${format(new Date(), 'yyyy-MM-dd_HH-mm')}`;
    }
    
    // Check if we have data
    if (!data || data.length === 0) {
      console.log('⚠️ No check-in data found, creating file with headers only');
      // Create file with headers only
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
      
      console.log('✅ Downloaded empty check-in report with headers');
      return { success: true, count: 0, message: 'No data found, downloaded headers only' };
    }
    
    if (formatType === 'csv') {
      downloadCSV(flattenedData, headers, filename);
    } else if (formatType === 'excel') {
      downloadExcel(flattenedData, headers, filename);
    } else if (formatType === 'pdf') {
      // Create title with event info if specific event is selected
      let title = 'Laporan Check-in Event';
      let subtitle = `Dibuat pada: ${format(new Date(), 'dd MMMM yyyy, HH:mm')}`;
      
      if (eventId && data.length > 0) {
        const eventName = data[0]?.event_name || 'Event';
        title = `Laporan Check-in Event: ${eventName}`;
        subtitle = `${eventName} - Dibuat pada: ${format(new Date(), 'dd MMMM yyyy, HH:mm')}`;
      }
      
      await downloadPDF(flattenedData, headers, filename, {
        title: title,
        subtitle: subtitle,
        includeSummary: true
      });
    }
    
    console.log('✅ Check-in report download completed successfully');
    return { success: true, count: data.length };
  } catch (error) {
    console.error('Error downloading check-in report:', error);
    throw error;
  }
} 