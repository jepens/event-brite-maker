import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Download, 
  FileText, 
  FileSpreadsheet, 
  File, 
  Settings, 
  Save, 
  Trash2, 
  AlertCircle, 
  CheckCircle,
  Calendar,
  Search,
  Filter,
  Users
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { ExportService, ExportConfig, ExportFilters, ExportTemplate } from '@/lib/export-service';
import { Event } from './types';

interface ExportDialogProps {
  events: Event[];
  currentFilters?: {
    searchTerm?: string;
    statusFilter?: string;
    eventFilter?: string;
  };
}

export function ExportDialog({ events, currentFilters }: ExportDialogProps) {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [templates, setTemplates] = useState<ExportTemplate[]>([]);
  const [customFields, setCustomFields] = useState<Array<{ name: string; label: string }>>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateDescription, setNewTemplateDescription] = useState('');

  // Export configuration
  const [exportConfig, setExportConfig] = useState<ExportConfig>({
    eventId: 'all',
    filters: {
      status: 'all',
      checkinStatus: 'all'
    },
    format: 'excel',
    includeCustomFields: true,
    includeTickets: true,
    includeCheckinData: true,
    customFieldSelection: []
  });

  const loadTemplates = useCallback(async () => {
    try {
      const templatesData = await ExportService.getTemplates(exportConfig.eventId);
      setTemplates(templatesData);
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  }, [exportConfig.eventId]);

  const loadCustomFields = useCallback(async (eventId: string) => {
    try {
      const fields = await ExportService.getEventCustomFields(eventId);
      setCustomFields(fields);
    } catch (error) {
      console.error('Error loading custom fields:', error);
    }
  }, []);

  // Initialize with current filters
  useEffect(() => {
    if (currentFilters) {
      setExportConfig(prev => ({
        ...prev,
        eventId: currentFilters.eventFilter || 'all',
        filters: {
          ...prev.filters,
          status: (currentFilters.statusFilter as 'pending' | 'approved' | 'rejected' | 'all') || 'all',
          searchTerm: currentFilters.searchTerm || undefined
        }
      }));
    }
  }, [currentFilters]);

  // Load templates and custom fields
  useEffect(() => {
    if (open) {
      loadTemplates();
      if (exportConfig.eventId && exportConfig.eventId !== 'all') {
        loadCustomFields(exportConfig.eventId);
      }
    }
  }, [open, exportConfig.eventId, loadTemplates, loadCustomFields]);

  const handleEventChange = useCallback((eventId: string) => {
    setExportConfig(prev => ({ ...prev, eventId }));
    if (eventId && eventId !== 'all') {
      loadCustomFields(eventId);
    }
  }, [loadCustomFields]);

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setExportConfig({
        eventId: template.eventId || 'all',
        filters: template.filters,
        format: template.format,
        includeCustomFields: template.includeCustomFields,
        includeTickets: template.includeTickets,
        includeCheckinData: template.includeCheckinData,
        customFieldSelection: template.fields
      });
      setSelectedTemplate(templateId);
    }
  };

  const handleSaveTemplate = async () => {
    if (!newTemplateName.trim()) {
      toast({
        title: 'Error',
        description: 'Nama template wajib diisi',
        variant: 'destructive',
      });
      return;
    }

    try {
      const templateData = {
        name: newTemplateName,
        description: newTemplateDescription,
        eventId: exportConfig.eventId === 'all' ? undefined : exportConfig.eventId,
        fields: exportConfig.customFieldSelection || [],
        filters: exportConfig.filters,
        format: exportConfig.format,
        includeCustomFields: exportConfig.includeCustomFields,
        includeTickets: exportConfig.includeTickets,
        includeCheckinData: exportConfig.includeCheckinData
      };

      await ExportService.saveTemplate(templateData);
      
      toast({
        title: 'Success',
        description: 'Template berhasil disimpan',
      });

      setNewTemplateName('');
      setNewTemplateDescription('');
      setShowTemplateManager(false);
      loadTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      toast({
        title: 'Error',
        description: 'Gagal menyimpan template',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      const success = await ExportService.deleteTemplate(templateId);
      if (success) {
        toast({
          title: 'Success',
          description: 'Template berhasil dihapus',
        });
        loadTemplates();
        if (selectedTemplate === templateId) {
          setSelectedTemplate('');
        }
      } else {
        throw new Error('Failed to delete template');
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      toast({
        title: 'Error',
        description: 'Gagal menghapus template',
        variant: 'destructive',
      });
    }
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      setExportProgress(0);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setExportProgress(prev => Math.min(prev + 20, 90));
      }, 300);

      const result = await ExportService.exportData(exportConfig);
      
      clearInterval(progressInterval);
      setExportProgress(100);

      if (result.success) {
        toast({
          title: 'Export berhasil',
          description: `Berhasil export ${result.recordCount} data ke ${result.filename}`,
        });
      } else {
        toast({
          title: 'Export gagal',
          description: result.error || 'Terjadi kesalahan saat export',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error exporting data:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Gagal export data',
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
      setExportProgress(0);
    }
  };

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'csv':
        return <FileText className="h-4 w-4" />;
      case 'excel':
        return <FileSpreadsheet className="h-4 w-4" />;
          case 'pdf':
      return <File className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getFormatLabel = (format: string) => {
    switch (format) {
      case 'csv':
        return 'CSV';
      case 'excel':
        return 'Excel';
      case 'pdf':
        return 'PDF';
      default:
        return format.toUpperCase();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export Data
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Export Data Registrasi</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="export" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="export">Export</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="export" className="space-y-6">
            {/* Quick Export Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Quick Export
                </CardTitle>
                <CardDescription>
                  Export data dengan konfigurasi cepat
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Format Export</Label>
                    <Select value={exportConfig.format} onValueChange={(value: 'csv' | 'excel' | 'pdf') => setExportConfig(prev => ({ ...prev, format: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="csv">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            CSV
                          </div>
                        </SelectItem>
                        <SelectItem value="excel">
                          <div className="flex items-center gap-2">
                            <FileSpreadsheet className="h-4 w-4" />
                            Excel
                          </div>
                        </SelectItem>
                        <SelectItem value="pdf">
                          <div className="flex items-center gap-2">
                            <File className="h-4 w-4" />
                            PDF
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Event</Label>
                    <Select value={exportConfig.eventId} onValueChange={handleEventChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih event" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Semua Event</SelectItem>
                        {events.map(event => (
                          <SelectItem key={event.id} value={event.id}>
                            {event.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleExport}
                    disabled={exporting}
                    className="flex-1"
                  >
                    {exporting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Exporting...
                      </>
                    ) : (
                      <>
                        {getFormatIcon(exportConfig.format)}
                        <span className="ml-2">Export {getFormatLabel(exportConfig.format)}</span>
                      </>
                    )}
                  </Button>
                </div>

                {exporting && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span>{exportProgress}%</span>
                    </div>
                    <Progress value={exportProgress} className="w-full" />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Advanced Filters Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Advanced Filters
                </CardTitle>
                <CardDescription>
                  Filter data yang akan di-export
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Status Registrasi</Label>
                    <Select 
                      value={exportConfig.filters.status || 'all'} 
                      onValueChange={(value: 'pending' | 'approved' | 'rejected' | 'all') => 
                        setExportConfig(prev => ({ 
                          ...prev, 
                          filters: { ...prev.filters, status: value } 
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Semua Status</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Status Check-in</Label>
                    <Select 
                      value={exportConfig.filters.checkinStatus || 'all'} 
                      onValueChange={(value: 'checked_in' | 'not_checked_in' | 'all') => 
                        setExportConfig(prev => ({ 
                          ...prev, 
                          filters: { ...prev.filters, checkinStatus: value } 
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Semua</SelectItem>
                        <SelectItem value="checked_in">Sudah Check-in</SelectItem>
                        <SelectItem value="not_checked_in">Belum Check-in</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Tanggal Dari</Label>
                    <Input
                      type="date"
                      value={exportConfig.filters.dateFrom || ''}
                      onChange={(e) => setExportConfig(prev => ({ 
                        ...prev, 
                        filters: { ...prev.filters, dateFrom: e.target.value || undefined } 
                      }))}
                    />
                  </div>

                  <div>
                    <Label>Tanggal Sampai</Label>
                    <Input
                      type="date"
                      value={exportConfig.filters.dateTo || ''}
                      onChange={(e) => setExportConfig(prev => ({ 
                        ...prev, 
                        filters: { ...prev.filters, dateTo: e.target.value || undefined } 
                      }))}
                    />
                  </div>
                </div>

                <div>
                  <Label>Search Term</Label>
                  <Input
                    placeholder="Cari berdasarkan nama atau email..."
                    value={exportConfig.filters.searchTerm || ''}
                    onChange={(e) => setExportConfig(prev => ({ 
                      ...prev, 
                      filters: { ...prev.filters, searchTerm: e.target.value || undefined } 
                    }))}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Field Selection Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Field Selection
                </CardTitle>
                <CardDescription>
                  Pilih field yang akan di-export
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="include-tickets"
                      checked={exportConfig.includeTickets}
                      onCheckedChange={(checked) => setExportConfig(prev => ({ ...prev, includeTickets: checked as boolean }))}
                    />
                    <Label htmlFor="include-tickets">Include Ticket Information</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="include-checkin"
                      checked={exportConfig.includeCheckinData}
                      onCheckedChange={(checked) => setExportConfig(prev => ({ ...prev, includeCheckinData: checked as boolean }))}
                    />
                    <Label htmlFor="include-checkin">Include Check-in Data</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="include-custom-fields"
                      checked={exportConfig.includeCustomFields}
                      onCheckedChange={(checked) => setExportConfig(prev => ({ ...prev, includeCustomFields: checked as boolean }))}
                    />
                    <Label htmlFor="include-custom-fields">Include Custom Fields</Label>
                  </div>
                </div>

                {exportConfig.includeCustomFields && customFields.length > 0 && (
                  <div className="space-y-2">
                    <Label>Custom Fields</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {customFields.map(field => (
                        <div key={field.name} className="flex items-center space-x-2">
                          <Checkbox
                            id={`custom-${field.name}`}
                            checked={!exportConfig.customFieldSelection || exportConfig.customFieldSelection.includes(field.name)}
                            onCheckedChange={(checked) => {
                              const currentSelection = exportConfig.customFieldSelection || customFields.map(f => f.name);
                              const newSelection = checked 
                                ? [...currentSelection, field.name]
                                : currentSelection.filter(f => f !== field.name);
                              setExportConfig(prev => ({ 
                                ...prev, 
                                customFieldSelection: newSelection 
                              }));
                            }}
                          />
                          <Label htmlFor={`custom-${field.name}`} className="text-sm">
                            {field.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="templates" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Save className="h-5 w-5" />
                      Export Templates
                    </CardTitle>
                    <CardDescription>
                      Kelola template export untuk penggunaan berulang
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowTemplateManager(true)}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save Current as Template
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {templates.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Save className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Belum ada template tersimpan</p>
                    <p className="text-sm">Buat template pertama Anda untuk menyimpan konfigurasi export</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {templates.map(template => (
                      <div
                        key={template.id}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          selectedTemplate === template.id 
                            ? 'border-primary bg-primary/5' 
                            : 'border-border hover:border-primary/50'
                        }`}
                        onClick={() => handleTemplateSelect(template.id)}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-medium">{template.name}</h4>
                              <Badge variant="outline" className="text-xs">
                                {getFormatLabel(template.format)}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {template.description}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span>Fields: {template.fields.length}</span>
                              <span>Updated: {new Date(template.updated_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTemplate(template.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Save Template Dialog */}
            {showTemplateManager && (
              <Card>
                <CardHeader>
                  <CardTitle>Save as Template</CardTitle>
                  <CardDescription>
                    Simpan konfigurasi export saat ini sebagai template
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Nama Template</Label>
                    <Input
                      placeholder="Masukkan nama template"
                      value={newTemplateName}
                      onChange={(e) => setNewTemplateName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Deskripsi (Opsional)</Label>
                    <Input
                      placeholder="Deskripsi template"
                      value={newTemplateDescription}
                      onChange={(e) => setNewTemplateDescription(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleSaveTemplate} className="flex-1">
                      <Save className="h-4 w-4 mr-2" />
                      Save Template
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setShowTemplateManager(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Export Settings</CardTitle>
                <CardDescription>
                  Konfigurasi default untuk export
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Settings akan disimpan di browser Anda dan digunakan sebagai default untuk export berikutnya.
                  </AlertDescription>
                </Alert>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Default Format</Label>
                    <Select 
                      value={exportConfig.format} 
                      onValueChange={(value: 'csv' | 'excel' | 'pdf') => setExportConfig(prev => ({ ...prev, format: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="excel">Excel</SelectItem>
                        <SelectItem value="csv">CSV</SelectItem>
                        <SelectItem value="pdf">PDF</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Default Include Tickets</Label>
                    <Select 
                      value={exportConfig.includeTickets ? 'yes' : 'no'} 
                      onValueChange={(value) => setExportConfig(prev => ({ ...prev, includeTickets: value === 'yes' }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yes">Yes</SelectItem>
                        <SelectItem value="no">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
} 