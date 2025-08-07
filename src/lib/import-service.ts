import { supabase } from '@/integrations/supabase/client';

// Helper function to handle Supabase errors
const handleSupabaseError = (error: any, context: string) => {
  console.error(`❌ ${context}:`, error);
  
  if (error?.code) {
    switch (error.code) {
      case '23505': // Unique constraint violation
        return 'Data duplikat ditemukan';
      case '23514': // Check constraint violation
        return 'Data tidak memenuhi persyaratan';
      case '23503': // Foreign key constraint violation
        return 'Referensi data tidak valid';
      case '42P01': // Undefined table
        return 'Tabel tidak ditemukan';
      case '42501': // Insufficient privilege
        return 'Tidak memiliki izin untuk operasi ini';
      default:
        return error.message || 'Database error';
    }
  }
  
  return error?.message || 'Unknown error';
};
import * as XLSX from 'xlsx';
import { toast } from '@/hooks/use-toast';
import type { ValidationRule, ImportProgress, ImportError } from '@/components/admin/registrations/import-types';

// Types for import functionality
export interface ImportConfig {
  eventId: string;
  fileType: 'csv' | 'excel';
  mapping: FieldMapping;
  validationRules?: Record<string, ValidationRule>;
  options: ImportOptions;
}

export interface FieldMapping {
  [key: string]: string; // field_name: column_name
}

export interface ImportOptions {
  skipDuplicates: boolean;
  defaultStatus: 'pending' | 'approved';
  sendEmails: boolean;
  validateOnly: boolean;
}

export interface ParsedRow {
  rowNumber: number;
  data: Record<string, string>;
  errors: ImportError[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: ImportError[];
  warnings: ImportError[];
}

export interface ImportResult {
  success: boolean;
  totalRecords: number;
  successfulImports: number;
  failedImports: number;
  errors: ImportError[];
  importLogId?: string;
  failedImportData?: Array<{
    row_number: number;
    name: string;
    email: string;
    phone: string;
    error_message: string;
    error_field: string;
    original_data: Record<string, any>;
  }>;
}

export interface ParsedData {
  headers: string[];
  rows: ParsedRow[];
  totalRows: number;
}

// Email validation regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^[+]?[0-9\s\-()]{8,}$/;

export class ImportService {
  /**
   * Parse file headers
   */
  static async parseFileHeaders(file: File): Promise<string[]> {
    try {
      if (file.name.toLowerCase().endsWith('.csv')) {
        const text = await file.text();
        const lines = text.split('\n');
        const firstLine = lines[0];
        return firstLine.split(',').map(header => header.trim().replace(/"/g, ''));
      } else if (file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls')) {
        // Use the existing parseExcel function to get headers
        const parsedData = await ImportService.parseExcel(file);
        return parsedData.headers;
      } else {
        throw new Error('Unsupported file format. Please use CSV or Excel files.');
      }
    } catch (error) {
      console.error('Error parsing file headers:', error);
      throw new Error('Failed to parse file headers');
    }
  }

  /**
   * Parse file with field mapping
   */
  static async parseFile(file: File, fieldMapping: Record<string, string>): Promise<Record<string, unknown>[]> {
    try {
      if (file.name.toLowerCase().endsWith('.csv')) {
        const text = await file.text();
        const lines = text.split('\n').filter(line => line.trim());
        if (lines.length < 2) {
          throw new Error('File must have at least header and one data row');
        }

        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const data: Record<string, unknown>[] = [];

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          const values = this.parseCSVLine(line);
          const rowData: Record<string, unknown> = {};
          
          headers.forEach((header, index) => {
            rowData[header] = values[index] || '';
          });

          data.push(rowData);
        }

        return data;
      } else if (file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls')) {
        // Use the existing parseExcel function to get data
        const parsedData = await ImportService.parseExcel(file);
        
        const data: Record<string, unknown>[] = [];
        
        for (const row of parsedData.rows) {
          const rowData: Record<string, unknown> = {};
          parsedData.headers.forEach((header, index) => {
            rowData[header] = row.data[header] || '';
          });
          data.push(rowData);
        }
        
        return data;
      } else {
        throw new Error('Unsupported file format. Please use CSV or Excel files.');
      }
    } catch (error) {
      console.error('Error parsing file:', error);
      throw new Error('Failed to parse file');
    }
  }

  /**
   * Validate data with validation rules and field mapping
   */
  static async validateData(
    data: Record<string, unknown>[], 
    validationRules: Record<string, ValidationRule>,
    fieldMapping?: Record<string, string>
  ): Promise<{
    headers: string[];
    data: Record<string, unknown>[];
    totalRows: number;
    validRows: number;
    invalidRows: number;
    errors: ImportError[];
  }> {
    const errors: ImportError[] = [];
    let validRows = 0;
    let invalidRows = 0;

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNumber = i + 1;
      let hasError = false;

      for (const [fieldName, rules] of Object.entries(validationRules)) {
        // Get the actual column name from field mapping, or use fieldName as fallback
        const columnName = fieldMapping?.[fieldName] || fieldName;
        const value = String(row[columnName] || '');
        
        // Required validation
        if (rules.required && !value.trim()) {
          errors.push({
            row: rowNumber,
            field: columnName,
            message: `${fieldName} wajib diisi`,
            value
          });
          hasError = true;
        }

        // Email validation
        if (rules.type === 'email' && value) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            errors.push({
              row: rowNumber,
              field: columnName,
              message: 'Format email tidak valid',
              value
            });
            hasError = true;
          }
        }

        // Length validation
        if (rules.minLength && value.length < rules.minLength) {
          errors.push({
            row: rowNumber,
            field: columnName,
            message: `${fieldName} minimal ${rules.minLength} karakter`,
            value
          });
          hasError = true;
        }

        if (rules.maxLength && value.length > rules.maxLength) {
          errors.push({
            row: rowNumber,
            field: columnName,
            message: `${fieldName} maksimal ${rules.maxLength} karakter`,
            value
          });
          hasError = true;
        }

        // Pattern validation
        if (rules.pattern && value) {
          const regex = new RegExp(rules.pattern);
          if (!regex.test(value)) {
            errors.push({
              row: rowNumber,
              field: columnName,
              message: `${fieldName} tidak sesuai format yang ditentukan`,
              value
            });
            hasError = true;
          }
        }
      }

      if (hasError) {
        invalidRows++;
      } else {
        validRows++;
      }
    }

