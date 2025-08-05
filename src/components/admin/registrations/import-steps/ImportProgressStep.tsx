import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  ArrowLeft,
  Clock,
  Database,
  FileText
} from 'lucide-react';
import { type ImportProgress } from '../import-types';

interface ImportProgressStepProps {
  progress: ImportProgress | null;
  onBack: () => void;
}

export function ImportProgressStep({ progress, onBack }: ImportProgressStepProps) {
  if (!progress) {
    return (
      <div className="text-center py-8">
        <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Memulai Import...</h3>
        <p className="text-muted-foreground">
          Mohon tunggu sebentar
        </p>
      </div>
    );
  }

  const getStatusIcon = () => {
    switch (progress.status) {
      case 'preparing':
        return <FileText className="h-5 w-5 text-blue-500" />;
      case 'validating':
        return <CheckCircle className="h-5 w-5 text-orange-500" />;
      case 'importing':
        return <Database className="h-5 w-5 text-green-500" />;
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusColor = () => {
    switch (progress.status) {
      case 'preparing':
        return 'text-blue-600';
      case 'validating':
        return 'text-orange-600';
      case 'importing':
        return 'text-green-600';
      case 'completed':
        return 'text-green-600';
      case 'failed':
        return 'text-red-600';
      default:
        return 'text-muted-foreground';
    }
  };

  const getStatusDescription = () => {
    switch (progress.status) {
      case 'preparing':
        return 'Menyiapkan file dan memproses data...';
      case 'validating':
        return 'Memvalidasi data sesuai template...';
      case 'importing':
        return 'Mengimport data ke database...';
      case 'completed':
        return 'Import berhasil diselesaikan!';
      case 'failed':
        return 'Import gagal. Silakan coba lagi.';
      default:
        return 'Memproses...';
    }
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) {
      return `${seconds} detik`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes} menit ${remainingSeconds} detik`;
  };

  const estimatedTimeRemaining = () => {
    if (progress.current === 0 || progress.percentage === 0) {
      return 'Menghitung...';
    }
    
    const elapsed = progress.current; // Assuming this is in seconds
    const remaining = (elapsed / progress.percentage) * (100 - progress.percentage);
    
    return formatTime(Math.round(remaining));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Progress Import</h2>
          <p className="text-sm text-muted-foreground">
            Memproses data peserta
          </p>
        </div>
        {progress.status !== 'importing' && (
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Kembali
          </Button>
        )}
      </div>

      {/* Progress Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            {getStatusIcon()}
            <span className={`ml-2 ${getStatusColor()}`}>
              {progress.status.charAt(0).toUpperCase() + progress.status.slice(1)}
            </span>
          </CardTitle>
          <CardDescription>
            {getStatusDescription()}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{Math.round(progress.percentage)}%</span>
            </div>
            <Progress value={progress.percentage} className="w-full" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{progress.current} dari {progress.total} records</span>
              {progress.status === 'importing' && (
                <span>Estimasi: {estimatedTimeRemaining()}</span>
              )}
            </div>
          </div>

          {/* Status Message */}
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm font-medium mb-1">Status:</p>
            <p className="text-sm text-muted-foreground">{progress.message}</p>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{progress.current}</div>
              <div className="text-sm text-blue-600">Processed</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {progress.current - progress.errors.length}
              </div>
              <div className="text-sm text-green-600">Success</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{progress.errors.length}</div>
              <div className="text-sm text-red-600">Errors</div>
            </div>
          </div>

          {/* Error Display */}
          {progress.errors.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm flex items-center">
                <AlertCircle className="h-4 w-4 mr-2 text-red-500" />
                Recent Errors ({progress.errors.length})
              </h4>
              <div className="max-h-40 overflow-y-auto space-y-2">
                {progress.errors.slice(0, 5).map((error, index) => (
                  <div key={index} className="text-xs bg-red-50 p-2 rounded border-l-2 border-red-500">
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
                    <p className="text-red-700">{error.message}</p>
                    {error.value && (
                      <p className="text-red-600 text-xs mt-1">
                        Value: "{error.value}"
                      </p>
                    )}
                  </div>
                ))}
                {progress.errors.length > 5 && (
                  <p className="text-xs text-muted-foreground text-center">
                    ...dan {progress.errors.length - 5} error lainnya
                  </p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status Alerts */}
      {progress.status === 'completed' && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            Import berhasil diselesaikan! {progress.current} records telah diproses.
          </AlertDescription>
        </Alert>
      )}

      {progress.status === 'failed' && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Import gagal. {progress.errors.length} error ditemukan. Silakan periksa data dan coba lagi.
          </AlertDescription>
        </Alert>
      )}

      {/* Action Buttons */}
      {progress.status === 'completed' && (
        <div className="flex justify-center">
          <Button onClick={onBack} className="w-full sm:w-auto">
            Selesai
          </Button>
        </div>
      )}

      {progress.status === 'failed' && (
        <div className="flex justify-center space-x-2">
          <Button variant="outline" onClick={onBack}>
            Kembali
          </Button>
          <Button>
            Coba Lagi
          </Button>
        </div>
      )}

      {/* Importing Status */}
      {progress.status === 'importing' && (
        <div className="text-center py-4">
          <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Mohon jangan tutup browser selama proses import berlangsung</span>
          </div>
        </div>
      )}
    </div>
  );
} 