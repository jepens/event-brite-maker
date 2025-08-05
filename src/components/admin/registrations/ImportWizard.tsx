import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
  Sparkles
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
    batchSize: 100
  });

  // Advanced features state
  const [showTemplateLibrary, setShowTemplateLibrary] = useState(false);
  const [showImportHistory, setShowImportHistory] = useState(false);
  const [showBatchProcessor, setShowBatchProcessor] = useState(false);
  const [useBatchProcessing, setUseBatchProcessing] = useState(false);

  // Animation states
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);

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
    
    setLoading(true);
    setError(null);
    
    try {
      // Start import process
      goToStep('importing');
      
      const progress = await ImportService.importData(
        file,
        {
          eventId: importConfig.eventId,
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
  }, [file, selectedTemplate, previewData, importConfig, fieldMapping, onImportComplete, goToStep]);

  // Advanced features handlers
  const handleTemplateLibraryOpen = () => {
    setShowTemplateLibrary(true);
  };

  const handleImportHistoryOpen = () => {
    setShowImportHistory(true);
  };

  const handleBatchProcessorOpen = () => {
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
              <h3 className="text-lg font-semibold mb-2">Import Berhasil!</h3>
              <p className="text-muted-foreground mb-4">
                Data telah berhasil diimport ke database.
              </p>
              {importResult && (
                <div className="bg-green-50 p-4 rounded-lg mb-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Total Records:</span>
                      <p className="text-green-600">{importResult.totalRecords}</p>
                    </div>
                    <div>
                      <span className="font-medium">Successful:</span>
                      <p className="text-green-600">{importResult.successfulImports}</p>
                    </div>
                  </div>
                </div>
              )}
              <Button 
                onClick={() => setOpen(false)}
                className="bg-green-600 hover:bg-green-700"
              >
                Tutup
              </Button>
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
          {/* Advanced Features Buttons */}
          <div className="flex gap-2 mt-4">
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