    return {
      headers: Object.keys(data[0] || {}),
      data,
      totalRows: data.length,
      validRows,
      invalidRows,
      errors
    };
  }

  /**
   * Import data with progress callback
   */
  static async importData(
    file: File, 
    config: ImportConfig, 
    onProgress?: (progress: ImportProgress) => void
  ): Promise<ImportResult> {
    console.log('🚀 Starting import process with config:', config);
    
    try {
      // Simulate progress updates
      if (onProgress) {
        onProgress({
          current: 0,
          total: 100,
          percentage: 0,
          status: 'preparing',
          message: 'Menyiapkan file...',
          errors: []
        });
      }

      // Parse file
      console.log('📄 Parsing file:', file.name);
      const data = await this.parseFile(file, config.mapping);
      console.log('✅ File parsed successfully. Rows:', data.length);
      
      if (onProgress) {
        onProgress({
          current: 25,
          total: 100,
          percentage: 25,
          status: 'validating',
          message: 'Memvalidasi data...',
          errors: []
        });
      }

      // Validate data
      console.log('🔍 Validating data with rules:', config.validationRules);
      const validationRules = config.validationRules || {};
      const validationResult = await this.validateData(data, validationRules, config.mapping);
      console.log('✅ Validation complete. Valid rows:', validationResult.validRows, 'Invalid rows:', validationResult.invalidRows);

      if (onProgress) {
        onProgress({
          current: 50,
          total: 100,
          percentage: 50,
          status: 'importing',
          message: 'Mengimport data ke database...',
          errors: validationResult.errors
        });
      }

      // Check if validateOnly is enabled
      if (config.options.validateOnly) {
        console.log('📋 Validate only mode - skipping database import');
        return {
          success: true,
          totalRecords: validationResult.totalRows,
          successfulImports: validationResult.validRows,
          failedImports: validationResult.invalidRows,
          errors: validationResult.errors
        };
      }

      // Convert data to ParsedData format for enhanced import
      const parsedData: ParsedData = {
        headers: validationResult.headers,
        rows: data.map((row, index) => ({
          rowNumber: index + 1,
          data: row as Record<string, string>,
          errors: []
        })),
        totalRows: data.length
      };

      console.log('💾 Starting database import for event:', config.eventId);
      
      // Use enhanced import function for actual database operations
      const importResult = await this.importDataEnhanced(parsedData, config);
      
      console.log('✅ Database import completed:', {
        success: importResult.success,
        totalRecords: importResult.totalRecords,
        successfulImports: importResult.successfulImports,
        failedImports: importResult.failedImports,
        errors: importResult.errors.length
      });

      if (onProgress) {
        onProgress({
          current: 100,
          total: 100,
          percentage: 100,
          status: 'completed',
          message: `Import selesai! ${importResult.successfulImports} data berhasil diimport`,
          errors: importResult.errors
        });
      }

      return importResult;
    } catch (error) {
      console.error('❌ Import failed:', error);
      
      if (onProgress) {
        onProgress({
          current: 0,
          total: 100,
          percentage: 0,
          status: 'failed',
          message: 'Import gagal',
          errors: [{ row: 0, field: 'general', message: error instanceof Error ? error.message : 'Unknown error' }]
        });
      }
      throw error;
    }
  }

  /**
   * Parse CSV file content
   */
  static parseCSV(content: string): ParsedData {
    try {
      const lines = content.split('\n').filter(line => line.trim());
      if (lines.length === 0) {
        throw new Error('File is empty');
      }

      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const rows: ParsedRow[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) {
          console.log(`⏭️ Skipping empty line ${i + 1}`);
          continue;
        }

        const values = this.parseCSVLine(line);
        
        // Skip rows where all values are empty or whitespace
        if (values.every(value => !value || value.trim() === '')) {
          console.log(`⏭️ Skipping row ${i + 1} with all empty values`);
          continue;
        }
        
        const rowData: Record<string, string> = {};
        
        headers.forEach((header, index) => {
          rowData[header] = (values[index] || '').trim();
        });

        // Additional check: skip rows where all mapped fields are empty
        const hasAnyData = Object.values(rowData).some(value => value.trim() !== '');
        if (!hasAnyData) {
          console.log(`⏭️ Skipping row ${i + 1} with no meaningful data`);
          continue;
        }

        rows.push({
          rowNumber: i + 1,
          data: rowData,
          errors: []
        });
      }

      return {
        headers,
        rows,
        totalRows: rows.length
      };
    } catch (error) {
      console.error('Error parsing CSV:', error);
      throw new Error(`Failed to parse CSV file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse Excel file content
   */
  static parseExcel(file: File): Promise<ParsedData> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][];
          
          if (jsonData.length === 0) {
            throw new Error('Excel file is empty');
          }

          const headers = jsonData[0].map(h => String(h).trim());
          const rows: ParsedRow[] = [];

          for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            
            // Skip empty rows - check if row is null/undefined or if all cells are empty/whitespace
            if (!row || row.every(cell => !cell || (typeof cell === 'string' && cell.trim() === ''))) {
              console.log(`⏭️ Skipping empty row ${i + 1}`);
              continue;
            }

            const rowData: Record<string, string> = {};
            headers.forEach((header, index) => {
              rowData[header] = String(row[index] || '').trim();
            });

            // Additional check: skip rows where all mapped fields are empty
            const hasAnyData = Object.values(rowData).some(value => value.trim() !== '');
            if (!hasAnyData) {
              console.log(`⏭️ Skipping row ${i + 1} with no meaningful data`);
              continue;
            }

            rows.push({
              rowNumber: i + 1,
              data: rowData,
              errors: []
            });
          }

          resolve({
            headers,
            rows,
            totalRows: rows.length
          });
        } catch (error) {
          console.error('Error parsing Excel:', error);
          reject(new Error(`Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
      };

      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Parse CSV line with proper comma handling
   */
  private static parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++; // Skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  }

  /**
   * Enhanced data validation with flexible field mapping
   */
  static async validateDataEnhanced(data: ParsedData, eventId: string, mapping: FieldMapping, validationRules?: Record<string, ValidationRule>): Promise<ValidationResult> {
    const errors: ImportError[] = [];
    const warnings: ImportError[] = [];

    try {
      // Get event configuration
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('id, name, custom_fields, max_participants')
        .eq('id', eventId)
        .single();

      if (eventError || !eventData) {
        throw new Error('Event not found');
      }

      const customFields = eventData.custom_fields as Array<{ name: string; label: string; required?: boolean }> || [];

      // Validate each row
      for (const row of data.rows) {
        const rowErrors: ImportError[] = [];

        // Validate each mapped field based on validation rules
        for (const [fieldName, columnName] of Object.entries(mapping)) {
          const value = row.data[columnName];
          const fieldRule = validationRules?.[fieldName];

          // Check required fields
          if (fieldRule?.required && !value) {
            rowErrors.push({
              row: row.rowNumber,
              field: columnName,
              message: `Field ${fieldName} wajib diisi`,
              value: value
            });
            continue;
          }

          // Skip validation if no value and not required
          if (!value) continue;

          // Validate field type
          switch (fieldRule?.type) {
            case 'email':
              if (!emailRegex.test(value)) {
                rowErrors.push({
                  row: row.rowNumber,
                  field: columnName,
                  message: 'Format email tidak valid',
                  value: value
                });
              }
              break;
            case 'phone':
              if (!phoneRegex.test(value)) {
                rowErrors.push({
                  row: row.rowNumber,
                  field: columnName,
                  message: 'Format nomor telepon tidak valid',
                  value: value
                });
              }
              break;
            case 'number':
              if (isNaN(Number(value))) {
                rowErrors.push({
                  row: row.rowNumber,
                  field: columnName,
                  message: 'Format angka tidak valid',
                  value: value
                });
              }
              break;
            case 'date':
              if (isNaN(Date.parse(value))) {
                rowErrors.push({
                  row: row.rowNumber,
                  field: columnName,
                  message: 'Format tanggal tidak valid',
                  value: value
                });
              }
              break;
          }

          // Validate length constraints
          if (fieldRule?.minLength && value.length < fieldRule.minLength) {
            rowErrors.push({
              row: row.rowNumber,
              field: columnName,
              message: `Minimal ${fieldRule.minLength} karakter`,
              value: value
            });
          }

          if (fieldRule?.maxLength && value.length > fieldRule.maxLength) {
            rowErrors.push({
              row: row.rowNumber,
              field: columnName,
              message: `Maksimal ${fieldRule.maxLength} karakter`,
              value: value
            });
          }

          // Validate pattern if provided
          if (fieldRule?.pattern) {
            const regex = new RegExp(fieldRule.pattern);
            if (!regex.test(value)) {
              rowErrors.push({
                row: row.rowNumber,
                field: columnName,
                message: 'Format tidak sesuai dengan pola yang ditentukan',
                value: value
              });
            }
          }

          // Custom validation
          if (fieldRule?.custom) {
            const customResult = fieldRule.custom(value);
            if (customResult !== true) {
              rowErrors.push({
                row: row.rowNumber,
                field: columnName,
                message: typeof customResult === 'string' ? customResult : 'Validasi kustom gagal',
                value: value
              });
            }
          }
        }

        // Check for duplicate emails in current import
        const emailFields = Object.entries(mapping).filter(([fieldName, _]) => 
          validationRules?.[fieldName]?.type === 'email'
        );

        for (const [fieldName, columnName] of emailFields) {
          const email = row.data[columnName];
          if (email) {
            const duplicateCount = data.rows.filter(r => 
              r.rowNumber !== row.rowNumber && 
              r.data[columnName] === email
            ).length;
            
            if (duplicateCount > 0) {
              warnings.push({
                row: row.rowNumber,
                field: columnName,
                message: `Email ${email} duplikat dalam file import`,
                value: email
              });
            }
          }
        }

        row.errors = rowErrors;
        errors.push(...rowErrors);
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };
    } catch (error) {
      console.error('Error validating data:', error);
      throw new Error(`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Import data to database (enhanced version)
   */
  static async importDataEnhanced(data: ParsedData, config: ImportConfig): Promise<ImportResult> {
    const { eventId, mapping, options } = config;
    let successfulImports = 0;
    let failedImports = 0;
    const errors: ImportError[] = [];

    console.log('🚀 Starting enhanced import for event:', eventId);
    console.log('📊 Total rows to process:', data.totalRows);
    console.log('⚙️ Import options:', options);
    console.log('🗺️ Field mapping:', mapping);
    console.log('📋 Sample data row:', data.rows[0]?.data);
    console.log('🔍 skipDuplicates option:', options.skipDuplicates);
    console.log('📋 Data headers:', data.headers);
    console.log('📋 Available columns in first row:', Object.keys(data.rows[0]?.data || {}));

    // Validate eventId
    if (!eventId) {
      return {
        success: false,
        totalRecords: data.totalRows,
        successfulImports: 0,
        failedImports: data.totalRows,
        errors: [{
          row: 0,
          field: 'eventId',
          message: 'Event ID is required',
          value: ''
        }]
      };
    }

    // Create import log
    let importLogId: string | undefined;
    try {
      const { data: logData, error: logError } = await supabase
        .from('import_logs')
        .insert([{
          event_id: eventId,
          total_records: data.totalRows,
          status: 'processing',
          options: {
            skipDuplicates: options.skipDuplicates,
            defaultStatus: options.defaultStatus,
            sendEmails: options.sendEmails,
            validateOnly: options.validateOnly
          }
        }])
        .select('id')
        .single();

      if (logError) {
        console.error('❌ Error creating import log:', logError);
        console.log('⚠️ Continuing without import log...');
      } else {
        importLogId = logData.id;
        console.log('📝 Created import log:', importLogId);
      }
    } catch (error) {
      console.error('❌ Error creating import log:', error);
      console.log('⚠️ Continuing without import log...');
    }

    // Check for existing registrations if skipDuplicates is enabled
    if (options.skipDuplicates) {
      console.log('🔍 Checking for duplicates with skipDuplicates enabled...');
      console.log('📋 Current mapping:', mapping);
      
      // If mapping is empty, try to auto-detect from data headers
      if (!mapping || Object.keys(mapping).length === 0) {
        console.log('⚠️ Mapping is empty, attempting auto-detection from data headers...');
        const dataHeaders = data.headers || Object.keys(data.rows[0]?.data || {});
        
        dataHeaders.forEach(header => {
          const headerLower = header.toLowerCase();
          if (headerLower.includes('nama') || headerLower.includes('name')) {
            mapping.participant_name = header;
          } else if (headerLower.includes('email') || headerLower.includes('mail')) {
            mapping.participant_email = header;
          } else if (headerLower.includes('phone') || headerLower.includes('telepon') || headerLower.includes('hp')) {
            mapping.phone_number = header;
          }
        });
        
        console.log('✅ Auto-detected mapping:', mapping);
      }
      
      // Find email fields in the mapping - improved detection
      const emailFields = Object.entries(mapping).filter(([fieldName, columnName]) => {
        const fieldNameLower = fieldName.toLowerCase();
        const columnNameLower = columnName.toLowerCase();
        const isEmailField = fieldNameLower.includes('email') || 
               fieldNameLower.includes('mail') ||
               columnNameLower.includes('email') || 
               columnNameLower.includes('mail');
        
        console.log(`🔍 Checking field: ${fieldName} -> ${columnName} (isEmail: ${isEmailField})`);
        return isEmailField;
      });

      console.log('📧 Detected email fields:', emailFields.map(([field, col]) => `${field} -> ${col}`));
      console.log('📋 All mapping entries:', Object.entries(mapping).map(([field, col]) => `${field} -> ${col}`));

      console.log('📧 Detected email fields:', emailFields);
      console.log('📋 All mapping entries:', Object.entries(mapping));

      // Auto-detect email field if not found in mapping
      if (emailFields.length === 0) {
        console.log('⚠️ No email fields found in mapping, attempting auto-detection...');
        
        // Look for email fields in the data headers
        const dataHeaders = data.headers || Object.keys(data.rows[0]?.data || {});
        console.log('📋 Data headers:', dataHeaders);
        
        const autoDetectedEmailFields = dataHeaders.filter(header => {
          const headerLower = header.toLowerCase();
          return headerLower.includes('email') || headerLower.includes('mail');
        });
        
        console.log('🔍 Auto-detected email fields:', autoDetectedEmailFields);
        
        if (autoDetectedEmailFields.length > 0) {
          // Add auto-detected email field to mapping
          const emailField = autoDetectedEmailFields[0];
          mapping.participant_email = emailField;
          console.log('✅ Added auto-detected email field to mapping:', { participant_email: emailField });
        } else {
          console.log('❌ No email fields found in data headers either');
        }
      }

      // If we have email fields, check for duplicates
      if (emailFields.length > 0) {
        console.log('🔍 Email field found, checking for existing registrations...');
        
        // Extract emails from the data
        const [emailFieldKey, emailColumnName] = emailFields[0];
        
        console.log('📧 Using email field:', { fieldKey: emailFieldKey, columnName: emailColumnName });
        console.log('📧 Sample email values from first 5 rows:');
        data.rows.slice(0, 5).forEach((row, index) => {
          console.log(`  Row ${index + 1}: "${row.data[emailColumnName]}"`);
        });
        
        const emailsToCheck = data.rows
          .map(row => row.data[emailColumnName])
          .filter(email => email && email.trim())
          .map(email => email.toLowerCase().trim());

        // Also get the original emails for comparison
        const originalEmails = data.rows
          .map(row => row.data[emailColumnName])
          .filter(email => email && email.trim());

        console.log('📧 Emails to check for duplicates:', emailsToCheck.slice(0, 5), emailsToCheck.length > 5 ? `... and ${emailsToCheck.length - 5} more` : '');
        console.log('📧 Total emails to check:', emailsToCheck.length);

        if (emailsToCheck.length > 0) {
          try {
            console.log('🔍 Querying database for existing registrations...');
            console.log('📧 Query parameters:', { eventId, emailsToCheck: emailsToCheck.slice(0, 5) });
            
            // Use a more robust query to check for existing emails
            // Check for existing registrations
            const { data: existingRegistrations, error: existingError } = await supabase
              .from('registrations')
              .select('participant_email')
              .eq('event_id', eventId);

            if (existingError) {
              console.error('❌ Error checking existing registrations:', existingError);
            } else {
              console.log('✅ Database query successful');
              console.log('📧 Raw existing registrations:', existingRegistrations);
              
              const existingEmails = new Set(existingRegistrations?.map(r => r.participant_email.toLowerCase().trim()) || []);
              const existingEmailsOriginal = new Set(existingRegistrations?.map(r => r.participant_email) || []);
              console.log(`📋 Found ${existingEmails.size} existing registrations for this event`);
              console.log('📧 Existing emails:', Array.from(existingEmails).slice(0, 5), existingEmails.size > 5 ? `... and ${existingEmails.size - 5} more` : '');

              // Filter out rows that already exist
              console.log('🔍 Starting to filter out existing registrations...');
              const filteredRows = data.rows.filter((row, index) => {
                const email = row.data[emailColumnName]?.toLowerCase().trim();
                const emailOriginal = row.data[emailColumnName];
                const name = row.data[mapping.participant_name || 'name'] || 'Unknown';
                
                // Check both case-sensitive and case-insensitive matches
                const isDuplicate = (email && existingEmails.has(email)) || 
                                   (emailOriginal && existingEmailsOriginal.has(emailOriginal));
                
                if (isDuplicate) {
                  console.log(`❌ Registration already exists: ${name} (${emailOriginal}) - filtering out row ${index + 1}`);
                  failedImports++;
                  errors.push({
                    row: index + 1,
                    field: 'participant_email',
                    message: 'Email sudah terdaftar untuk event ini',
                    value: emailOriginal
                  });
                  return false;
                } else {
                  console.log(`✅ Email not found in database: ${emailOriginal} (${name}) - keeping row ${index + 1}`);
                  return true;
                }
              });

              console.log(`📋 Filtered data: ${filteredRows.length}/${data.rows.length} rows after duplicate check`);
              console.log('📋 First 5 filtered rows:', filteredRows.slice(0, 5).map(row => ({
                name: row.data[mapping.participant_name || 'name'],
                email: row.data[emailColumnName]
              })));
              
              // Update the data to use filtered rows
              data.rows = filteredRows;
              data.totalRows = filteredRows.length;
            }
          } catch (error) {
            console.error('❌ Error checking existing registrations:', error);
          }
        }
      } else {
        console.log('⚠️ No email field found in mapping, skipping duplicate check');
        console.log('📋 Available mapping keys:', Object.keys(mapping));
        console.log('📋 Mapping entries that might be email fields:');
        Object.entries(mapping).forEach(([key, value]) => {
          const keyLower = key.toLowerCase();
          const valueLower = value.toLowerCase();
          console.log(`  ${key} -> ${value} (key has email: ${keyLower.includes('email')}, value has email: ${valueLower.includes('email')})`);
        });
      }
    } else {
      console.log('📝 skipDuplicates disabled - skipping duplicate check');
    }

    try {
      console.log('💾 Inserting registrations to database...');
      console.log(`📊 Processing ${data.rows.length} rows for import`);
      
      // Insert registrations one by one to handle individual errors
      const insertedRegistrations = [];
      const insertErrors = [];
      
      for (let i = 0; i < data.rows.length; i++) {
        const row = data.rows[i];
        let retryCount = 0;
        const maxRetries = 2;
        
        // Transform row data to registration format with enhanced field mapping
        const registration = {
          event_id: eventId,
          participant_name: '',
          participant_email: '',
          phone_number: null,
          status: options.defaultStatus,
          custom_data: {} as Record<string, any>,
          registered_at: new Date().toISOString()
        };

        // Enhanced field mapping with multiple strategies
        for (const [fieldName, columnName] of Object.entries(mapping)) {
          const value = row.data[columnName] || '';
          
          console.log(`🔍 Mapping field: ${fieldName} -> ${columnName} = "${value}"`);
          
          // Strategy 1: Direct field mapping
          if (fieldName === 'participant_name' || fieldName === 'name') {
            registration.participant_name = value;
            console.log(`✅ Mapped to participant_name: "${value}"`);
          } else if (fieldName === 'participant_email' || fieldName === 'email') {
            registration.participant_email = value;
            console.log(`✅ Mapped to participant_email: "${value}"`);
          } else if (fieldName === 'phone_number' || fieldName === 'phone') {
            registration.phone_number = value;
            console.log(`✅ Mapped to phone_number: "${value}"`);
          } else {
            // Strategy 2: Column name-based mapping for generic field names
            const columnNameLower = columnName.toLowerCase();
            if (columnNameLower.includes('nama') || columnNameLower.includes('name')) {
              registration.participant_name = value;
              console.log(`✅ Mapped to participant_name (by column): "${value}"`);
            } else if (columnNameLower.includes('email') || columnNameLower.includes('mail')) {
              registration.participant_email = value;
              console.log(`✅ Mapped to participant_email (by column): "${value}"`);
            } else if (columnNameLower.includes('telepon') || columnNameLower.includes('phone') || 
                       columnNameLower.includes('hp') || columnNameLower.includes('whatsapp')) {
              registration.phone_number = value;
              console.log(`✅ Mapped to phone_number (by column): "${value}"`);
            } else {
              // Strategy 3: Store as custom data
              registration.custom_data[fieldName] = value;
              console.log(`📦 Stored as custom_data[${fieldName}]: "${value}"`);
            }
          }
        }

        console.log(`📋 Row ${i + 1} mapping result:`, {
          name: registration.participant_name,
          email: registration.participant_email,
          phone: registration.phone_number,
          customData: registration.custom_data
        });

        // Skip rows with empty required fields
        if (!registration.participant_name.trim() || !registration.participant_email.trim()) {
          console.log(`⏭️ Skipping row ${i + 1} - missing required fields (name: "${registration.participant_name}", email: "${registration.participant_email}")`);
          console.log(`📋 Row data:`, row.data);
          console.log(`🗺️ Mapping:`, mapping);
          insertErrors.push({
            row: i + 1,
            field: 'validation',
            message: 'Missing required fields (name or email)',
            value: `Name: "${registration.participant_name}", Email: "${registration.participant_email}"`
          });
          failedImports++;
          continue;
        }
        
        while (retryCount <= maxRetries) {
          try {
            console.log(`🔄 Inserting registration ${i + 1} (attempt ${retryCount + 1}):`, {
              name: registration.participant_name,
              email: registration.participant_email
            });

            const { data: inserted, error: insertError } = await supabase
              .from('registrations')
              .insert([registration])
              .select('id, participant_email, participant_name')
              .single();

            if (insertError) {
              console.error(`❌ Database insert error for registration ${i + 1} (attempt ${retryCount + 1}):`, insertError);
              
              // Use the helper function for better error handling
              const errorMessage = handleSupabaseError(insertError, `Insert registration ${i + 1}`);
              
              // If it's a capacity error or unique constraint, don't retry
              if (insertError.code === '23505' || insertError.message.includes('capacity')) {
                insertErrors.push({
                  row: i + 1,
                  field: 'database',
                  message: errorMessage,
                  value: `${registration.participant_name} (${registration.participant_email})`
                });
                failedImports++;
                break;
              }
              
              // Retry for other errors
              if (retryCount < maxRetries) {
                retryCount++;
                console.log(`🔄 Retrying registration ${i + 1} (attempt ${retryCount + 1})...`);
                await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // Exponential backoff
                continue;
              } else {
                insertErrors.push({
                  row: i + 1,
                  field: 'database',
                  message: errorMessage,
                  value: `${registration.participant_name} (${registration.participant_email})`
                });
                failedImports++;
              }
            } else {
              insertedRegistrations.push(inserted);
              successfulImports++;
              console.log(`✅ Successfully inserted registration ${i + 1}:`, {
                id: inserted.id,
                email: inserted.participant_email,
                name: inserted.participant_name
              });
              break; // Success, exit retry loop
            }
          } catch (singleError) {
            console.error(`❌ Error inserting registration ${i + 1} (attempt ${retryCount + 1}):`, singleError);
            
            if (retryCount < maxRetries) {
              retryCount++;
              console.log(`🔄 Retrying registration ${i + 1} (attempt ${retryCount + 1})...`);
              await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // Exponential backoff
              continue;
            } else {
              insertErrors.push({
                row: i + 1,
                field: 'database',
                message: `Insert error: ${singleError instanceof Error ? singleError.message : 'Unknown error'}`,
                value: `${registration.participant_name} (${registration.participant_email})`
              });
              failedImports++;
            }
          }
        }
      }
      
      // Add all insert errors to the errors array
      errors.push(...insertErrors);
      
      console.log(`📊 Insert summary: ${successfulImports} successful, ${failedImports} failed`);
      
      // Log detailed information about failed imports
      if (insertErrors.length > 0) {
        console.log('❌ Failed imports details:');
        insertErrors.forEach(error => {
          console.log(`  Row ${error.row}: ${error.message} - ${error.value}`);
        });
      }
      
    } catch (error) {
      console.error('❌ Error in batch processing:', error);
      failedImports += data.rows.length;
      errors.push({
        row: 0,
        field: 'batch',
        message: `Batch processing error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        value: ''
      });
    }

    console.log(`📊 Batch processing complete: ${successfulImports} successful, ${failedImports} failed`);
    // Create a summary of failed imports for export
    const failedImportData = errors.map(error => {
      const originalRow = data.rows[error.row - 1]; // Convert to 0-based index
      const failedData = {
        row_number: error.row,
        name: originalRow?.data[mapping.participant_name || 'name'] || 'Unknown',
        email: originalRow?.data[mapping.participant_email || 'email'] || 'Unknown',
        phone: originalRow?.data[mapping.phone_number || 'phone'] || '',
        error_message: error.message,
        error_field: error.field,
        original_data: originalRow?.data || {}
      };
      console.log(`📋 Created failed import data for row ${error.row}:`, failedData);
      return failedData;
    });

    console.log(`📊 Total failedImportData created: ${failedImportData.length}`);

    console.log(`📊 Import Summary:`);
    console.log(`  Total rows in file: ${data.totalRows}`);
    console.log(`  Successfully imported: ${successfulImports}`);
    console.log(`  Failed to import: ${failedImports}`);
    console.log(`  Duplicates skipped: ${data.totalRows - successfulImports - failedImports}`);
    
    if (failedImportData.length > 0) {
      console.log(`📋 Failed imports that need attention:`);
      failedImportData.forEach(item => {
        console.log(`  Row ${item.row_number}: ${item.name} (${item.email}) - ${item.error_message}`);
      });
    }

    const result = { 
      success: failedImports === 0,
      totalRecords: data.totalRows,
      successfulImports, 
      failedImports, 
      errors,
      importLogId,
      failedImportData // Add this for potential export functionality
    };

    console.log(`📊 Final result object:`, {
      success: result.success,
      totalRecords: result.totalRecords,
      successfulImports: result.successfulImports,
      failedImports: result.failedImports,
      errorsCount: result.errors.length,
      failedImportDataCount: result.failedImportData?.length || 0
    });

    return result;
  }

  /**
   * Process a batch of registrations
   */
  private static async processBatch(batch: ParsedRow[], config: ImportConfig): Promise<{
    successful: number;
    failed: number;
    errors: ImportError[];
  }> {
    const { eventId, mapping, options } = config;
    let successful = 0;
    let failed = 0;
    const errors: ImportError[] = [];

    console.log('🔄 processBatch called with config:', {
      eventId,
      mapping,
      options,
      batchSize: batch.length
    });
    console.log('🔍 skipDuplicates option:', options.skipDuplicates);
    console.log('📋 Field mapping keys:', Object.keys(mapping));
    console.log('📋 Sample batch row data keys:', Object.keys(batch[0]?.data || {}));

    // Validate eventId
    if (!eventId || eventId.trim() === '') {
      console.error('❌ Event ID is required for batch processing');
      return { successful: 0, failed: batch.length, errors: [{
        row: 0,
        field: 'event_id',
        message: 'Event ID is required for import',
        value: eventId
      }] };
    }

    // Check event capacity before processing
    try {
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('id, name, max_participants, registration_status')
        .eq('id', eventId)
        .single();

      if (eventError || !event) {
        console.error('❌ Event not found:', eventError);
        return { successful: 0, failed: batch.length, errors: [{
          row: 0,
          field: 'event_id',
          message: 'Event not found or access denied',
          value: eventId
        }] };
      }

      // Check if registration is open
      if (event.registration_status === 'closed') {
        console.error('❌ Event registration is closed');
        return { successful: 0, failed: batch.length, errors: [{
          row: 0,
          field: 'event_id',
          message: 'Event registration is closed',
          value: eventId
        }] };
      }

      // Check current registration count
      const { count: currentCount, error: countError } = await supabase
        .from('registrations')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', eventId);

      if (countError) {
        console.error('❌ Error checking current registration count:', countError);
      } else {
        console.log(`📊 Current registrations: ${currentCount}, Max capacity: ${event.max_participants}`);
        
        // Check if batch would exceed capacity
        if (event.max_participants && currentCount + batch.length > event.max_participants) {
          const availableSlots = event.max_participants - currentCount;
          console.error(`❌ Batch would exceed capacity. Available: ${availableSlots}, Requested: ${batch.length}`);
          
          // Process only what fits
          if (availableSlots > 0) {
            console.log(`⚠️ Processing only ${availableSlots} registrations to fit capacity`);
            batch = batch.slice(0, availableSlots);
          } else {
            return { successful: 0, failed: batch.length, errors: [{
              row: 0,
              field: 'capacity',
              message: `Event has reached maximum capacity (${event.max_participants}). Cannot register more participants.`,
              value: `Current: ${currentCount}, Max: ${event.max_participants}`
            }] };
          }
        }
      }
    } catch (error) {
      console.error('❌ Error checking event capacity:', error);
      return { successful: 0, failed: batch.length, errors: [{
        row: 0,
        field: 'capacity_check',
        message: 'Error checking event capacity',
        value: error instanceof Error ? error.message : 'Unknown error'
      }] };
    }

    console.log('🔄 Processing batch with mapping:', mapping);
    console.log('📊 Batch size:', batch.length);

    // Prepare registrations data
    const registrations = batch.map((row, index) => {
      console.log(`📝 Processing row ${index + 1}:`, row.data);
      
      // Create base registration object
      const registration: {
        event_id: string;
        participant_name: string;
        participant_email: string;
        status: string;
        registered_at: string;
        phone_number?: string;
        custom_data?: Record<string, unknown>;
      } = {
        event_id: eventId,
        participant_name: '',
        participant_email: '',
        status: options.defaultStatus,
        registered_at: new Date().toISOString()
      };

      // Map fields using flexible field mapping
      for (const [fieldName, columnName] of Object.entries(mapping)) {
        const value = row.data[columnName] || '';
        
        console.log(`🔍 Mapping field: ${fieldName} -> ${columnName} = "${value}"`);
        
        // Enhanced field detection with multiple strategies
        const fieldNameLower = fieldName.toLowerCase();
        const columnNameLower = columnName.toLowerCase();
        
        // Strategy 1: Check field name patterns
        if (fieldNameLower.includes('nama') || fieldNameLower.includes('name') || 
            columnNameLower.includes('nama') || columnNameLower.includes('name')) {
          registration.participant_name = value;
          console.log(`✅ Mapped to participant_name: "${value}"`);
        } else if (fieldNameLower.includes('email') || fieldNameLower.includes('mail') || 
                   columnNameLower.includes('email') || columnNameLower.includes('mail')) {
          registration.participant_email = value;
          console.log(`✅ Mapped to participant_email: "${value}"`);
        } else if (fieldNameLower.includes('phone') || fieldNameLower.includes('telepon') || fieldNameLower.includes('hp') || fieldNameLower.includes('whatsapp') || 
                   columnNameLower.includes('phone') || columnNameLower.includes('telepon') || columnNameLower.includes('hp') || columnNameLower.includes('whatsapp')) {
          registration.phone_number = value;
          console.log(`✅ Mapped to phone_number: "${value}"`);
        } else {
          // Strategy 2: Check column name patterns if field name is generic
          if (columnNameLower.includes('nama') || columnNameLower.includes('name')) {
            registration.participant_name = value;
            console.log(`✅ Mapped to participant_name (by column): "${value}"`);
          } else if (columnNameLower.includes('email') || columnNameLower.includes('mail')) {
            registration.participant_email = value;
            console.log(`✅ Mapped to participant_email (by column): "${value}"`);
          } else if (columnNameLower.includes('phone') || columnNameLower.includes('telepon') || columnNameLower.includes('hp') || columnNameLower.includes('whatsapp')) {
            registration.phone_number = value;
            console.log(`✅ Mapped to phone_number (by column): "${value}"`);
          } else {
            // Strategy 3: Content-based detection for generic field names
            if (fieldNameLower.includes('field_') || fieldNameLower.includes('field')) {
              // For generic field names, try to detect based on content and column name
              if (columnNameLower === 'nama' || columnNameLower === 'name') {
                registration.participant_name = value;
                console.log(`✅ Mapped to participant_name (generic field): "${value}"`);
              } else if (columnNameLower === 'email' || columnNameLower === 'mail') {
                registration.participant_email = value;
                console.log(`✅ Mapped to participant_email (generic field): "${value}"`);
              } else if (columnNameLower.includes('telepon') || columnNameLower.includes('phone') || columnNameLower.includes('hp') || columnNameLower.includes('whatsapp')) {
                registration.phone_number = value;
                console.log(`✅ Mapped to phone_number (generic field): "${value}"`);
              } else {
                // Store as custom data
                if (!registration.custom_data) {
                  registration.custom_data = {};
                }
                registration.custom_data[fieldName] = value;
                console.log(`📦 Stored as custom_data[${fieldName}]: "${value}"`);
              }
            } else {
              // Store as custom data
              if (!registration.custom_data) {
                registration.custom_data = {};
              }
              registration.custom_data[fieldName] = value;
              console.log(`📦 Stored as custom_data[${fieldName}]: "${value}"`);
            }
          }
        }
      }

      console.log(`✅ Row ${index + 1} mapped:`, {
        name: registration.participant_name,
        email: registration.participant_email,
        phone: registration.phone_number,
        customData: registration.custom_data,
        rawData: row.data
      });

      return registration;
    });

    // Filter out registrations with missing required fields
    const validRegistrations = registrations.filter((reg, index) => {
      // Validate participant_name (required)
      if (!reg.participant_name || !reg.participant_name.trim()) {
        console.log(`❌ Invalid registration ${index + 1} (missing name):`, reg);
        failed++;
        errors.push({
          row: index + 1,
          field: 'participant_name',
          message: 'Nama peserta wajib diisi',
          value: JSON.stringify(reg)
        });
        return false;
      }

      // Validate email format if provided
      if (reg.participant_email && reg.participant_email.trim()) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(reg.participant_email)) {
          console.log(`❌ Invalid registration ${index + 1} (invalid email):`, reg);
          failed++;
          errors.push({
            row: index + 1,
            field: 'participant_email',
            message: 'Format email tidak valid',
            value: reg.participant_email
          });
          return false;
        }
      }

      // Generate email if not provided (for system compatibility)
      if (!reg.participant_email || !reg.participant_email.trim()) {
        // Generate a default email based on name and event ID
        const sanitizedName = reg.participant_name
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '')
          .substring(0, 20);
        const eventIdShort = eventId.substring(0, 8);
        reg.participant_email = `${sanitizedName}.${eventIdShort}@imported.local`;
        console.log(`📧 Generated email for ${reg.participant_name}: ${reg.participant_email}`);
      }

      // Validate phone number format if provided
      if (reg.phone_number && reg.phone_number.trim()) {
        const phoneRegex = /^[\+]?[0-9\s\-\(\)]{8,}$/;
        if (!phoneRegex.test(reg.phone_number.replace(/\s/g, ''))) {
          console.log(`⚠️ Warning: Invalid phone format for ${reg.participant_name}: ${reg.phone_number}`);
          // Don't fail the import, just log a warning
        }
      }

      console.log(`✅ Valid registration ${index + 1}:`, {
        name: reg.participant_name,
        email: reg.participant_email,
        phone: reg.phone_number
      });

      return true;
    });

    console.log(`📋 Valid registrations: ${validRegistrations.length}/${registrations.length}`);

    if (validRegistrations.length === 0) {
      console.log('⚠️ No valid registrations to insert');
      return { successful: 0, failed: registrations.length, errors };
    }

    // Check for duplicate emails within the batch
    const emailMap = new Map<string, number>();
    const duplicateEmails = new Set<string>();
    
    validRegistrations.forEach((reg, index) => {
      const email = reg.participant_email.toLowerCase().trim();
      if (emailMap.has(email)) {
        duplicateEmails.add(email);
        console.log(`❌ Duplicate email in batch: ${email} at rows ${emailMap.get(email)! + 1} and ${index + 1}`);
      } else {
        emailMap.set(email, index);
      }
    });

    // Remove duplicates from the batch (keep first occurrence)
    const uniqueRegistrations = validRegistrations.filter((reg, index) => {
      const email = reg.participant_email.toLowerCase().trim();
      if (duplicateEmails.has(email) && emailMap.get(email) !== index) {
        console.log(`🗑️ Removing duplicate registration: ${reg.participant_name} (${email})`);
        failed++;
        errors.push({
          row: index + 1,
          field: 'participant_email',
          message: 'Email duplikat dalam batch import',
          value: email
        });
        return false;
      }
      return true;
    });

    console.log(`📋 Unique registrations after duplicate check: ${uniqueRegistrations.length}/${validRegistrations.length}`);

    if (uniqueRegistrations.length === 0) {
      console.log('⚠️ No unique registrations to insert after duplicate check');
      return { successful: 0, failed: registrations.length, errors };
    }

    // Check for existing registrations in database to prevent conflicts (only if skipDuplicates is enabled)
    if (options.skipDuplicates) {
      console.log('🔍 skipDuplicates enabled - checking for existing registrations in database...');
      try {
        const emailsToCheck = uniqueRegistrations.map(reg => reg.participant_email.toLowerCase().trim());
        console.log('🔍 Checking for existing registrations in database...');
        console.log('📧 Emails to check:', emailsToCheck);
        
        const { data: existingRegistrations, error: existingError } = await supabase
          .from('registrations')
          .select('participant_email')
          .eq('event_id', eventId)
          .in('participant_email', emailsToCheck);

        if (existingError) {
          console.error('❌ Error checking existing registrations:', existingError);
        } else {
          const existingEmails = new Set(existingRegistrations?.map(r => r.participant_email.toLowerCase().trim()) || []);
          console.log(`📋 Found ${existingEmails.size} existing registrations for this event`);
          console.log('📧 Existing emails in database:', Array.from(existingEmails));

          // Filter out registrations that already exist
          const newRegistrations = uniqueRegistrations.filter((reg, index) => {
            const email = reg.participant_email.toLowerCase().trim();
            const exists = existingEmails.has(email);
            if (exists) {
              console.log(`❌ Registration already exists: ${reg.participant_name} (${email})`);
              failed++;
              errors.push({
                row: index + 1,
                field: 'participant_email',
                message: 'Email sudah terdaftar untuk event ini',
                value: email
              });
              return false;
            } else {
              console.log(`✅ Email not found in database: ${email}`);
              return true;
            }
          });

          console.log(`📋 New registrations after existing check: ${newRegistrations.length}/${uniqueRegistrations.length}`);

          if (newRegistrations.length === 0) {
            console.log('⚠️ No new registrations to insert after existing check');
            return { successful: 0, failed: registrations.length, errors };
          }

          // Update the registrations to process
          uniqueRegistrations.length = 0;
          uniqueRegistrations.push(...newRegistrations);
        }
      } catch (error) {
        console.error('❌ Error checking existing registrations:', error);
        // Continue with the import even if we can't check existing registrations
      }
    } else {
      console.log('📝 skipDuplicates disabled - skipping database duplicate check');
    }

    try {
      console.log('💾 Inserting registrations to database...');
      
      // Insert registrations one by one to handle individual errors
      const insertedRegistrations = [];
      const insertErrors = [];
      
      for (let i = 0; i < uniqueRegistrations.length; i++) {
        const registration = uniqueRegistrations[i];
        let retryCount = 0;
        const maxRetries = 2;
        
        while (retryCount <= maxRetries) {
          try {
            console.log(`🔄 Inserting registration ${i + 1} (attempt ${retryCount + 1}):`, {
              name: registration.participant_name,
              email: registration.participant_email
            });

            const { data: inserted, error: insertError } = await supabase
              .from('registrations')
              .insert([registration])
              .select('id, participant_email, participant_name')
              .single();

            if (insertError) {
              console.error(`❌ Database insert error for registration ${i + 1} (attempt ${retryCount + 1}):`, insertError);
              
              // Use the helper function for better error handling
              const errorMessage = handleSupabaseError(insertError, `Insert registration ${i + 1}`);
              
              // If it's a capacity error or unique constraint, don't retry
              if (insertError.code === '23505' || insertError.message.includes('capacity')) {
                insertErrors.push({
                  row: i + 1,
                  field: 'database',
                  message: errorMessage,
                  value: `${registration.participant_name} (${registration.participant_email})`
                });
                failed++;
                break;
              }
              
              // Retry for other errors
              if (retryCount < maxRetries) {
                retryCount++;
                console.log(`🔄 Retrying registration ${i + 1} (attempt ${retryCount + 1})...`);
                await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // Exponential backoff
                continue;
              } else {
                insertErrors.push({
                  row: i + 1,
                  field: 'database',
                  message: errorMessage,
                  value: `${registration.participant_name} (${registration.participant_email})`
                });
                failed++;
              }
            } else {
              insertedRegistrations.push(inserted);
              successful++;
              console.log(`✅ Successfully inserted registration ${i + 1}:`, {
                id: inserted.id,
                email: inserted.participant_email,
                name: inserted.participant_name
              });
              break; // Success, exit retry loop
            }
          } catch (singleError) {
            console.error(`❌ Error inserting registration ${i + 1} (attempt ${retryCount + 1}):`, singleError);
            
            if (retryCount < maxRetries) {
              retryCount++;
              console.log(`🔄 Retrying registration ${i + 1} (attempt ${retryCount + 1})...`);
              await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // Exponential backoff
              continue;
            } else {
              insertErrors.push({
                row: i + 1,
                field: 'database',
                message: `Insert error: ${singleError instanceof Error ? singleError.message : 'Unknown error'}`,
                value: `${registration.participant_name} (${registration.participant_email})`
              });
              failed++;
            }
          }
        }
      }
      
      // Add all insert errors to the errors array
      errors.push(...insertErrors);
      
      console.log(`📊 Insert summary: ${successful} successful, ${failed} failed`);
      
    } catch (error) {
      console.error('❌ Error in batch processing:', error);
      failed += validRegistrations.length;
      errors.push({
        row: 0,
        field: 'batch',
        message: `Batch processing error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        value: ''
      });
    }

    console.log(`📊 Batch processing complete: ${successful} successful, ${failed} failed`);
    return { successful, failed, errors };
  }

  /**
   * Get event custom fields for mapping
   */
  static async getEventCustomFields(eventId: string): Promise<Array<{ name: string; label: string; required?: boolean }>> {
    try {
      const { data: event, error } = await supabase
        .from('events')
        .select('custom_fields')
        .eq('id', eventId)
        .single();

      if (error || !event) {
        throw new Error('Event not found');
      }

      return event.custom_fields as Array<{ name: string; label: string; required?: boolean }> || [];
    } catch (error) {
      console.error('Error getting event custom fields:', error);
      return [];
    }
  }

  /**
   * Generate template for import
   */
  static generateTemplate(headers: string[], customFields: Array<{ name: string; label: string }>): string {
    const baseHeaders = ['Nama Peserta', 'Email', 'Nomor Telepon'];
    const customHeaders = customFields.map(field => field.label);
    const allHeaders = [...baseHeaders, ...customHeaders];
    
    return allHeaders.join(',') + '\n' + allHeaders.map(() => 'Contoh Data').join(',');
  }

  /**
   * Test function to verify import service functionality
   */
  /**
   * Export failed import data to CSV
   */
  static exportFailedImportsToCSV(failedImportData: Array<{
    row_number: number;
    name: string;
    email: string;
    phone: string;
    error_message: string;
    error_field: string;
    original_data: Record<string, any>;
  }>): string {
    if (failedImportData.length === 0) {
      return '';
    }

    // Create CSV headers
    const headers = [
      'Row Number',
      'Name',
      'Email',
      'Phone',
      'Error Message',
      'Error Field',
      'Original Data'
    ];

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...failedImportData.map(item => [
        item.row_number,
        `"${item.name}"`,
        `"${item.email}"`,
        `"${item.phone}"`,
        `"${item.error_message}"`,
        `"${item.error_field}"`,
        `"${JSON.stringify(item.original_data)}"`
      ].join(','))
    ].join('\n');

    return csvContent;
  }

  /**
   * Download failed import data as CSV file
   */
  static downloadFailedImportsCSV(failedImportData: Array<{
    row_number: number;
    name: string;
    email: string;
    phone: string;
    error_message: string;
    error_field: string;
    original_data: Record<string, any>;
  }>, filename: string = 'failed-imports.csv'): void {
    const csvContent = this.exportFailedImportsToCSV(failedImportData);
    
    if (!csvContent) {
      console.log('No failed imports to export');
      return;
    }

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  static async testImportService(eventId: string): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    try {
      console.log('🧪 Testing import service for event:', eventId);
      
      // Test 1: Check if event exists
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('id, name, max_participants, registration_status')
        .eq('id', eventId)
        .single();

      if (eventError || !event) {
        return {
          success: false,
          message: 'Event not found or access denied',
          details: eventError
        };
      }

      console.log('✅ Event found:', event);

      // Test 2: Check current registration count
      const { count: currentCount, error: countError } = await supabase
        .from('registrations')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', eventId);

      if (countError) {
        return {
          success: false,
          message: 'Error checking registration count',
          details: countError
        };
      }

      console.log('✅ Current registrations:', currentCount);

      // Test 3: Check if we can insert a test registration
      const testRegistration = {
        event_id: eventId,
        participant_name: 'Test Import User',
        participant_email: `test.import.${Date.now()}@test.local`,
        status: 'pending',
        registered_at: new Date().toISOString()
      };

      const { data: testInsert, error: insertError } = await supabase
        .from('registrations')
        .insert([testRegistration])
        .select('id, participant_email, participant_name')
        .single();

      if (insertError) {
        return {
          success: false,
          message: 'Error inserting test registration',
          details: insertError
        };
      }

      console.log('✅ Test registration inserted:', testInsert);

      // Test 4: Clean up test registration
      const { error: deleteError } = await supabase
        .from('registrations')
        .delete()
        .eq('id', testInsert.id);

      if (deleteError) {
        console.warn('⚠️ Could not clean up test registration:', deleteError);
      } else {
        console.log('✅ Test registration cleaned up');
      }

      return {
        success: true,
        message: 'Import service is working correctly',
        details: {
          event,
          currentRegistrations: currentCount,
          maxCapacity: event.max_participants,
          registrationStatus: event.registration_status
        }
      };

    } catch (error) {
      console.error('❌ Import service test failed:', error);
      return {
        success: false,
        message: 'Import service test failed',
        details: error
      };
    }
  }
}