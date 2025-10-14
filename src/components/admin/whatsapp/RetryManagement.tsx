import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, Clock, AlertTriangle, CheckCircle, XCircle, Play } from "lucide-react";

interface FailedRecipient {
  id: string;
  phone: string;
  error_message: string;
  retry_count: number;
  last_retry_at: string | null;
  next_retry_at: string | null;
  campaign_id: string;
  campaign?: {
    name: string;
  };
}

interface RetryStats {
  total_eligible: number;
  retried: number;
  skipped: number;
  errors: number;
  details: Array<{
    recipient_id: string;
    phone: string;
    status: 'retried' | 'skipped' | 'error';
    reason: string;
  }>;
}

export const RetryManagement: React.FC = () => {
  const [failedRecipients, setFailedRecipients] = useState<FailedRecipient[]>([]);
  const [loading, setLoading] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [retryStats, setRetryStats] = useState<RetryStats | null>(null);
  const { toast } = useToast();

  const fetchFailedRecipients = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('whatsapp_blast_recipients')
        .select(`
          *,
          campaign:whatsapp_blast_campaigns(name)
        `)
        .eq('status', 'failed')
        .lt('retry_count', 3)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setFailedRecipients(data || []);
    } catch (error) {
      console.error('Error fetching failed recipients:', error);
      toast({
        title: "Error",
        description: "Failed to fetch failed recipients",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const retryFailedMessages = async (campaignId?: string, recipientIds?: string[]) => {
    setRetrying(true);
    try {
      const { data, error } = await supabase.functions.invoke('retry-whatsapp-blast', {
        body: {
          campaign_id: campaignId,
          recipient_ids: recipientIds,
          max_retries: 3,
          delay_minutes: 5
        }
      });

      if (error) throw error;

      setRetryStats(data.stats);
      toast({
        title: "Retry Completed",
        description: `${data.stats.retried} messages scheduled for retry`,
      });

      // Refresh the list
      await fetchFailedRecipients();
    } catch (error) {
      console.error('Error retrying messages:', error);
      toast({
        title: "Retry Failed",
        description: "Failed to retry messages",
        variant: "destructive",
      });
    } finally {
      setRetrying(false);
    }
  };

  useEffect(() => {
    fetchFailedRecipients();
  }, [fetchFailedRecipients]);

  const groupedByCampaign = failedRecipients.reduce((acc, recipient) => {
    const campaignId = recipient.campaign_id;
    if (!acc[campaignId]) {
      acc[campaignId] = {
        campaign: recipient.campaign,
        recipients: []
      };
    }
    acc[campaignId].recipients.push(recipient);
    return acc;
  }, {} as Record<string, { campaign?: { name: string }, recipients: FailedRecipient[] }>);

  const getErrorCategory = (errorMessage: string) => {
    const msg = errorMessage.toLowerCase();
    if (msg.includes('invalid phone number format')) return 'phone_validation';
    if (msg.includes('rate limit') || msg.includes('too many requests')) return 'rate_limit';
    if (msg.includes('timeout') || msg.includes('network')) return 'network';
    if (msg.includes('invalid number') || msg.includes('blocked')) return 'permanent';
    return 'unknown';
  };

  const getErrorBadgeColor = (category: string) => {
    switch (category) {
      case 'phone_validation': return 'bg-blue-100 text-blue-800';
      case 'rate_limit': return 'bg-yellow-100 text-yellow-800';
      case 'network': return 'bg-orange-100 text-orange-800';
      case 'permanent': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const canRetry = (recipient: FailedRecipient) => {
    const errorCategory = getErrorCategory(recipient.error_message || '');
    return errorCategory !== 'permanent' && recipient.retry_count < 3;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Retry Management</h2>
          <p className="text-muted-foreground">
            Manage and retry failed WhatsApp messages
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={fetchFailedRecipients}
            disabled={loading}
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={() => retryFailedMessages()}
            disabled={retrying || failedRecipients.length === 0}
          >
            <Play className="h-4 w-4 mr-2" />
            Retry All Eligible
          </Button>
        </div>
      </div>

      {retryStats && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            Last retry: {retryStats.retried} scheduled, {retryStats.skipped} skipped, {retryStats.errors} errors
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Failed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{failedRecipients.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Retryable</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {failedRecipients.filter(canRetry).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Permanent Errors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {failedRecipients.filter(r => !canRetry(r)).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Max Retries Reached</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {failedRecipients.filter(r => r.retry_count >= 3).length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="by-campaign" className="w-full">
        <TabsList>
          <TabsTrigger value="by-campaign">By Campaign</TabsTrigger>
          <TabsTrigger value="by-error">By Error Type</TabsTrigger>
          <TabsTrigger value="all">All Failed</TabsTrigger>
        </TabsList>

        <TabsContent value="by-campaign" className="space-y-4">
          {Object.entries(groupedByCampaign).map(([campaignId, { campaign, recipients }]) => (
            <Card key={campaignId}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      {campaign?.name || 'Unknown Campaign'}
                    </CardTitle>
                    <CardDescription>
                      {recipients.length} failed messages
                    </CardDescription>
                  </div>
                  <Button
                    onClick={() => retryFailedMessages(campaignId)}
                    disabled={retrying || recipients.filter(canRetry).length === 0}
                    size="sm"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Retry Campaign ({recipients.filter(canRetry).length})
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {recipients.slice(0, 5).map((recipient) => (
                    <div key={recipient.id} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm">{recipient.phone}</span>
                        <Badge className={getErrorBadgeColor(getErrorCategory(recipient.error_message || ''))}>
                          {getErrorCategory(recipient.error_message || '')}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Retry {recipient.retry_count}/3
                        </span>
                      </div>
                      {canRetry(recipient) ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                  ))}
                  {recipients.length > 5 && (
                    <p className="text-sm text-muted-foreground">
                      ... and {recipients.length - 5} more
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="by-error" className="space-y-4">
          {['phone_validation', 'rate_limit', 'network', 'permanent', 'unknown'].map((category) => {
            const categoryRecipients = failedRecipients.filter(r => getErrorCategory(r.error_message || '') === category);
            if (categoryRecipients.length === 0) return null;

            return (
              <Card key={category}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg capitalize">
                        {category.replace('_', ' ')} Errors
                      </CardTitle>
                      <CardDescription>
                        {categoryRecipients.length} failed messages
                      </CardDescription>
                    </div>
                    <Button
                      onClick={() => retryFailedMessages(undefined, categoryRecipients.filter(canRetry).map(r => r.id))}
                      disabled={retrying || categoryRecipients.filter(canRetry).length === 0}
                      size="sm"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Retry Category ({categoryRecipients.filter(canRetry).length})
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {categoryRecipients.slice(0, 3).map((recipient) => (
                      <div key={recipient.id} className="flex items-center justify-between p-2 border rounded">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm">{recipient.phone}</span>
                          <span className="text-xs text-muted-foreground">
                            {recipient.campaign?.name}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          Retry {recipient.retry_count}/3
                        </span>
                      </div>
                    ))}
                    {categoryRecipients.length > 3 && (
                      <p className="text-sm text-muted-foreground">
                        ... and {categoryRecipients.length - 3} more
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Failed Messages</CardTitle>
              <CardDescription>
                Complete list of failed messages with retry status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {failedRecipients.map((recipient) => (
                  <div key={recipient.id} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm">{recipient.phone}</span>
                      <Badge className={getErrorBadgeColor(getErrorCategory(recipient.error_message || ''))}>
                        {getErrorCategory(recipient.error_message || '')}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {recipient.campaign?.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        Retry {recipient.retry_count}/3
                      </span>
                      {canRetry(recipient) ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};