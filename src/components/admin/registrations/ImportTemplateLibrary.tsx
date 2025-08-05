import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Search, 
  Filter, 
  Download, 
  Upload, 
  Copy, 
  Edit, 
  Trash2, 
  Eye,
  Calendar,
  User,
  FileText,
  CheckCircle,
  AlertCircle,
  Clock
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { ImportTemplateService } from '@/lib/import-template-service';
import type { ImportTemplate, ImportHistory } from './import-types';

interface ImportTemplateLibraryProps {
  eventId: string;
  onTemplateSelect: (template: ImportTemplate) => void;
  onTemplateEdit?: (template: ImportTemplate) => void;
  onTemplateDelete?: (templateId: string) => void;
}

export function ImportTemplateLibrary({
  eventId,
  onTemplateSelect,
  onTemplateEdit,
  onTemplateDelete
}: ImportTemplateLibraryProps) {
  const [templates, setTemplates] = useState<ImportTemplate[]>([]);
  const [history, setHistory] = useState<ImportHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('name');
  const [selectedTemplate, setSelectedTemplate] = useState<ImportTemplate | null>(null);
  const [showTemplateDetails, setShowTemplateDetails] = useState(false);

  // Load templates and history
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [templatesData, historyData] = await Promise.all([
        ImportTemplateService.getTemplates(eventId),
        ImportTemplateService.getImportHistory(eventId, 1, 10)
      ]);
      setTemplates(templatesData);
      setHistory(historyData.data);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error',
        description: 'Gagal memuat template dan riwayat import',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter and sort templates
  const filteredTemplates = templates
    .filter(template => {
      const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           template.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = filterCategory === 'all' || template.category === filterCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'created':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'updated':
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        case 'usage':
          return (b.usage_count || 0) - (a.usage_count || 0);
        default:
          return 0;
      }
    });

  // Template actions
  const handleTemplateSelect = (template: ImportTemplate) => {
    onTemplateSelect(template);
  };

  const handleTemplateEdit = (template: ImportTemplate) => {
    if (onTemplateEdit) {
      onTemplateEdit(template);
    }
  };

  const handleTemplateDelete = async (templateId: string) => {
    try {
      await ImportTemplateService.deleteTemplate(templateId);
      await loadData();
      toast({
        title: 'Success',
        description: 'Template berhasil dihapus'
      });
      if (onTemplateDelete) {
        onTemplateDelete(templateId);
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      toast({
        title: 'Error',
        description: 'Gagal menghapus template',
        variant: 'destructive'
      });
    }
  };

  const handleTemplateDuplicate = async (template: ImportTemplate) => {
    try {
      const duplicated = await ImportTemplateService.duplicateTemplate(template.id);
      await loadData();
      toast({
        title: 'Success',
        description: 'Template berhasil diduplikasi'
      });
    } catch (error) {
      console.error('Error duplicating template:', error);
      toast({
        title: 'Error',
        description: 'Gagal menduplikasi template',
        variant: 'destructive'
      });
    }
  };

  const handleTemplateExport = async (template: ImportTemplate) => {
    try {
      const exported = await ImportTemplateService.exportTemplate(template.id);
      const blob = new Blob([JSON.stringify(exported, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${template.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_template.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({
        title: 'Success',
        description: 'Template berhasil diekspor'
      });
    } catch (error) {
      console.error('Error exporting template:', error);
      toast({
        title: 'Error',
        description: 'Gagal mengekspor template',
        variant: 'destructive'
      });
    }
  };

  const handleTemplateImport = async (file: File) => {
    try {
      const text = await file.text();
      const templateData = JSON.parse(text);
      await ImportTemplateService.importTemplate(templateData, eventId);
      await loadData();
      toast({
        title: 'Success',
        description: 'Template berhasil diimpor'
      });
    } catch (error) {
      console.error('Error importing template:', error);
      toast({
        title: 'Error',
        description: 'Gagal mengimpor template',
        variant: 'destructive'
      });
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'basic': return 'bg-blue-100 text-blue-800';
      case 'advanced': return 'bg-purple-100 text-purple-800';
      case 'custom': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Memuat template...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Template Library</h2>
          <p className="text-muted-foreground">
            Kelola dan gunakan template untuk import data
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Upload className="h-4 w-4 mr-2" />
                Import Template
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Import Template</DialogTitle>
                <DialogDescription>
                  Upload file JSON template yang telah diekspor sebelumnya
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  type="file"
                  accept=".json"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleTemplateImport(file);
                    }
                  }}
                />
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="templates" className="space-y-4">
        <TabsList>
          <TabsTrigger value="templates">Template ({templates.length})</TabsTrigger>
          <TabsTrigger value="history">Riwayat Import ({history.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Cari template..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Kategori" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kategori</SelectItem>
                <SelectItem value="basic">Basic</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Urutkan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Nama</SelectItem>
                <SelectItem value="created">Dibuat Terbaru</SelectItem>
                <SelectItem value="updated">Diupdate Terbaru</SelectItem>
                <SelectItem value="usage">Paling Sering Digunakan</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Templates Grid */}
          {filteredTemplates.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Tidak ada template</h3>
              <p className="text-muted-foreground">
                {searchTerm || filterCategory !== 'all' 
                  ? 'Tidak ada template yang sesuai dengan filter'
                  : 'Buat template pertama Anda untuk memulai'
                }
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates.map((template) => (
                <Card key={template.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                        <CardDescription className="mt-1">
                          {template.description || 'Tidak ada deskripsi'}
                        </CardDescription>
                      </div>
                      <Badge className={getCategoryColor(template.category)}>
                        {template.category}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      {/* Template Stats */}
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span>{template.created_by_name || 'Unknown'}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{new Date(template.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span>Fields: {Object.keys(template.field_mapping).length}</span>
                        <span>Used: {template.usage_count || 0}x</span>
                      </div>

                      <Separator />

                      {/* Actions */}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleTemplateSelect(template)}
                          className="flex-1"
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Gunakan
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedTemplate(template);
                            setShowTemplateDetails(true);
                          }}
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        {onTemplateEdit && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleTemplateEdit(template)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                        )}
                      </div>

                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleTemplateDuplicate(template)}
                          className="flex-1"
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          Duplikat
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleTemplateExport(template)}
                          className="flex-1"
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Export
                        </Button>
                        {onTemplateDelete && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleTemplateDelete(template.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {/* Import History */}
          {history.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Tidak ada riwayat import</h3>
              <p className="text-muted-foreground">
                Riwayat import akan muncul di sini setelah Anda melakukan import
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((item) => (
                <Card key={item.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-medium">{item.filename}</h4>
                          <Badge className={getStatusColor(item.import_status)}>
                            {item.import_status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>Total: {item.total_records}</span>
                          <span>Berhasil: {item.successful_imports}</span>
                          <span>Gagal: {item.failed_imports}</span>
                          <span>
                            {new Date(item.started_at).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {item.import_status === 'completed' && (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        )}
                        {item.import_status === 'failed' && (
                          <AlertCircle className="h-4 w-4 text-red-600" />
                        )}
                        {item.import_status === 'in_progress' && (
                          <Clock className="h-4 w-4 text-yellow-600" />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Template Details Dialog */}
      <Dialog open={showTemplateDetails} onOpenChange={setShowTemplateDetails}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detail Template</DialogTitle>
            <DialogDescription>
              Informasi lengkap tentang template ini
            </DialogDescription>
          </DialogHeader>
          {selectedTemplate && (
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Informasi Dasar</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Nama:</span>
                    <p>{selectedTemplate.name}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Kategori:</span>
                    <p>{selectedTemplate.category}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Dibuat oleh:</span>
                    <p>{selectedTemplate.created_by_name || 'Unknown'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Digunakan:</span>
                    <p>{selectedTemplate.usage_count || 0} kali</p>
                  </div>
                </div>
                {selectedTemplate.description && (
                  <div className="mt-4">
                    <span className="text-muted-foreground">Deskripsi:</span>
                    <p className="mt-1">{selectedTemplate.description}</p>
                  </div>
                )}
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-2">Field Mapping</h4>
                <div className="space-y-2">
                  {Object.entries(selectedTemplate.field_mapping).map(([field, column]) => (
                    <div key={field} className="flex justify-between text-sm">
                      <span className="font-medium">{field}:</span>
                      <span className="text-muted-foreground">{column}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-2">Validation Rules</h4>
                <div className="space-y-2">
                  {Object.entries(selectedTemplate.validation_rules || {}).map(([field, rules]) => (
                    <div key={field} className="text-sm">
                      <span className="font-medium">{field}:</span>
                      <div className="ml-4 text-muted-foreground">
                        {rules.required && <div>• Required</div>}
                        {rules.type && <div>• Type: {rules.type}</div>}
                        {rules.minLength && <div>• Min length: {rules.minLength}</div>}
                        {rules.maxLength && <div>• Max length: {rules.maxLength}</div>}
                        {rules.pattern && <div>• Pattern: {rules.pattern}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 