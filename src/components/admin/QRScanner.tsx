import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Camera, CameraOff, CheckCircle, XCircle, Scan } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import QrScanner from 'qr-scanner';

interface ScanResult {
  success: boolean;
  message: string;
  participant?: {
    name: string;
    email: string;
    event_name: string;
  };
}

export function QRScanner() {
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [manualCode, setManualCode] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const qrScannerRef = useRef<QrScanner | null>(null);

  useEffect(() => {
    return () => {
      // Cleanup scanner on unmount
      if (qrScannerRef.current) {
        qrScannerRef.current.destroy();
      }
    };
  }, []);

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
      // First, find the ticket
      const { data: ticket, error: ticketError } = await supabase
        .from('tickets')
        .select(`
          *,
          registrations (
            participant_name,
            participant_email,
            events (
              name
            )
          )
        `)
        .eq('qr_code', qrCode)
        .single();

      if (ticketError || !ticket) {
        setScanResult({
          success: false,
          message: 'Invalid QR code. Ticket not found.',
        });
        return;
      }

      // Check if ticket is already used
      if (ticket.status === 'used') {
        setScanResult({
          success: false,
          message: 'This ticket has already been used.',
          participant: {
            name: ticket.registrations.participant_name,
            email: ticket.registrations.participant_email,
            event_name: ticket.registrations.events.name,
          },
        });
        return;
      }

      // Mark ticket as used
      const { error: updateError } = await supabase
        .from('tickets')
        .update({
          status: 'used',
          used_at: new Date().toISOString(),
        })
        .eq('id', ticket.id);

      if (updateError) {
        throw updateError;
      }

      setScanResult({
        success: true,
        message: 'Ticket verified successfully! Welcome to the event.',
        participant: {
          name: ticket.registrations.participant_name,
          email: ticket.registrations.participant_email,
          event_name: ticket.registrations.events.name,
        },
      });

      toast({
        title: 'Success',
        description: 'Ticket verified and marked as used',
      });
    } catch (error: any) {
      console.error('Error verifying ticket:', error);
      setScanResult({
        success: false,
        message: 'Error verifying ticket. Please try again.',
      });
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">QR Code Scanner</h2>
        <p className="text-muted-foreground">Scan or verify QR codes for event entry</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Camera Scanner */}
        <Card>
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
            <div className="relative">
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
                <Button onClick={startScanning} className="flex-1">
                  <Camera className="h-4 w-4 mr-2" />
                  Start Scanner
                </Button>
              ) : (
                <Button onClick={stopScanning} variant="outline" className="flex-1">
                  <CameraOff className="h-4 w-4 mr-2" />
                  Stop Scanner
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Manual Entry */}
        <Card>
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
              />
            </div>

            <Button onClick={handleManualVerification} className="w-full">
              <CheckCircle className="h-4 w-4 mr-2" />
              Verify Ticket
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Scan Result */}
      {scanResult && (
        <Card className={scanResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
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
                    {scanResult.success ? 'Valid Ticket' : 'Invalid Ticket'}
                  </Badge>
                </div>
                <p className={`font-medium ${scanResult.success ? 'text-green-800' : 'text-red-800'}`}>
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