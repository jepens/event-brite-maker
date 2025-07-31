import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import QrScanner from 'qr-scanner';
import { ScanResult } from './types';
import { useCache } from '@/lib/cache-manager';

export function useQRScanner() {
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [manualCode, setManualCode] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const qrScannerRef = useRef<QrScanner | null>(null);
  const { invalidatePattern } = useCache();

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
      // Use optimized RPC function to combine ticket lookup and status update
      // This reduces API requests from 2 to 1
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
          message: 'Error processing check-in. Please try again.',
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
          message: result.error || 'Check-in failed',
        });
        return;
      }

      setScanResult({
        success: true,
        message: 'Check-in successful!',
        participant: {
          name: result.participant?.name || 'Unknown',
          email: result.participant?.email || 'Unknown',
          event_name: result.event?.name || 'Unknown Event',
        },
      });

      // Invalidate related caches after successful check-in
      invalidatePattern('checkin_stats');
      invalidatePattern('checkin_reports');

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