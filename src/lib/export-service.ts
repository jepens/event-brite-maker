import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { createPDFWithCDN } from './pdf-fallback';
import { createPDFDirectCDN } from './pdf-cdn-direct';

// Enhanced export types
export interface ExportConfig {
  eventId?: string;
  filters: ExportFilters;
  format: 'csv' | 'excel' | 'pdf';
  includeCustomFields: boolean;
  includeTickets: boolean;
  includeCheckinData: boolean;
  customFieldSelection?: string[];
  templateId?: string;
}

export interface ExportFilters {
  status?: 'pending' | 'approved' | 'rejected' | 'all';
  dateFrom?: string;
  dateTo?: string;
  searchTerm?: string;
  checkinStatus?: 'checked_in' | 'not_checked_in' | 'all';
}

export interface ExportTemplate {
  id: string;
  name: string;
  description: string;
  eventId?: string;
  fields: string[];
  filters: ExportFilters;
  format: 'csv' | 'excel' | 'pdf';
  includeCustomFields: boolean;
  includeTickets: boolean;
  includeCheckinData: boolean;
  created_at: string;
  updated_at: string;
}

export interface ExportResult {
  success: boolean;
  filename: string;
  recordCount: number;
  format: string;
  downloadUrl?: string;
  error?: string;
}

// Define proper types for custom fields
interface CustomField {
  name: string;
  label: string;
  type: string;
  required?: boolean;
  options?: string[];
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
  // Common custom fields
  member_number?: string;
  company?: string;
  position?: string;
  department?: string;
  address?: string;
  city?: string;
  dietary_restrictions?: string;
  special_requests?: string;
  // Raw custom data for other fields
  custom_data?: Record<string, unknown>;
  event_custom_fields?: CustomField[];
}

