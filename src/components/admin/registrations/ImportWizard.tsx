import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
  Upload, 
  FileText, 
  Settings, 
  Eye, 
  CheckCircle, 
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  X,
  Loader2,
  Sparkles,
  Bug,
  AlertTriangle,
  Download
} from 'lucide-react';
import { ImportService } from '@/lib/import-service';
import { ImportTemplateService } from '@/lib/import-template-service';
import { 
  type ImportTemplate,
  type ImportPreviewData,
  type ImportProgress,
  type ImportConfig,
  type ImportError,
  type ImportResult
} from './import-types';

// Step components
import { FileUploadStep } from './import-steps/FileUploadStep';
import { TemplateSelectionStep } from './import-steps/TemplateSelectionStep';
import { FieldMappingStep } from './import-steps/FieldMappingStep';
import { DataPreviewStep } from './import-steps/DataPreviewStep';
import { ValidationStep } from './import-steps/ValidationStep';
import { ImportProgressStep } from './import-steps/ImportProgressStep';

// Advanced components
import { ImportTemplateBuilder } from './ImportTemplateBuilder';
import { ImportTemplateLibrary } from './ImportTemplateLibrary';
import { ImportHistory } from './ImportHistory';
import { BatchImportProcessor } from './BatchImportProcessor';

interface ImportWizardProps {
  eventId: string;
  onImportComplete?: () => void;
}

type WizardStep = 'upload' | 'template' | 'mapping' | 'preview' | 'validation' | 'importing' | 'complete';

const STEPS: { key: WizardStep; title: string; description: string; icon: React.ReactNode }[] = [
  {
    key: 'upload',
    title: 'Upload File',
    description: 'Pilih file CSV atau Excel',
    icon: <Upload className="h-4 w-4" />
  },
  {
    key: 'template',
    title: 'Pilih Template',
    description: 'Pilih template import',
    icon: <FileText className="h-4 w-4" />
  },
  {
    key: 'mapping',
    title: 'Field Mapping',
    description: 'Map kolom ke field',
    icon: <Settings className="h-4 w-4" />
  },
  {
    key: 'preview',
    title: 'Preview Data',
    description: 'Review data sebelum import',
    icon: <Eye className="h-4 w-4" />
  },
  {
    key: 'validation',
    title: 'Validasi',
    description: 'Validasi data',
    icon: <CheckCircle className="h-4 w-4" />
  },
  {
    key: 'importing',
    title: 'Importing',
    description: 'Proses import data',
    icon: <Loader2 className="h-4 w-4" />
  }
];

