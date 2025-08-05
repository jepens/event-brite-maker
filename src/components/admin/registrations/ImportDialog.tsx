import { useState, useRef } from 'react';
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
import { Upload, FileText, AlertCircle, CheckCircle, XCircle, Download } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { ImportService, ImportConfig, FieldMapping, ImportOptions, ParsedData, ValidationResult } from '@/lib/import-service';
import { Event } from './types';

interface ImportDialogProps {
  events: Event[];
  onImportComplete: () => void;
}

interface ImportStep {
  id: 'upload' | 'mapping' | 'preview' | 'import' | 'complete';
  title: string;
  description: string;
}

const IMPORT_STEPS: ImportStep[] = [
  {
    id: 'upload',
    title: 'Upload File',
    description: 'Pilih file CSV atau Excel yang berisi data peserta'
  },
  {
    id: 'mapping',
    title: 'Map Fields',
    description: 'Peta kolom file ke field database'
  },
  {
    id: 'preview',
    title: 'Preview Data',
    description: 'Tinjau data sebelum import'
  },
  {
    id: 'import',
    title: 'Import Data',
    description: 'Proses import data ke database'
  },
  {
    id: 'complete',
    title: 'Complete',
    description: 'Import selesai'
  }
];

export function ImportDialog({ events, onImportComplete }: ImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState<ImportStep['id']>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [fieldMapping, setFieldMapping] = useState<FieldMapping>({
    participant_name: '',
    participant_email: '',
    phone_number: '',
    custom_fields: {}
  });
  const [importOptions, setImportOptions] = useState<ImportOptions>({
    skipDuplicates: true,
    defaultStatus: 'pending',
    sendEmails: false,
    validateOnly: false
  });
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    totalRecords: number;
    successfulImports: number;
    failedImports: number;
    errors: Array<{ message: string }>;
  } | null>(null);
  const [customFields, setCustomFields] = useState<Array<{ name: string; label: string; required?: boolean }>>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedEvent = events.find(e => e.id === selectedEventId);

  const handleFileSelect = async (selectedFile: File) => {
    try {
      setFile(selectedFile);
      
      // Validate file type
      const fileType = selectedFile.name.toLowerCase();
      if (!fileType.endsWith('.csv') && !fileType.endsWith('.xlsx') && !fileType.endsWith('.xls')) {
        throw new Error('File harus berformat CSV atau Excel');
      }

      // Validate file size (max 10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        throw new Error('Ukuran file maksimal 10MB');
      }

      // Parse file
      let data: ParsedData;
      if (fileType.endsWith('.csv')) {
        const content = await selectedFile.text();
        data = ImportService.parseCSV(content);
      } else {
        data = await ImportService.parseExcel(selectedFile);
      }

      setParsedData(data);
      
      // Auto-map common field names
      const autoMapping: FieldMapping = {
        participant_name: '',
        participant_email: '',
        phone_number: '',
        custom_fields: {}
      };

      data.headers.forEach(header => {
        const lowerHeader = header.toLowerCase();
        if (lowerHeader.includes('nama') || lowerHeader.includes('name')) {
          autoMapping.participant_name = header;
        } else if (lowerHeader.includes('email') || lowerHeader.includes('mail')) {
          autoMapping.participant_email = header;
        } else if (lowerHeader.includes('phone') || lowerHeader.includes('telp') || lowerHeader.includes('hp')) {
          autoMapping.phone_number = header;
        }
      });

      setFieldMapping(autoMapping);
      setCurrentStep('mapping');
      
      toast({
        title: 'File berhasil diupload',
        description: `Ditemukan ${data.totalRows} baris data dengan ${data.headers.length} kolom`,
      });
    } catch (error) {
      console.error('Error handling file:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Gagal memproses file',
        variant: 'destructive',
      });
    }
  };

  const handleEventChange = async (eventId: string) => {
    setSelectedEventId(eventId);
    if (eventId) {
      try {
        const fields = await ImportService.getEventCustomFields(eventId);
        setCustomFields(fields);
      } catch (error) {
        console.error('Error getting custom fields:', error);
      }
    }
  };

  const handleMappingChange = (field: keyof FieldMapping, value: string) => {
    setFieldMapping(prev => ({
      ...prev,
      [field]: value === '__none__' ? '' : value
    }));
  };

  const handleCustomFieldMapping = (fieldName: string, columnName: string) => {
    setFieldMapping(prev => ({
      ...prev,
      custom_fields: {
        ...prev.custom_fields,
        [fieldName]: columnName === '__none__' ? '' : columnName
      }
    }));
  };

  const handlePreview = async () => {
    if (!parsedData || !selectedEventId) return;

    try {
      const validation = await ImportService.validateData(parsedData, selectedEventId, fieldMapping);
      setValidationResult(validation);
      setCurrentStep('preview');
    } catch (error) {
      console.error('Error validating data:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Gagal memvalidasi data',
        variant: 'destructive',
      });
    }
  };

  const handleImport = async () => {
    if (!parsedData || !selectedEventId) return;

    try {
      setImporting(true);
      setImportProgress(0);
      setCurrentStep('import');

      const config: ImportConfig = {
        eventId: selectedEventId,
        fileType: file?.name.toLowerCase().endsWith('.csv') ? 'csv' : 'excel',
        mapping: fieldMapping,
        options: importOptions
      };

      // Simulate progress
      const progressInterval = setInterval(() => {
        setImportProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      const result = await ImportService.importData(parsedData, config);
      
      clearInterval(progressInterval);
      setImportProgress(100);
      setImportResult(result);

      if (result.success) {
        toast({
          title: 'Import berhasil',
          description: `Berhasil mengimport ${result.successfulImports} dari ${result.totalRecords} data`,
        });
      } else {
        toast({
          title: 'Import selesai dengan error',
          description: `Berhasil: ${result.successfulImports}, Gagal: ${result.failedImports}`,
          variant: 'destructive',
        });
      }

      setCurrentStep('complete');
      onImportComplete();
    } catch (error) {
      console.error('Error importing data:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Gagal mengimport data',
        variant: 'destructive',
      });
      setCurrentStep('preview');
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadTemplate = () => {
    if (!selectedEventId) {
      toast({
        title: 'Pilih Event',
        description: 'Pilih event terlebih dahulu untuk download template',
        variant: 'destructive',
      });
      return;
    }

    const headers = ['Nama Peserta', 'Email', 'Nomor Telepon'];
    const customHeaders = customFields.map(field => field.label);
    const allHeaders = [...headers, ...customHeaders];
    
    const template = ImportService.generateTemplate(allHeaders, customFields);
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `template_${selectedEvent?.name || 'event'}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resetDialog = () => {
    setFile(null);
    setParsedData(null);
    setSelectedEventId('');
    setFieldMapping({
      participant_name: '',
      participant_email: '',
      phone_number: '',
      custom_fields: {}
    });
    setImportOptions({
      skipDuplicates: true,
      defaultStatus: 'pending',
      sendEmails: false,
      validateOnly: false
    });
    setValidationResult(null);
    setImporting(false);
    setImportProgress(0);
    setImportResult(null);
    setCustomFields([]);
    setCurrentStep('upload');
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      resetDialog();
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'upload':
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="event-select">Pilih Event</Label>
                <Select value={selectedEventId} onValueChange={handleEventChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih event untuk import data" />
                  </SelectTrigger>
                  <SelectContent>
                    {events.map(event => (
                      <SelectItem key={event.id} value={event.id}>
                        {event.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedEventId && (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadTemplate}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Template
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Download template untuk format yang benar
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <Label>Upload File</Label>
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-gray-400 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-lg font-medium">Klik untuk upload file</p>
                <p className="text-sm text-muted-foreground">
                  Support format CSV dan Excel (maksimal 10MB)
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file);
                  }}
                />
              </div>
            </div>

            {file && (
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <FileText className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-800">{file.name}</p>
                  <p className="text-sm text-green-600">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
            )}
          </div>
        );

      case 'mapping':
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="font-medium">Map Kolom File ke Field Database</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name-mapping">Nama Peserta *</Label>
                  <Select value={fieldMapping.participant_name} onValueChange={(value) => handleMappingChange('participant_name', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih kolom nama" />
                    </SelectTrigger>
                    <SelectContent>
                      {parsedData?.headers.map(header => (
                        <SelectItem key={header} value={header}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="email-mapping">Email *</Label>
                  <Select value={fieldMapping.participant_email} onValueChange={(value) => handleMappingChange('participant_email', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih kolom email" />
                    </SelectTrigger>
                    <SelectContent>
                      {parsedData?.headers.map(header => (
                        <SelectItem key={header} value={header}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="phone-mapping">Nomor Telepon</Label>
                  <Select value={fieldMapping.phone_number || '__none__'} onValueChange={(value) => handleMappingChange('phone_number', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih kolom telepon (opsional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Tidak ada</SelectItem>
                      {parsedData?.headers.map(header => (
                        <SelectItem key={header} value={header}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {customFields.length > 0 && (
                <div className="space-y-4">
                  <Separator />
                  <h4 className="font-medium">Custom Fields</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {customFields.map(field => (
                      <div key={field.name}>
                        <Label htmlFor={`custom-${field.name}`}>
                          {field.label} {field.required && <span className="text-red-500">*</span>}
                        </Label>
                        <Select 
                          value={fieldMapping.custom_fields?.[field.name] || '__none__'} 
                          onValueChange={(value) => handleCustomFieldMapping(field.name, value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={`Pilih kolom ${field.label}`} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">Tidak ada</SelectItem>
                            {parsedData?.headers.map(header => (
                              <SelectItem key={header} value={header}>
                                {header}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <Separator />
                <h4 className="font-medium">Opsi Import</h4>
                
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="skip-duplicates"
                      checked={importOptions.skipDuplicates}
                      onCheckedChange={(checked) => setImportOptions(prev => ({ ...prev, skipDuplicates: checked as boolean }))}
                    />
                    <Label htmlFor="skip-duplicates">Lewati data duplikat (berdasarkan email)</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="send-emails"
                      checked={importOptions.sendEmails}
                      onCheckedChange={(checked) => setImportOptions(prev => ({ ...prev, sendEmails: checked as boolean }))}
                    />
                    <Label htmlFor="send-emails">Kirim email konfirmasi ke peserta</Label>
                  </div>
                </div>

                <div>
                  <Label htmlFor="default-status">Status Default</Label>
                  <Select 
                    value={importOptions.defaultStatus} 
                    onValueChange={(value: 'pending' | 'approved') => setImportOptions(prev => ({ ...prev, defaultStatus: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        );

      case 'preview':
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="font-medium">Preview Data</h3>
              
              {validationResult && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant={validationResult.isValid ? 'default' : 'destructive'}>
                      {validationResult.isValid ? 'Valid' : 'Ada Error'}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {parsedData?.totalRows} baris data
                    </span>
                  </div>

                  {validationResult.errors.length > 0 && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="space-y-2">
                          <p className="font-medium">Ditemukan {validationResult.errors.length} error:</p>
                          <ul className="text-sm space-y-1">
                            {validationResult.errors.slice(0, 5).map((error, index) => (
                              <li key={index}>
                                • {error.field}: {error.message}
                                {error.suggestion && ` (Saran: ${error.suggestion})`}
                              </li>
                            ))}
                            {validationResult.errors.length > 5 && (
                              <li>• ... dan {validationResult.errors.length - 5} error lainnya</li>
                            )}
                          </ul>
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}

                  {validationResult.warnings.length > 0 && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="space-y-2">
                          <p className="font-medium">Ditemukan {validationResult.warnings.length} warning:</p>
                          <ul className="text-sm space-y-1">
                            {validationResult.warnings.slice(0, 3).map((warning, index) => (
                              <li key={index}>• {warning.message}</li>
                            ))}
                            {validationResult.warnings.length > 3 && (
                              <li>• ... dan {validationResult.warnings.length - 3} warning lainnya</li>
                            )}
                          </ul>
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}

                  {parsedData && (
                    <div className="border rounded-lg overflow-hidden">
                      <div className="bg-gray-50 p-3 border-b">
                        <p className="text-sm font-medium">Preview Data (5 baris pertama)</p>
                      </div>
                      <div className="max-h-60 overflow-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              {parsedData.headers.map(header => (
                                <th key={header} className="px-3 py-2 text-left font-medium">
                                  {header}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {parsedData.rows.slice(0, 5).map((row, index) => (
                              <tr key={index} className="border-t">
                                {parsedData.headers.map(header => (
                                  <td key={header} className="px-3 py-2">
                                    {row.data[header] || '-'}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );

      case 'import':
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="font-medium">Importing Data</h3>
              
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span>{importProgress}%</span>
                </div>
                <Progress value={importProgress} className="w-full" />
                
                <div className="text-center py-8">
                  {importing ? (
                    <div className="space-y-2">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                      <p className="text-sm text-muted-foreground">Mengimport data...</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <CheckCircle className="h-8 w-8 text-green-600 mx-auto" />
                      <p className="text-sm text-muted-foreground">Import selesai!</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      case 'complete':
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="text-center py-4">
                {importResult?.success ? (
                  <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                ) : (
                  <XCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
                )}
                
                <h3 className="text-lg font-medium mb-2">
                  {importResult?.success ? 'Import Berhasil' : 'Import Selesai dengan Error'}
                </h3>
                
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>Total data: {importResult?.totalRecords}</p>
                  <p>Berhasil: {importResult?.successfulImports}</p>
                  <p>Gagal: {importResult?.failedImports}</p>
                </div>
              </div>

              {importResult?.errors && importResult.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <p className="font-medium">Error yang terjadi:</p>
                      <ul className="text-sm space-y-1">
                                                       {importResult.errors.slice(0, 3).map((error, index: number) => (
                                 <li key={index}>• {error.message}</li>
                               ))}
                        {importResult.errors.length > 3 && (
                          <li>• ... dan {importResult.errors.length - 3} error lainnya</li>
                        )}
                      </ul>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const canProceedToNext = () => {
    switch (currentStep) {
      case 'upload':
        return file && selectedEventId;
      case 'mapping':
        return fieldMapping.participant_name && fieldMapping.participant_email;
      case 'preview':
        return validationResult && validationResult.isValid;
      case 'import':
        return !importing;
      default:
        return true;
    }
  };

  const handleNext = () => {
    switch (currentStep) {
      case 'upload':
        setCurrentStep('mapping');
        break;
      case 'mapping':
        handlePreview();
        break;
      case 'preview':
        handleImport();
        break;
      case 'import':
        setCurrentStep('complete');
        break;
    }
  };

  const handleBack = () => {
    switch (currentStep) {
      case 'mapping':
        setCurrentStep('upload');
        break;
      case 'preview':
        setCurrentStep('mapping');
        break;
      case 'complete':
        setCurrentStep('upload');
        break;
    }
  };

  const currentStepIndex = IMPORT_STEPS.findIndex(step => step.id === currentStep);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="h-4 w-4 mr-2" />
          Import Peserta
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Data Peserta</DialogTitle>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-6">
          {IMPORT_STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                index <= currentStepIndex 
                  ? 'bg-primary border-primary text-primary-foreground' 
                  : 'bg-background border-muted-foreground text-muted-foreground'
              }`}>
                {index + 1}
              </div>
              <div className="ml-2">
                <p className="text-sm font-medium">{step.title}</p>
                <p className="text-xs text-muted-foreground">{step.description}</p>
              </div>
              {index < IMPORT_STEPS.length - 1 && (
                <div className={`w-16 h-0.5 mx-4 ${
                  index < currentStepIndex ? 'bg-primary' : 'bg-muted'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="space-y-6">
          {renderStepContent()}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-6 border-t">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 'upload' || currentStep === 'import'}
          >
            Kembali
          </Button>
          
          <div className="flex gap-2">
            {currentStep === 'complete' ? (
              <Button onClick={() => handleOpenChange(false)}>
                Selesai
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                disabled={!canProceedToNext() || importing}
              >
                {currentStep === 'preview' ? 'Import Data' : 'Lanjut'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 