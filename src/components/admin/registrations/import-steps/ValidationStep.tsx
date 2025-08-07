import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  Loader2,
  Settings,
  Info
} from 'lucide-react';
import { type ImportConfig, type ImportError } from '../import-types';

interface ValidationStepProps {
  validationErrors: ImportError[];
  importConfig: ImportConfig;
  onImportConfigChange: (config: ImportConfig) => void;
  onComplete: () => void;
  onBack: () => void;
  loading?: boolean;
  error?: string | null;
}

export function ValidationStep({
  validationErrors,
  importConfig,
  onImportConfigChange,
  onComplete,
  onBack,
  loading,
  error
}: ValidationStepProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleConfigChange = (key: keyof ImportConfig, value: string | number | boolean) => {
    onImportConfigChange({
      ...importConfig,
      [key]: value
    });
  };

  const getErrorSummary = () => {
    const fieldErrors = validationErrors.filter(e => e.field);
    const generalErrors = validationErrors.filter(e => !e.field);
    
    const fieldErrorCounts = fieldErrors.reduce((acc, error) => {
      acc[error.field!] = (acc[error.field!] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalErrors: validationErrors.length,
      fieldErrors: fieldErrorCounts,
      generalErrors: generalErrors.length
    };
  };

  const errorSummary = getErrorSummary();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Validasi & Konfigurasi</h2>
          <p className="text-sm text-muted-foreground">
            Konfigurasi import dan review error
          </p>
        </div>
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Kembali
        </Button>
      </div>

      {/* Error Summary */}
      {validationErrors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <AlertCircle className="h-5 w-5 mr-2 text-red-500" />
              Error Summary
            </CardTitle>
            <CardDescription>
              {validationErrors.length} error ditemukan dalam data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{errorSummary.totalErrors}</div>
                <div className="text-sm text-red-600">Total Error</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{Object.keys(errorSummary.fieldErrors).length}</div>
                <div className="text-sm text-orange-600">Field dengan Error</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{errorSummary.generalErrors}</div>
                <div className="text-sm text-blue-600">General Error</div>
              </div>
            </div>

            {/* Field Error Breakdown */}
            {Object.keys(errorSummary.fieldErrors).length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Error per Field:</h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(errorSummary.fieldErrors).map(([field, count]) => (
                    <Badge key={field} variant="destructive" className="text-xs">
                      {field}: {count}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Import Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            Konfigurasi Import
          </CardTitle>
          <CardDescription>
            Pengaturan untuk proses import data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Settings */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="default-status">Status Default</Label>
                <Select
                  value={importConfig.defaultStatus}
                  onValueChange={(value) => handleConfigChange('defaultStatus', value)}
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
                <p className="text-xs text-muted-foreground">
                  Status default untuk data yang diimport
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="batch-size">Batch Size</Label>
                <Select
                  value={String(importConfig.batchSize)}
                  onValueChange={(value) => handleConfigChange('batchSize', parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="50">50 records</SelectItem>
                    <SelectItem value="100">100 records</SelectItem>
                    <SelectItem value="200">200 records</SelectItem>
                    <SelectItem value="500">500 records</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Jumlah record per batch untuk import
                </p>
              </div>
            </div>
          </div>

          {/* Advanced Settings */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Pengaturan Lanjutan</h4>
                <p className="text-sm text-muted-foreground">
                  Opsi tambahan untuk proses import
                </p>
              </div>
              <Switch
                checked={showAdvanced}
                onCheckedChange={setShowAdvanced}
              />
            </div>

            {showAdvanced && (
              <div className="space-y-4 p-4 bg-muted rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="skip-duplicates">Skip Duplicates</Label>
                    <p className="text-xs text-muted-foreground">
                      Lewati data yang sudah ada berdasarkan email
                    </p>
                  </div>
                  <Switch
                    id="skip-duplicates"
                    checked={importConfig.skipDuplicates}
                    onCheckedChange={(checked) => handleConfigChange('skipDuplicates', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="validate-only">Validate Only</Label>
                    <p className="text-xs text-muted-foreground">
                      Hanya validasi data tanpa import ke database
                    </p>
                  </div>
                  <Switch
                    id="validate-only"
                    checked={importConfig.validateOnly}
                    onCheckedChange={(checked) => handleConfigChange('validateOnly', checked)}
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Import Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <Info className="h-5 w-5 mr-2 text-blue-500" />
            Preview Import
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Status Default:</span>
                <Badge variant="outline">{importConfig.defaultStatus}</Badge>
              </div>
              <div className="flex justify-between">
                <span>Batch Size:</span>
                <span>{importConfig.batchSize} records</span>
              </div>
              <div className="flex justify-between">
                <span>Skip Duplicates:</span>
                <Badge variant={importConfig.skipDuplicates ? "default" : "secondary"}>
                  {importConfig.skipDuplicates ? 'Ya' : 'Tidak'}
                </Badge>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Validate Only:</span>
                <Badge variant={importConfig.validateOnly ? "destructive" : "default"}>
                  {importConfig.validateOnly ? 'Ya' : 'Tidak'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>Data dengan Error:</span>
                <Badge variant="destructive">{validationErrors.length}</Badge>
              </div>
              <div className="flex justify-between">
                <span>Mode Import:</span>
                <Badge variant={importConfig.validateOnly ? "secondary" : "default"}>
                  {importConfig.validateOnly ? 'Validasi Saja' : 'Import Lengkap'}
                </Badge>
              </div>
            </div>
          </div>
          
          {/* Next Steps Info */}
          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-medium text-blue-900 mb-2">📋 Langkah Selanjutnya:</h4>
            <div className="text-sm text-blue-800 space-y-1">
              <p>1. Klik "Mulai Import" untuk memproses data</p>
              <p>2. Sistem akan menampilkan progress import</p>
              <p>3. Setelah selesai, akan muncul ringkasan hasil import</p>
              <p>4. Jika ada data yang gagal, tombol "Download Data Gagal" akan tersedia</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Sebelumnya
        </Button>
        
        <div className="flex space-x-2">
          {validationErrors.length > 0 && !importConfig.validateOnly && (
            <Alert variant="destructive" className="max-w-md">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {validationErrors.length} baris memiliki error. Data yang valid tetap akan diimport.
              </AlertDescription>
            </Alert>
          )}
          
          {validationErrors.length === 0 && (
            <Alert className="max-w-md">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Data valid! Siap untuk diimport. Setelah import selesai, jika ada data yang gagal, tombol download akan tersedia.
              </AlertDescription>
            </Alert>
          )}
          
          <Button 
            onClick={onComplete}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Memproses...
              </>
            ) : (
              <>
                {importConfig.validateOnly ? 'Validasi Data' : 'Mulai Import →'}
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
} 