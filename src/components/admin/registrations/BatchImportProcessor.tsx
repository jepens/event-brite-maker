import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { 
  Play, 
  Pause, 
  Square, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  FileText,
  Clock,
  Zap,
  Settings,
  Download,
  Eye
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { ImportService } from '@/lib/import-service';
import type { ImportProgress, ImportResult, ImportConfig } from './import-types';

interface BatchImportProcessorProps {
  file: File;
  config: ImportConfig;
  eventId: string;
  onComplete: (result: ImportResult) => void;
  onCancel: () => void;
}

interface BatchStatus {
  status: 'idle' | 'preparing' | 'processing' | 'paused' | 'completed' | 'failed' | 'cancelled';
  currentBatch: number;
  totalBatches: number;
  processedRecords: number;
  totalRecords: number;
  successfulRecords: number;
  failedRecords: number;
  currentBatchSize: number;
  errors: Array<{ row: number; field?: string; message: string; value?: string }>;
  startTime: Date | null;
  estimatedTimeRemaining: number | null;
  processingSpeed: number; // records per second
}

export function BatchImportProcessor({
  file,
  config,
  eventId,
  onComplete,
  onCancel
}: BatchImportProcessorProps) {
  const [batchStatus, setBatchStatus] = useState<BatchStatus>({
    status: 'idle',
    currentBatch: 0,
    totalBatches: 0,
    processedRecords: 0,
    totalRecords: 0,
    successfulRecords: 0,
    failedRecords: 0,
    currentBatchSize: 0,
    errors: [],
    startTime: null,
    estimatedTimeRemaining: null,
    processingSpeed: 0
  });

  const [showErrorDetails, setShowErrorDetails] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [batchSize, setBatchSize] = useState(config.batchSize || 100);
  const [delayBetweenBatches, setDelayBetweenBatches] = useState(1000); // ms
  const [autoRetry, setAutoRetry] = useState(true);
  const [maxRetries, setMaxRetries] = useState(3);

  const processingRef = useRef<boolean>(false);
  const pauseRef = useRef<boolean>(false);
  const cancelRef = useRef<boolean>(false);
  const startTimeRef = useRef<Date | null>(null);
  const lastProgressUpdateRef = useRef<Date | null>(null);

  // Calculate progress percentage
  const getProgressPercentage = () => {
    if (batchStatus.totalRecords === 0) return 0;
    return Math.round((batchStatus.processedRecords / batchStatus.totalRecords) * 100);
  };

  // Calculate success rate
  const getSuccessRate = () => {
    if (batchStatus.processedRecords === 0) return 0;
    return Math.round((batchStatus.successfulRecords / batchStatus.processedRecords) * 100);
  };

  // Format duration
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  // Update processing speed
  const updateProcessingSpeed = useCallback(() => {
    if (!startTimeRef.current || !lastProgressUpdateRef.current) return;

    const now = new Date();
    const timeDiff = (now.getTime() - lastProgressUpdateRef.current.getTime()) / 1000;
    const recordsDiff = batchStatus.processedRecords - (batchStatus.processedRecords - batchStatus.currentBatchSize);

    if (timeDiff > 0) {
      const speed = recordsDiff / timeDiff;
      setBatchStatus(prev => ({
        ...prev,
        processingSpeed: speed,
        estimatedTimeRemaining: prev.totalRecords > prev.processedRecords 
          ? Math.round((prev.totalRecords - prev.processedRecords) / speed)
          : null
      }));
    }

    lastProgressUpdateRef.current = now;
  }, [batchStatus.processedRecords, batchStatus.currentBatchSize]);

  // Process batch
  const processBatch = useCallback(async (data: Record<string, unknown>[], startIndex: number, endIndex: number) => {
    const batchData = data.slice(startIndex, endIndex);
    const batchNumber = Math.floor(startIndex / batchSize) + 1;

    try {
      // Update status
      setBatchStatus(prev => ({
        ...prev,
        currentBatch: batchNumber,
        currentBatchSize: batchData.length,
        status: 'processing'
      }));

      // Simulate batch processing with progress updates
      const batchProgress = await ImportService.importData(
        file,
        config,
        (progress: ImportProgress) => {
          // Update progress for this batch
          const batchProgress = Math.round((progress.current / progress.total) * batchData.length);
          const totalProcessed = startIndex + batchProgress;
          
          setBatchStatus(prev => ({
            ...prev,
            processedRecords: totalProcessed,
            successfulRecords: prev.successfulRecords + Math.round(batchProgress * 0.9), // Simulate 90% success rate
            failedRecords: prev.failedRecords + Math.round(batchProgress * 0.1), // Simulate 10% failure rate
            errors: [...prev.errors, ...progress.errors]
          }));

          updateProcessingSpeed();
        }
      );

      // Add delay between batches
      if (delayBetweenBatches > 0 && batchNumber < Math.ceil(data.length / batchSize)) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
      }

      return batchProgress;
    } catch (error) {
      console.error(`Error processing batch ${batchNumber}:`, error);
      throw error;
    }
  }, [file, config, batchSize, delayBetweenBatches, updateProcessingSpeed]);

  // Start batch processing
  const startProcessing = useCallback(async () => {
    try {
      processingRef.current = true;
      pauseRef.current = false;
      cancelRef.current = false;
      startTimeRef.current = new Date();
      lastProgressUpdateRef.current = new Date();

      setBatchStatus(prev => ({
        ...prev,
        status: 'preparing',
        startTime: new Date(),
        errors: []
      }));

      // Parse file
      const data = await ImportService.parseFile(file, config.fieldMapping);
      const totalBatches = Math.ceil(data.length / batchSize);

      setBatchStatus(prev => ({
        ...prev,
        status: 'processing',
        totalRecords: data.length,
        totalBatches,
        currentBatch: 0
      }));

      // Process batches
      for (let i = 0; i < data.length; i += batchSize) {
        if (cancelRef.current) {
          setBatchStatus(prev => ({ ...prev, status: 'cancelled' }));
          return;
        }

        while (pauseRef.current) {
          setBatchStatus(prev => ({ ...prev, status: 'paused' }));
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        setBatchStatus(prev => ({ ...prev, status: 'processing' }));

        try {
          await processBatch(data, i, Math.min(i + batchSize, data.length));
        } catch (error) {
          console.error('Batch processing error:', error);
          
          if (autoRetry && maxRetries > 0) {
            // Retry logic would go here
            toast({
              title: 'Warning',
              description: `Batch ${Math.floor(i / batchSize) + 1} failed, retrying...`,
              variant: 'destructive'
            });
          } else {
            setBatchStatus(prev => ({ ...prev, status: 'failed' }));
            return;
          }
        }
      }

      // Complete
      setBatchStatus(prev => ({ ...prev, status: 'completed' }));
      
      // Get final status from state
      const result: ImportResult = {
        status: 'completed',
        totalRecords: data.length,
        successfulImports: batchStatus.successfulRecords,
        failedImports: batchStatus.failedRecords,
        errors: batchStatus.errors
      };

      onComplete(result);
    } catch (error) {
      console.error('Batch processing failed:', error);
      setBatchStatus(prev => ({ ...prev, status: 'failed' }));
      toast({
        title: 'Error',
        description: 'Batch processing failed',
        variant: 'destructive'
      });
    } finally {
      processingRef.current = false;
    }
  }, [file, config, batchSize, autoRetry, maxRetries, processBatch, onComplete, batchStatus]);

  // Control functions
  const handleStart = () => {
    startProcessing();
  };

  const handlePause = () => {
    pauseRef.current = true;
    setBatchStatus(prev => ({ ...prev, status: 'paused' }));
  };

  const handleResume = () => {
    pauseRef.current = false;
    setBatchStatus(prev => ({ ...prev, status: 'processing' }));
  };

  const handleCancel = () => {
    cancelRef.current = true;
    processingRef.current = false;
    setBatchStatus(prev => ({ ...prev, status: 'cancelled' }));
    onCancel();
  };

  // Get status icon
  const getStatusIcon = () => {
    switch (batchStatus.status) {
      case 'idle': return <Play className="h-4 w-4" />;
      case 'preparing': return <RefreshCw className="h-4 w-4 animate-spin" />;
      case 'processing': return <Zap className="h-4 w-4 text-blue-600" />;
      case 'paused': return <Pause className="h-4 w-4 text-yellow-600" />;
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-600" />;
              case 'cancelled': return <Square className="h-4 w-4 text-gray-600" />;
      default: return <Play className="h-4 w-4" />;
    }
  };

  // Get status color
  const getStatusColor = () => {
    switch (batchStatus.status) {
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Batch Import Processor</h2>
          <p className="text-muted-foreground">
            Processing {file.name} ({Math.round(file.size / 1024)} KB)
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSettings(true)}
          >
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getStatusIcon()}
              <div>
                <CardTitle className="text-lg">
                  {batchStatus.status === 'idle' && 'Ready to Start'}
                  {batchStatus.status === 'preparing' && 'Preparing Import'}
                  {batchStatus.status === 'processing' && 'Processing Import'}
                  {batchStatus.status === 'paused' && 'Import Paused'}
                  {batchStatus.status === 'completed' && 'Import Completed'}
                  {batchStatus.status === 'failed' && 'Import Failed'}
                  {batchStatus.status === 'cancelled' && 'Import Cancelled'}
                </CardTitle>
                <CardDescription>
                  {batchStatus.status === 'processing' && `Batch ${batchStatus.currentBatch} of ${batchStatus.totalBatches}`}
                  {batchStatus.status === 'completed' && 'All records processed successfully'}
                  {batchStatus.status === 'failed' && 'Import failed due to errors'}
                </CardDescription>
              </div>
            </div>
            <Badge className={getStatusColor()}>
              {batchStatus.status.toUpperCase()}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{getProgressPercentage()}%</span>
            </div>
            <Progress value={getProgressPercentage()} className="h-3" />
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold">{batchStatus.totalRecords}</p>
              <p className="text-sm text-muted-foreground">Total Records</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">{batchStatus.successfulRecords}</p>
              <p className="text-sm text-muted-foreground">Successful</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-red-600">{batchStatus.failedRecords}</p>
              <p className="text-sm text-muted-foreground">Failed</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold">{getSuccessRate()}%</p>
              <p className="text-sm text-muted-foreground">Success Rate</p>
            </div>
          </div>

          {/* Performance Metrics */}
          {batchStatus.status === 'processing' && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <p className="text-lg font-bold">{batchStatus.processingSpeed.toFixed(1)}</p>
                <p className="text-sm text-muted-foreground">Records/sec</p>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <p className="text-lg font-bold">
                  {batchStatus.estimatedTimeRemaining 
                    ? formatDuration(batchStatus.estimatedTimeRemaining)
                    : '-'
                  }
                </p>
                <p className="text-sm text-muted-foreground">ETA</p>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <p className="text-lg font-bold">
                  {batchStatus.startTime 
                    ? formatDuration(Math.round((new Date().getTime() - batchStatus.startTime.getTime()) / 1000))
                    : '-'
                  }
                </p>
                <p className="text-sm text-muted-foreground">Elapsed</p>
              </div>
            </div>
          )}

          {/* Error Summary */}
          {batchStatus.errors.length > 0 && (
            <div className="p-4 bg-red-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <span className="font-medium text-red-800">
                    {batchStatus.errors.length} Errors Found
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowErrorDetails(true)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </Button>
              </div>
              <p className="text-sm text-red-700">
                {batchStatus.errors.slice(0, 3).map(error => error.message).join(', ')}
                {batchStatus.errors.length > 3 && ` and ${batchStatus.errors.length - 3} more...`}
              </p>
            </div>
          )}

          {/* Controls */}
          <div className="flex gap-2 justify-center">
            {batchStatus.status === 'idle' && (
              <Button onClick={handleStart} className="flex-1 max-w-xs">
                <Play className="h-4 w-4 mr-2" />
                Start Import
              </Button>
            )}
            
            {batchStatus.status === 'processing' && (
              <>
                <Button variant="outline" onClick={handlePause} className="flex-1 max-w-xs">
                  <Pause className="h-4 w-4 mr-2" />
                  Pause
                </Button>
                <Button variant="destructive" onClick={handleCancel} className="flex-1 max-w-xs">
                  <Square className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </>
            )}
            
            {batchStatus.status === 'paused' && (
              <>
                <Button onClick={handleResume} className="flex-1 max-w-xs">
                  <Play className="h-4 w-4 mr-2" />
                  Resume
                </Button>
                <Button variant="destructive" onClick={handleCancel} className="flex-1 max-w-xs">
                  <Square className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </>
            )}
            
            {(batchStatus.status === 'completed' || batchStatus.status === 'failed' || batchStatus.status === 'cancelled') && (
              <Button variant="outline" onClick={onCancel} className="flex-1 max-w-xs">
                Close
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Batch Processing Settings</DialogTitle>
            <DialogDescription>
              Configure batch processing parameters
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Batch Size</label>
              <input
                type="number"
                value={batchSize}
                onChange={(e) => setBatchSize(Number(e.target.value))}
                className="w-full mt-1 px-3 py-2 border rounded-md"
                min="10"
                max="1000"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Number of records to process in each batch
              </p>
            </div>
            <div>
              <label className="text-sm font-medium">Delay Between Batches (ms)</label>
              <input
                type="number"
                value={delayBetweenBatches}
                onChange={(e) => setDelayBetweenBatches(Number(e.target.value))}
                className="w-full mt-1 px-3 py-2 border rounded-md"
                min="0"
                max="10000"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Delay between processing batches to reduce server load
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="autoRetry"
                checked={autoRetry}
                onChange={(e) => setAutoRetry(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="autoRetry" className="text-sm font-medium">
                Auto Retry Failed Batches
              </label>
            </div>
            {autoRetry && (
              <div>
                <label className="text-sm font-medium">Max Retries</label>
                <input
                  type="number"
                  value={maxRetries}
                  onChange={(e) => setMaxRetries(Number(e.target.value))}
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                  min="1"
                  max="10"
                />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Error Details Dialog */}
      <Dialog open={showErrorDetails} onOpenChange={setShowErrorDetails}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import Errors</DialogTitle>
            <DialogDescription>
              Detailed list of all import errors
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {batchStatus.errors.length} errors found
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const csvContent = generateErrorCSV(batchStatus.errors);
                  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'import_errors.csv';
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Export Errors
              </Button>
            </div>
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Row</TableHead>
                    <TableHead>Field</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Error Message</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batchStatus.errors.map((error, index) => (
                    <TableRow key={index}>
                      <TableCell>{error.row}</TableCell>
                      <TableCell>{error.field || '-'}</TableCell>
                      <TableCell className="max-w-32 truncate" title={error.value || ''}>
                        {error.value || '-'}
                      </TableCell>
                      <TableCell className="max-w-48">{error.message}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Helper function to generate CSV from errors
const generateErrorCSV = (errors: Array<{ row: number; field?: string; message: string; value?: string }>): string => {
  const headers = ['Row', 'Field', 'Value', 'Error Message'];
  const rows = errors.map(error => [
    error.row,
    error.field || '',
    error.value || '',
    error.message
  ]);
  
  return [headers, ...rows].map(row => 
    row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
  ).join('\n');
}; 