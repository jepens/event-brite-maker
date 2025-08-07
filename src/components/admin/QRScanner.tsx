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
import { formatDateTimeForDisplay } from '@/lib/date-utils';
import { ScanResult } from './scanner/ScanResult';

interface ScanResult {
  success: boolean;
  message: string;
  participant?: {
    name: string;
    email: string;
    event_name: string;
  };
  ticket_info?: {
    used_at?: string;
    checkin_at?: string;
    checkin_location?: string;
    checkin_notes?: string;
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
      // First, find the ticket by either qr_code or short_code
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
        .or(`qr_code.eq.${qrCode},short_code.eq.${qrCode}`)
        .single();

      if (ticketError || !ticket) {
        setScanResult({
          success: false,
          message: 'Kode QR tidak valid. Ticket tidak ditemukan.',
        });
        return;
      }

      // Check if ticket is already used or has been checked in
      if (ticket.status === 'used' || ticket.checkin_at) {
        const checkinTime = ticket.checkin_at ? formatDateTimeForDisplay(ticket.checkin_at) : 'Unknown time';
        setScanResult({
          success: false,
          message: `Ticket sudah digunakan. Check-in dilakukan pada: ${checkinTime}`,
          participant: {
            name: ticket.registrations.participant_name,
            email: ticket.registrations.participant_email,
            event_name: ticket.registrations.events.name,
          },
          ticket_info: {
            used_at: ticket.used_at,
            checkin_at: ticket.checkin_at,
            checkin_location: ticket.checkin_location,
            checkin_notes: ticket.checkin_notes,
          },
        });
        return;
      }

      // Mark ticket as used and record check-in
      const { error: updateError } = await supabase
        .from('tickets')
        .update({
          status: 'used',
          used_at: new Date().toISOString(),
          checkin_at: new Date().toISOString(),
          checkin_by: (await supabase.auth.getUser()).data.user?.id,
          checkin_location: 'QR Scanner',
          checkin_notes: 'Checked in via QR scanner'
        })
        .eq('id', ticket.id);

      if (updateError) {
        throw updateError;
      }

      setScanResult({
        success: true,
        message: 'Ticket berhasil diverifikasi! Selamat datang di event.',
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
    } catch (error: unknown) {
      console.error('Error verifying ticket:', error);
      setScanResult({
        success: false,
        message: 'Error memverifikasi ticket. Silakan coba lagi.',
      });
              toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Unknown error occurred',
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

        {/* Manual Entry */}
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
      </div>

      {/* Scan Result */}
      <ScanResult result={scanResult} />
    </div>
  );
}