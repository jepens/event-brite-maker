import { supabase } from '@/integrations/supabase/client';
import type { 
  ImportTemplate, 
  ImportHistory, 
  ImportHistoryDetail, 
  ImportStats, 
  TemplateStats,
  ImportTemplateForm,
  FieldMapping,
  ValidationRule
} from '@/components/admin/registrations/import-types';

export class ImportTemplateService {
  // Template Management
  static async getTemplates(eventId?: string): Promise<ImportTemplate[]> {
    try {
      let query = supabase
        .from('import_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (eventId && eventId !== 'all') {
        query = query.eq('event_id', eventId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching templates:', error);
        throw new Error('Failed to fetch templates');
      }

      return data || [];
    } catch (error) {
      console.error('Error in getTemplates:', error);
      throw error;
    }
  }

  static async getTemplate(id: string): Promise<ImportTemplate | null> {
    try {
      const { data, error } = await supabase
        .from('import_templates')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching template:', error);
        throw new Error('Failed to fetch template');
      }

      return data;
    } catch (error) {
      console.error('Error in getTemplate:', error);
      throw error;
    }
  }

  static async createTemplate(template: ImportTemplateForm): Promise<ImportTemplate> {
    try {
      // Get current user ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('import_templates')
        .insert({
          name: template.name,
          description: template.description,
          event_id: template.event_id,
          field_mapping: template.field_mapping,
          validation_rules: template.validation_rules,
          default_status: template.default_status,
          is_public: template.is_public,
          created_by: user.id, // Explicitly set created_by
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating template:', error);
        throw new Error('Failed to create template');
      }

      return data;
    } catch (error) {
      console.error('Error in createTemplate:', error);
      throw error;
    }
  }

  static async updateTemplate(id: string, template: Partial<ImportTemplateForm>): Promise<ImportTemplate> {
    try {
      const { data, error } = await supabase
        .from('import_templates')
        .update({
          name: template.name,
          description: template.description,
          event_id: template.event_id,
          field_mapping: template.field_mapping,
          validation_rules: template.validation_rules,
          default_status: template.default_status,
          is_public: template.is_public,
          version: supabase.sql`version + 1`,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating template:', error);
        throw new Error('Failed to update template');
      }

      return data;
    } catch (error) {
      console.error('Error in updateTemplate:', error);
      throw error;
    }
  }

  static async deleteTemplate(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('import_templates')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting template:', error);
        throw new Error('Failed to delete template');
      }
    } catch (error) {
      console.error('Error in deleteTemplate:', error);
      throw error;
    }
  }

  // Import History Management
  static async getImportHistory(
    eventId?: string,
    limit = 50,
    offset = 0
  ): Promise<{ data: ImportHistory[]; count: number }> {
    try {
      let query = supabase
        .from('import_history')
        .select('*, import_templates(name)', { count: 'exact' })
        .order('started_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (eventId && eventId !== 'all') {
        query = query.eq('event_id', eventId);
      }

      const { data, error, count } = await query;

      if (error) {
        console.error('Error fetching import history:', error);
        throw new Error('Failed to fetch import history');
      }

      return { data: data || [], count: count || 0 };
    } catch (error) {
      console.error('Error in getImportHistory:', error);
      throw error;
    }
  }

  static async getImportHistoryDetail(importHistoryId: string): Promise<ImportHistoryDetail[]> {
    try {
      const { data, error } = await supabase
        .from('import_history_details')
        .select('*')
        .eq('import_history_id', importHistoryId)
        .order('row_number', { ascending: true });

      if (error) {
        console.error('Error fetching import history details:', error);
        throw new Error('Failed to fetch import history details');
      }

      return data || [];
    } catch (error) {
      console.error('Error in getImportHistoryDetail:', error);
      throw error;
    }
  }

  static async createImportHistory(history: Omit<ImportHistory, 'id' | 'started_at'>): Promise<ImportHistory> {
    try {
      // Get current user ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('import_history')
        .insert({
          ...history,
          created_by: user.id, // Explicitly set created_by
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating import history:', error);
        throw new Error('Failed to create import history');
      }

      return data;
    } catch (error) {
      console.error('Error in createImportHistory:', error);
      throw error;
    }
  }

  static async updateImportHistory(
    id: string, 
    updates: Partial<Pick<ImportHistory, 'import_status' | 'successful_imports' | 'failed_imports' | 'skipped_imports' | 'completed_at' | 'error_details'>>
  ): Promise<ImportHistory> {
    try {
      const { data, error } = await supabase
        .from('import_history')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating import history:', error);
        throw new Error('Failed to update import history');
      }

      return data;
    } catch (error) {
      console.error('Error in updateImportHistory:', error);
      throw error;
    }
  }

