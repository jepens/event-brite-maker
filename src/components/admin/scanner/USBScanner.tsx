import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Usb, PowerOff, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface USBScannerProps {
  onScanResult: (qrCode: string) => void;
  isConnected: boolean;
  onConnectionChange: (connected: boolean) => void;
}

// SerialPort interface is now defined in types/serial.d.ts

export function USBScanner({ onScanResult, isConnected, onConnectionChange }: USBScannerProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [port, setPort] = useState<SerialPort | null>(null);
  const [reader, setReader] = useState<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const [buffer, setBuffer] = useState('');
  const [lastScannedCode, setLastScannedCode] = useState<string>('');
  const [scanHistory, setScanHistory] = useState<string[]>([]);
  const [error, setError] = useState<string>('');

  const isSupported = 'serial' in navigator;

  useEffect(() => {
    return () => {
      disconnectUSB();
    };
  }, []);

  const connectUSB = async () => {
    if (!isSupported) {
      setError('Web Serial API is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    try {
      setIsConnecting(true);
      setError('');

      // Request port access
      const selectedPort = await navigator.serial.requestPort({
        filters: [
          // Common USB-to-Serial adapters
          { usbVendorId: 0x0403, usbProductId: 0x6001 }, // FTDI
          { usbVendorId: 0x067b, usbProductId: 0x2303 }, // Prolific
          { usbVendorId: 0x10c4, usbProductId: 0xea60 }, // CP210x
          { usbVendorId: 0x1a86, usbProductId: 0x7523 }, // CH340
          { usbVendorId: 0x196a, usbProductId: 0x0220 }, // PL2303
        ]
      });

      // Open the port with common QR scanner settings
      await selectedPort.open({
        baudRate: 9600,
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
        bufferSize: 1024,
        flowControl: 'none'
      });

      setPort(selectedPort);
      onConnectionChange(true);

      // Start reading from the port
      const textDecoder = new TextDecoderStream();
      const readableStreamClosed = selectedPort.readable.pipeTo(textDecoder.writable);
      const reader = textDecoder.readable.getReader();

      setReader(reader);

      // Read data from the port
      const readLoop = async () => {
        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            // Process the received data
            processReceivedData(value);
          }
        } catch (error) {
          console.error('Error reading from USB port:', error);
          setError('Error reading from USB scanner');
        }
      };

      readLoop();

      toast({
        title: 'USB Scanner Connected',
        description: 'USB QR scanner is now ready to use',
      });

    } catch (error) {
      console.error('Error connecting to USB scanner:', error);
      if (error instanceof Error) {
        if (error.name === 'NotFoundError') {
          setError('No USB scanner found. Please connect a compatible QR scanner.');
        } else if (error.name === 'SecurityError') {
          setError('Permission denied. Please allow access to the USB device.');
        } else {
          setError(`Connection failed: ${error.message}`);
        }
      } else {
        setError('Failed to connect to USB scanner');
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectUSB = async () => {
    try {
      if (reader) {
        await reader.cancel();
        setReader(null);
      }
      if (port) {
        await port.close();
        setPort(null);
      }
      setBuffer('');
      onConnectionChange(false);
      
      toast({
        title: 'USB Scanner Disconnected',
        description: 'USB QR scanner has been disconnected',
      });
    } catch (error) {
      console.error('Error disconnecting USB scanner:', error);
    }
  };

  const processReceivedData = (data: string) => {
    // Add new data to buffer
    const newBuffer = buffer + data;
    setBuffer(newBuffer);

    // Look for common QR scanner terminators
    const terminators = ['\r', '\n', '\r\n', '\0'];
    let hasTerminator = false;
    let scannedCode = '';

    for (const terminator of terminators) {
      if (newBuffer.includes(terminator)) {
        const parts = newBuffer.split(terminator);
        scannedCode = parts[0].trim();
        setBuffer(parts.slice(1).join(terminator));
        hasTerminator = true;
        break;
      }
    }

    // If no terminator found, check if buffer is getting too long
    if (!hasTerminator && newBuffer.length > 100) {
      // Assume the entire buffer is a code
      scannedCode = newBuffer.trim();
      setBuffer('');
      hasTerminator = true;
    }

    if (hasTerminator && scannedCode) {
      // Validate that it looks like a QR code (alphanumeric, reasonable length)
      if (scannedCode.length >= 4 && /^[a-zA-Z0-9\-_]+$/.test(scannedCode)) {
        handleScannedCode(scannedCode);
      }
    }
  };

  const handleScannedCode = (code: string) => {
    // Prevent duplicate scans
    if (code === lastScannedCode) {
      return;
    }

    setLastScannedCode(code);
    setScanHistory(prev => [code, ...prev.slice(0, 9)]); // Keep last 10 scans

    // Send the scanned code to parent component
    onScanResult(code);

    toast({
      title: 'QR Code Scanned',
      description: `Code: ${code}`,
    });
  };

  const testUSBConnection = async () => {
    if (!port) return;

    try {
      const encoder = new TextEncoder();
      const writer = port.writable.getWriter();
      await writer.write(encoder.encode('TEST\n'));
      writer.releaseLock();
      
      toast({
        title: 'Test Signal Sent',
        description: 'Check if your USB scanner responds',
      });
    } catch (error) {
      console.error('Error sending test signal:', error);
      toast({
        title: 'Test Failed',
        description: 'Could not send test signal to USB scanner',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card className="mobile-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Usb className="h-5 w-5" />
          USB QR Scanner
        </CardTitle>
        <CardDescription>
          Connect and use a USB QR code scanner
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Browser Support Check */}
        {!isSupported && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              Web Serial API is not supported in this browser. Please use Chrome or Edge.
            </AlertDescription>
          </Alert>
        )}

        {/* Error Display */}
        {error && (
          <Alert className="border-red-200 bg-red-50">
            <XCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Connection Status */}
        <div className="flex items-center gap-3 p-3 rounded-lg border">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-300'}`} />
          <div className="flex-1">
            <p className="font-medium">
              {isConnected ? 'USB Scanner Connected' : 'USB Scanner Disconnected'}
            </p>
            <p className="text-sm text-muted-foreground">
              {isConnected 
                ? 'Ready to scan QR codes' 
                : 'Connect a USB QR scanner to begin'
              }
            </p>
          </div>
          <Badge variant={isConnected ? 'default' : 'secondary'}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </Badge>
        </div>

        {/* Connection Controls */}
        <div className="flex gap-2">
          {!isConnected ? (
            <Button 
              onClick={connectUSB} 
              disabled={!isSupported || isConnecting}
              className="flex-1 mobile-button"
            >
              <Usb className="h-4 w-4 mr-2" />
              {isConnecting ? 'Connecting...' : 'Connect USB Scanner'}
            </Button>
          ) : (
            <>
              <Button 
                onClick={testUSBConnection}
                variant="outline"
                className="flex-1 mobile-button"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Test Connection
              </Button>
              <Button 
                onClick={disconnectUSB}
                variant="destructive"
                className="flex-1 mobile-button"
              >
                <PowerOff className="h-4 w-4 mr-2" />
                Disconnect
              </Button>
            </>
          )}
        </div>

        {/* Scan History */}
        {scanHistory.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Recent Scans</h4>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {scanHistory.map((code, index) => (
                <div 
                  key={index}
                  className="text-xs p-2 bg-gray-100 rounded border font-mono"
                >
                  {code}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong>Instructions:</strong></p>
          <ul className="list-disc list-inside space-y-1">
            <li>Connect your USB QR scanner to your computer</li>
            <li>Click "Connect USB Scanner" to establish connection</li>
            <li>Scan QR codes with your USB scanner</li>
            <li>Scanned codes will be automatically processed</li>
          </ul>
        </div>

        {/* Supported Devices */}
        <div className="text-xs text-muted-foreground">
          <p><strong>Supported Devices:</strong></p>
          <p>Most USB QR scanners with FTDI, Prolific, CP210x, CH340, or PL2303 chipsets</p>
        </div>
      </CardContent>
    </Card>
  );
} 