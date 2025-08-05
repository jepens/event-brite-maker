// Types for Phase 3 Import Enhancement

export interface ImportTemplate {
  id: string;
  name: string;
  description?: string;
  event_id?: string;
  field_mapping: Record<string, string>;
  validation_rules?: Record<string, ValidationRule>;
  default_status: string;
  is_public: boolean;
  version: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ValidationRule {
  required?: boolean;
  type?: 'email' | 'phone' | 'date' | 'number' | 'text';
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  custom?: (value: string) => boolean | string;
}

export interface ImportHistory {
  id: string;
  template_id?: string;
  event_id: string;
  filename: string;
  file_size?: number;
  total_records: number;
  successful_imports: number;
  failed_imports: number;
  skipped_imports: number;
  import_status: 'pending' | 'processing' | 'completed' | 'failed';
  error_details?: Record<string, unknown>;
  started_at: string;
  completed_at?: string;
  created_by: string;
}

export interface ImportHistoryDetail {
  id: string;
  import_history_id: string;
  row_number: number;
  participant_name?: string;
  participant_email?: string;
  phone_number?: string;
  status?: string;
  error_message?: string;
  is_success: boolean;
  created_at: string;
}

export interface ImportStats {
  total_imports: number;
  successful_imports: number;
  failed_imports: number;
  total_records: number;
  avg_records_per_import: number;
  success_rate: number;
}

export interface TemplateStats {
  total_templates: number;
  public_templates: number;
  private_templates: number;
  most_used_template?: string;
  most_used_count: number;
}

export interface ImportConfig {
  eventId: string;
  templateId?: string;
  defaultStatus: string;
  skipDuplicates: boolean;
  validateOnly: boolean;
  batchSize: number;
}

export interface FieldMapping {
  [key: string]: string; // field_name: column_name
}

export interface ImportPreviewData {
  headers: string[];
  data: Record<string, unknown>[];
  totalRows: number;
  validRows: number;
  invalidRows: number;
  errors: ImportError[];
}

export interface ImportError {
  row: number;
  field?: string;
  message: string;
  value?: string;
}

export interface ImportProgress {
  current: number;
  total: number;
  percentage: number;
  status: 'preparing' | 'validating' | 'importing' | 'completed' | 'failed';
  message: string;
  errors: ImportError[];
}

export interface ImportResult {
  success: boolean;
  totalRecords: number;
  successfulImports: number;
  failedImports: number;
  errors: ImportError[];
  importLogId?: string;
}

export interface ImportTemplateForm {
  name: string;
  description?: string;
  event_id?: string;
  field_mapping: FieldMapping;
  validation_rules: Record<string, ValidationRule>;
  default_status: string;
  is_public: boolean;
}

// Common field suggestions for better UX (not enforced)
export const FIELD_SUGGESTIONS = {
  'Nama Peserta': 'participant_name',
  'Email': 'participant_email', 
  'Nomor Telepon': 'phone_number',
  'Perusahaan': 'custom_data.company',
  'Jabatan': 'custom_data.position',
  'Departemen': 'custom_data.department',
  'Website': 'custom_data.website',
  'LinkedIn': 'custom_data.linkedin',
  'Twitter': 'custom_data.twitter',
  'Instagram': 'custom_data.instagram',
  'Catatan': 'custom_data.notes',
} as const;

// Validation rule presets
export const VALIDATION_PRESETS = {
  email: {
    required: true,
    type: 'email' as const,
  },
  name: {
    required: true,
    minLength: 2,
    maxLength: 100,
  },
  phone: {
    required: false,
    type: 'phone' as const,
    pattern: '^[+]?[0-9\\s\\-()]{8,}$',
  },
  company: {
    required: false,
    maxLength: 100,
  },
  position: {
    required: false,
    maxLength: 100,
  },
} as const;

export type ValidationPreset = keyof typeof VALIDATION_PRESETS; 