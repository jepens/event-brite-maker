import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Trash2, 
  AlertTriangle, 
  Users, 
  MessageSquare,
  Calendar,
  Loader2
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Campaign {
  id: string;
  name: string;
  description?: string;
  template_name: string;
  status: 'draft' | 'sending' | 'completed' | 'failed' | 'cancelled';
  total_recipients: number;
  sent_count: number;
  delivered_count: number;
  failed_count: number;
  created_at: string;
  updated_at: string;
  created_by?: string;
  scheduled_at?: string;
}

interface BulkDeleteDialogProps {
  campaigns: Campaign[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function BulkDeleteDialog({ campaigns, open, onOpenChange, onSuccess }: BulkDeleteDialogProps) {
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);

  // Filter campaigns that can be deleted (not sending)
  const deletableCampaigns = campaigns.filter(campaign => campaign.status !== 'sending');

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedCampaigns(deletableCampaigns.map(c => c.id));
    } else {
      setSelectedCampaigns([]);
    }
  };

  const handleSelectCampaign = (campaignId: string, checked: boolean) => {
    if (checked) {
      setSelectedCampaigns(prev => [...prev, campaignId]);
    } else {
      setSelectedCampaigns(prev => prev.filter(id => id !== campaignId));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedCampaigns.length === 0) return;

    try {
      setDeleting(true);

      // Delete recipients first
      const { error: recipientsError } = await supabase
        .from('whatsapp_blast_recipients')
        .delete()
        .in('campaign_id', selectedCampaigns);

      if (recipientsError) throw recipientsError;

      // Delete campaigns
      const { error: campaignsError } = await supabase
        .from('whatsapp_blast_campaigns')
        .delete()
        .in('id', selectedCampaigns);

      if (campaignsError) throw campaignsError;

      toast({
        title: 'Berhasil',
        description: `${selectedCampaigns.length} campaign berhasil dihapus`,
      });

      onSuccess();
      onOpenChange(false);
      setSelectedCampaigns([]);

    } catch (error) {
      console.error('Error deleting campaigns:', error);
      toast({
        title: 'Error',
        description: 'Gagal menghapus campaigns',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      draft: 'secondary',
      sending: 'default',
      completed: 'default',
      failed: 'destructive',
      cancelled: 'outline'
    };
    return variants[status as keyof typeof variants] || 'secondary';
  };

  const totalRecipients = selectedCampaigns.reduce((total, campaignId) => {
    const campaign = campaigns.find(c => c.id === campaignId);
    return total + (campaign?.total_recipients || 0);
  }, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-red-600" />
            Bulk Delete Campaigns
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Warning Alert */}
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Peringatan:</strong> Tindakan ini akan menghapus campaign dan semua data recipients secara permanen. 
              Tindakan ini tidak dapat dibatalkan.
            </AlertDescription>
          </Alert>

          {/* Selection Summary */}
          {selectedCampaigns.length > 0 && (
            <Alert>
              <MessageSquare className="h-4 w-4" />
              <AlertDescription>
                <strong>{selectedCampaigns.length} campaign</strong> dipilih untuk dihapus dengan total{' '}
                <strong>{totalRecipients} recipients</strong>.
              </AlertDescription>
            </Alert>
          )}

          {/* Select All */}
          <div className="flex items-center space-x-2 p-4 bg-gray-50 rounded-lg">
            <Checkbox
              id="select-all"
              checked={selectedCampaigns.length === deletableCampaigns.length && deletableCampaigns.length > 0}
              onCheckedChange={handleSelectAll}
            />
            <label htmlFor="select-all" className="text-sm font-medium">
              Pilih semua campaign yang dapat dihapus ({deletableCampaigns.length})
            </label>
          </div>

          {/* Campaigns List */}
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {campaigns.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Tidak ada campaign untuk dihapus</p>
              </div>
            ) : (
              campaigns.map((campaign) => {
                const isSelectable = campaign.status !== 'sending';
                const isSelected = selectedCampaigns.includes(campaign.id);

                return (
                  <div
                    key={campaign.id}
                    className={`p-4 border rounded-lg ${
                      isSelectable ? 'hover:bg-gray-50' : 'bg-gray-100 opacity-60'
                    } ${isSelected ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => handleSelectCampaign(campaign.id, checked as boolean)}
                        disabled={!isSelectable}
                        className="mt-1"
                      />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-gray-900 truncate">{campaign.name}</h4>
                          <Badge variant={getStatusBadge(campaign.status)}>
                            {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                          </Badge>
                        </div>
                        
                        {campaign.description && (
                          <p className="text-sm text-gray-600 mb-2 line-clamp-2">{campaign.description}</p>
                        )}
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4 text-gray-400" />
                            <span>{campaign.total_recipients} recipients</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MessageSquare className="h-4 w-4 text-gray-400" />
                            <span>{campaign.template_name}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span>{new Date(campaign.created_at).toLocaleDateString('id-ID')}</span>
                          </div>
                          <div className="text-gray-500">
                            {campaign.sent_count} sent, {campaign.failed_count} failed
                          </div>
                        </div>

                        {!isSelectable && (
                          <div className="mt-2 text-sm text-amber-600 flex items-center gap-1">
                            <AlertTriangle className="h-4 w-4" />
                            Campaign sedang dalam proses pengiriman dan tidak dapat dihapus
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          <div className="text-sm text-gray-500">
            {selectedCampaigns.length} dari {deletableCampaigns.length} campaign dipilih
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={deleting}>
              Batal
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleBulkDelete}
              disabled={selectedCampaigns.length === 0 || deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Menghapus...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Hapus {selectedCampaigns.length} Campaign
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}