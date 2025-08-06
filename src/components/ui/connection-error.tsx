import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { RefreshCw, Wifi, WifiOff } from 'lucide-react';

interface ConnectionErrorProps {
  error?: Error | null;
  onRetry?: () => void;
  isConnecting?: boolean;
}

export function ConnectionError({ error, onRetry, isConnecting = false }: ConnectionErrorProps) {
  if (!error) return null;

  const isConnectionError = error.message.includes('timeout') || 
                           error.message.includes('connection') ||
                           error.message.includes('network');

  return (
    <Alert className="mb-4 border-orange-200 bg-orange-50">
      <WifiOff className="h-4 w-4 text-orange-600" />
      <AlertTitle className="text-orange-800">
        {isConnectionError ? 'Connection Issue' : 'Something went wrong'}
      </AlertTitle>
      <AlertDescription className="text-orange-700">
        {isConnectionError ? (
          <div className="space-y-2">
            <p>We're having trouble connecting to our servers. This might be due to:</p>
            <ul className="list-disc list-inside text-sm space-y-1">
              <li>Slow internet connection</li>
              <li>Server maintenance</li>
              <li>Temporary network issues</li>
            </ul>
            <p className="text-sm mt-2">
              Don't worry, your data is safe. Please try again in a moment.
            </p>
          </div>
        ) : (
          error.message
        )}
      </AlertDescription>
      {onRetry && (
        <Button
          onClick={onRetry}
          disabled={isConnecting}
          variant="outline"
          size="sm"
          className="mt-3 gap-2 border-orange-300 text-orange-700 hover:bg-orange-100"
        >
          {isConnecting ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <Wifi className="h-4 w-4" />
              Try Again
            </>
          )}
        </Button>
      )}
    </Alert>
  );
}
