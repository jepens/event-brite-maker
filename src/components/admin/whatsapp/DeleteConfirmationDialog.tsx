import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Trash2, AlertTriangle, X } from 'lucide-react';
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
  created_at: string;
  updated_at: string;
}

interface DeleteConfirmationDialogProps {
  campaign: Campaign | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function DeleteConfirmationDialog({ 
  campaign, 
  open, 
  onOpenChange, 
  onSuccess 
}: DeleteConfirmationDialogProps) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!campaign) return;

    try {
      setDeleting(true);

      // First delete all recipients for this campaign
      const { error: recipientsError } = await supabase
        .from('whatsapp_blast_recipients')
        .delete()
        .eq('campaign_id', campaign.id);

      if (recipientsError) throw recipientsError;

      // Then delete the campaign
      const { error: campaignError } = await supabase
        .from('whatsapp_blast_campaigns')
        .delete()
        .eq('id', campaign.id);

      if (campaignError) throw campaignError;

      toast({
        title: 'Berhasil',
        description: 'Campaign berhasil dihapus',
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error deleting campaign:', error);
      toast({
        title: 'Error',
        description: 'Gagal menghapus campaign',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleClose = () => {
    if (!deleting) {
      onOpenChange(false);
    }
  };

  const canDelete = campaign && ['draft', 'failed', 'cancelled', 'completed'].includes(campaign.status);
  const isActivelyRunning = campaign?.status === 'sending';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <Trash2 className="h-5 w-5" />
            Hapus Campaign
          </DialogTitle>
        </DialogHeader>

        {campaign && (
          <div className="space-y-4">
            {/* Warning Alert */}
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Peringatan!</strong> Tindakan ini tidak dapat dibatalkan. 
                Semua data campaign dan recipients akan dihapus secara permanen.
              </AlertDescription>
            </Alert>

            {/* Campaign Info */}
            <div className="p-4 bg-gray-50 rounded-lg space-y-3">
              <div>
                <h4 className="font-medium text-gray-900">Campaign yang akan dihapus:</h4>
                <p className="text-lg font-semibold">{campaign.name}</p>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Status:</span>
                <Badge variant={
                  campaign.status === 'draft' ? 'secondary' :
                  campaign.status === 'sending' ? 'default' :
                  campaign.status === 'completed' ? 'default' :
                  campaign.status === 'failed' ? 'destructive' : 'outline'
                }>
                  {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Template:</span>
                <span className="text-sm font-medium">{campaign.template_name}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total Recipients:</span>
                <span className="text-sm font-medium">{campaign.total_recipients}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Created:</span>
                <span className="text-sm">{new Date(campaign.created_at).toLocaleString('id-ID')}</span>
              </div>
            </div>

            {/* Cannot delete warning for running campaigns */}
            {isActivelyRunning && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Campaign yang sedang berjalan tidak dapat dihapus. 
                  Silakan batalkan campaign terlebih dahulu atau tunggu hingga selesai.
                </AlertDescription>
              </Alert>
            )}

            {/* Statistics that will be lost */}
            {campaign.sent_count > 0 && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h5 className="font-medium text-yellow-800 mb-2">Data yang akan hilang:</h5>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="text-center">
                    <div className="font-semibold text-yellow-700">{campaign.sent_count}</div>
                    <div className="text-yellow-600">Sent</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-yellow-700">{campaign.delivered_count}</div>
                    <div className="text-yellow-600">Delivered</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-yellow-700">{campaign.failed_count}</div>
                    <div className="text-yellow-600">Failed</div>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose} disabled={deleting}>
                <X className="h-4 w-4 mr-2" />
                Batal
              </Button>
              <Button 
                variant="destructive"
                onClick={handleDelete} 
                disabled={!canDelete || deleting}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {deleting ? 'Menghapus...' : 'Ya, Hapus Campaign'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}