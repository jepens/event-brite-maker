import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Usb, CheckCircle, XCircle, AlertTriangle, Clock, User, Mail, Calendar } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { formatDateTimeForDisplay } from '@/lib/date-utils';
import { useCache } from '@/lib/cache-manager';

interface ScanResult {
  id: string;
  qrCode: string;
  timestamp: Date;
  status: 'pending' | 'success' | 'error' | 'duplicate';
  message: string;
  participantName?: string;
  participantEmail?: string;
  eventName?: string;
  checkinTime?: string;
}

interface USBScannerProps {
  onScanResult: (qrCode: string) => void;
  isConnected: boolean;
  onConnectionChange: (connected: boolean) => void;
}

export function USBScanner({ onScanResult, isConnected, onConnectionChange }: USBScannerProps) {
  const [scanInput, setScanInput] = useState<string>('');
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isListening, setIsListening] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const { invalidatePattern } = useCache();

  // Initialize scanner on mount
  useEffect(() => {
    setIsListening(true);
    onConnectionChange(true);
    
    // Auto-focus the input field
    if (inputRef.current) {
      inputRef.current.focus();
    }
    
    toast({
      title: 'QR Scanner Ready',
      description: 'Scanner is ready to scan QR codes. Focus on the input field and scan.',
    });
  }, [onConnectionChange]);

  // Auto-focus input field on mount and keep it focused
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Keep input focused after any state changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (inputRef.current && document.activeElement !== inputRef.current) {
        inputRef.current.focus();
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [scanResults, isVerifying]);

  // Add click handler to refocus input when clicking in scanner area
  const handleCardClick = () => {
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 50);
  };

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    setScanInput(value);
  };

  // Handle input key press
  const handleInputKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Process on Enter or Tab
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      
      if (scanInput.trim()) {
        processScannedCode(scanInput.trim());
      }
    }
  };

  // Handle manual submit
  const handleManualSubmit = () => {
    if (scanInput.trim()) {
      processScannedCode(scanInput.trim());
    }
  };

  const processScannedCode = async (qrCode: string) => {
    if (!qrCode || qrCode.length !== 8) {
      toast({
        title: 'Invalid QR Code',
        description: 'QR code must be exactly 8 characters long',
        variant: 'destructive',
      });
      return;
    }

    // Add scan result immediately
    const scanResult = addScanResult({
      qrCode,
      status: 'pending',
      message: 'Processing scan...'
    });
    
    // Process the scan
    await verifyAndCheckIn(qrCode, scanResult.id);
    
    // Clear input and refocus for next scan
    setScanInput('');
    
    // Aggressive auto-focus with multiple attempts
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 50);
    
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 200);
    
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 500);
  };

  const verifyAndCheckIn = async (qrCode: string, scanResultId: string) => {
    try {
      setIsVerifying(true);
      
      // Call the parent's verification function for offline support
      onScanResult(qrCode);
      
      // Perform actual check-in
      const checkInResult = await performCheckIn(qrCode);

      if (checkInResult.success) {
        updateScanResult(
          scanResultId, 
          'success', 
          'Check-in successful!', 
          checkInResult.participantName,
          checkInResult.participantEmail,
          checkInResult.eventName,
          checkInResult.checkinTime
        );
        
        // Invalidate related caches after successful check-in
        invalidatePattern('checkin_stats');
        invalidatePattern('checkin_reports');
        
        toast({
          title: 'Check-in Successful',
          description: `${checkInResult.participantName} has been checked in successfully.`,
        });
      } else {
        // For error cases, always pass participant details if available
        updateScanResult(
          scanResultId, 
          'error', 
          checkInResult.message,
          checkInResult.participantName || undefined,
          checkInResult.participantEmail || undefined,
          checkInResult.eventName || undefined,
          checkInResult.checkinTime || undefined
        );
        
        toast({
          title: 'Check-in Failed',
          description: checkInResult.message,
          variant: 'destructive',
        });
      }

    } catch (error) {
      updateScanResult(scanResultId, 'error', 'Verification failed. Please try again.');
      
      toast({
        title: 'Verification Error',
        description: 'Failed to verify ticket. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsVerifying(false);
      
      // Ensure input is focused after verification completes
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);
    }
  };

  const performCheckIn = async (qrCode: string): Promise<{
    success: boolean;
    message: string;
    participantName?: string;
    participantEmail?: string;
    eventName?: string;
    checkinTime?: string;
  }> => {
    try {
      // Check if user is authenticated
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return {
          success: false,
          message: 'Authentication required. Please sign in again.',
        };
      }

      // Use optimized RPC function to combine ticket lookup and status update
      // This reduces API requests from 2 to 1
      const { data, error } = await supabase
        .rpc('checkin_ticket', {
          qr_code_param: qrCode,
          checkin_location_param: 'USB Scanner',
          checkin_notes_param: 'Checked in via USB scanner'
        });

      if (error) {
        console.error('RPC error:', error);
        return {
          success: false,
          message: 'Database error. Please try again.',
        };
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
        return {
          success: false,
          message: result.error || 'Check-in failed',
        };
      }

      return {
        success: true,
        message: 'Check-in successful!',
        participantName: result.participant?.name || 'Unknown',
        participantEmail: result.participant?.email || 'Unknown',
        eventName: result.event?.name || 'Unknown Event',
        checkinTime: formatDateTimeForDisplay(result.ticket?.checkin_at || new Date().toISOString()),
      };

    } catch (error) {
      return {
        success: false,
        message: 'Network error during check-in. Please check your connection.',
      };
    }
  };

  const addScanResult = (result: Omit<ScanResult, 'id' | 'timestamp'>): ScanResult => {
    const newResult: ScanResult = {
      ...result,
      id: Date.now().toString(),
      timestamp: new Date(),
    };
    
    setScanResults(prev => {
      const updated = [newResult, ...prev.slice(0, 9)]; // Keep only last 10 results
      return updated;
    });
    
    return newResult;
  };

  const updateScanResult = (
    id: string, 
    status: ScanResult['status'], 
    message: string, 
    participantName?: string, 
    participantEmail?: string,
    eventName?: string,
    checkinTime?: string
  ) => {
    setScanResults(prev => {
      const updated = prev.map(result => 
        result.id === id 
          ? { ...result, status, message, participantName, participantEmail, eventName, checkinTime }
          : result
      );
      return updated;
    });
  };

  const isValidQRCode = (code: string): boolean => {
    // Check if code is exactly 8 alphanumeric characters
    return /^[A-Z0-9]{8}$/.test(code);
  };

  const formatTimestamp = (date: Date): string => {
    return date.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getStatusBadge = (status: ScanResult['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="flex items-center gap-1"><Clock className="h-3 w-3" />Pending</Badge>;
      case 'success':
        return <Badge variant="default" className="flex items-center gap-1"><CheckCircle className="h-3 w-3" />Success</Badge>;
      case 'error':
        return <Badge variant="destructive" className="flex items-center gap-1"><XCircle className="h-3 w-3" />Error</Badge>;
      case 'duplicate':
        return <Badge variant="outline" className="flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Duplicate</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Scanner Control Panel */}
      <Card className="mobile-card" onClick={handleCardClick}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Usb className="h-5 w-5" />
            QR Code Scanner
          </CardTitle>
          <CardDescription>
            Simple QR code scanner that accepts 8-character alphanumeric codes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Connection Status */}
          <div className="flex items-center gap-3 p-3 rounded-lg border">
            <div className={`w-3 h-3 rounded-full ${isVerifying ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`} />
            <div className="flex-1">
              <p className="font-medium">
                {isVerifying ? 'Processing Scan...' : 'Scanner Ready'}
              </p>
              <p className="text-sm text-muted-foreground">
                {isVerifying 
                  ? 'Verifying ticket and processing check-in...' 
                  : 'Scanner is ready to scan QR codes. Focus on the input field below and scan.'
                }
              </p>
            </div>
            <Badge variant={isVerifying ? "secondary" : "default"}>
              {isVerifying ? 'Processing' : 'Ready'}
            </Badge>
          </div>

          {/* Scanner Input Field */}
          <div className="space-y-2">
            <label htmlFor="scanner-input" className="text-sm font-medium">
              QR Code Input
            </label>
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                id="scanner-input"
                type="text"
                value={scanInput}
                onChange={handleInputChange}
                onKeyDown={handleInputKeyPress}
                placeholder="Scan QR code here..."
                className="font-mono text-lg tracking-wider"
                maxLength={8}
                autoFocus
                autoComplete="off"
                spellCheck={false}
                disabled={isVerifying}
              />
              <Button 
                onClick={handleManualSubmit}
                disabled={!scanInput.trim() || isVerifying}
              >
                {isVerifying ? 'Processing...' : 'Submit'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Scan QR code or type manually. Press Enter/Tab or click Submit to process.
            </p>
          </div>

          {/* Current Scan Display */}
          {scanInput && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Usb className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">
                  Current Input:
                </span>
              </div>
              <p className="text-sm font-mono bg-white p-2 rounded border">
                {scanInput}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Press Enter/Tab or click Submit to process
              </p>
            </div>
          )}

          {/* Instructions */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p><strong>Instructions:</strong></p>
            <ul className="list-disc list-inside space-y-1">
              <li>Connect your QR scanner to your computer</li>
              <li>Click on the input field above to ensure it's focused</li>
              <li>Scan QR codes with your scanner</li>
              <li>Scanner will automatically type into the input field</li>
              <li>Press Enter/Tab or click Submit to process the scan</li>
              <li>Expected format: 8 alphanumeric characters (e.g., XZHFIZX9)</li>
            </ul>
          </div>

          {/* QR Code Format Info */}
          <div className="text-xs text-muted-foreground p-2 bg-yellow-50 border border-yellow-200 rounded">
            <p><strong>QR Code Format:</strong></p>
            <p>Expected format: 8 alphanumeric characters (e.g., XZHFIZX9)</p>
            <p>All characters should be uppercase letters and numbers only</p>
          </div>
        </CardContent>
      </Card>

      {/* Scan Results Panel */}
      <Card className="mobile-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Scan Results
          </CardTitle>
          <CardDescription>
            Recent scan results and verification status
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Verification Status */}
          {isVerifying && (
            <Alert className="border-blue-200 bg-blue-50">
              <Clock className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                Verifying ticket and processing check-in...
              </AlertDescription>
            </Alert>
          )}

          {/* Results List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">Recent Scans ({scanResults.length})</h4>
              {scanResults.length > 0 && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setScanResults([])}
                >
                  Clear All
                </Button>
              )}
            </div>
            
            {scanResults.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No scans yet</p>
                <p className="text-xs">Scan a QR code to see results here</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                    {scanResults.map((result) => (
                  <div key={result.id} className={`p-4 border rounded-lg ${
                    result.status === 'success' ? 'bg-green-50 border-green-200' :
                    result.status === 'error' ? 'bg-red-50 border-red-200' :
                    result.status === 'duplicate' ? 'bg-yellow-50 border-yellow-200' :
                    'bg-gray-50 border-gray-200'
                  }`}>
                    <div className="flex items-start gap-3">
                      {result.status === 'success' ? (
                        <CheckCircle className="h-5 w-5 text-green-600 mt-1" />
                      ) : result.status === 'error' ? (
                        <XCircle className="h-5 w-5 text-red-600 mt-1" />
                      ) : result.status === 'duplicate' ? (
                        <AlertTriangle className="h-5 w-5 text-yellow-600 mt-1" />
                      ) : (
                        <Clock className="h-5 w-5 text-gray-600 mt-1" />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-mono text-muted-foreground">
                          {formatTimestamp(result.timestamp)}
                          </span>
                          {getStatusBadge(result.status)}
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-mono font-bold">
                            {result.qrCode}
                          </p>
                          <p className={`font-medium ${
                            result.status === 'success' ? 'text-green-800' :
                            result.status === 'error' ? 'text-red-800' :
                            result.status === 'duplicate' ? 'text-yellow-800' :
                            'text-gray-800'
                          }`}>
                            {result.message}
                          </p>
                          {/* Always show participant details if available, regardless of status */}
                          {(result.participantName || result.participantEmail || result.eventName) && (
                            <div className="mt-3 space-y-1 text-sm">
                            {result.participantName && (
                                <p><strong>Participant:</strong> {result.participantName}</p>
                              )}
                              {result.participantEmail && (
                                <p><strong>Email:</strong> {result.participantEmail}</p>
                              )}
                              {result.eventName && (
                                <p><strong>Event:</strong> {result.eventName}</p>
                              )}
                              {result.checkinTime && (
                                <p><strong>Check-in:</strong> {result.checkinTime}</p>
                              )}
                            </div>
                            )}
                          </div>
                      </div>
                    </div>
                  </div>
                    ))}
              </div>
            )}
          </div>

          {/* Statistics */}
          {scanResults.length > 0 && (
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="text-center p-2 bg-green-50 rounded border">
                <div className="font-bold text-green-600">
                  {scanResults.filter(r => r.status === 'success').length}
                </div>
                <div className="text-green-600">Successful</div>
              </div>
              <div className="text-center p-2 bg-red-50 rounded border">
                <div className="font-bold text-red-600">
                  {scanResults.filter(r => r.status === 'error').length}
                </div>
                <div className="text-red-600">Failed</div>
              </div>
              <div className="text-center p-2 bg-yellow-50 rounded border">
                <div className="font-bold text-yellow-600">
                  {scanResults.filter(r => r.status === 'duplicate').length}
                </div>
                <div className="text-yellow-600">Duplicate</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 