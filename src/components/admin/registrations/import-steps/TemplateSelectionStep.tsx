import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  FileText, 
  Settings, 
  Users, 
  Globe, 
  Lock,
  CheckCircle,
  AlertCircle,
  Plus,
  Loader2,
  ArrowLeft,
  Trash2
} from 'lucide-react';
import { ImportTemplateService } from '@/lib/import-template-service';
import { ImportTemplateBuilder } from '../ImportTemplateBuilder';
import { useToast } from '@/hooks/use-toast';
import { type ImportTemplate } from '../import-types';

interface TemplateSelectionStepProps {
  eventId: string;
  onTemplateSelect: (template: ImportTemplate) => void;
  selectedTemplate: ImportTemplate | null;
  onBack: () => void;
}

export function TemplateSelectionStep({ 
  eventId, 
  onTemplateSelect, 
  selectedTemplate, 
  onBack 
}: TemplateSelectionStepProps) {
  const [templates, setTemplates] = useState<ImportTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<ImportTemplate | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  const loadTemplates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await ImportTemplateService.getTemplates(eventId);
      setTemplates(data);
    } catch (err) {
      setError('Gagal memuat template. Silakan coba lagi.');
      console.error('Error loading templates:', err);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const handleTemplateCreated = useCallback((template: ImportTemplate) => {
    setTemplates(prev => [template, ...prev]);
    setShowCreateDialog(false);
  }, []);

  const handleTemplateSelect = useCallback((template: ImportTemplate) => {
    onTemplateSelect(template);
  }, [onTemplateSelect]);

  const handleDeleteTemplate = (template: ImportTemplate) => {
    setTemplateToDelete(template);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteTemplate = async () => {
    if (!templateToDelete) return;
    
    setDeleting(true);
    try {
      await ImportTemplateService.deleteTemplate(templateToDelete.id);
      setTemplates(prev => prev.filter(t => t.id !== templateToDelete.id));
      
      // If the deleted template was selected, clear the selection
      if (selectedTemplate?.id === templateToDelete.id) {
        onTemplateSelect(null as unknown as ImportTemplate);
      }
      
      toast({
        title: 'Berhasil',
        description: 'Template berhasil dihapus'
      });
      
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

  const getFieldMappingPreview = (template: ImportTemplate) => {
    const fields = Object.entries(template.field_mapping);
    return fields.slice(0, 3).map(([key, value]) => `${key}: ${value}`).join(', ');
  };

  const getTemplateStats = (template: ImportTemplate) => {
    const fieldCount = Object.keys(template.field_mapping).length;
    const hasValidation = template.validation_rules && Object.keys(template.validation_rules).length > 0;
    
    return {
      fieldCount,
      hasValidation,
      isPublic: template.is_public,
      version: template.version
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Memuat template...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Pilih Template Import</h2>
          <p className="text-sm text-muted-foreground">
            Pilih template yang sesuai dengan struktur file Anda
          </p>
        </div>
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Kembali
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Template List */}
      <div className="grid gap-4">
        {templates.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Belum ada template</h3>
              <p className="text-muted-foreground mb-4">
                Buat template pertama untuk mempermudah proses import
              </p>
              <ImportTemplateBuilder 
                eventId={eventId}
                onTemplateCreated={handleTemplateCreated}
              />
            </CardContent>
          </Card>
        ) : (
          templates.map((template) => {
            const stats = getTemplateStats(template);
            const isSelected = selectedTemplate?.id === template.id;
            
            return (
              <Card 
                key={template.id} 
                className={`cursor-pointer transition-all hover:shadow-md ${
                  isSelected ? 'ring-2 ring-primary bg-primary/5' : ''
                }`}
                onClick={() => handleTemplateSelect(template)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="font-semibold">{template.name}</h3>
                        {stats.isPublic ? (
                          <Badge variant="secondary">
                            <Globe className="h-3 w-3 mr-1" />
                            Publik
                          </Badge>
                        ) : (
                          <Badge variant="outline">
                            <Lock className="h-3 w-3 mr-1" />
                            Pribadi
                          </Badge>
                        )}
                        {isSelected && (
                          <Badge variant="default">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Dipilih
                          </Badge>
                        )}
                      </div>
                      
                      {template.description && (
                        <p className="text-sm text-muted-foreground mb-3">
                          {template.description}
                        </p>
                      )}
                      
                      <div className="space-y-2">
                        <div className="flex items-center space-x-4 text-sm">
                          <span className="flex items-center">
                            <Settings className="h-4 w-4 mr-1" />
                            {stats.fieldCount} field
                          </span>
                          {stats.hasValidation && (
                            <span className="flex items-center text-green-600">
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Validasi
                            </span>
                          )}
                          <span className="text-muted-foreground">
                            v{stats.version}
                          </span>
                        </div>
                        
                        <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                          <strong>Field Mapping:</strong> {getFieldMappingPreview(template)}
                          {Object.keys(template.field_mapping).length > 3 && '...'}
                        </div>
                      </div>
                    </div>
                    
                    <div className="ml-4 flex flex-col gap-2">
                      <Button
                        variant={isSelected ? "default" : "outline"}
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTemplateSelect(template);
                        }}
                      >
                        {isSelected ? 'Dipilih' : 'Pilih'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTemplate(template);
                        }}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Create New Template */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Buat Template Baru</CardTitle>
          <CardDescription>
            Buat template kustom untuk kebutuhan spesifik
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                Template kustom memungkinkan Anda mendefinisikan field mapping dan validasi sesuai kebutuhan.
              </p>
              <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                <span>✓ Field mapping kustom</span>
                <span>✓ Validasi rules</span>
                <span>✓ Reusable</span>
              </div>
            </div>
            <ImportTemplateBuilder 
              eventId={eventId}
              onTemplateCreated={handleTemplateCreated}
            />
          </div>
        </CardContent>
      </Card>

      {/* Continue Button */}
      {selectedTemplate && (
        <div className="flex justify-end">
          <Button 
            onClick={() => handleTemplateSelect(selectedTemplate)}
            className="w-full sm:w-auto"
          >
            Lanjutkan ke Field Mapping
          </Button>
        </div>
      )}

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
    </div>
  );
} 