import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Send, 
  Settings, 
  Clock, 
  Users, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Play,
  Pause,
  Square,
  Info
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Campaign {
  id: string;
  name: string;
  template_name: string;
  status: 'draft' | 'sending' | 'completed' | 'failed' | 'cancelled';
  total_recipients: number;
  sent_count: number;
  delivered_count: number;
  failed_count: number;
}

interface Recipient {
  id: string;
  phone_number: string;
  name?: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'read';
  failed_reason?: string;
}

interface BatchProgress {
  currentBatch: number;
  totalBatches: number;
  currentBatchSize: number;
  processedInBatch: number;
  totalProcessed: number;
  totalSuccess: number;
  totalFailed: number;
  isRunning: boolean;
  isPaused: boolean;
  estimatedTimeRemaining: number;
}

interface ManualBatchDialogProps {
  campaign: Campaign | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ManualBatchDialog({ campaign, open, onOpenChange, onSuccess }: ManualBatchDialogProps) {
  const [batchSize, setBatchSize] = useState(10);
  const [delayBetweenBatches, setDelayBetweenBatches] = useState(30);
  const [maxRetries, setMaxRetries] = useState(3);
  const [pendingRecipients, setPendingRecipients] = useState<Recipient[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState<BatchProgress>({
    currentBatch: 0,
    totalBatches: 0,
    currentBatchSize: 0,
    processedInBatch: 0,
    totalProcessed: 0,
    totalSuccess: 0,
    totalFailed: 0,
    isRunning: false,
    isPaused: false,
    estimatedTimeRemaining: 0
  });

  const fetchPendingRecipients = useCallback(async () => {
    if (!campaign) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('whatsapp_blast_recipients')
        .select('*')
        .eq('campaign_id', campaign.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setPendingRecipients(data || []);
    } catch (error) {
      console.error('Error fetching pending recipients:', error);
      toast({
        title: 'Error',
        description: 'Gagal memuat data penerima yang tertunda',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [campaign]);

  // Fetch pending recipients when dialog opens
  useEffect(() => {
    if (campaign && open) {
      fetchPendingRecipients();
    }
  }, [campaign, open, fetchPendingRecipients]);

  const calculateBatches = () => {
    const totalRecipients = pendingRecipients.length;
    const totalBatches = Math.ceil(totalRecipients / batchSize);
    const estimatedTime = totalBatches * delayBetweenBatches;
    
    return {
      totalRecipients,
      totalBatches,
      estimatedTime: Math.round(estimatedTime / 60) // in minutes
    };
  };

  const sendBatch = async (recipients: Recipient[], batchNumber: number, retryCount = 0): Promise<{ success: number; failed: number }> => {
    try {
      console.log(`📤 Sending batch ${batchNumber} with ${recipients.length} recipients (attempt ${retryCount + 1})`);
      
      // Validate campaign object
      if (!campaign || !campaign.id) {
        throw new Error('Campaign object is null or missing ID');
      }
      
      console.log('Campaign ID:', campaign.id);
      console.log('Campaign object:', campaign);
      
      // Update progress
      setProgress(prev => ({
        ...prev,
        currentBatch: batchNumber,
        currentBatchSize: recipients.length,
        processedInBatch: 0
      }));

      // Call Edge Function to process this batch
      const { data, error } = await supabase.functions.invoke('send-whatsapp-blast', {
        body: {
          campaign_id: campaign.id,
          action: 'batch',
          recipients: recipients.map(r => r.id),
          batch_size: recipients.length
        }
      });

      if (error) {
        console.error(`❌ Batch ${batchNumber} failed:`, error);
        
        // Retry logic
        if (retryCount < maxRetries) {
          console.log(`🔄 Retrying batch ${batchNumber} (attempt ${retryCount + 2}/${maxRetries + 1})`);
          await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds before retry
          return await sendBatch(recipients, batchNumber, retryCount + 1);
        }
        
        throw error;
      }

      console.log(`✅ Batch ${batchNumber} completed:`, data);
      
      // Update progress with results
      const success = data?.success || 0;
      const failed = recipients.length - success;
      
      setProgress(prev => ({
        ...prev,
        processedInBatch: recipients.length,
        totalProcessed: prev.totalProcessed + recipients.length,
        totalSuccess: prev.totalSuccess + success,
        totalFailed: prev.totalFailed + failed
      }));

      return { success, failed };
      
    } catch (error) {
      console.error(`❌ Batch ${batchNumber} failed after ${retryCount + 1} attempts:`, error);
      
      // Mark all recipients in this batch as failed
      setProgress(prev => ({
        ...prev,
        processedInBatch: recipients.length,
        totalProcessed: prev.totalProcessed + recipients.length,
        totalFailed: prev.totalFailed + recipients.length
      }));

      return { success: 0, failed: recipients.length };
    }
  };

  const startBatchProcessing = async () => {
    if (!campaign || pendingRecipients.length === 0) return;

    try {
      setProcessing(true);
      const { totalBatches } = calculateBatches();
      
      // Initialize progress
      setProgress({
        currentBatch: 0,
        totalBatches,
        currentBatchSize: 0,
        processedInBatch: 0,
        totalProcessed: 0,
        totalSuccess: 0,
        totalFailed: 0,
        isRunning: true,
        isPaused: false,
        estimatedTimeRemaining: totalBatches * delayBetweenBatches
      });

      console.log('🚀 Starting manual batch processing...');
      console.log(`📊 Total batches: ${totalBatches}`);
      console.log(`📦 Batch size: ${batchSize}`);
      console.log(`⏱️ Delay between batches: ${delayBetweenBatches} seconds`);

      // Process batches
      for (let i = 0; i < totalBatches; i++) {
        const startIndex = i * batchSize;
        const endIndex = Math.min(startIndex + batchSize, pendingRecipients.length);
        const batchRecipients = pendingRecipients.slice(startIndex, endIndex);
        
        console.log(`\n📦 Processing batch ${i + 1}/${totalBatches}`);
        console.log(`👥 Recipients: ${batchRecipients.length}`);
        
        // Send batch
        await sendBatch(batchRecipients, i + 1);
        
        // Update estimated time remaining
        const remainingBatches = totalBatches - (i + 1);
        setProgress(prev => ({
          ...prev,
          estimatedTimeRemaining: remainingBatches * delayBetweenBatches
        }));
        
        // Wait between batches (except for the last batch)
        if (i < totalBatches - 1) {
          console.log(`⏳ Waiting ${delayBetweenBatches} seconds before next batch...`);
          await new Promise(resolve => setTimeout(resolve, delayBetweenBatches * 1000));
        }
      }

      // Mark as completed
      setProgress(prev => ({
        ...prev,
        isRunning: false,
        estimatedTimeRemaining: 0
      }));

      console.log('🎉 Manual batch processing completed!');
      
      toast({
        title: 'Batch Processing Completed',
        description: `Berhasil memproses ${progress.totalProcessed} pesan`,
      });

      // Refresh campaign data
      if (onSuccess) {
        onSuccess();
      }

    } catch (error) {
      console.error('❌ Batch processing error:', error);
      
      setProgress(prev => ({
        ...prev,
        isRunning: false
      }));

      toast({
        title: 'Error',
        description: 'Terjadi kesalahan saat memproses batch',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const stopBatchProcessing = () => {
    setProgress(prev => ({
      ...prev,
      isRunning: false,
      isPaused: false
    }));
    setProcessing(false);
    
    toast({
      title: 'Batch Processing Stopped',
      description: 'Pemrosesan batch telah dihentikan',
    });
  };

  const { totalRecipients, totalBatches, estimatedTime } = calculateBatches();
  const progressPercentage = progress.totalBatches > 0 
    ? Math.round((progress.totalProcessed / pendingRecipients.length) * 100)
    : 0;

  if (!campaign) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Manual Batch Processing
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Campaign Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Info className="h-5 w-5" />
                Campaign Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-600">Campaign Name</Label>
                  <p className="font-semibold">{campaign.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Status</Label>
                  <Badge variant={campaign.status === 'sending' ? 'default' : 'secondary'}>
                    {campaign.status}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Total Recipients</Label>
                  <p className="font-semibold">{campaign.total_recipients}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Pending Recipients</Label>
                  <p className="font-semibold text-orange-600">{pendingRecipients.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Batch Configuration */}
          {!processing && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Batch Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="batchSize">Batch Size</Label>
                    <Input
                      id="batchSize"
                      type="number"
                      min="1"
                      max="50"
                      value={batchSize}
                      onChange={(e) => setBatchSize(parseInt(e.target.value) || 10)}
                    />
                    <p className="text-xs text-gray-500 mt-1">Jumlah pesan per batch (1-50)</p>
                  </div>
                  
                  <div>
                    <Label htmlFor="delay">Delay Between Batches (seconds)</Label>
                    <Input
                      id="delay"
                      type="number"
                      min="10"
                      max="300"
                      value={delayBetweenBatches}
                      onChange={(e) => setDelayBetweenBatches(parseInt(e.target.value) || 30)}
                    />
                    <p className="text-xs text-gray-500 mt-1">Jeda antar batch (10-300 detik)</p>
                  </div>
                  
                  <div>
                    <Label htmlFor="retries">Max Retries</Label>
                    <Input
                      id="retries"
                      type="number"
                      min="0"
                      max="5"
                      value={maxRetries}
                      onChange={(e) => setMaxRetries(parseInt(e.target.value) || 3)}
                    />
                    <p className="text-xs text-gray-500 mt-1">Maksimal percobaan ulang (0-5)</p>
                  </div>
                </div>

                <Separator />

                {/* Batch Preview */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Batch Preview</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Total Recipients:</span>
                      <p className="font-semibold">{totalRecipients}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Total Batches:</span>
                      <p className="font-semibold">{totalBatches}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Estimated Time:</span>
                      <p className="font-semibold">{estimatedTime} minutes</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Rate:</span>
                      <p className="font-semibold">{Math.round(60 / delayBetweenBatches * batchSize)} msg/min</p>
                    </div>
                  </div>
                </div>

                {/* Recommendations */}
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Rekomendasi:</strong> Untuk kampanye besar (&gt;100 penerima), gunakan batch size 10-20 dengan delay 30-60 detik untuk menghindari rate limiting.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          )}

          {/* Progress Monitoring */}
          {processing && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <RefreshCw className={`h-5 w-5 ${progress.isRunning ? 'animate-spin' : ''}`} />
                  Processing Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Overall Progress */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Overall Progress</span>
                    <span className="text-sm text-gray-600">{progressPercentage}%</span>
                  </div>
                  <Progress value={progressPercentage} className="h-2" />
                </div>

                {/* Current Batch Progress */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">
                      Current Batch ({progress.currentBatch}/{progress.totalBatches})
                    </span>
                    <span className="text-sm text-gray-600">
                      {progress.processedInBatch}/{progress.currentBatchSize}
                    </span>
                  </div>
                  <Progress 
                    value={progress.currentBatchSize > 0 ? (progress.processedInBatch / progress.currentBatchSize) * 100 : 0} 
                    className="h-2" 
                  />
                </div>

                {/* Statistics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-lg font-semibold text-blue-600">{progress.totalProcessed}</div>
                    <div className="text-xs text-blue-700">Processed</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-lg font-semibold text-green-600">{progress.totalSuccess}</div>
                    <div className="text-xs text-green-700">Success</div>
                  </div>
                  <div className="text-center p-3 bg-red-50 rounded-lg">
                    <div className="text-lg font-semibold text-red-600">{progress.totalFailed}</div>
                    <div className="text-xs text-red-700">Failed</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-lg font-semibold text-gray-600">
                      {Math.round(progress.estimatedTimeRemaining / 60)}m
                    </div>
                    <div className="text-xs text-gray-700">Remaining</div>
                  </div>
                </div>

                {/* Status */}
                <div className="flex items-center gap-2">
                  {progress.isRunning ? (
                    <>
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-sm text-green-600 font-medium">Processing...</span>
                    </>
                  ) : (
                    <>
                      <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                      <span className="text-sm text-gray-600 font-medium">Stopped</span>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* No pending recipients */}
          {!loading && pendingRecipients.length === 0 && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Tidak ada penerima yang tertunda. Semua pesan mungkin sudah terkirim atau kampanye sudah selesai.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="flex justify-between">
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={processing}>
              Close
            </Button>
            <Button 
              variant="outline" 
              onClick={fetchPendingRecipients} 
              disabled={loading || processing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
          
          <div className="flex gap-2">
            {processing ? (
              <Button variant="destructive" onClick={stopBatchProcessing}>
                <Square className="h-4 w-4 mr-2" />
                Stop Processing
              </Button>
            ) : (
              <Button 
                onClick={startBatchProcessing}
                disabled={loading || pendingRecipients.length === 0}
              >
                <Play className="h-4 w-4 mr-2" />
                Start Batch Processing
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}