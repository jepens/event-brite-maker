import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Eye, 
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Info,
  Filter,
  Download
} from 'lucide-react';
import { type ImportPreviewData, type ImportError } from '../import-types';

interface DataPreviewStepProps {
  previewData: ImportPreviewData | null;
  onConfirm: () => void;
  onBack: () => void;
}

export function DataPreviewStep({ previewData, onConfirm, onBack }: DataPreviewStepProps) {
  const [showErrors, setShowErrors] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage] = useState(10);

  if (!previewData) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Data tidak tersedia</h3>
        <p className="text-muted-foreground">
          Silakan kembali ke langkah sebelumnya untuk memproses data.
        </p>
      </div>
    );
  }

  const { headers, data, totalRows, validRows, invalidRows, errors } = previewData;
  
  // Pagination
  const totalPages = Math.ceil(data.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentData = data.slice(startIndex, endIndex);

  const getRowStatus = (rowIndex: number) => {
    const rowNumber = startIndex + rowIndex + 1;
    const hasError = errors.some(error => error.row === rowNumber);
    return hasError ? 'error' : 'valid';
  };

  const getRowErrors = (rowIndex: number) => {
    const rowNumber = startIndex + rowIndex + 1;
    return errors.filter(error => error.row === rowNumber);
  };

  const exportPreviewData = () => {
    const csvContent = [
      headers.join(','),
      ...currentData.map(row => 
        headers.map(header => {
          const value = row[header] || '';
          return `"${String(value).replace(/"/g, '""')}"`;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'preview_data.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Preview Data</h2>
          <p className="text-sm text-muted-foreground">
            Review data sebelum melakukan import
          </p>
        </div>
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Kembali
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Info className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Total Data</p>
                <p className="text-2xl font-bold">{totalRows}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium">Valid</p>
                <p className="text-2xl font-bold text-green-600">{validRows}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm font-medium">Error</p>
                <p className="text-2xl font-bold text-red-600">{invalidRows}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm font-medium">Success Rate</p>
                <p className="text-2xl font-bold text-orange-600">
                  {totalRows > 0 ? Math.round((validRows / totalRows) * 100) : 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error Summary */}
      {errors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <AlertCircle className="h-5 w-5 mr-2 text-red-500" />
              Error Summary
            </CardTitle>
            <CardDescription>
              {errors.length} error ditemukan dalam data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {errors.slice(0, 5).map((error, index) => (
                <div key={index} className="flex items-center space-x-2 text-sm">
                  <Badge variant="destructive" className="text-xs">
                    Row {error.row}
                  </Badge>
                  <span className="text-muted-foreground">
                    {error.field && `${error.field}: `}
                    {error.message}
                  </span>
                </div>
              ))}
              {errors.length > 5 && (
                <p className="text-sm text-muted-foreground">
                  ...dan {errors.length - 5} error lainnya
                </p>
              )}
            </div>
            
            <div className="mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowErrors(!showErrors)}
              >
                {showErrors ? 'Sembunyikan' : 'Tampilkan'} Semua Error
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Preview Data</CardTitle>
              <CardDescription>
                Menampilkan {startIndex + 1}-{Math.min(endIndex, data.length)} dari {data.length} baris
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={exportPreviewData}>
              <Download className="h-4 w-4 mr-2" />
              Export Preview
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">#</TableHead>
                  {headers.map((header, index) => (
                    <TableHead key={index}>{header}</TableHead>
                  ))}
                  <TableHead className="w-20">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentData.map((row, rowIndex) => {
                  const status = getRowStatus(rowIndex);
                  const rowErrors = getRowErrors(rowIndex);
                  
                  return (
                    <TableRow 
                      key={rowIndex}
                      className={status === 'error' ? 'bg-red-50' : ''}
                    >
                      <TableCell className="font-medium">
                        {startIndex + rowIndex + 1}
                      </TableCell>
                      {headers.map((header, colIndex) => (
                        <TableCell key={colIndex}>
                          <div className="max-w-xs truncate" title={String(row[header] || '')}>
                            {String(row[header] || '')}
                          </div>
                        </TableCell>
                      ))}
                      <TableCell>
                        {status === 'error' ? (
                          <Badge variant="destructive" className="text-xs">
                            Error
                          </Badge>
                        ) : (
                          <Badge variant="default" className="text-xs">
                            Valid
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Halaman {currentPage} dari {totalPages}
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Sebelumnya
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Selanjutnya
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error Details */}
      {showErrors && errors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Detail Error</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {errors.map((error, index) => (
                <div key={index} className="border rounded p-3">
                  <div className="flex items-center space-x-2 mb-1">
                    <Badge variant="destructive" className="text-xs">
                      Row {error.row}
                    </Badge>
                    {error.field && (
                      <Badge variant="outline" className="text-xs">
                        {error.field}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm">{error.message}</p>
                  {error.value && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Value: "{error.value}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Sebelumnya
        </Button>
        
        <div className="flex space-x-2">
          {invalidRows > 0 && (
            <Alert variant="destructive" className="max-w-md">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {invalidRows} baris memiliki error. Data yang valid tetap akan diimport.
              </AlertDescription>
            </Alert>
          )}
          
          <Button onClick={onConfirm}>
            Lanjutkan ke Validasi
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
} 