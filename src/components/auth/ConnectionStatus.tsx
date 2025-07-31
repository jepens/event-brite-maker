import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, Wifi, WifiOff, RefreshCw } from 'lucide-react';

interface ConnectionStatusProps {
  status: 'online' | 'offline' | 'checking';
  onCheckConnection: () => void;
}

export function ConnectionStatus({ status, onCheckConnection }: ConnectionStatusProps) {
  if (status === 'online') {
    return (
      <Alert className="border-green-200 bg-green-50">
        <Wifi className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          Connected to server
        </AlertDescription>
      </Alert>
    );
  }

  if (status === 'checking') {
    return (
      <Alert className="border-yellow-200 bg-yellow-50">
        <RefreshCw className="h-4 w-4 text-yellow-600 animate-spin" />
        <AlertDescription className="text-yellow-800">
          Checking connection...
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className="border-red-200 bg-red-50">
      <WifiOff className="h-4 w-4 text-red-600" />
      <AlertDescription className="text-red-800">
        <div className="flex items-center justify-between">
          <span>No connection to server</span>
          <Button
            onClick={onCheckConnection}
            variant="outline"
            size="sm"
            className="ml-2"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Retry
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
} 