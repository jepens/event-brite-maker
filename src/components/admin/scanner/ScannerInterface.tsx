import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, CameraOff } from 'lucide-react';

interface ScannerInterfaceProps {
  scanning: boolean;
  videoRef: React.RefObject<HTMLVideoElement>;
  onStartScanning: () => void;
  onStopScanning: () => void;
}

export function ScannerInterface({
  scanning,
  videoRef,
  onStartScanning,
  onStopScanning,
}: ScannerInterfaceProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          QR Code Scanner
        </CardTitle>
        <CardDescription>
          Scan QR codes or short codes to check in participants
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <video
            ref={videoRef}
            className="w-full h-64 bg-black rounded-lg"
            style={{ display: scanning ? 'block' : 'none' }}
          />
          {!scanning && (
            <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <Camera className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600">Camera will appear here when scanning</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          {!scanning ? (
            <Button onClick={onStartScanning} className="flex-1">
              <Camera className="h-4 w-4 mr-2" />
              Start Scanning
            </Button>
          ) : (
            <Button onClick={onStopScanning} variant="destructive" className="flex-1">
              <CameraOff className="h-4 w-4 mr-2" />
              Stop Scanning
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 