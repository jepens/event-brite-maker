import React, { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  FileText, 
  FileSpreadsheet, 
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react';

interface FileUploadStepProps {
  onFileUpload: (file: File) => void;
  loading?: boolean;
  error?: string | null;
}

const ACCEPTED_FILE_TYPES = [
  '.csv',
  '.xlsx',
  '.xls',
  'text/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel'
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function FileUploadStep({ onFileUpload, loading, error }: FileUploadStepProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const validateFile = (file: File): string | null => {
    // Check file type
    const isValidType = ACCEPTED_FILE_TYPES.some(type => 
      file.name.toLowerCase().endsWith(type) || file.type === type
    );
    
    if (!isValidType) {
      return 'File harus berformat CSV atau Excel (.csv, .xlsx, .xls)';
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return 'Ukuran file tidak boleh lebih dari 10MB';
    }

    return null;
  };

  const handleFileSelect = useCallback((file: File) => {
    setFileError(null);
    
    const validationError = validateFile(file);
    if (validationError) {
      setFileError(validationError);
      return;
    }

    setSelectedFile(file);
  }, []);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleUpload = useCallback(() => {
    if (selectedFile) {
      onFileUpload(selectedFile);
    }
  }, [selectedFile, onFileUpload]);

  const getFileIcon = (fileName: string) => {
    if (fileName.toLowerCase().endsWith('.csv')) {
      return <FileText className="h-8 w-8 text-blue-500" />;
    }
    return <FileSpreadsheet className="h-8 w-8 text-green-500" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Upload File</CardTitle>
          <CardDescription>
            Pilih file CSV atau Excel yang berisi data peserta
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* File Upload Area */}
          <div
            className={`
              border-2 border-dashed rounded-lg p-8 text-center transition-colors
              ${dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
              ${selectedFile ? 'border-green-500 bg-green-50' : ''}
            `}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            {!selectedFile ? (
              <div className="space-y-4">
                <Upload className="h-12 w-12 text-muted-foreground mx-auto" />
                <div>
                  <p className="text-lg font-medium">
                    Drag & drop file di sini atau{' '}
                    <Label htmlFor="file-upload" className="text-primary cursor-pointer hover:underline">
                      pilih file
                    </Label>
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Format yang didukung: CSV, Excel (.xlsx, .xls)
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Maksimal ukuran: 10MB
                  </p>
                </div>
                <Input
                  id="file-upload"
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-center space-x-3">
                  {getFileIcon(selectedFile.name)}
                  <div className="text-left">
                    <p className="font-medium">{selectedFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatFileSize(selectedFile.size)}
                    </p>
                  </div>
                  <CheckCircle className="h-6 w-6 text-green-500" />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedFile(null)}
                >
                  Pilih File Lain
                </Button>
              </div>
            )}
          </div>

          {/* File Requirements */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Persyaratan File:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Format: CSV (.csv) atau Excel (.xlsx, .xls)</li>
              <li>• Ukuran maksimal: 10MB</li>
              <li>• Baris pertama harus berisi header kolom</li>
              <li>• Encoding: UTF-8 (untuk file CSV)</li>
            </ul>
          </div>

          {/* Error Display */}
          {(error || fileError) && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {error || fileError}
              </AlertDescription>
            </Alert>
          )}

          {/* Upload Button */}
          {selectedFile && (
            <Button 
              onClick={handleUpload} 
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Memproses File...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Lanjutkan ke Template Selection
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Sample Template Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Template File</CardTitle>
          <CardDescription>
            Contoh struktur file yang dapat diimport
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted p-4 rounded-lg font-mono text-sm">
            <div className="grid grid-cols-3 gap-4 text-center font-semibold border-b pb-2 mb-2">
              <span>Nama Peserta</span>
              <span>Email</span>
              <span>Nomor Telepon</span>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center text-muted-foreground">
              <span>John Doe</span>
              <span>john@example.com</span>
              <span>+628123456789</span>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center text-muted-foreground">
              <span>Jane Smith</span>
              <span>jane@example.com</span>
              <span>+628987654321</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            * Header kolom dapat disesuaikan dengan template yang dipilih
          </p>
        </CardContent>
      </Card>
    </div>
  );
} 