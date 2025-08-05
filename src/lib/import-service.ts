import { supabase } from '@/integrations/supabase/client';
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
        if (!line) continue;

        const values = this.parseCSVLine(line);
        const rowData: Record<string, string> = {};
        
        headers.forEach((header, index) => {
          rowData[header] = values[index] || '';
        });

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
            if (!row || row.every(cell => !cell)) continue;

            const rowData: Record<string, string> = {};
            headers.forEach((header, index) => {
              rowData[header] = String(row[index] || '').trim();
            });

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

    try {
      // Create import log
      const { data: importLog, error: logError } = await supabase
        .from('import_logs')
        .insert({
          event_id: eventId,
          file_name: 'import.csv', // TODO: Get actual filename
          total_records: data.totalRows,
          successful_imports: 0,
          failed_imports: 0,
          errors: []
        })
        .select()
        .single();

      if (logError) {
        console.error('❌ Error creating import log:', logError);
      } else {
        console.log('✅ Import log created:', importLog.id);
      }

      // Process in batches of 50
      const batchSize = 50;
      for (let i = 0; i < data.rows.length; i += batchSize) {
        const batch = data.rows.slice(i, i + batchSize);
        console.log(`🔄 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(data.rows.length / batchSize)}`);
        
        // Check for existing registrations if skipDuplicates is enabled
        if (options.skipDuplicates) {
          console.log('🔍 Checking for duplicates...');
          
          // Find email fields in the mapping
          const emailFields = Object.entries(mapping).filter(([fieldName, _]) => 
            fieldName.toLowerCase().includes('email')
          );
          
          if (emailFields.length > 0) {
            const [emailFieldName, emailColumnName] = emailFields[0];
            console.log(`📧 Using email field: ${emailFieldName} -> ${emailColumnName}`);
            
            const emails = batch.map(row => row.data[emailColumnName]).filter(Boolean);
            console.log('📧 Emails to check:', emails);
            
            if (emails.length > 0) {
              const { data: existingRegistrations, error: existingError } = await supabase
                .from('registrations')
                .select('participant_email')
                .eq('event_id', eventId)
                .in('participant_email', emails);

              if (existingError) {
                console.error('❌ Error checking existing registrations:', existingError);
              } else {
                const existingEmails = new Set(existingRegistrations?.map(r => r.participant_email) || []);
                console.log('📧 Existing emails found:', Array.from(existingEmails));
                
                // Filter out existing emails
                const filteredBatch = batch.filter(row => 
                  !existingEmails.has(row.data[emailColumnName])
                );
                
                console.log(`📊 Filtered batch: ${filteredBatch.length}/${batch.length} (skipped ${batch.length - filteredBatch.length} duplicates)`);
                
                // Process filtered batch
                const batchResult = await this.processBatch(filteredBatch, config);
                successfulImports += batchResult.successful;
                failedImports += batchResult.failed;
                errors.push(...batchResult.errors);
              }
            } else {
              console.log('⚠️ No emails found in batch, processing all rows');
              const batchResult = await this.processBatch(batch, config);
              successfulImports += batchResult.successful;
              failedImports += batchResult.failed;
              errors.push(...batchResult.errors);
            }
          } else {
            console.log('⚠️ No email field found in mapping, processing all rows');
            const batchResult = await this.processBatch(batch, config);
            successfulImports += batchResult.successful;
            failedImports += batchResult.failed;
            errors.push(...batchResult.errors);
          }
        } else {
          console.log('📝 Skip duplicates disabled, processing all rows');
          const batchResult = await this.processBatch(batch, config);
          successfulImports += batchResult.successful;
          failedImports += batchResult.failed;
          errors.push(...batchResult.errors);
        }
      }

      // Update import log
      if (importLog) {
        console.log('📝 Updating import log with final results');
        await supabase
          .from('import_logs')
          .update({
            successful_imports: successfulImports,
            failed_imports: failedImports,
            errors: errors,
            completed_at: new Date().toISOString()
          })
          .eq('id', importLog.id);
      }

      const result = {
        success: failedImports === 0,
        totalRecords: data.totalRows,
        successfulImports,
        failedImports,
        errors,
        importLogId: importLog?.id
      };

      console.log('✅ Import completed successfully:', result);
      return result;
    } catch (error) {
      console.error('❌ Error importing data:', error);
      throw new Error(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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
        } else if (fieldNameLower.includes('phone') || fieldNameLower.includes('telepon') || fieldNameLower.includes('hp') || 
                   columnNameLower.includes('phone') || columnNameLower.includes('telepon') || columnNameLower.includes('hp')) {
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
          } else if (columnNameLower.includes('phone') || columnNameLower.includes('telepon') || columnNameLower.includes('hp')) {
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
              } else if (columnNameLower.includes('telepon') || columnNameLower.includes('phone') || columnNameLower.includes('hp')) {
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
        customData: registration.custom_data
      });

      return registration;
    });

    // Filter out registrations with missing required fields
    const validRegistrations = registrations.filter(reg => {
      // Only require participant_name, email is optional since app supports WhatsApp tickets
      const isValid = reg.participant_name && reg.participant_name.trim();
      if (!isValid) {
        console.log('❌ Invalid registration (missing name):', reg);
        failed++;
        errors.push({
          row: 0,
          field: 'validation',
          message: 'Nama peserta wajib diisi',
          value: JSON.stringify(reg)
        });
        return false;
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

      return true;
    });

    console.log(`📋 Valid registrations: ${validRegistrations.length}/${registrations.length}`);

    if (validRegistrations.length === 0) {
      console.log('⚠️ No valid registrations to insert');
      return { successful: 0, failed: registrations.length, errors };
    }

    try {
      console.log('💾 Inserting registrations to database...');
      
      // Insert registrations
      const { data: insertedRegistrations, error: insertError } = await supabase
        .from('registrations')
        .insert(validRegistrations)
        .select('id, participant_email, participant_name');

      if (insertError) {
        console.error('❌ Database insert error:', insertError);
        failed += validRegistrations.length;
        errors.push({
          row: 0,
          field: 'database',
          message: `Database error: ${insertError.message}`,
          value: insertError.details || ''
        });
      } else {
        successful += insertedRegistrations?.length || 0;
        failed += validRegistrations.length - (insertedRegistrations?.length || 0);
        
        console.log('✅ Successfully inserted registrations:', insertedRegistrations?.map(r => ({
          id: r.id,
          email: r.participant_email,
          name: r.participant_name
        })));
      }
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
} 