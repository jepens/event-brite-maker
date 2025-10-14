import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  MessageSquare, 
  Users, 
  CheckCircle, 
  XCircle, 
  Clock,
  Eye,
  Edit,
  Trash2,
  Trash,
  CheckSquare,
  Square,
  RefreshCw,
  Play,
  Bug,
  Settings,
  RotateCcw,
  AlertTriangle
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CreateCampaignDialog } from './CreateCampaignDialog';
import { CampaignDetailsDialog } from './CampaignDetailsDialog';
import { EditCampaignDialog } from './EditCampaignDialog';
import { DeleteConfirmationDialog } from './DeleteConfirmationDialog';
import { BulkDeleteDialog } from './BulkDeleteDialog';
import { RetryManagement } from './RetryManagement';

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

export function WhatsAppBlastManagement() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
  const [bulkMode, setBulkMode] = useState(false);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('whatsapp_blast_campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCampaigns(data || []);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast({
        title: 'Error',
        description: 'Gagal memuat data campaigns',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const handleCreateSuccess = () => {
    fetchCampaigns();
  };

  const handleViewDetails = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setDetailsDialogOpen(true);
  };

  const handleEditCampaign = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setEditDialogOpen(true);
  };

  const handleDeleteCampaign = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setDeleteDialogOpen(true);
  };

  const handleCampaignUpdated = () => {
    fetchCampaigns();
    setEditDialogOpen(false);
    setSelectedCampaign(null);
  };

  const handleCampaignDeleted = () => {
    fetchCampaigns();
  };

  const handleBulkModeToggle = () => {
    setBulkMode(!bulkMode);
    setSelectedCampaigns([]);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const selectableCampaigns = campaigns.filter(c => c.status !== 'sending').map(c => c.id);
      setSelectedCampaigns(selectableCampaigns);
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

  const handleBulkDelete = () => {
    if (selectedCampaigns.length === 0) {
      toast({
        title: 'Peringatan',
        description: 'Pilih minimal satu campaign untuk dihapus',
        variant: 'destructive',
      });
      return;
    }
    setBulkDeleteDialogOpen(true);
  };

  const handleBulkDeleteSuccess = () => {
    setSelectedCampaigns([]);
    setBulkMode(false);
    fetchCampaigns();
  };

  const handleStartCampaign = async (campaign: Campaign) => {
    console.log('\n=== STARTING CAMPAIGN FROM UI ===');
    console.log('Campaign ID:', campaign.id);
    console.log('Campaign Name:', campaign.name);
    console.log('Campaign Status:', campaign.status);
    console.log('Template Name:', campaign.template_name);
    console.log('Total Recipients:', campaign.total_recipients);
    console.log('Timestamp:', new Date().toISOString());

    try {
      // Update campaign status to sending
      console.log('🔄 Updating campaign status to "sending"...');
      const { error: updateError } = await supabase
        .from('whatsapp_blast_campaigns')
        .update({ status: 'sending' })
        .eq('id', campaign.id);

      if (updateError) {
        console.error('❌ Failed to update campaign status:', updateError);
        throw updateError;
      }
      console.log('✅ Campaign status updated to "sending"');

      // Start the campaign
      console.log('📤 Invoking send-whatsapp-blast function...');
      console.log('Function payload:', { 
        campaign_id: campaign.id,
        action: 'start'
      });

      const startTime = Date.now();
      const { data: functionData, error: functionError } = await supabase.functions.invoke('send-whatsapp-blast', {
        body: { 
          campaign_id: campaign.id,
          action: 'start'
        }
      });
      const endTime = Date.now();

      console.log(`⏱️ Function call took ${endTime - startTime}ms`);
      console.log('Function response data:', functionData);

      if (functionError) {
        console.error('❌ Function call failed:', functionError);
        console.error('Function error details:', {
          message: functionError.message,
          details: functionError.details,
          hint: functionError.hint,
          code: functionError.code
        });

        // Revert status back to draft if function call fails
        console.log('🔄 Reverting campaign status back to "draft"...');
        const { error: revertError } = await supabase
          .from('whatsapp_blast_campaigns')
          .update({ status: 'draft' })
          .eq('id', campaign.id);

        if (revertError) {
          console.error('❌ Failed to revert campaign status:', revertError);
        } else {
          console.log('✅ Campaign status reverted to "draft"');
        }
        
        throw functionError;
      }

      console.log('✅ Function call successful!');
      console.log('Function response:', functionData);

      toast({
        title: 'Success',
        description: `Campaign "${campaign.name}" berhasil dimulai`,
      });

      // Refresh campaigns to show updated status
      console.log('🔄 Refreshing campaigns list...');
      fetchCampaigns();

    } catch (error) {
      console.error('\n❌ START CAMPAIGN ERROR:');
      console.error('Error type:', error?.constructor?.name);
      console.error('Error message:', error?.message);
      console.error('Full error object:', error);
      console.error('Campaign ID:', campaign.id);
      console.error('Campaign Name:', campaign.name);

      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Gagal memulai campaign',
        variant: 'destructive',
      });
    }
  };

  const handleDebugCampaign = async (campaign: Campaign) => {
    try {
      console.log('\n🔍 DEBUGGING CAMPAIGN:');
      console.log('Campaign ID:', campaign.id);
      console.log('Campaign Name:', campaign.name);
      console.log('Campaign Status:', campaign.status);

      toast({
        title: 'Debug Started',
        description: `Memulai debug untuk campaign "${campaign.name}"`,
      });

      // Call debug endpoint
      const { data: debugData, error: debugError } = await supabase.functions.invoke('send-whatsapp-blast', {
        body: { 
          action: 'debug'
        }
      });

      if (debugError) {
        console.error('❌ Debug call failed:', debugError);
        toast({
          title: 'Debug Error',
          description: debugError.message || 'Gagal melakukan debug',
          variant: 'destructive',
        });
        return;
      }

      console.log('✅ Debug response:', debugData);

      // Show debug results in a more user-friendly way
      const debugInfo = debugData?.debug_info || {};
      
      let debugMessage = 'Debug Results:\n\n';
      
      // Environment Variables
      if (debugInfo.environment_variables) {
        debugMessage += '🔧 Environment Variables:\n';
        Object.entries(debugInfo.environment_variables).forEach(([key, value]) => {
          debugMessage += `  ${key}: ${value ? '✅ Set' : '❌ Missing'}\n`;
        });
        debugMessage += '\n';
      }

      // Database Connection
      if (debugInfo.database_connection !== undefined) {
        debugMessage += `🗄️ Database Connection: ${debugInfo.database_connection ? '✅ OK' : '❌ Failed'}\n\n`;
      }

      // WhatsApp API Test
      if (debugInfo.whatsapp_api_test) {
        debugMessage += '📱 WhatsApp API Test:\n';
        debugMessage += `  Status: ${debugInfo.whatsapp_api_test.success ? '✅ OK' : '❌ Failed'}\n`;
        if (debugInfo.whatsapp_api_test.error) {
          debugMessage += `  Error: ${debugInfo.whatsapp_api_test.error}\n`;
        }
        debugMessage += '\n';
      }

      // Rate Limits
      if (debugInfo.rate_limits) {
        debugMessage += '⏱️ Rate Limits:\n';
        Object.entries(debugInfo.rate_limits).forEach(([key, value]) => {
          debugMessage += `  ${key}: ${value}\n`;
        });
        debugMessage += '\n';
      }

      // Show results in console and toast
      console.log('📊 Debug Summary:\n' + debugMessage);
      
      toast({
        title: 'Debug Complete',
        description: 'Debug results logged to console. Check browser console for details.',
      });

      // Optionally show in alert for immediate visibility
      alert(debugMessage);

    } catch (error) {
      console.error('\n❌ DEBUG ERROR:');
      console.error('Error:', error);
      
      toast({
        title: 'Debug Error',
        description: error instanceof Error ? error.message : 'Gagal melakukan debug',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { label: 'Draft', variant: 'secondary' as const },
      sending: { label: 'Sending', variant: 'default' as const },
      completed: { label: 'Completed', variant: 'default' as const },
      failed: { label: 'Failed', variant: 'destructive' as const },
      cancelled: { label: 'Cancelled', variant: 'outline' as const },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;

    return (
      <Badge variant={config.variant}>
        {config.label}
      </Badge>
    );
  };

  const calculateProgress = (campaign: Campaign) => {
    if (campaign.total_recipients === 0) return 0;
    const processed = campaign.sent_count + campaign.failed_count;
    return Math.round((processed / campaign.total_recipients) * 100);
  };

  const getSuccessRate = (campaign: Campaign) => {
    if (campaign.total_recipients === 0) return 0;
    // Calculate success rate based on successfully sent messages vs total recipients
    // Since we don't have delivery confirmation webhooks, we consider 'sent' as successful
    return Math.round((campaign.sent_count / campaign.total_recipients) * 100);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">WhatsApp Blast Management</h1>
          <p className="text-gray-600">Kelola campaign WhatsApp blast untuk event Anda</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="campaigns" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="campaigns" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Campaigns
          </TabsTrigger>
          <TabsTrigger value="retry" className="flex items-center gap-2">
            <RotateCcw className="h-4 w-4" />
            Retry Management
          </TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="space-y-6">
          {/* Campaign Management Content */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1"></div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchCampaigns} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button 
            variant="outline" 
            onClick={() => handleDebugCampaign({ id: 'system', name: 'System Debug', status: 'debug' })}
            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            title="Debug WhatsApp API system configuration"
          >
            <Settings className="h-4 w-4 mr-2" />
            Debug System
          </Button>
          {campaigns.length > 0 && (
            <Button 
              variant={bulkMode ? "secondary" : "outline"} 
              onClick={handleBulkModeToggle}
            >
              {bulkMode ? (
                <>
                  <CheckSquare className="mr-2 h-4 w-4" />
                  Keluar Bulk Mode
                </>
              ) : (
                <>
                  <Square className="mr-2 h-4 w-4" />
                  Bulk Mode
                </>
              )}
            </Button>
          )}
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Buat Campaign Baru
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      {campaigns.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <MessageSquare className="h-5 w-5 text-blue-600" />
                <div>
                  <div className="text-2xl font-bold">{campaigns.length}</div>
                  <div className="text-sm text-gray-600">Total Campaigns</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-green-600" />
                <div>
                  <div className="text-2xl font-bold">
                    {campaigns.reduce((sum, c) => sum + c.total_recipients, 0)}
                  </div>
                  <div className="text-sm text-gray-600">Total Recipients</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <div className="text-2xl font-bold">
                    {campaigns.reduce((sum, c) => sum + c.delivered_count, 0)}
                  </div>
                  <div className="text-sm text-gray-600">Messages Delivered</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <XCircle className="h-5 w-5 text-red-600" />
                <div>
                  <div className="text-2xl font-bold">
                    {campaigns.reduce((sum, c) => sum + c.failed_count, 0)}
                  </div>
                  <div className="text-sm text-gray-600">Failed Messages</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Bulk Controls */}
      {bulkMode && campaigns.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Checkbox
                  checked={selectedCampaigns.length === campaigns.filter(c => c.status !== 'sending').length && campaigns.filter(c => c.status !== 'sending').length > 0}
                  onCheckedChange={handleSelectAll}
                />
                <span className="text-sm font-medium">
                  Pilih semua ({selectedCampaigns.length} dari {campaigns.filter(c => c.status !== 'sending').length} campaign dipilih)
                </span>
              </div>
              <div className="flex gap-2">
                {selectedCampaigns.length > 0 && (
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={handleBulkDelete}
                  >
                    <Trash className="mr-2 h-4 w-4" />
                    Hapus {selectedCampaigns.length} Campaign
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Campaigns List */}
      <div className="space-y-4">
        {campaigns.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Belum ada campaign</h3>
              <p className="text-gray-600 mb-4">
                Mulai dengan membuat campaign WhatsApp blast pertama Anda
              </p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Buat Campaign Pertama
              </Button>
            </CardContent>
          </Card>
        ) : (
          campaigns.map((campaign) => {
            const isSelected = selectedCampaigns.includes(campaign.id);
            const isSelectable = campaign.status !== 'sending';
            
            return (
            <Card key={campaign.id} className={isSelected ? "ring-2 ring-blue-500" : ""}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {bulkMode && isSelectable && (
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => handleSelectCampaign(campaign.id, checked as boolean)}
                      />
                    )}
                    <div>
                    <CardTitle className="flex items-center gap-2">
                      {campaign.name}
                      {getStatusBadge(campaign.status)}
                    </CardTitle>
                    <CardDescription>
                      Template: {campaign.template_name} • 
                      Created: {new Date(campaign.created_at).toLocaleDateString('id-ID')}
                    </CardDescription>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {campaign.status === 'draft' && (
                      <Button 
                        variant="default" 
                        size="sm"
                        onClick={() => handleStartCampaign(campaign)}
                        className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                      >
                        <Play className="h-4 w-4" />
                        Start Campaign
                      </Button>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleViewDetails(campaign)}
                      className="flex items-center gap-2"
                    >
                      <Eye className="h-4 w-4" />
                      View
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDebugCampaign(campaign)}
                      className="flex items-center gap-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      title="Debug WhatsApp API configuration and connectivity"
                    >
                      <Bug className="h-4 w-4" />
                      Debug
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleEditCampaign(campaign)}
                      className="flex items-center gap-2"
                      disabled={campaign.status === 'sending'}
                    >
                      <Edit className="h-4 w-4" />
                      Edit
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDeleteCampaign(campaign)}
                      className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                      disabled={campaign.status === 'sending'}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Progress Bar for sending campaigns */}
                {campaign.status === 'sending' && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span>{calculateProgress(campaign)}%</span>
                    </div>
                    <Progress value={calculateProgress(campaign)} className="w-full" />
                  </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-lg font-semibold text-blue-600">{campaign.total_recipients}</div>
                    <div className="text-xs text-blue-700">Total</div>
                  </div>
                  <div className="text-center p-3 bg-yellow-50 rounded-lg">
                    <div className="text-lg font-semibold text-yellow-600">{campaign.sent_count}</div>
                    <div className="text-xs text-yellow-700">Sent</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-lg font-semibold text-green-600">{campaign.delivered_count}</div>
                    <div className="text-xs text-green-700">Delivered</div>
                  </div>
                  <div className="text-center p-3 bg-red-50 rounded-lg">
                    <div className="text-lg font-semibold text-red-600">{campaign.failed_count}</div>
                    <div className="text-xs text-red-700">Failed</div>
                  </div>
                </div>

                {/* Success Rate */}
                {campaign.total_recipients > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span>Send Success Rate:</span>
                    <span className="font-medium text-green-600">{getSuccessRate(campaign)}%</span>
                  </div>
                )}

                {/* Error Alert */}
                {campaign.status === 'failed' && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Campaign gagal dijalankan. Silakan coba lagi atau hubungi administrator.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          );
          })
        )}
      </div>

          {/* Dialogs */}
          <CreateCampaignDialog
            open={createDialogOpen}
            onOpenChange={setCreateDialogOpen}
            onSuccess={handleCreateSuccess}
          />

          <CampaignDetailsDialog
            campaign={selectedCampaign}
            open={detailsDialogOpen}
            onOpenChange={setDetailsDialogOpen}
          />

          <EditCampaignDialog
            campaign={selectedCampaign}
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            onSuccess={handleCampaignUpdated}
          />

          <DeleteConfirmationDialog
            campaign={selectedCampaign}
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
            onSuccess={handleCampaignDeleted}
          />

          <BulkDeleteDialog
            campaigns={campaigns.filter(c => selectedCampaigns.includes(c.id))}
            open={bulkDeleteDialogOpen}
            onOpenChange={setBulkDeleteDialogOpen}
            onSuccess={handleBulkDeleteSuccess}
          />
        </TabsContent>

        <TabsContent value="retry" className="space-y-6">
          <RetryManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
}