import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  Plus, 
  Trash2, 
  Save, 
  Copy, 
  Download, 
  Upload, 
  Settings,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { ImportTemplateService } from '@/lib/import-template-service';
import { useToast } from '@/hooks/use-toast';
import { 
  FIELD_SUGGESTIONS, 
  VALIDATION_PRESETS,
  type ImportTemplate,
  type ImportTemplateForm,
  type FieldMapping,
  type ValidationRule,
  type ValidationPreset
} from './import-types';

interface ImportTemplateBuilderProps {
  eventId?: string;
  onTemplateCreated?: (template: ImportTemplate) => void;
  onTemplateUpdated?: (template: ImportTemplate) => void;
  onTemplateDeleted?: (templateId: string) => void;
}

export function ImportTemplateBuilder({ 
  eventId, 
  onTemplateCreated, 
  onTemplateUpdated,
  onTemplateDeleted
}: ImportTemplateBuilderProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [existingTemplates, setExistingTemplates] = useState<ImportTemplate[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<ImportTemplate | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();
  
  const [form, setForm] = useState<ImportTemplateForm>({
    name: '',
    description: '',
    event_id: eventId,
    field_mapping: {},
    validation_rules: {},
    default_status: 'pending',
    is_public: false,
  });

  const loadTemplates = useCallback(async () => {
    try {
      const templates = await ImportTemplateService.getTemplates(eventId);
      setExistingTemplates(templates);
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  }, [eventId]);

  useEffect(() => {
    if (open) {
      loadTemplates();
    }
  }, [open, loadTemplates]);

  const handleFieldMappingChange = (field: string, columnName: string) => {
    setForm(prev => ({
      ...prev,
      field_mapping: {
        ...prev.field_mapping,
        [field]: columnName,
      },
    }));
  };

  const addCustomField = () => {
    const fieldCount = Object.keys(form.field_mapping).length;
    const newField = `field_${fieldCount + 1}`;
    setForm(prev => ({
      ...prev,
      field_mapping: {
        ...prev.field_mapping,
        [newField]: '',
      },
      validation_rules: {
        ...prev.validation_rules,
        [newField]: { required: false, type: 'text' },
      },
    }));
  };

  const removeField = (field: string) => {
    const newFieldMapping = { ...form.field_mapping };
    delete newFieldMapping[field];
    
    const newValidationRules = { ...form.validation_rules };
    delete newValidationRules[field];
    
    setForm(prev => ({
      ...prev,
      field_mapping: newFieldMapping,
      validation_rules: newValidationRules,
    }));
  };

  const setValidationPreset = (field: string, preset: ValidationPreset) => {
    setForm(prev => ({
      ...prev,
      validation_rules: {
        ...prev.validation_rules,
        [field]: VALIDATION_PRESETS[preset],
      },
    }));
  };

  const updateValidationRule = (field: string, rule: Partial<ValidationRule>) => {
    setForm(prev => ({
      ...prev,
      validation_rules: {
        ...prev.validation_rules,
        [field]: {
          ...prev.validation_rules[field],
          ...rule,
        },
      },
    }));
  };

  const validateForm = (): string[] => {
    const errors: string[] = [];
    
    // Validate template name
    const nameErrors = ImportTemplateService.validateTemplateName(form.name, existingTemplates);
    errors.push(...nameErrors);
    
    // Validate field mapping - at least one field is required
    if (Object.keys(form.field_mapping).length === 0) {
      errors.push('Minimal satu field mapping harus ditambahkan');
    }
    
    // Check for duplicate mappings
    const mappedColumns = Object.values(form.field_mapping).filter(Boolean);
    const uniqueColumns = new Set(mappedColumns);
    if (mappedColumns.length !== uniqueColumns.size) {
      errors.push('Tidak boleh ada kolom yang dipetakan ke lebih dari satu field');
    }
    
    return errors;
  };

  const handleSubmit = async () => {
    setLoading(true);
    setErrors([]);
    
    try {
      const validationErrors = validateForm();
      if (validationErrors.length > 0) {
        setErrors(validationErrors);
        return;
      }
      
      const template = await ImportTemplateService.createTemplate(form);
      
      if (onTemplateCreated) {
        onTemplateCreated(template);
      }
      
      setOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error creating template:', error);
      setErrors(['Gagal membuat template. Silakan coba lagi.']);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      name: '',
      description: '',
      event_id: eventId,
      field_mapping: {},
      validation_rules: {},
      default_status: 'pending',
      is_public: false,
    });
    setErrors([]);
  };

  const getFieldDisplayName = (field: string): string => {
    // Check if it's a suggested field
    const suggestion = Object.entries(FIELD_SUGGESTIONS).find(([_, value]) => value === field);
    if (suggestion) {
      return suggestion[0];
    }
    return field;
  };

  const handleDeleteTemplate = (template: ImportTemplate) => {
    setTemplateToDelete(template);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteTemplate = async () => {
    if (!templateToDelete) return;
    
    setDeleting(true);
    try {
      await ImportTemplateService.deleteTemplate(templateToDelete.id);
      setExistingTemplates(prev => prev.filter(t => t.id !== templateToDelete.id));
      
      toast({
        title: 'Berhasil',
        description: 'Template berhasil dihapus'
      });
      
      if (onTemplateDeleted) {
        onTemplateDeleted(templateToDelete.id);
      }
      
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
    } catch (error) {
      console.error('Error deleting template:', error);
      toast({
        title: 'Error',
        description: 'Gagal menghapus template',
        variant: 'destructive'
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Buat Template
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Buat Template Import</DialogTitle>
            <DialogDescription>
              Buat template untuk mempermudah proses import data peserta
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Informasi Template</CardTitle>
                <CardDescription>
                  Informasi dasar tentang template
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="template-name">Nama Template *</Label>
                    <Input
                      id="template-name"
                      value={form.name}
                      onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Contoh: Template CSV Standar"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="default-status">Status Default</Label>
                    <Select
                      value={form.default_status}
                      onValueChange={(value) => setForm(prev => ({ ...prev, default_status: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="template-description">Deskripsi</Label>
                  <Textarea
                    id="template-description"
                    value={form.description}
                    onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Deskripsi template (opsional)"
                    rows={3}
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is-public"
                    checked={form.is_public}
                    onCheckedChange={(checked) => setForm(prev => ({ ...prev, is_public: checked }))}
                  />
                  <Label htmlFor="is-public">Template Publik</Label>
                  <Badge variant="secondary" className="ml-2">
                    {form.is_public ? 'Dapat digunakan semua admin' : 'Hanya untuk Anda'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Field Mapping */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Field Mapping</CardTitle>
                <CardDescription>
                  Peta kolom file ke field database
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(form.field_mapping).map(([field, columnName]) => (
                  <div key={field} className="flex items-center space-x-4">
                    <div className="flex-1">
                      <Label className="text-sm font-medium">
                        {getFieldDisplayName(field)}
                      </Label>
                      <Input
                        value={columnName}
                        onChange={(e) => handleFieldMappingChange(field, e.target.value)}
                        placeholder={`Nama kolom untuk ${getFieldDisplayName(field)}`}
                        className="mt-1"
                      />
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Select
                        value={form.validation_rules[field]?.type || 'text'}
                        onValueChange={(value) => updateValidationRule(field, { type: value as 'email' | 'phone' | 'date' | 'number' | 'text' })}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">Text</SelectItem>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="phone">Phone</SelectItem>
                          <SelectItem value="date">Date</SelectItem>
                          <SelectItem value="number">Number</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <Switch
                        checked={form.validation_rules[field]?.required || false}
                        onCheckedChange={(checked) => updateValidationRule(field, { required: checked })}
                      />
                      <Label className="text-xs">Required</Label>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeField(field)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addCustomField}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Tambah Field
                </Button>
              </CardContent>
            </Card>

            {/* Validation Rules */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Validation Rules</CardTitle>
                <CardDescription>
                  Aturan validasi untuk setiap field
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(form.validation_rules).map(([field, rules]) => (
                  <div key={field} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <Label className="font-medium">{getFieldDisplayName(field)}</Label>
                      <div className="flex space-x-2">
                        {Object.entries(VALIDATION_PRESETS).map(([preset, presetRules]) => (
                          <Button
                            key={preset}
                            variant="outline"
                            size="sm"
                            onClick={() => setValidationPreset(field, preset as ValidationPreset)}
                          >
                            {preset}
                          </Button>
                        ))}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm">Min Length</Label>
                        <Input
                          type="number"
                          value={rules.minLength || ''}
                          onChange={(e) => updateValidationRule(field, { 
                            minLength: e.target.value ? parseInt(e.target.value) : undefined 
                          })}
                          placeholder="Min length"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">Max Length</Label>
                        <Input
                          type="number"
                          value={rules.maxLength || ''}
                          onChange={(e) => updateValidationRule(field, { 
                            maxLength: e.target.value ? parseInt(e.target.value) : undefined 
                          })}
                          placeholder="Max length"
                        />
                      </div>
                    </div>
                    
                    {rules.pattern && (
                      <div className="space-y-2 mt-4">
                        <Label className="text-sm">Pattern (Regex)</Label>
                        <Input
                          value={rules.pattern}
                          onChange={(e) => updateValidationRule(field, { pattern: e.target.value })}
                          placeholder="Regular expression pattern"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Errors */}
            {errors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <ul className="list-disc list-inside space-y-1">
                    {errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? 'Menyimpan...' : 'Simpan Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Template</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus template "{templateToDelete?.name}"?
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Tindakan ini akan:</p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Menghapus template secara permanen</li>
                <li>Menghapus semua konfigurasi field mapping</li>
                <li>Menghapus semua aturan validasi</li>
              </ul>
            </div>
            
            <p className="text-sm font-semibold text-destructive">
              Tindakan ini tidak dapat dibatalkan.
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteTemplate}
              disabled={deleting}
            >
              {deleting ? 'Menghapus...' : 'Hapus Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
} 