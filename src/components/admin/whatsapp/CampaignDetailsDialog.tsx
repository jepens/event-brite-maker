import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  MessageSquare, 
  Users, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Send,
  Eye,
  Download,
  RefreshCw,
  Calendar,
  User,
  Phone,
  AlertTriangle,
  Info,
  Settings
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ManualBatchDialog } from './ManualBatchDialog';

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

interface Recipient {
  id: string;
  phone_number: string;
  name?: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'read';
  sent_at?: string;
  delivered_at?: string;
  failed_reason?: string;
  created_at: string;
}

interface CampaignDetailsDialogProps {
  campaign: Campaign | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CampaignDetailsDialog({ campaign, open, onOpenChange }: CampaignDetailsDialogProps) {
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [manualBatchDialogOpen, setManualBatchDialogOpen] = useState(false);

  const fetchRecipients = useCallback(async () => {
    if (!campaign) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('whatsapp_blast_recipients')
        .select('*')
        .eq('campaign_id', campaign.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRecipients(data || []);
    } catch (error) {
      console.error('Error fetching recipients:', error);
      toast({
        title: 'Error',
        description: 'Gagal memuat data recipients',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [campaign]);

  useEffect(() => {
    if (campaign && open) {
      fetchRecipients();
    }
  }, [campaign, open, fetchRecipients]);

  const exportToCSV = () => {
    if (recipients.length === 0) {
      toast({
        title: 'Info',
        description: 'Tidak ada data untuk diekspor',
      });
      return;
    }

    const headers = ['Nama', 'Nomor Telepon', 'Status', 'Sent At', 'Delivered At', 'Failed Reason'];
    const csvContent = [
      headers.join(','),
      ...recipients.map(recipient => [
        recipient.name || '',
        recipient.phone_number,
        recipient.status,
        recipient.sent_at ? new Date(recipient.sent_at).toISOString() : '',
        recipient.delivered_at ? new Date(recipient.delivered_at).toISOString() : '',
        recipient.failed_reason || ''
      ].map(field => `"${field}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `campaign-${campaign?.name}-recipients.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: 'Berhasil',
      description: 'Data recipients berhasil diekspor',
    });
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      draft: 'secondary',
      sending: 'default',
      completed: 'default',
      failed: 'destructive',
      cancelled: 'outline',
      pending: 'secondary',
      sent: 'default',
      delivered: 'default',
      read: 'default'
    };
    return variants[status as keyof typeof variants] || 'secondary';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
      case 'delivered':
      case 'sent':
        return <CheckCircle className="h-4 w-4" />;
      case 'failed':
        return <XCircle className="h-4 w-4" />;
      case 'sending':
        return <Send className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const successRate = campaign ? 
    campaign.total_recipients > 0 ? 
      Math.round((campaign.delivered_count / campaign.total_recipients) * 100) : 0 
    : 0;

  const progress = campaign ? 
    campaign.total_recipients > 0 ? 
      Math.round(((campaign.sent_count + campaign.failed_count) / campaign.total_recipients) * 100) : 0 
    : 0;

  if (!campaign) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Detail Campaign: {campaign.name}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="recipients">Recipients ({recipients.length})</TabsTrigger>
            <TabsTrigger value="template">Template & Message</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Campaign Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  Informasi Campaign
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Nama Campaign</label>
                    <p className="text-lg font-semibold">{campaign.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Status</label>
                    <div className="flex items-center gap-2 mt-1">
                      {getStatusIcon(campaign.status)}
                      <Badge variant={getStatusBadge(campaign.status)}>
                        {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Template</label>
                    <p className="font-medium">{campaign.template_name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Dibuat</label>
                    <p className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {new Date(campaign.created_at).toLocaleString('id-ID')}
                    </p>
                  </div>
                  {campaign.description && (
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-gray-600">Deskripsi</label>
                      <p className="text-gray-800">{campaign.description}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Total Recipients
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{campaign.total_recipients}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Send className="h-4 w-4" />
                    Sent
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-blue-600">{campaign.sent_count}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {campaign.total_recipients > 0 ? Math.round((campaign.sent_count / campaign.total_recipients) * 100) : 0}% dari total
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Delivered
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-green-600">{campaign.delivered_count}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {campaign.total_recipients > 0 ? Math.round((campaign.delivered_count / campaign.total_recipients) * 100) : 0}% dari total
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <XCircle className="h-4 w-4" />
                    Failed
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-red-600">{campaign.failed_count}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {campaign.total_recipients > 0 ? Math.round((campaign.failed_count / campaign.total_recipients) * 100) : 0}% dari total
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Progress */}
            {campaign.status === 'sending' && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Progress Pengiriman</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span className="font-medium">{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-3" />
                    <p className="text-sm text-gray-600">
                      {campaign.sent_count + campaign.failed_count} dari {campaign.total_recipients} pesan telah diproses
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Success Rate */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Delivery Success Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Success Rate</span>
                    <span className="font-medium text-lg">{successRate}%</span>
                  </div>
                  <Progress value={successRate} className="h-3" />
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="text-center">
                      <div className="font-semibold text-green-600">{campaign.delivered_count}</div>
                      <div className="text-gray-500">Delivered</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-blue-600">{campaign.sent_count - campaign.delivered_count}</div>
                      <div className="text-gray-500">Sent Only</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-red-600">{campaign.failed_count}</div>
                      <div className="text-gray-500">Failed</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Alerts */}
            {campaign.status === 'failed' && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Campaign ini gagal dijalankan. Periksa log error atau hubungi administrator.
                </AlertDescription>
              </Alert>
            )}

            {campaign.failed_count > 0 && campaign.status === 'completed' && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {campaign.failed_count} pesan gagal dikirim. Periksa detail recipients untuk informasi lebih lanjut.
                </AlertDescription>
              </Alert>
            )}

            {/* Manual Batch Processing Card */}
            {(campaign.status === 'sending' || campaign.status === 'failed') && (
              <Card className="border-orange-200 bg-orange-50">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2 text-orange-800">
                    <Settings className="h-5 w-5" />
                    Manual Batch Processing
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <p className="text-sm text-orange-700">
                      Gunakan fitur ini untuk mengirim pesan secara manual dengan kontrol penuh atas ukuran batch, 
                      delay antar batch, dan retry logic. Cocok untuk mengatasi masalah pengiriman atau melanjutkan 
                      kampanye yang terhenti.
                    </p>
                    <div className="flex items-center gap-4 text-sm text-orange-600">
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        <span>Pending: {campaign.total_recipients - campaign.sent_count - campaign.failed_count}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>Kontrol Timing</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <RefreshCw className="h-4 w-4" />
                        <span>Auto Retry</span>
                      </div>
                    </div>
                    <Button 
                      onClick={() => setManualBatchDialogOpen(true)}
                      className="bg-orange-600 hover:bg-orange-700"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Open Manual Batch Processing
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Recipients Tab */}
          <TabsContent value="recipients" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Daftar Recipients</h3>
              <div className="flex gap-2">
                <Button variant="outline" onClick={fetchRecipients} disabled={loading}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button variant="outline" onClick={exportToCSV}>
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
                {(campaign.status === 'sending' || campaign.status === 'failed') && (
                  <Button 
                    variant="default" 
                    onClick={() => setManualBatchDialogOpen(true)}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Send Batch Manually
                  </Button>
                )}
              </div>
            </div>

            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="all">Semua ({recipients.length})</TabsTrigger>
                <TabsTrigger value="pending">Pending ({recipients.filter(r => r.status === 'pending').length})</TabsTrigger>
                <TabsTrigger value="sent">Sent ({recipients.filter(r => r.status === 'sent').length})</TabsTrigger>
                <TabsTrigger value="delivered">Delivered ({recipients.filter(r => r.status === 'delivered').length})</TabsTrigger>
                <TabsTrigger value="failed">Failed ({recipients.filter(r => r.status === 'failed').length})</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="mt-4">
                <RecipientsTable recipients={recipients} loading={loading} />
              </TabsContent>
              <TabsContent value="pending" className="mt-4">
                <RecipientsTable recipients={recipients.filter(r => r.status === 'pending')} loading={loading} />
              </TabsContent>
              <TabsContent value="sent" className="mt-4">
                <RecipientsTable recipients={recipients.filter(r => r.status === 'sent')} loading={loading} />
              </TabsContent>
              <TabsContent value="delivered" className="mt-4">
                <RecipientsTable recipients={recipients.filter(r => r.status === 'delivered')} loading={loading} />
              </TabsContent>
              <TabsContent value="failed" className="mt-4">
                <RecipientsTable recipients={recipients.filter(r => r.status === 'failed')} loading={loading} />
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* Template Tab */}
          <TabsContent value="template" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Template WhatsApp
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Template Name</label>
                  <p className="font-mono text-lg">{campaign.template_name}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-600">Preview Pesan</label>
                  <div className="mt-2 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                        <MessageSquare className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-600 mb-2">WhatsApp Business Message</p>
                        <div className="bg-white p-3 rounded-lg shadow-sm">
                          <p className="text-sm">
                            🎉 <strong>Reminder Event Anda!</strong>
                          </p>
                          <p className="text-sm mt-2">
                            Halo [Nama Peserta],<br/>
                            Jangan lupa event <strong>[Nama Event]</strong> akan segera dimulai!
                          </p>
                          <p className="text-sm mt-2">
                            📅 <strong>Tanggal:</strong> [Tanggal Event]<br/>
                            🕐 <strong>Waktu:</strong> [Waktu Event]<br/>
                            📍 <strong>Lokasi:</strong> [Lokasi Event]
                          </p>
                          <p className="text-sm mt-2">
                            Terima kasih telah mendaftar. Sampai jumpa di event!
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Template ini menggunakan variabel dinamis yang akan diganti dengan data event dan peserta saat pesan dikirim.
                    Variabel seperti [Nama Peserta], [Nama Event], [Tanggal Event], dll. akan otomatis terisi.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Footer Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button onClick={() => onOpenChange(false)}>
            Tutup
          </Button>
        </div>
      </DialogContent>

      {/* Manual Batch Dialog */}
      <ManualBatchDialog
        campaign={campaign}
        open={manualBatchDialogOpen}
        onOpenChange={setManualBatchDialogOpen}
        onSuccess={() => {
          fetchRecipients();
          toast({
            title: 'Success',
            description: 'Data recipients telah diperbarui setelah batch processing',
          });
        }}
      />
    </Dialog>
  );
}

function RecipientsTable({ recipients, loading }: { recipients: Recipient[]; loading: boolean }) {
  const getStatusBadge = (status: string) => {
    const variants = {
      pending: 'secondary',
      sent: 'default',
      delivered: 'default',
      failed: 'destructive',
      read: 'default'
    };
    return variants[status as keyof typeof variants] || 'secondary';
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p className="text-sm text-gray-500">Memuat data recipients...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">Nama</TableHead>
            <TableHead className="w-[150px]">Nomor Telepon</TableHead>
            <TableHead className="w-[100px]">Status</TableHead>
            <TableHead className="w-[150px]">Sent At</TableHead>
            <TableHead className="w-[150px]">Delivered At</TableHead>
            <TableHead>Failed Reason</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {recipients.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-12">
                <div className="text-gray-500">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Tidak ada data recipients</p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            recipients.map((recipient) => (
              <TableRow key={recipient.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-400" />
                    {recipient.name || '-'}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span className="font-mono text-sm">{recipient.phone_number}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={getStatusBadge(recipient.status)}>
                    {recipient.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">
                  {recipient.sent_at ? (
                    <div>
                      <div>{new Date(recipient.sent_at).toLocaleDateString('id-ID')}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(recipient.sent_at).toLocaleTimeString('id-ID')}
                      </div>
                    </div>
                  ) : '-'}
                </TableCell>
                <TableCell className="text-sm">
                  {recipient.delivered_at ? (
                    <div>
                      <div>{new Date(recipient.delivered_at).toLocaleDateString('id-ID')}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(recipient.delivered_at).toLocaleTimeString('id-ID')}
                      </div>
                    </div>
                  ) : '-'}
                </TableCell>
                <TableCell className="max-w-xs">
                  {recipient.failed_reason ? (
                    <div className="text-sm text-red-600 truncate" title={recipient.failed_reason}>
                      {recipient.failed_reason}
                    </div>
                  ) : '-'}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}