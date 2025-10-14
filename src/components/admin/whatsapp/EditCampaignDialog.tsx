import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Edit, Save, X, AlertCircle } from 'lucide-react';
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
  template_params?: {
    participant_name?: string;
    location?: string;
    address?: string;
    date?: string;
    time?: string;
  };
}

interface EditCampaignDialogProps {
  campaign: Campaign | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditCampaignDialog({ campaign, open, onOpenChange, onSuccess }: EditCampaignDialogProps) {
  const [campaignName, setCampaignName] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [templateParams, setTemplateParams] = useState({
    participant_name: '',
    location: '',
    address: '',
    date: '',
    time: ''
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  // Reset form when campaign changes
  useEffect(() => {
    if (campaign) {
      setCampaignName(campaign.name);
      setTemplateName(campaign.template_name);
      setTemplateParams({
        participant_name: campaign.template_params?.participant_name || '',
        location: campaign.template_params?.location || '',
        address: campaign.template_params?.address || '',
        date: campaign.template_params?.date || '',
        time: campaign.template_params?.time || ''
      });
      setErrors([]);
    }
  }, [campaign]);

  const validateForm = (): boolean => {
    const newErrors: string[] = [];

    if (!campaignName.trim()) {
      newErrors.push('Nama campaign tidak boleh kosong');
    }

    if (!templateName.trim()) {
      newErrors.push('Template name tidak boleh kosong');
    }

    // Check if campaign can be edited
    if (campaign?.status === 'sending') {
      newErrors.push('Campaign yang sedang berjalan tidak dapat diedit');
    }

    if (campaign?.status === 'completed') {
      newErrors.push('Campaign yang sudah selesai tidak dapat diedit');
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSave = async () => {
    if (!campaign || !validateForm()) return;

    try {
      setSaving(true);

      const { error } = await supabase
        .from('whatsapp_blast_campaigns')
        .update({
          name: campaignName.trim(),
          template_name: templateName.trim(),
          template_params: templateParams,
          updated_at: new Date().toISOString()
        })
        .eq('id', campaign.id);

      if (error) throw error;

      toast({
        title: 'Berhasil',
        description: 'Campaign berhasil diperbarui',
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating campaign:', error);
      toast({
        title: 'Error',
        description: 'Gagal memperbarui campaign',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (!saving) {
      onOpenChange(false);
    }
  };

  const canEdit = campaign && ['draft', 'failed', 'cancelled'].includes(campaign.status);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Edit Campaign
          </DialogTitle>
        </DialogHeader>

        {campaign && (
          <div className="space-y-4">
            {/* Campaign Status Info */}
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Status Campaign:</span>
                <Badge variant={
                  campaign.status === 'draft' ? 'secondary' :
                  campaign.status === 'sending' ? 'default' :
                  campaign.status === 'completed' ? 'default' :
                  campaign.status === 'failed' ? 'destructive' : 'outline'
                }>
                  {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                </Badge>
              </div>
              <div className="text-xs text-gray-600">
                Created: {new Date(campaign.created_at).toLocaleString('id-ID')}
              </div>
            </div>

            {/* Edit Warning for non-editable campaigns */}
            {!canEdit && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Campaign dengan status "{campaign.status}" tidak dapat diedit. 
                  Hanya campaign dengan status "draft", "failed", atau "cancelled" yang dapat diedit.
                </AlertDescription>
              </Alert>
            )}

            {/* Form Fields */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="campaignName">Nama Campaign</Label>
                <Input
                  id="campaignName"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="Masukkan nama campaign"
                  disabled={!canEdit || saving}
                />
              </div>

              <div>
                <Label htmlFor="templateName">Template Name</Label>
                <Input
                  id="templateName"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="Masukkan template name"
                  disabled={!canEdit || saving}
                />
              </div>
            </div>

            {/* Template Parameters Section */}
            <Separator />
            <div>
              <h4 className="font-medium mb-3">Parameter Template</h4>
              <p className="text-sm text-gray-600 mb-4">
                Atur parameter default untuk template WhatsApp. Parameter ini akan digunakan jika tidak ada data spesifik untuk penerima.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="participantName">Nama Peserta Default</Label>
                  <Input
                    id="participantName"
                    value={templateParams.participant_name}
                    onChange={(e) => setTemplateParams(prev => ({ ...prev, participant_name: e.target.value }))}
                    placeholder="Peserta"
                    disabled={!canEdit || saving}
                  />
                </div>
                <div>
                  <Label htmlFor="location">Lokasi</Label>
                  <Input
                    id="location"
                    value={templateParams.location}
                    onChange={(e) => setTemplateParams(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="TBA"
                    disabled={!canEdit || saving}
                  />
                </div>
                <div>
                  <Label htmlFor="address">Alamat</Label>
                  <Input
                    id="address"
                    value={templateParams.address}
                    onChange={(e) => setTemplateParams(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="TBA"
                    disabled={!canEdit || saving}
                  />
                </div>
                <div>
                  <Label htmlFor="date">Tanggal</Label>
                  <Input
                    id="date"
                    value={templateParams.date}
                    onChange={(e) => setTemplateParams(prev => ({ ...prev, date: e.target.value }))}
                    placeholder="TBA"
                    disabled={!canEdit || saving}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="time">Waktu</Label>
                  <Input
                    id="time"
                    value={templateParams.time}
                    onChange={(e) => setTemplateParams(prev => ({ ...prev, time: e.target.value }))}
                    placeholder="TBA"
                    disabled={!canEdit || saving}
                  />
                </div>
              </div>
            </div>

            {/* Campaign Stats (Read-only) */}
            <Separator />
            <div>
              <h4 className="font-medium mb-3">Statistik Campaign</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-2 bg-blue-50 rounded">
                  <div className="text-lg font-semibold text-blue-600">{campaign.total_recipients}</div>
                  <div className="text-xs text-blue-700">Total Recipients</div>
                </div>
                <div className="text-center p-2 bg-yellow-50 rounded">
                  <div className="text-lg font-semibold text-yellow-600">{campaign.sent_count}</div>
                  <div className="text-xs text-yellow-700">Sent</div>
                </div>
                <div className="text-center p-2 bg-green-50 rounded">
                  <div className="text-lg font-semibold text-green-600">{campaign.delivered_count}</div>
                  <div className="text-xs text-green-700">Delivered</div>
                </div>
                <div className="text-center p-2 bg-red-50 rounded">
                  <div className="text-lg font-semibold text-red-600">{campaign.failed_count}</div>
                  <div className="text-xs text-red-700">Failed</div>
                </div>
              </div>
            </div>

            {/* Validation Errors */}
            {errors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <ul className="list-disc list-inside space-y-1">
                    {errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose} disabled={saving}>
                <X className="h-4 w-4 mr-2" />
                Batal
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={!canEdit || saving}
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}