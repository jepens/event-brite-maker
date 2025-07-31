import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Camera, CameraOff, CheckCircle, XCircle, Scan, Wifi, WifiOff, Download, Upload, Usb } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { offlineManager, OfflineCheckinData } from '@/lib/offline-manager';
import { usePWA } from '@/hooks/usePWA';
import QrScanner from 'qr-scanner';
import { USBScanner } from './USBScanner';

interface ScanResult {
  success: boolean;
  message: string;
  participant?: {
    name: string;
    email: string;
    event_name: string;
    ticket_id: string;
  };
  offline?: boolean;
}

export function OfflineQRScanner() {
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [syncStatus, setSyncStatus] = useState({ total: 0, synced: 0, unsynced: 0 });
  const [usbConnected, setUsbConnected] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const qrScannerRef = useRef<QrScanner | null>(null);
  
  const { isOnline } = usePWA();

  useEffect(() => {
    // Load sync status on mount
    loadSyncStatus();
    
    // Set up periodic sync status updates
    const interval = setInterval(loadSyncStatus, 5000);
    
    return () => {
      clearInterval(interval);
      if (qrScannerRef.current) {
        qrScannerRef.current.destroy();
      }
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

  const startScanning = async () => {
    if (!videoRef.current) return;

    try {
      setScanResult(null);
      setScanning(true);

      qrScannerRef.current = new QrScanner(
        videoRef.current,
        (result: QrScanner.ScanResult) => {
          handleScanResult(result.data);
        },
        {
          highlightScanRegion: true,
          highlightCodeOutline: true,
        }
      );

      await qrScannerRef.current.start();
    } catch (error) {
      console.error('Error starting QR scanner:', error);
      toast({
        title: 'Error',
        description: 'Failed to start camera. Please check camera permissions.',
        variant: 'destructive',
      });
      setScanning(false);
    }
  };

  const stopScanning = () => {
    if (qrScannerRef.current) {
      qrScannerRef.current.stop();
      qrScannerRef.current.destroy();
      qrScannerRef.current = null;
    }
    setScanning(false);
  };

  const handleScanResult = async (qrCode: string) => {
    stopScanning();
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
    // First, find the ticket by either qr_code or short_code
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select(`
        id,
        qr_code,
        short_code,
        status,
        checkin_at,
        registrations (
          id,
          participant_name,
          participant_email,
          status,
          events (
            id,
            name
          )
        )
      `)
      .or(`qr_code.eq.${qrCode},short_code.eq.${qrCode}`)
      .single();

    if (ticketError || !ticket) {
      setScanResult({
        success: false,
        message: 'Invalid QR code or ticket not found',
      });
      return;
    }

    const registration = ticket.registrations;
    if (!registration) {
      setScanResult({
        success: false,
        message: 'No registration found for this ticket',
      });
      return;
    }

    if (registration.status !== 'approved') {
      setScanResult({
        success: false,
        message: `Registration is ${registration.status}`,
        participant: {
          name: registration.participant_name,
          email: registration.participant_email,
          event_name: registration.events?.name || 'Unknown Event',
          ticket_id: ticket.id,
        },
      });
      return;
    }

    // Check if already checked in by looking at ticket status
    if (ticket.status === 'used' || ticket.checkin_at) {
      setScanResult({
        success: false,
        message: `Ticket already checked in at: ${ticket.checkin_at ? new Date(ticket.checkin_at).toLocaleString('id-ID') : 'Unknown time'}`,
        participant: {
          name: registration.participant_name,
          email: registration.participant_email,
          event_name: registration.events?.name || 'Unknown Event',
          ticket_id: ticket.id,
        },
      });
      return;
    }

    // Perform check-in by updating the ticket
    const { error: checkinError } = await supabase
      .from('tickets')
      .update({
        status: 'used',
        checkin_at: new Date().toISOString(),
        checkin_by: (await supabase.auth.getUser()).data.user?.id,
        checkin_location: 'QR Scanner',
        checkin_notes: 'Checked in via QR scanner'
      })
      .eq('id', ticket.id);

    if (checkinError) {
      setScanResult({
        success: false,
        message: 'Failed to check in ticket',
      });
      return;
    }

    // Cache ticket data for offline use
    await offlineManager.cacheTicketData({
      id: ticket.id,
      qrCode: ticket.qr_code,
      shortCode: ticket.short_code,
      participantName: registration.participant_name,
      participantEmail: registration.participant_email,
      eventId: registration.events?.id || '',
      eventName: registration.events?.name || 'Unknown Event',
      status: registration.status,
      cachedAt: Date.now(),
    });

    setScanResult({
      success: true,
      message: 'Check-in successful!',
      participant: {
        name: registration.participant_name,
        email: registration.participant_email,
        event_name: registration.events?.name || 'Unknown Event',
        ticket_id: ticket.id,
      },
    });

    toast({
      title: 'Success',
      description: 'Check-in completed successfully',
    });
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

      <Tabs defaultValue="camera" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="camera" className="flex items-center gap-2">
            <Camera className="h-4 w-4" />
            Camera
          </TabsTrigger>
          <TabsTrigger value="usb" className="flex items-center gap-2">
            <Usb className="h-4 w-4" />
            USB Scanner
          </TabsTrigger>
          <TabsTrigger value="manual" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Manual
          </TabsTrigger>
        </TabsList>

        <TabsContent value="camera" className="space-y-4">
          <Card className="mobile-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Camera Scanner
              </CardTitle>
              <CardDescription>
                Use your device camera to scan QR codes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative qr-scanner">
                <video
                  ref={videoRef}
                  className="w-full h-64 bg-gray-100 rounded-lg object-cover"
                  style={{ display: scanning ? 'block' : 'none' }}
                />
                {!scanning && (
                  <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <Scan className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                      <p className="text-gray-500">Click "Start Scanner" to begin</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                {!scanning ? (
                  <Button onClick={startScanning} className="flex-1 mobile-button">
                    <Camera className="h-4 w-4 mr-2" />
                    Start Scanner
                  </Button>
                ) : (
                  <Button onClick={stopScanning} variant="outline" className="flex-1 mobile-button">
                    <CameraOff className="h-4 w-4 mr-2" />
                    Stop Scanner
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usb" className="space-y-4">
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
      {scanResult && (
        <Card className={`${
          scanResult.success 
            ? 'border-green-200 bg-green-50' 
            : 'border-red-200 bg-red-50'
        } ${scanResult.offline ? 'border-yellow-200 bg-yellow-50' : ''}`}>
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              {scanResult.success ? (
                <CheckCircle className="h-6 w-6 text-green-600 mt-1" />
              ) : (
                <XCircle className="h-6 w-6 text-red-600 mt-1" />
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={scanResult.success ? 'default' : 'destructive'}>
                    {scanResult.offline ? 'Offline ' : ''}
                    {scanResult.success ? 'Valid Ticket' : 'Invalid Ticket'}
                  </Badge>
                  {scanResult.offline && (
                    <Badge variant="secondary">Offline Mode</Badge>
                  )}
                </div>
                <p className={`font-medium ${
                  scanResult.success 
                    ? scanResult.offline ? 'text-yellow-800' : 'text-green-800'
                    : 'text-red-800'
                }`}>
                  {scanResult.message}
                </p>
                {scanResult.participant && (
                  <div className="mt-3 space-y-1 text-sm">
                    <p><strong>Participant:</strong> {scanResult.participant.name}</p>
                    <p><strong>Email:</strong> {scanResult.participant.email}</p>
                    <p><strong>Event:</strong> {scanResult.participant.event_name}</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 