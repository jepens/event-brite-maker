import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, XCircle, Wifi, WifiOff, Download, Upload, Usb } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { offlineManager, OfflineCheckinData } from '@/lib/offline-manager';
import { usePWA } from '@/hooks/usePWA';
import { USBScanner } from './USBScanner';
import { formatDateTimeForDisplay } from '@/lib/date-utils';
import { ScanResult } from './ScanResult';

interface ScanResult {
  success: boolean;
  message: string;
  participant?: {
    name: string;
    email: string;
    event_name: string;
    ticket_id: string;
  };
  ticket_info?: {
    used_at?: string;
    checkin_at?: string;
    checkin_location?: string;
    checkin_notes?: string;
  };
  offline?: boolean;
}

export function OfflineQRScanner() {
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [syncStatus, setSyncStatus] = useState({ total: 0, synced: 0, unsynced: 0 });
  const [usbConnected, setUsbConnected] = useState(false);
  
  const { isOnline } = usePWA();

  useEffect(() => {
    // Load sync status on mount
    loadSyncStatus();
    
    // Set up periodic sync status updates
    const interval = setInterval(loadSyncStatus, 5000);
    
    return () => {
      clearInterval(interval);
    };
  }, []);

  const loadSyncStatus = async () => {
    try {
      const status = await offlineManager.getSyncStatus();
      setSyncStatus(status);
    } catch (error) {
      console.error('Failed to load sync status:', error);
    }
  };

  const handleScanResult = async (qrCode: string) => {
    await verifyTicket(qrCode);
  };

  const handleManualVerification = async () => {
    if (!manualCode.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a QR code',
        variant: 'destructive',
      });
      return;
    }

    await verifyTicket(manualCode.trim());
  };

  const verifyTicket = async (qrCode: string) => {
    try {
      if (isOnline) {
        // Online verification
        await verifyTicketOnline(qrCode);
      } else {
        // Offline verification
        await verifyTicketOffline(qrCode);
      }
    } catch (error) {
      console.error('Error verifying ticket:', error);
      toast({
        title: 'Error',
        description: 'Failed to verify ticket',
        variant: 'destructive',
      });
    }
  };

  const verifyTicketOnline = async (qrCode: string) => {
    try {
      // Use optimized RPC function to combine ticket lookup and status update
      const { data, error } = await supabase
        .rpc('checkin_ticket', {
          qr_code_param: qrCode,
          checkin_location_param: 'QR Scanner',
          checkin_notes_param: 'Checked in via QR scanner'
        });

      if (error) {
        console.error('RPC error:', error);
        setScanResult({
          success: false,
          message: 'Error memproses check-in. Silakan coba lagi.',
        });
        return;
      }

      const result = data as {
        success: boolean;
        message: string;
        error?: string;
        ticket?: {
          id: string;
          qr_code: string;
          short_code: string;
          status: string;
          checkin_at: string;
        };
        ticket_info?: {
          used_at?: string;
          checkin_at?: string;
          checkin_location?: string;
          checkin_notes?: string;
        };
        participant?: {
          name: string;
          email: string;
        };
        event?: {
          name: string;
          date: string;
          location: string;
        };
      };

      if (!result.success) {
        setScanResult({
          success: false,
          message: result.error || 'Check-in gagal',
          participant: result.participant ? {
            name: result.participant.name,
            email: result.participant.email,
            event_name: result.event?.name || 'Unknown Event',
            ticket_id: result.ticket?.id || '',
          } : undefined,
          ticket_info: result.ticket_info,
        });
        return;
      }

      // Cache ticket data for offline use
      if (result.ticket && result.participant) {
        await offlineManager.cacheTicketData({
          id: result.ticket.id,
          qrCode: result.ticket.qr_code,
          shortCode: result.ticket.short_code,
          participantName: result.participant.name,
          participantEmail: result.participant.email,
          eventId: result.event?.name || '',
          eventName: result.event?.name || 'Unknown Event',
          status: 'approved',
          cachedAt: Date.now(),
        });
      }

      setScanResult({
        success: true,
        message: 'Check-in berhasil!',
        participant: {
          name: result.participant?.name || 'Unknown',
          email: result.participant?.email || 'Unknown',
          event_name: result.event?.name || 'Unknown Event',
          ticket_id: result.ticket?.id || '',
        },
      });

      toast({
        title: 'Success',
        description: 'Check-in completed successfully',
      });
    } catch (error) {
      console.error('Error in verifyTicketOnline:', error);
      setScanResult({
        success: false,
        message: 'Error memverifikasi ticket. Silakan coba lagi.',
      });
    }
  };

  const verifyTicketOffline = async (qrCode: string) => {
    // Try to find cached ticket data
    const cachedTicket = await offlineManager.getCachedTicket(qrCode);
    
    if (!cachedTicket) {
      setScanResult({
        success: false,
        message: 'Ticket not found in offline cache. Please connect to internet to verify.',
        offline: true,
      });
      return;
    }

    if (cachedTicket.status !== 'approved') {
      setScanResult({
        success: false,
        message: `Registration is ${cachedTicket.status}`,
        participant: {
          name: cachedTicket.participantName,
          email: cachedTicket.participantEmail,
          event_name: cachedTicket.eventName,
          ticket_id: cachedTicket.id,
        },
        offline: true,
      });
      return;
    }

    // Store offline check-in
    const offlineCheckinId = await offlineManager.storeOfflineCheckin({
      ticketId: cachedTicket.id,
      qrCode: cachedTicket.qrCode,
      shortCode: cachedTicket.shortCode,
      participantName: cachedTicket.participantName,
      participantEmail: cachedTicket.participantEmail,
      eventId: cachedTicket.eventId,
      eventName: cachedTicket.eventName,
      checkinAt: Date.now(),
    });

    setScanResult({
      success: true,
      message: 'Offline check-in stored. Will sync when online.',
      participant: {
        name: cachedTicket.participantName,
        email: cachedTicket.participantEmail,
        event_name: cachedTicket.eventName,
        ticket_id: cachedTicket.id,
      },
      offline: true,
    });

    toast({
      title: 'Offline Check-in',
      description: 'Check-in stored offline. Will sync when connected.',
    });

    // Update sync status
    await loadSyncStatus();
  };

  const syncOfflineCheckins = async () => {
    try {
      await offlineManager.syncOfflineCheckins();
      await loadSyncStatus();
      
      toast({
        title: 'Sync Complete',
        description: 'Offline check-ins have been synced',
      });
    } catch (error) {
      console.error('Sync failed:', error);
      toast({
        title: 'Sync Failed',
        description: 'Failed to sync offline check-ins',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Offline QR Scanner</h2>
        <p className="text-muted-foreground">Scan QR codes for check-in with offline support</p>
      </div>

      {/* Network Status */}
      <Card className={isOnline ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            {isOnline ? (
              <Wifi className="h-5 w-5 text-green-600" />
            ) : (
              <WifiOff className="h-5 w-5 text-yellow-600" />
            )}
            <div>
              <p className={`font-medium ${isOnline ? 'text-green-800' : 'text-yellow-800'}`}>
                {isOnline ? 'Online Mode' : 'Offline Mode'}
              </p>
              <p className={`text-sm ${isOnline ? 'text-green-600' : 'text-yellow-600'}`}>
                {isOnline 
                  ? 'Real-time check-ins with server sync' 
                  : 'Check-ins stored locally, will sync when online'
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sync Status */}
      {syncStatus.unsynced > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Upload className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium text-blue-800">
                    {syncStatus.unsynced} offline check-ins pending
                  </p>
                  <p className="text-sm text-blue-600">
                    {syncStatus.synced} already synced
                  </p>
                </div>
              </div>
              <Button 
                onClick={syncOfflineCheckins} 
                disabled={!isOnline}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Upload className="h-4 w-4 mr-2" />
                Sync Now
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="scanner" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="scanner" className="flex items-center gap-2">
            <Usb className="h-4 w-4" />
            Scanner
          </TabsTrigger>
          <TabsTrigger value="manual" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Manual Verification
          </TabsTrigger>
        </TabsList>

        <TabsContent value="scanner" className="space-y-4">
          <USBScanner 
            onScanResult={handleScanResult}
            isConnected={usbConnected}
            onConnectionChange={setUsbConnected}
          />
        </TabsContent>

        <TabsContent value="manual" className="space-y-4">
          <Card className="mobile-card">
            <CardHeader>
              <CardTitle>Manual Verification</CardTitle>
              <CardDescription>
                Enter QR code manually for verification
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="manualCode">QR Code</Label>
                <Input
                  id="manualCode"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="Enter QR code here"
                  className="mobile-input"
                />
              </div>

              <Button onClick={handleManualVerification} className="w-full mobile-button">
                <CheckCircle className="h-4 w-4 mr-2" />
                Verify Ticket
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Scan Result */}
      <ScanResult result={scanResult} />
    </div>
  );
} 