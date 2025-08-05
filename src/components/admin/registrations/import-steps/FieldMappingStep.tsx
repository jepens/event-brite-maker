import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Settings, 
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Loader2,
  Info
} from 'lucide-react';
import { ImportService } from '@/lib/import-service';
import { FIELD_SUGGESTIONS, type ImportTemplate } from '../import-types';

interface FieldMappingStepProps {
  file: File | null;
  template: ImportTemplate | null;
  fieldMapping: Record<string, string>;
  onFieldMappingChange: (mapping: Record<string, string>) => void;
  onComplete: () => void;
  onBack: () => void;
  loading?: boolean;
  error?: string | null;
  parsedData?: {
    headers: string[];
    rows: Record<string, unknown>[];
    totalRows: number;
  } | null;
}

export function FieldMappingStep({
  file,
  template,
  fieldMapping,
  onFieldMappingChange,
  onComplete,
  onBack,
  loading,
  error,
  parsedData
}: FieldMappingStepProps) {
  const [fileHeaders, setFileHeaders] = useState<string[]>([]);
  const [loadingHeaders, setLoadingHeaders] = useState(false);
  const [mappingErrors, setMappingErrors] = useState<string[]>([]);

  const loadFileHeaders = useCallback(async () => {
    if (!file) return;
    
    try {
      setLoadingHeaders(true);
      const headers = await ImportService.parseFileHeaders(file);
      setFileHeaders(headers);
    } catch (err) {
      console.error('Error loading file headers:', err);
    } finally {
      setLoadingHeaders(false);
    }
  }, [file]);

  // Load file headers or use parsed data
  useEffect(() => {
    if (parsedData?.headers) {
      setFileHeaders(parsedData.headers);
      setLoadingHeaders(false);
    } else if (file) {
      loadFileHeaders();
    }
  }, [file, loadFileHeaders, parsedData]);

  // Validate field mapping
  const validateMapping = useCallback(() => {
    const errors: string[] = [];
    
    // Check if at least one field is mapped
    if (Object.keys(fieldMapping).length === 0) {
      errors.push('Minimal satu field harus dipetakan');
    }
    
    // Check for duplicate mappings
    const mappedColumns = Object.values(fieldMapping).filter(Boolean);
    const uniqueColumns = new Set(mappedColumns);
    if (mappedColumns.length !== uniqueColumns.size) {
      errors.push('Tidak boleh ada kolom yang dipetakan ke lebih dari satu field');
    }
    
    setMappingErrors(errors);
    return errors.length === 0;
  }, [fieldMapping]);

  const handleFieldMappingChange = useCallback((field: string, columnName: string) => {
    const newMapping = { ...fieldMapping, [field]: columnName === '__none__' ? '' : columnName };
    onFieldMappingChange(newMapping);
  }, [fieldMapping, onFieldMappingChange]);

  const handleComplete = useCallback(() => {
    if (validateMapping()) {
      onComplete();
    }
  }, [validateMapping, onComplete]);

  const getFieldDisplayName = (field: string): string => {
    // Check if it's a suggested field
    const suggestion = Object.entries(FIELD_SUGGESTIONS).find(([_, value]) => value === field);
    if (suggestion) {
      return suggestion[0];
    }
    return field;
  };

  const getFieldDescription = (field: string): string => {
    // Check if it's a suggested field and provide appropriate description
    const suggestion = Object.entries(FIELD_SUGGESTIONS).find(([_, value]) => value === field);
    if (suggestion) {
      const [displayName, fieldKey] = suggestion;
      switch (fieldKey) {
        case 'participant_name':
          return 'Nama lengkap peserta (wajib)';
        case 'participant_email':
          return 'Alamat email yang valid (opsional)';
        case 'phone_number':
          return 'Nomor telepon (opsional)';
        default:
          return 'Data kustom tambahan';
      }
    }
    return 'Field kustom';
  };

  const isFieldRequired = (field: string): boolean => {
    // Check if field is required based on template validation rules
    if (template?.validation_rules?.[field]?.required) {
      return true;
    }
    // Default: only participant_name is required
    return field === 'participant_name';
  };

  const getMappedColumnName = (field: string): string => {
    return fieldMapping[field] || '';
  };

  const getUnmappedHeaders = (): string[] => {
    const mappedColumns = Object.values(fieldMapping).filter(Boolean);
    return fileHeaders.filter(header => !mappedColumns.includes(header));
  };

  if (loadingHeaders) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Membaca struktur file...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Field Mapping</h2>
          <p className="text-sm text-muted-foreground">
            Peta kolom file ke field database
          </p>
        </div>
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Kembali
        </Button>
      </div>

      {/* File Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Informasi File</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Nama File:</span>
              <p className="text-muted-foreground">{file?.name}</p>
            </div>
            <div>
              <span className="font-medium">Jumlah Kolom:</span>
              <p className="text-muted-foreground">{fileHeaders.length}</p>
            </div>
          </div>
          
          <div className="mt-4">
            <span className="font-medium text-sm">Kolom yang tersedia:</span>
            <div className="flex flex-wrap gap-2 mt-2">
              {fileHeaders.map((header, index) => (
                <Badge key={index} variant="outline">
                  {header}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Field Mapping */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Peta Field</CardTitle>
          <CardDescription>
            Pilih kolom file yang sesuai dengan field database
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {template && Object.entries(template.field_mapping).map(([field, templateColumn]) => (
            <div key={field} className="border rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <Label className="font-medium">
                      {getFieldDisplayName(field)}
                    </Label>
                    {isFieldRequired(field) && (
                      <Badge variant="destructive" className="text-xs">
                        Required
                      </Badge>
                    )}
                    {templateColumn && (
                      <Badge variant="secondary" className="text-xs">
                        Template: {templateColumn}
                      </Badge>
                    )}
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-3">
                    {getFieldDescription(field)}
                  </p>
                  
                  <Select
                    value={getMappedColumnName(field) || '__none__'}
                    onValueChange={(value) => handleFieldMappingChange(field, value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Pilih kolom file..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">-- Pilih Kolom --</SelectItem>
                      {fileHeaders.map((header, index) => (
                        <SelectItem key={index} value={header}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {getMappedColumnName(field) && (
                  <CheckCircle className="h-5 w-5 text-green-500 ml-4 mt-8" />
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Unmapped Columns Warning */}
      {getUnmappedHeaders().length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <Info className="h-5 w-5 mr-2 text-blue-500" />
              Kolom Tidak Terpetakan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Kolom berikut tidak dipetakan ke field database dan akan diabaikan:
            </p>
            <div className="flex flex-wrap gap-2">
              {getUnmappedHeaders().map((header, index) => (
                <Badge key={index} variant="outline" className="text-orange-600">
                  {header}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {(error || mappingErrors.length > 0) && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error || (
              <ul className="list-disc list-inside space-y-1">
                {mappingErrors.map((err, index) => (
                  <li key={index}>{err}</li>
                ))}
              </ul>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Sebelumnya
        </Button>
        
        <Button 
          onClick={handleComplete}
          disabled={loading || mappingErrors.length > 0}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Memproses...
            </>
          ) : (
            <>
              Lanjutkan ke Preview
              <ArrowRight className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
} 