  static async addImportHistoryDetails(details: Omit<ImportHistoryDetail, 'id' | 'created_at'>[]): Promise<void> {
    try {
      const { error } = await supabase
        .from('import_history_details')
        .insert(details);

      if (error) {
        console.error('Error adding import history details:', error);
        throw new Error('Failed to add import history details');
      }
    } catch (error) {
      console.error('Error in addImportHistoryDetails:', error);
      throw error;
    }
  }

  // Statistics
  static async getImportStats(
    eventId?: string,
    dateFrom?: string,
    dateTo?: string
  ): Promise<ImportStats> {
    try {
      const { data, error } = await supabase
        .rpc('get_import_stats', {
          p_event_id: eventId,
          p_date_from: dateFrom,
          p_date_to: dateTo,
        });

      if (error) {
        console.error('Error fetching import stats:', error);
        throw new Error('Failed to fetch import stats');
      }

      return data?.[0] || {
        total_imports: 0,
        successful_imports: 0,
        failed_imports: 0,
        total_records: 0,
        avg_records_per_import: 0,
        success_rate: 0,
      };
    } catch (error) {
      console.error('Error in getImportStats:', error);
      throw error;
    }
  }

  static async getTemplateStats(eventId?: string): Promise<TemplateStats> {
    try {
      const { data, error } = await supabase
        .rpc('get_template_stats', {
          p_event_id: eventId,
        });

      if (error) {
        console.error('Error fetching template stats:', error);
        throw new Error('Failed to fetch template stats');
      }

      return data?.[0] || {
        total_templates: 0,
        public_templates: 0,
        private_templates: 0,
        most_used_count: 0,
      };
    } catch (error) {
      console.error('Error in getTemplateStats:', error);
      throw error;
    }
  }

  // Utility Methods
  static async duplicateTemplate(templateId: string, newName: string): Promise<ImportTemplate> {
    try {
      const template = await this.getTemplate(templateId);
      if (!template) {
        throw new Error('Template not found');
      }

      return await this.createTemplate({
        name: newName,
        description: template.description,
        event_id: template.event_id,
        field_mapping: template.field_mapping,
        validation_rules: template.validation_rules || {},
        default_status: template.default_status,
        is_public: false, // Duplicates are always private
      });
    } catch (error) {
      console.error('Error in duplicateTemplate:', error);
      throw error;
    }
  }

  static async exportTemplate(templateId: string): Promise<ImportTemplate> {
    try {
      const template = await this.getTemplate(templateId);
      if (!template) {
        throw new Error('Template not found');
      }

      return template;
    } catch (error) {
      console.error('Error in exportTemplate:', error);
      throw error;
    }
  }

  static async importTemplate(templateData: ImportTemplate, newName?: string): Promise<ImportTemplate> {
    try {
      return await this.createTemplate({
        name: newName || templateData.name,
        description: templateData.description,
        event_id: templateData.event_id,
        field_mapping: templateData.field_mapping,
        validation_rules: templateData.validation_rules || {},
        default_status: templateData.default_status,
        is_public: false, // Imported templates are always private
      });
    } catch (error) {
      console.error('Error in importTemplate:', error);
      throw error;
    }
  }

  // Validation helpers
  static validateFieldMapping(mapping: FieldMapping): string[] {
    const errors: string[] = [];
    
    // Check if at least one field is mapped
    if (Object.keys(mapping).length === 0) {
      errors.push('Minimal satu field mapping harus ditambahkan');
    }
    
    // Check for duplicate column mappings
    const mappedColumns = Object.values(mapping).filter(Boolean);
    const uniqueColumns = new Set(mappedColumns);
    if (mappedColumns.length !== uniqueColumns.size) {
      errors.push('Tidak boleh ada kolom yang dipetakan ke lebih dari satu field');
    }

    return errors;
  }

  static validateTemplateName(name: string, existingTemplates: ImportTemplate[]): string[] {
    const errors: string[] = [];
    
    if (!name.trim()) {
      errors.push('Nama template tidak boleh kosong');
    }
    
    if (name.length > 255) {
      errors.push('Nama template tidak boleh lebih dari 255 karakter');
    }
    
    const duplicateName = existingTemplates.find(t => t.name.toLowerCase() === name.toLowerCase());
    if (duplicateName) {
      errors.push('Nama template sudah ada');
    }

    return errors;
  }
} 