export function ImportWizard({ eventId, onImportComplete }: ImportWizardProps) {
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState<WizardStep>('upload');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  // Validate eventId on component mount
  useEffect(() => {
    if (!eventId || eventId.trim() === '') {
      console.error('❌ ImportWizard: Invalid eventId provided:', eventId);
      setError('Invalid event ID. Please refresh the page and try again.');
    } else {
      console.log('✅ ImportWizard: Valid eventId:', eventId);
    }
  }, [eventId]);
  
  // Step data
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<{
    headers: string[];
    rows: Record<string, unknown>[];
    totalRows: number;
  } | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<ImportTemplate | null>(null);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [previewData, setPreviewData] = useState<ImportPreviewData | null>(null);
  const [validationErrors, setValidationErrors] = useState<ImportError[]>([]);
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null);
  const [importConfig, setImportConfig] = useState<ImportConfig>({
    eventId,
    defaultStatus: 'pending',
    skipDuplicates: true,
    validateOnly: false,
    batchSize: 100,
    fieldMapping: {},
    validationRules: {}
  });

  // Update importConfig when fieldMapping changes
  useEffect(() => {
    setImportConfig(prev => ({
      ...prev,
      fieldMapping,
      validationRules: selectedTemplate?.validation_rules || {}
    }));
  }, [fieldMapping, selectedTemplate]);

  // Advanced features state
  const [showTemplateLibrary, setShowTemplateLibrary] = useState(false);
  const [showImportHistory, setShowImportHistory] = useState(false);
  const [showBatchProcessor, setShowBatchProcessor] = useState(false);
  const [useBatchProcessing, setUseBatchProcessing] = useState(false);

  // Animation states
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  // Reset wizard when dialog opens/closes
  useEffect(() => {
    if (!open) {
      resetWizard();
    }
  }, [open]);

  const resetWizard = () => {
    setCurrentStep('upload');
    setFile(null);
    setParsedData(null);
    setSelectedTemplate(null);
    setFieldMapping({});
    setPreviewData(null);
    setValidationErrors([]);
    setImportProgress(null);
    setImportResult(null);
    setError(null);
    setLoading(false);
    setShowSuccessAnimation(false);
    setTestResult(null);
  };

  const goToStep = useCallback((step: WizardStep) => {
    setIsTransitioning(true);
    setCurrentStep(step);
    setError(null);
    
    // Smooth transition animation
    setTimeout(() => {
      setIsTransitioning(false);
    }, 300);
  }, []);

  const goToNextStep = useCallback(() => {
    const currentIndex = STEPS.findIndex(s => s.key === currentStep);
    if (currentIndex < STEPS.length - 1) {
      const nextStep = STEPS[currentIndex + 1].key;
      goToStep(nextStep);
    }
  }, [currentStep, goToStep]);

  const goToPreviousStep = () => {
    const currentIndex = STEPS.findIndex(s => s.key === currentStep);
    if (currentIndex > 0) {
      const previousStep = STEPS[currentIndex - 1].key;
      goToStep(previousStep);
    }
  };

  // Step handlers
  const handleFileUpload = useCallback(async (uploadedFile: File) => {
    setLoading(true);
    setError(null);
    
    try {
      setFile(uploadedFile);
      
      // Parse file to get headers and data
      let parsedFileData;
      if (uploadedFile.name.toLowerCase().endsWith('.csv')) {
        const content = await uploadedFile.text();
        parsedFileData = ImportService.parseCSV(content);
      } else {
        parsedFileData = await ImportService.parseExcel(uploadedFile);
      }
      
      setParsedData(parsedFileData);
      
      // Auto-detect template based on headers
      const templates = await ImportTemplateService.getTemplates(eventId);
      const detectedTemplate = templates.find(template => {
        const templateFields = Object.values(template.field_mapping);
        return templateFields.some(field => 
          parsedFileData.headers.some(header => 
            header.toLowerCase().includes(field.toLowerCase()) ||
            field.toLowerCase().includes(header.toLowerCase())
          )
        );
      });
      
      if (detectedTemplate) {
        setSelectedTemplate(detectedTemplate);
        setFieldMapping(detectedTemplate.field_mapping);
      }
      
      goToNextStep();
    } catch (err) {
      setError('Gagal membaca file. Pastikan format file benar.');
      console.error('File upload error:', err);
    } finally {
      setLoading(false);
    }
  }, [eventId, goToNextStep]);

  const handleTemplateSelect = useCallback((template: ImportTemplate) => {
    setSelectedTemplate(template);
    setFieldMapping(template.field_mapping);
    goToNextStep();
  }, [goToNextStep]);

  const handleFieldMappingComplete = useCallback(async () => {
    if (!file || !selectedTemplate) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Parse and preview data using the new flexible field mapping
      const data = await ImportService.parseFile(file, fieldMapping);
      const preview = await ImportService.validateData(data, selectedTemplate.validation_rules || {}, fieldMapping);
      
      setPreviewData(preview);
      setValidationErrors(preview.errors);
      
      goToNextStep();
    } catch (err) {
      setError('Gagal memproses data. Silakan cek field mapping.');
      console.error('Field mapping error:', err);
    } finally {
      setLoading(false);
    }
  }, [file, selectedTemplate, fieldMapping, goToNextStep]);

  const handlePreviewConfirm = useCallback(() => {
    goToNextStep();
  }, [goToNextStep]);

  const handleValidationComplete = useCallback(async () => {
    if (!file || !selectedTemplate || !previewData) return;
    
    // Validate eventId before proceeding
    if (!eventId || eventId.trim() === '') {
      setError('Invalid event ID. Please refresh the page and try again.');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Start import process
      goToStep('importing');
      
      const progress = await ImportService.importData(
        file,
        {
          eventId: eventId, // Use the validated eventId directly
          fileType: file.name.toLowerCase().endsWith('.csv') ? 'csv' : 'excel',
          mapping: fieldMapping, // Use flexible field mapping directly
          validationRules: selectedTemplate.validation_rules || {},
          options: {
            skipDuplicates: importConfig.skipDuplicates,
            defaultStatus: importConfig.defaultStatus as 'pending' | 'approved',
            sendEmails: false,
            validateOnly: importConfig.validateOnly
          }
        },
        (progressUpdate) => {
          setImportProgress(progressUpdate);
        }
      );
      
      if (progress.success) {
        setImportResult(progress);
        setShowSuccessAnimation(true);
        goToStep('complete');
        if (onImportComplete) {
          onImportComplete();
        }
      } else {
        setError('Import gagal. Silakan coba lagi.');
        goToStep('validation');
      }
    } catch (err) {
      setError('Gagal melakukan import. Silakan coba lagi.');
      console.error('Import error:', err);
      goToStep('validation');
    } finally {
      setLoading(false);
    }
  }, [file, selectedTemplate, previewData, importConfig, fieldMapping, onImportComplete, goToStep, eventId]);

  // Advanced features handlers
  const handleTemplateLibraryOpen = () => {
    setShowTemplateLibrary(true);
  };

  const handleImportHistoryOpen = () => {
    setShowImportHistory(true);
  };

  const handleBatchProcessorOpen = () => {
    // Check if we have a proper field mapping
    if (!fieldMapping || Object.keys(fieldMapping).length === 0) {
      // If no field mapping, try to auto-detect from parsed data
      if (parsedData && parsedData.headers.length > 0) {
        console.log('🔍 Auto-detecting field mapping for batch processor...');
        const autoMapping: Record<string, string> = {};
        
        // Auto-detect common fields
        parsedData.headers.forEach(header => {
          const headerLower = header.toLowerCase();
          if (headerLower.includes('nama') || headerLower.includes('name')) {
            autoMapping.participant_name = header;
          } else if (headerLower.includes('email') || headerLower.includes('mail')) {
            autoMapping.participant_email = header;
          } else if (headerLower.includes('phone') || headerLower.includes('telepon') || headerLower.includes('hp')) {
            autoMapping.phone_number = header;
          } else {
            // Add as custom field
            autoMapping[`custom_${header.toLowerCase().replace(/\s+/g, '_')}`] = header;
          }
        });
        
        console.log('✅ Auto-detected field mapping:', autoMapping);
        setFieldMapping(autoMapping);
        setImportConfig(prev => ({
          ...prev,
          fieldMapping: autoMapping
        }));
      } else {
        // Show error message
        setError('Silakan selesaikan field mapping terlebih dahulu sebelum menggunakan batch processor');
        return;
      }
    }
    
    setShowBatchProcessor(true);
  };

  const handleTemplateSelectFromLibrary = (template: ImportTemplate) => {
    setSelectedTemplate(template);
    setFieldMapping(template.field_mapping);
    setImportConfig(prev => ({
      ...prev,
      validationRules: template.validation_rules || {}
    }));
    setShowTemplateLibrary(false);
    goToStep('mapping');
  };

  const handleBatchProcessingComplete = (result: ImportResult) => {
    setShowBatchProcessor(false);
    setImportResult(result);
    setShowSuccessAnimation(true);
    if (onImportComplete) {
      onImportComplete();
    }
  };

  const handleTestImportService = async () => {
    setLoading(true);
    setTestResult(null);
    setError(null);
    
    try {
      const result = await ImportService.testImportService(eventId);
      if (result.success) {
        setTestResult(`✅ ${result.message}\n\nDetails:\n${JSON.stringify(result.details, null, 2)}`);
      } else {
        setError(`❌ ${result.message}\n\nDetails:\n${JSON.stringify(result.details, null, 2)}`);
      }
    } catch (err) {
      setError(`Test failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = (format: 'csv' | 'excel') => {
    try {
      if (format === 'csv') {
        // Create CSV content with better sample data
        const csvContent = `Nama,Email,Telepon,Status,Catatan
John Doe,john.doe@example.com,081234567890,pending,Sample registration 1
Jane Smith,jane.smith@example.com,081234567891,confirmed,Sample registration 2
Bob Johnson,bob.johnson@example.com,081234567892,pending,Sample registration 3
Alice Brown,alice.brown@example.com,081234567893,cancelled,Sample registration 4
Charlie Wilson,charlie.wilson@example.com,081234567894,pending,Sample registration 5`;

        // Create blob and download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'registration-template.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Show success message
        console.log('✅ CSV template downloaded successfully');
      } else {
        // For Excel, we'll create a tab-separated file that can be opened in Excel
        const excelContent = `Nama\tEmail\tTelepon\tStatus\tCatatan
John Doe\tjohn.doe@example.com\t081234567890\tpending\tSample registration 1
Jane Smith\tjane.smith@example.com\t081234567891\tconfirmed\tSample registration 2
Bob Johnson\tbob.johnson@example.com\t081234567892\tpending\tSample registration 3
Alice Brown\talice.brown@example.com\t081234567893\tcancelled\tSample registration 4
Charlie Wilson\tcharlie.wilson@example.com\t081234567894\tpending\tSample registration 5`;

        const blob = new Blob([excelContent], { type: 'text/tab-separated-values;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'registration-template.xls');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Show success message
        console.log('✅ Excel template downloaded successfully');
      }
    } catch (error) {
      console.error('❌ Error downloading template:', error);
      setError('Failed to download template');
    }
  };

  const getCurrentStepIndex = () => {
    return STEPS.findIndex(s => s.key === currentStep);
  };

  const getProgressPercentage = () => {
    const currentIndex = getCurrentStepIndex();
    return ((currentIndex + 1) / STEPS.length) * 100;
  };

  const renderCurrentStep = () => {
    const stepContent = (() => {
      switch (currentStep) {
        case 'upload':
          return (
            <FileUploadStep
              onFileUpload={handleFileUpload}
              loading={loading}
              error={error}
            />
          );
        
        case 'template':
          return (
            <TemplateSelectionStep
              eventId={eventId}
              onTemplateSelect={handleTemplateSelect}
              selectedTemplate={selectedTemplate}
              onBack={() => goToStep('upload')}
            />
          );
        
        case 'mapping':
          return (
            <FieldMappingStep
              file={file}
              template={selectedTemplate}
              fieldMapping={fieldMapping}
              onFieldMappingChange={setFieldMapping}
              onComplete={handleFieldMappingComplete}
              onBack={() => goToStep('template')}
              loading={loading}
              error={error}
              parsedData={parsedData}
            />
          );
        
        case 'preview':
          return (
            <DataPreviewStep
              previewData={previewData}
              onConfirm={handlePreviewConfirm}
              onBack={() => goToStep('mapping')}
            />
          );
        
        case 'validation':
          return (
            <ValidationStep
              validationErrors={validationErrors}
              importConfig={importConfig}
              onImportConfigChange={setImportConfig}
              onComplete={handleValidationComplete}
              onBack={() => goToStep('preview')}
              loading={loading}
              error={error}
            />
          );
        
        case 'importing':
          return (
            <ImportProgressStep
              progress={importProgress}
              onBack={() => goToStep('validation')}
            />
          );
        
        case 'complete':
          return (
            <div className="text-center py-8">
              <div className="relative">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                {showSuccessAnimation && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Sparkles className="h-8 w-8 text-yellow-400 animate-pulse" />
                  </div>
                )}
              </div>
              <h3 className="text-lg font-semibold mb-2">Import Selesai!</h3>
              <p className="text-muted-foreground mb-4">
                Proses import telah selesai.
              </p>
              {importResult && (
                <div className="bg-blue-50 p-4 rounded-lg mb-4 text-left">
                  <h4 className="font-medium mb-3">Ringkasan Import:</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Total Data:</span>
                      <p className="text-blue-600">{importResult.totalRecords}</p>
                    </div>
                    <div>
                      <span className="font-medium">Berhasil Import:</span>
                      <p className="text-green-600">{importResult.successfulImports}</p>
                    </div>
                    <div>
                      <span className="font-medium">Gagal Import:</span>
                      <p className="text-red-600">{importResult.failedImports}</p>
                    </div>
                    <div>
                      <span className="font-medium">Duplikat (Dilewati):</span>
                      <p className="text-orange-600">{importResult.totalRecords - importResult.successfulImports - importResult.failedImports}</p>
                    </div>
                  </div>
                  
                  {/* Show failed imports details */}
                  {importResult.failedImports > 0 && (
                    <div className="mt-4 p-3 bg-red-50 rounded border border-red-200">
                      <h5 className="font-medium text-red-800 mb-2">Data yang Gagal Import ({importResult.failedImports}):</h5>
                      <div className="text-xs text-red-700 max-h-32 overflow-y-auto">
                        {importResult.errors && importResult.errors.length > 0 ? (
                          <>
                            {importResult.errors.slice(0, 5).map((error, index) => (
                              <div key={index} className="mb-1">
                                • Row {error.row}: {error.message} - {error.value}
                              </div>
                            ))}
                            {importResult.errors.length > 5 && (
                              <div className="text-orange-600">
                                ... dan {importResult.errors.length - 5} error lainnya
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="text-gray-600">
                            Data gagal di-import karena duplikat atau error lainnya
                          </div>
                        )}
                      </div>
                      
                      {/* Debug info */}
                      <div className="text-xs text-gray-600 mt-2">
                        Debug: failedImportData length: {importResult.failedImportData?.length || 0}
                      </div>
                      
                      {/* Export failed imports button */}
                      <Button 
                        onClick={() => {
                          console.log('Download button clicked (inside section)');
                          console.log('failedImportData:', importResult.failedImportData);
                          console.log('errors:', importResult.errors);
                          
                          // Always create download data from errors as fallback
                          const downloadData = (importResult.errors || []).map(error => {
                            // Try to extract name and email from error value
                            const errorValue = error.value || '';
                            let name = 'Unknown';
                            let email = 'Unknown';
                            
                            // Parse error value like "Unknown (email@example.com)"
                            if (errorValue.includes('(') && errorValue.includes(')')) {
                              const match = errorValue.match(/^(.+?)\s*\(([^)]+)\)$/);
                              if (match) {
                                name = match[1].trim();
                                email = match[2].trim();
                              }
                            } else if (errorValue.includes('@')) {
                              // If it's just an email
                              email = errorValue;
                            } else {
                              name = errorValue;
                            }
                            
                            return {
                              row_number: error.row,
                              name: name,
                              email: email,
                              phone: '',
                              error_message: error.message,
                              error_field: error.field || 'unknown',
                              original_data: {}
                            };
                          });
                          
                          console.log('Created download data (inside section):', downloadData);
                          
                          // If no errors but there are failed imports, create informative data
                          if (downloadData.length === 0 && importResult.failedImports > 0) {
                            const informativeData = [{
                              row_number: 1,
                              name: 'Data yang Gagal Import',
                              email: `${importResult.failedImports} data`,
                              phone: '',
                              error_message: `Total ${importResult.failedImports} data gagal di-import karena duplikat atau error lainnya`,
                              error_field: 'summary',
                              original_data: {
                                total_failed: importResult.failedImports,
                                total_successful: importResult.successfulImports,
                                total_records: importResult.totalRecords,
                                note: 'Data detail tidak tersedia, tetapi ada data yang gagal di-import'
                              }
                            }];
                            console.log('Using informative data (inside section):', informativeData);
                            ImportService.downloadFailedImportsCSV(
                              informativeData,
                              `failed-imports-summary-${new Date().toISOString().split('T')[0]}.csv`
                            );
                          } else {
                            ImportService.downloadFailedImportsCSV(
                              downloadData,
                              `failed-imports-${new Date().toISOString().split('T')[0]}.csv`
                            );
                          }
                        }}
                        variant="outline"
                        size="sm"
                        className="mt-2 text-red-700 border-red-300 hover:bg-red-100"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download Data Gagal (CSV)
                      </Button>
                    </div>
                  )}
                </div>
              )}
              
              <div className="flex gap-2 justify-center">
                <Button 
                  onClick={() => setOpen(false)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Tutup
                </Button>
                {importResult?.failedImports > 0 && (
                  <Button 
                    onClick={() => {
                      console.log('Download button clicked (bottom)');
                      console.log('failedImportData:', importResult.failedImportData);
                      console.log('errors:', importResult.errors);
                      
                      // Always create download data from errors as fallback
                      const downloadData = (importResult.errors || []).map(error => {
                        // Try to extract name and email from error value
                        const errorValue = error.value || '';
                        let name = 'Unknown';
                        let email = 'Unknown';
                        
                        // Parse error value like "Unknown (email@example.com)"
                        if (errorValue.includes('(') && errorValue.includes(')')) {
                          const match = errorValue.match(/^(.+?)\s*\(([^)]+)\)$/);
                          if (match) {
                            name = match[1].trim();
                            email = match[2].trim();
                          }
                        } else if (errorValue.includes('@')) {
                          // If it's just an email
                          email = errorValue;
                        } else {
                          name = errorValue;
                        }
                        
                        return {
                          row_number: error.row,
                          name: name,
                          email: email,
                          phone: '',
                          error_message: error.message,
                          error_field: error.field || 'unknown',
                          original_data: {}
                        };
                      });
                      
                      console.log('Created download data:', downloadData);
                      
                      // If no errors but there are failed imports, create informative data
                      if (downloadData.length === 0 && importResult.failedImports > 0) {
                        const informativeData = [{
                          row_number: 1,
                          name: 'Data yang Gagal Import',
                          email: `${importResult.failedImports} data`,
                          phone: '',
                          error_message: `Total ${importResult.failedImports} data gagal di-import karena duplikat atau error lainnya`,
                          error_field: 'summary',
                          original_data: {
                            total_failed: importResult.failedImports,
                            total_successful: importResult.successfulImports,
                            total_records: importResult.totalRecords,
                            note: 'Data detail tidak tersedia, tetapi ada data yang gagal di-import'
                          }
                        }];
                        console.log('Using informative data:', informativeData);
                        ImportService.downloadFailedImportsCSV(
                          informativeData,
                          `failed-imports-summary-${new Date().toISOString().split('T')[0]}.csv`
                        );
                      } else {
                        ImportService.downloadFailedImportsCSV(
                          downloadData,
                          `failed-imports-${new Date().toISOString().split('T')[0]}.csv`
                        );
                      }
                    }}
                    variant="outline"
                    className="border-orange-300 text-orange-700 hover:bg-orange-50"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Data Gagal ({importResult.failedImports})
                  </Button>
                )}
                                  </div>
              </div>
          );
        
        default:
          return null;
      }
    })();

    return (
      <div className={`transition-all duration-300 ease-in-out ${
        isTransitioning ? 'opacity-50 scale-95' : 'opacity-100 scale-100'
      }`}>
        {stepContent}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="hover:scale-105 transition-transform">
          <Upload className="h-4 w-4 mr-2" />
          Import Data
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Import Data Peserta
            {showSuccessAnimation && (
              <Sparkles className="h-5 w-5 text-yellow-400 animate-pulse" />
            )}
          </DialogTitle>
          <DialogDescription>
            Import data peserta dari file CSV atau Excel
          </DialogDescription>
          
          {/* Template Information */}
          <div className="bg-blue-50 p-4 rounded-lg mt-4">
            <h4 className="font-medium text-blue-900 mb-2">📋 Template Format</h4>
            <div className="text-sm text-blue-800 space-y-1">
              <p><strong>Required Fields:</strong> Nama, Email</p>
              <p><strong>Optional Fields:</strong> Telepon, Status, Catatan</p>
              <p><strong>Status Options:</strong> pending, confirmed, cancelled</p>
              <p><strong>Format:</strong> CSV atau Excel dengan header di baris pertama</p>
            </div>
          </div>
          {/* Advanced Features Buttons */}
          <div className="flex gap-2 mt-4 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDownloadTemplate('csv')}
              className="hover:bg-green-50 transition-colors"
            >
              <Download className="h-4 w-4 mr-2" />
              Download CSV Template
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDownloadTemplate('excel')}
              className="hover:bg-blue-50 transition-colors"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Excel Template
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleTemplateLibraryOpen}
              className="hover:bg-blue-50 transition-colors"
            >
              <FileText className="h-4 w-4 mr-2" />
              Template Library
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleImportHistoryOpen}
              className="hover:bg-purple-50 transition-colors"
            >
              <Eye className="h-4 w-4 mr-2" />
              Import History
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleBatchProcessorOpen}
              className="hover:bg-orange-50 transition-colors"
            >
              <Settings className="h-4 w-4 mr-2" />
              Batch Processor
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestImportService}
              disabled={loading}
              className="hover:bg-red-50 transition-colors"
            >
              <Bug className="h-4 w-4 mr-2" />
              Test Import
            </Button>
          </div>
        </DialogHeader>
        
        {/* Progress Bar */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Progress</span>
            <span className="text-sm text-muted-foreground">
              Step {getCurrentStepIndex() + 1} dari {STEPS.length}
            </span>
          </div>
          <Progress 
            value={getProgressPercentage()} 
            className="w-full h-3 transition-all duration-500 ease-out"
          />
          
          {/* Step Indicators */}
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => {
              const isActive = step.key === currentStep;
              const isCompleted = getCurrentStepIndex() > index;
              
              return (
                <div key={step.key} className="flex flex-col items-center space-y-2">
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium
                    transition-all duration-300 ease-in-out transform
                    ${isActive ? 'bg-primary text-primary-foreground scale-110' : ''}
                    ${isCompleted ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'}
                    ${isActive ? 'shadow-lg' : 'hover:scale-105'}
                  `}>
                    {isCompleted ? <CheckCircle className="h-4 w-4" /> : step.icon}
                  </div>
                  <div className="text-center">
                    <div className={`text-xs font-medium transition-colors duration-300 ${
                      isActive ? 'text-primary' : 'text-muted-foreground'
                    }`}>
                      {step.title}
                    </div>
                    <div className="text-xs text-muted-foreground hidden sm:block">
                      {step.description}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Error Display */}
        {error && (
          <Alert variant="destructive" className="animate-in slide-in-from-top-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Test Result Display */}
        {testResult && (
          <Alert className="animate-in slide-in-from-top-2">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription className="whitespace-pre-wrap font-mono text-xs">
              {testResult}
            </AlertDescription>
          </Alert>
        )}
        
        {/* Current Step Content */}
        <div className="py-4">
          {renderCurrentStep()}
        </div>
        
        {/* Navigation Footer */}
        {currentStep !== 'complete' && currentStep !== 'importing' && (
          <DialogFooter>
            <div className="flex justify-between w-full">
              <Button
                variant="outline"
                onClick={goToPreviousStep}
                disabled={getCurrentStepIndex() === 0}
                className="transition-all duration-200 hover:scale-105"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Sebelumnya
              </Button>
              
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => setOpen(false)}
                  className="transition-all duration-200 hover:scale-105"
                >
                  <X className="h-4 w-4 mr-2" />
                  Batal
                </Button>
              </div>
            </div>
          </DialogFooter>
        )}
      </DialogContent>

      {/* Advanced Features Dialogs */}
      
      {/* Template Library Dialog */}
      <Dialog open={showTemplateLibrary} onOpenChange={setShowTemplateLibrary}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Template Library</DialogTitle>
            <DialogDescription>
              Browse dan gunakan template import yang tersedia
            </DialogDescription>
          </DialogHeader>
          <ImportTemplateLibrary
            eventId={eventId}
            onTemplateSelect={handleTemplateSelectFromLibrary}
          />
        </DialogContent>
      </Dialog>

      {/* Import History Dialog */}
      <Dialog open={showImportHistory} onOpenChange={setShowImportHistory}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import History</DialogTitle>
            <DialogDescription>
              Riwayat lengkap semua import yang telah dilakukan
            </DialogDescription>
          </DialogHeader>
          <ImportHistory eventId={eventId} />
        </DialogContent>
      </Dialog>

      {/* Batch Processor Dialog */}
      <Dialog open={showBatchProcessor} onOpenChange={setShowBatchProcessor}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Batch Import Processor</DialogTitle>
            <DialogDescription>
              Import file besar dengan batch processing
            </DialogDescription>
          </DialogHeader>
          
          {/* Warning if field mapping is incomplete */}
          {(!fieldMapping || Object.keys(fieldMapping).length === 0) && (
            <Alert className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Field Mapping Belum Lengkap</AlertTitle>
              <AlertDescription>
                Field mapping belum diselesaikan. Silakan selesaikan field mapping terlebih dahulu untuk hasil yang optimal.
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowBatchProcessor(false);
                    goToStep('mapping');
                  }}
                  className="mt-2"
                >
                  Lanjutkan ke Field Mapping
                </Button>
              </AlertDescription>
            </Alert>
          )}
          
          {file && (
            <BatchImportProcessor
              file={file}
              config={importConfig}
              eventId={eventId}
              onComplete={handleBatchProcessingComplete}
              onCancel={() => setShowBatchProcessor(false)}
            />
          )}
          {!file && (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                Silakan upload file terlebih dahulu untuk menggunakan batch processor
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Dialog>
  );
} 