export class ExportService {
  /**
   * Get available export templates
   */
  static async getTemplates(eventId?: string): Promise<ExportTemplate[]> {
    try {
      let query = supabase
        .from('export_templates')
        .select('*')
        .order('updated_at', { ascending: false });

      // Only add event filter if eventId is provided and not 'all'
      if (eventId && eventId !== 'all' && eventId.trim() !== '') {
        query = query.or(`event_id.eq.${eventId},event_id.is.null`);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching export templates:', error);
      return [];
    }
  }

  /**
   * Save export template
   */
  static async saveTemplate(template: Omit<ExportTemplate, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('export_templates')
        .insert({
          ...template,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (error) throw error;

      return data.id;
    } catch (error) {
      console.error('Error saving export template:', error);
      throw new Error('Failed to save template');
    }
  }

  /**
   * Delete export template
   */
  static async deleteTemplate(templateId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('export_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Error deleting export template:', error);
      return false;
    }
  }

  /**
   * Get event custom fields for export
   */
  static async getEventCustomFields(eventId: string): Promise<CustomField[]> {
    try {
      // Return empty array if eventId is 'all' or invalid
      if (!eventId || eventId === 'all' || eventId.trim() === '') {
        return [];
      }

      const { data: event, error } = await supabase
        .from('events')
        .select('custom_fields')
        .eq('id', eventId)
        .single();

      if (error || !event) {
        throw new Error('Event not found');
      }

      return event.custom_fields as CustomField[] || [];
    } catch (error) {
      console.error('Error getting event custom fields:', error);
      return [];
    }
  }

  /**
   * Fetch registration data with enhanced filtering
   */
  static async fetchRegistrationData(config: ExportConfig): Promise<RegistrationData[]> {
    try {
      console.log('🔍 Fetching registration data with enhanced config:', config);
      
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
          )
        `)
        .order('registered_at', { ascending: false });

      // Apply filters
      if (config.eventId && config.eventId !== 'all') {
        console.log('🔍 Filtering by event ID:', config.eventId);
        query = query.eq('event_id', config.eventId);
      }

      if (config.filters.status && config.filters.status !== 'all') {
        console.log('🔍 Filtering by status:', config.filters.status);
        query = query.eq('status', config.filters.status);
      }

      if (config.filters.dateFrom) {
        console.log('🔍 Filtering by date from:', config.filters.dateFrom);
        query = query.gte('registered_at', config.filters.dateFrom);
      }

      if (config.filters.dateTo) {
        console.log('🔍 Filtering by date to:', config.filters.dateTo);
        query = query.lte('registered_at', config.filters.dateTo);
      }

      if (config.filters.searchTerm) {
        console.log('🔍 Filtering by search term:', config.filters.searchTerm);
        query = query.or(`participant_name.ilike.%${config.filters.searchTerm}%,participant_email.ilike.%${config.filters.searchTerm}%`);
      }

      console.log('🔍 Executing query...');
      const { data, error } = await query;

      if (error) {
        console.error('❌ Database error:', error);
        throw error;
      }

      console.log('📊 Raw data from database:', data?.length || 0, 'records');

      // Fetch tickets separately to avoid relationship ambiguity
      const registrationIds = (data || []).map(reg => reg.id);
      let ticketsData: Record<string, any> = {};
      
      if (registrationIds.length > 0) {
        const { data: tickets, error: ticketsError } = await supabase
          .from('tickets')
          .select('id, registration_id, qr_code, short_code, checkin_at, checkin_location, checkin_notes')
          .in('registration_id', registrationIds);
        
        if (ticketsError) {
          console.warn('⚠️ Warning: Could not fetch tickets data:', ticketsError);
        } else {
          // Create a map of registration_id to ticket data
          ticketsData = (tickets || []).reduce((acc, ticket) => {
            acc[ticket.registration_id] = ticket;
            return acc;
          }, {} as Record<string, any>);
        }
      }

      let mappedData = (data || []).map(registration => {
        // Extract common custom fields
        const customData = registration.custom_data || {};
        const memberNumber = customData.member_number || customData.nomor_anggota || customData['Nomor Anggota'] || '';
        const company = customData.company || customData.instansi || customData.perusahaan || customData['Perusahaan'] || customData['Instansi'] || '';
        const position = customData.position || customData.jabatan || customData['Jabatan'] || '';
        const department = customData.department || customData.bagian || customData['Department'] || customData['Bagian'] || '';
        const address = customData.address || customData.alamat || customData['Address'] || customData['Alamat'] || '';
        const city = customData.city || customData.kota || customData['City'] || customData['Kota'] || '';
        const dietaryRestrictions = customData.dietary_restrictions || customData['Dietary Restrictions'] || customData['Pembatasan Diet'] || '';
        const specialRequests = customData.special_requests || customData['Special Requests'] || customData['Permintaan Khusus'] || '';

        // Get ticket data for this registration
        const ticket = ticketsData[registration.id];

        return {
          id: registration.id,
          participant_name: registration.participant_name,
          participant_email: registration.participant_email,
          phone_number: registration.phone_number || '',
          status: registration.status,
          registered_at: registration.registered_at,
          event_name: (registration.events as { name?: string; event_date?: string; location?: string; custom_fields?: CustomField[] })?.name || 'Unknown Event',
          event_date: (registration.events as { name?: string; event_date?: string; location?: string; custom_fields?: CustomField[] })?.event_date || '',
          event_location: (registration.events as { name?: string; event_date?: string; location?: string; custom_fields?: CustomField[] })?.location || '',
          ticket_code: ticket?.qr_code || '',
          ticket_short_code: ticket?.short_code || '',
          checkin_at: ticket?.checkin_at || '',
          checkin_location: ticket?.checkin_location || '',
          checkin_notes: ticket?.checkin_notes || '',
          // Common custom fields
          member_number: memberNumber,
          company: company,
          position: position,
          department: department,
          address: address,
          city: city,
          dietary_restrictions: dietaryRestrictions,
          special_requests: specialRequests,
          // Raw custom data for other fields
          custom_data: registration.custom_data,
          event_custom_fields: (registration.events as { name?: string; event_date?: string; location?: string; custom_fields?: CustomField[] })?.custom_fields || []
        };
      });

      // Apply check-in status filter
      if (config.filters.checkinStatus && config.filters.checkinStatus !== 'all') {
        if (config.filters.checkinStatus === 'checked_in') {
          mappedData = mappedData.filter(reg => reg.checkin_at);
        } else if (config.filters.checkinStatus === 'not_checked_in') {
          mappedData = mappedData.filter(reg => !reg.checkin_at);
        }
      }

      console.log('✅ Mapped data count:', mappedData.length);
      return mappedData;
    } catch (error) {
      console.error('❌ Error fetching registration data:', error);
      throw error;
    }
  }

  /**
   * Generate headers based on configuration
   */
  static generateHeaders(data: RegistrationData[], config: ExportConfig): string[] {
    const baseHeaders = [
      'ID',
      'Nama Peserta',
      'Email',
      'Nomor Telepon',
      'Status',
      'Tanggal Registrasi',
      'Nama Event'
    ];

    // Add common custom fields that are commonly used
    const commonCustomHeaders = [
      'Nomor Anggota',
      'Perusahaan/Instansi',
      'Jabatan',
      'Department/Bagian',
      'Alamat',
      'Kota',
      'Pembatasan Diet',
      'Permintaan Khusus'
    ];
    baseHeaders.push(...commonCustomHeaders);

    // Add optional fields based on config
    if (config.includeCheckinData) {
      baseHeaders.push('Waktu Check-in', 'Lokasi Check-in', 'Catatan Check-in');
    }

    if (config.includeTickets) {
      baseHeaders.push('Kode Tiket', 'Kode Pendek');
    }

    if (config.includeCustomFields && data.length > 0) {
      const firstRegistration = data[0];
      const customFields = firstRegistration.event_custom_fields || [];
      
      // Filter custom fields if specific selection is provided
      const selectedCustomFields = config.customFieldSelection 
        ? customFields.filter(field => config.customFieldSelection!.includes(field.name))
        : customFields;

      const customHeaders = selectedCustomFields.map(field => field.label || field.name);
      baseHeaders.push(...customHeaders);
    }

    return baseHeaders;
  }

  /**
   * Flatten data with custom fields
   */
  static flattenData(data: RegistrationData[], config: ExportConfig): Record<string, unknown>[] {
    return data.map(registration => {
      const baseData: Record<string, unknown> = {
        id: registration.id,
        participant_name: registration.participant_name,
        participant_email: registration.participant_email,
        phone_number: registration.phone_number || '',
        status: registration.status,
        registered_at: registration.registered_at,
        event_name: registration.event_name,
        // Common custom fields
        'Nomor Anggota': registration.member_number || '',
        'Perusahaan/Instansi': registration.company || '',
        'Jabatan': registration.position || '',
        'Department/Bagian': registration.department || '',
        'Alamat': registration.address || '',
        'Kota': registration.city || '',
        'Pembatasan Diet': registration.dietary_restrictions || '',
        'Permintaan Khusus': registration.special_requests || ''
      };

      // Add optional fields based on config
      if (config.includeCheckinData) {
        baseData['Waktu Check-in'] = registration.checkin_at || '';
        baseData['Lokasi Check-in'] = registration.checkin_location || '';
        baseData['Catatan Check-in'] = registration.checkin_notes || '';
      }

      if (config.includeTickets) {
        baseData['Kode Tiket'] = registration.ticket_code || '';
        baseData['Kode Pendek'] = registration.ticket_short_code || '';
      }

      // Add custom fields
      if (config.includeCustomFields && registration.custom_data && registration.event_custom_fields) {
        const customFields = registration.event_custom_fields;
        const selectedCustomFields = config.customFieldSelection 
          ? customFields.filter(field => config.customFieldSelection!.includes(field.name))
          : customFields;

        selectedCustomFields.forEach(field => {
          const fieldName = field.name;
          const fieldValue = registration.custom_data?.[fieldName] || '';
          baseData[field.label || field.name] = fieldValue;
        });
      }

      return baseData;
    });
  }

  /**
   * Export data with enhanced configuration
   */
  static async exportData(config: ExportConfig): Promise<ExportResult> {
    try {
      console.log('🔍 Starting enhanced export with config:', config);

      // Fetch data
      const data = await this.fetchRegistrationData(config);
      
      if (!data || data.length === 0) {
        return {
          success: false,
          filename: '',
          recordCount: 0,
          format: config.format,
          error: 'No data found matching the criteria'
        };
      }

      // Generate headers
      const headers = this.generateHeaders(data, config);
      
      // Flatten data
      const flattenedData = this.flattenData(data, config);

      // Generate filename
      const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm');
      const eventName = data[0]?.event_name || 'all-events';
      const sanitizedEventName = eventName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      const filename = `registrations_${sanitizedEventName}_${timestamp}`;

      // Export based on format
      switch (config.format) {
        case 'csv':
          this.downloadCSV(flattenedData, headers, filename);
          break;
        case 'excel':
          this.downloadExcel(flattenedData, headers, filename);
          break;
        case 'pdf':
          await this.downloadPDF(flattenedData, headers, filename, {
            title: `Laporan Registrasi: ${eventName}`,
            subtitle: `Dibuat pada: ${format(new Date(), 'dd MMMM yyyy, HH:mm')}`,
            includeSummary: true
          });
          break;
      }

      return {
        success: true,
        filename: `${filename}.${config.format}`,
        recordCount: data.length,
        format: config.format
      };

    } catch (error) {
      console.error('❌ Error in enhanced export:', error);
      return {
        success: false,
        filename: '',
        recordCount: 0,
        format: config.format,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Download CSV with enhanced data
   */
  private static downloadCSV(data: unknown[], headers: string[], filename: string) {
    console.log('🔧 Converting to CSV...');
    
    // Create mapping from Indonesian headers to English data keys
    const headerMapping: Record<string, string> = {
      'ID': 'id',
      'Nama Peserta': 'participant_name',
      'Email': 'participant_email',
      'Nomor Telepon': 'phone_number',
      'Status': 'status',
      'Tanggal Registrasi': 'registered_at',
      'Nama Event': 'event_name',
      'Nomor Anggota': 'Nomor Anggota',
      'Perusahaan/Instansi': 'Perusahaan/Instansi',
      'Jabatan': 'Jabatan',
      'Department/Bagian': 'Department/Bagian',
      'Alamat': 'Alamat',
      'Kota': 'Kota',
      'Pembatasan Diet': 'Pembatasan Diet',
      'Permintaan Khusus': 'Permintaan Khusus',
      'Waktu Check-in': 'Waktu Check-in',
      'Lokasi Check-in': 'Lokasi Check-in',
      'Catatan Check-in': 'Catatan Check-in',
      'Kode Tiket': 'Kode Tiket',
      'Kode Pendek': 'Kode Pendek'
    };
    
    const csvHeaders = headers.join(',');
    
    if (!data || data.length === 0) {
      const csv = csvHeaders + '\n';
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      this.downloadBlob(blob, `${filename}.csv`);
      return;
    }
    
    const csvRows = data.map(row => {
      const rowData = headers.map(header => {
        const dataKey = headerMapping[header];
        let value = '';
        
        if (dataKey) {
          value = String((row as Record<string, unknown>)[dataKey] || '');
        } else {
          // For custom fields, try to get value directly using header as key
          value = String((row as Record<string, unknown>)[header] || '');
        }
        
        // Escape commas and quotes in CSV
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',');
      
      return rowData;
    });
    
    const csv = [csvHeaders, ...csvRows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    this.downloadBlob(blob, `${filename}.csv`);
  }

  /**
   * Download Excel with enhanced data
   */
  private static downloadExcel(data: unknown[], headers: string[], filename: string) {
    console.log('📊 Creating Excel file...');
    
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
        'Nomor Anggota': 'Nomor Anggota',
        'Perusahaan/Instansi': 'Perusahaan/Instansi',
        'Jabatan': 'Jabatan',
        'Department/Bagian': 'Department/Bagian',
        'Alamat': 'Alamat',
        'Kota': 'Kota',
        'Pembatasan Diet': 'Pembatasan Diet',
        'Permintaan Khusus': 'Permintaan Khusus',
        'Waktu Check-in': 'Waktu Check-in',
        'Lokasi Check-in': 'Lokasi Check-in',
        'Catatan Check-in': 'Catatan Check-in',
        'Kode Tiket': 'Kode Tiket',
        'Kode Pendek': 'Kode Pendek'
      };

      // Prepare data for Excel
      const excelData = [];
      
      // Add headers as first row
      excelData.push(headers);
      
      // Add data rows
      if (data && data.length > 0) {
        data.forEach(row => {
          const rowData = headers.map(header => {
            const dataKey = headerMapping[header];
            let value = '';
            
            if (dataKey) {
              value = String((row as Record<string, unknown>)[dataKey] || '');
            } else {
              // For custom fields, try to get value directly using header as key
              value = String((row as Record<string, unknown>)[header] || '');
            }
            
            return value;
          });
          
          excelData.push(rowData);
        });
      } else {
        // Add empty row to show headers
        excelData.push(headers.map(() => ''));
      }

      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.aoa_to_sheet(excelData);

      // Set column widths
      const columnWidths = headers.map(header => {
        let width = 15; // Default minimum width
        
        // Set specific widths for known headers
        if (header === 'ID') width = 10;
        else if (header === 'Nama Peserta') width = 25;
        else if (header === 'Email') width = 35;
        else if (header === 'Nomor Telepon') width = 20;
        else if (header === 'Status') width = 15;
        else if (header === 'Tanggal Registrasi') width = 20;
        else if (header === 'Nama Event') width = 30;
        else if (header === 'Nomor Anggota') width = 18;
        else if (header === 'Perusahaan/Instansi') width = 30;
        else if (header === 'Jabatan') width = 20;
        else if (header === 'Department/Bagian') width = 25;
        else if (header === 'Alamat') width = 35;
        else if (header === 'Kota') width = 15;
        else if (header === 'Pembatasan Diet') width = 25;
        else if (header === 'Permintaan Khusus') width = 30;
        else if (header === 'Waktu Check-in') width = 20;
        else if (header === 'Lokasi Check-in') width = 25;
        else if (header === 'Catatan Check-in') width = 30;
        else if (header === 'Kode Tiket') width = 25;
        else if (header === 'Kode Pendek') width = 15;
        else {
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
      
      this.downloadBlob(blob, `${filename}.xlsx`);
      
      console.log('✅ Excel file created and downloaded successfully');
    } catch (error) {
      console.error('❌ Error creating Excel file:', error);
      throw error;
    }
  }

  /**
   * Download PDF with enhanced data
   */
  private static async downloadPDF(data: unknown[], headers: string[], filename: string, options: {
    title?: string;
    subtitle?: string;
    includeSummary?: boolean;
  } = {}) {
    console.log('📄 Creating PDF file...');
    
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
        'Nomor Anggota': 'Nomor Anggota',
        'Perusahaan/Instansi': 'Perusahaan/Instansi',
        'Jabatan': 'Jabatan',
        'Department/Bagian': 'Department/Bagian',
        'Alamat': 'Alamat',
        'Kota': 'Kota',
        'Pembatasan Diet': 'Pembatasan Diet',
        'Permintaan Khusus': 'Permintaan Khusus',
        'Waktu Check-in': 'Waktu Check-in',
        'Lokasi Check-in': 'Lokasi Check-in',
        'Catatan Check-in': 'Catatan Check-in',
        'Kode Tiket': 'Kode Tiket',
        'Kode Pendek': 'Kode Pendek'
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
      
      // Add summary if requested
      if (options.includeSummary && data && data.length > 0) {
        const totalRegistrations = data.length;
        const approvedCount = data.filter((row: Record<string, unknown>) => row.status === 'approved').length;
        const pendingCount = data.filter((row: Record<string, unknown>) => row.status === 'pending').length;
        const checkedInCount = data.filter((row: Record<string, unknown>) => row.checkin_at).length;
        
        // Summary box with better styling
        pdf.setFillColor(240, 248, 255);
        pdf.rect(14, 30, 120, 20, 'F');
        pdf.setDrawColor(41, 128, 185);
        pdf.rect(14, 30, 120, 20, 'S');
        
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(41, 128, 185);
        pdf.text('📊 Summary', 16, 37);
        
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(0, 0, 0);
        pdf.text(`Total: ${totalRegistrations}`, 16, 44);
        pdf.text(`Approved: ${approvedCount} | Pending: ${pendingCount}`, 16, 51);
        pdf.text(`Checked-in: ${checkedInCount}`, 16, 58);
      }
      
      // Prepare table data
      const tableData = [];
      if (data && data.length > 0) {
        data.forEach(row => {
          const rowData = headers.map(header => {
            const dataKey = headerMapping[header];
            let value = '';
            
            if (dataKey) {
              value = String((row as Record<string, unknown>)[dataKey] || '');
            } else {
              // For custom fields, try to get value directly using header as key
              value = String((row as Record<string, unknown>)[header] || '');
            }
            
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
          
          tableData.push(rowData);
        });
      } else {
        tableData.push(headers.map(() => 'Tidak ada data'));
      }

      // Create table
      const tableStartY = options.includeSummary ? 70 : 55;
      
      try {
        // Check if we're in browser environment
        if (typeof window === 'undefined') {
          throw new Error('PDF generation is only available in browser environment');
        }
        
        const autoTable = (pdf as unknown as Record<string, unknown>).autoTable;
        
        if (typeof autoTable !== 'function') {
          throw new Error('autoTable method not available - please check if jspdf-autotable is properly loaded');
        }
        
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
        
        console.log('✅ PDF table created successfully');
      } catch (tableError) {
        console.error('❌ Error creating PDF table:', tableError);
        
        // Try fallback with CDN
        try {
          await createPDFWithCDN(data, headers, filename, options);
          console.log('✅ PDF created successfully with CDN fallback');
          return;
        } catch (cdnError) {
          console.error('❌ CDN fallback failed:', cdnError);
          
          // Try direct CDN as last resort
          try {
            await createPDFDirectCDN(data, headers, filename, options);
            console.log('✅ PDF created successfully with direct CDN');
            return;
          } catch (directCdnError) {
            console.error('❌ Direct CDN also failed:', directCdnError);
            throw new Error(`All PDF methods failed`);
          }
        }
      }

      // Save PDF
      pdf.save(`${filename}.pdf`);
      console.log('✅ PDF file created and downloaded successfully');
      
    } catch (error) {
      console.error('❌ Error creating PDF file:', error);
      throw error;
    }
  }

  /**
   * Helper function to download blob
   */
  private static downloadBlob(blob: Blob, filename: string) {
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Get default export templates
   */
  static getDefaultTemplates(): Omit<ExportTemplate, 'id' | 'created_at' | 'updated_at'>[] {
    return [
      {
        name: 'Semua Data',
        description: 'Export semua data registrasi dengan semua field',
        fields: ['id', 'participant_name', 'participant_email', 'phone_number', 'status', 'registered_at', 'event_name'],
        filters: { status: 'all' },
        format: 'excel',
        includeCustomFields: true,
        includeTickets: true,
        includeCheckinData: true
      },
      {
        name: 'Data Check-in',
        description: 'Export hanya data yang sudah check-in',
        fields: ['participant_name', 'participant_email', 'checkin_at', 'checkin_location'],
        filters: { checkinStatus: 'checked_in' },
        format: 'csv',
        includeCustomFields: false,
        includeTickets: false,
        includeCheckinData: true
      },
      {
        name: 'Data Pending',
        description: 'Export data yang masih pending',
        fields: ['participant_name', 'participant_email', 'phone_number', 'registered_at'],
        filters: { status: 'pending' },
        format: 'excel',
        includeCustomFields: true,
        includeTickets: false,
        includeCheckinData: false
      }
    ];
  }
} 