import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import QrScanner from 'qr-scanner';
import { ScanResult } from './types';

export function useQRScanner() {
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
          id,
          qr_code,
          short_code,
          status,
          checkin_at,
          registrations (
            id,
            participant_name,
            participant_email,
            events (
              id,
              name
            )
          )
        `)
        .or(`qr_code.eq.${qrCode},short_code.eq.${qrCode}`)
        .single();

      if (ticketError) {
        if (ticketError.code === 'PGRST116') {
          setScanResult({
            success: false,
            message: 'Invalid QR code. Ticket not found.',
          });
        } else {
          throw ticketError;
        }
        return;
      }

      if (!ticket) {
        setScanResult({
          success: false,
          message: 'Invalid QR code. Ticket not found.',
        });
        return;
      }

      const registration = ticket.registrations as unknown as {
        participant_name: string;
        participant_email: string;
        events?: { name: string };
      };
      if (!registration) {
        setScanResult({
          success: false,
          message: 'Ticket found but no registration associated.',
        });
        return;
      }

      // Check if ticket is already used or has been checked in
      if (ticket.status === 'used' || ticket.checkin_at) {
        setScanResult({
          success: false,
          message: `Ticket has already been used. Checked in at: ${ticket.checkin_at ? new Date(ticket.checkin_at).toLocaleString('id-ID') : 'Unknown time'}`,
          participant: {
            name: registration.participant_name,
            email: registration.participant_email,
            event_name: registration.events?.name || 'Unknown Event',
          },
        });
        return;
      }

      // Mark ticket as used and record check-in details
      const { error: updateError } = await supabase
        .from('tickets')
        .update({
          status: 'used',
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
        message: 'Check-in successful!',
        participant: {
          name: registration.participant_name,
          email: registration.participant_email,
          event_name: registration.events?.name || 'Unknown Event',
        },
      });

      toast({
        title: 'Success',
        description: 'Check-in completed successfully!',
      });
    } catch (error) {
      console.error('Error verifying ticket:', error);
      setScanResult({
        success: false,
        message: 'Error verifying ticket. Please try again.',
      });
      toast({
        title: 'Error',
        description: 'Failed to verify ticket. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const resetScanner = () => {
    setScanResult(null);
    setManualCode('');
  };

  return {
    scanning,
    scanResult,
    manualCode,
    setManualCode,
    videoRef,
    startScanning,
    stopScanning,
    handleManualVerification,
    resetScanner,
  };
} 