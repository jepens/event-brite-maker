import { ConnectionError } from '@/components/ui/connection-error';

interface ErrorStateProps {
  error: Error;
  onRetry: () => void;
}

export function ErrorState({ error, onRetry }: ErrorStateProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full mx-4">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold mb-2">Oops! Something went wrong</h1>
          <p className="text-muted-foreground">
            We encountered an issue while loading your dashboard
          </p>
        </div>
        <ConnectionError error={error} onRetry={onRetry} />
      </div>
    </div>
  );
} 