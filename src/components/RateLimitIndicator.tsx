import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Clock, CheckCircle, XCircle } from 'lucide-react';
import { RateLimitState } from '@/hooks/useRateLimit';
import { formatTimeForDisplay24 } from '@/lib/date-utils';

interface RateLimitIndicatorProps {
  state: RateLimitState;
  action: string;
  onReset?: () => void;
  showDetails?: boolean;
  className?: string;
}

export function RateLimitIndicator({ 
  state, 
  action, 
  onReset, 
  showDetails = false,
  className = '' 
}: RateLimitIndicatorProps) {
  const [timeLeft, setTimeLeft] = useState(state.timeUntilReset);

  // Update countdown timer
  useEffect(() => {
    if (state.timeUntilReset <= 0) {
      setTimeLeft(0);
      return;
    }

    const interval = setInterval(() => {
      setTimeLeft(prev => Math.max(0, prev - 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [state.timeUntilReset]);

  // Format time display
  const formatTime = (ms: number) => {
    if (ms <= 0) return '0s';
    
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  // Get progress percentage
  const getProgressPercentage = () => {
    const { attempts, remaining } = state;
    const total = attempts + remaining;
    return total > 0 ? (attempts / total) * 100 : 0;
  };

  // Get status color
  const getStatusColor = () => {
    const percentage = getProgressPercentage();
    if (state.isBlocked) return 'destructive';
    if (percentage >= 80) return 'secondary';
    if (percentage >= 60) return 'default';
    return 'default';
  };

  // Get status icon
  const getStatusIcon = () => {
    if (state.isBlocked) return <XCircle className="h-4 w-4" />;
    if (state.remaining <= 2) return <AlertTriangle className="h-4 w-4" />;
    return <CheckCircle className="h-4 w-4" />;
  };

  // Get status text
  const getStatusText = () => {
    if (state.isBlocked) return 'Blocked';
    if (state.remaining <= 2) return 'Warning';
    return 'Active';
  };

  // Don't show if no attempts and not blocked
  if (state.attempts === 0 && !state.isBlocked) {
    return null;
  }

  return (
    <Card className={`${className} ${state.isBlocked ? 'border-red-200 bg-red-50' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span className="text-sm font-medium capitalize">
              {action} Rate Limit
            </span>
          </div>
          <Badge variant={getStatusColor()}>
            {getStatusText()}
          </Badge>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2 mb-3">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Attempts: {state.attempts}</span>
            <span>Remaining: {state.remaining}</span>
          </div>
          <Progress 
            value={getProgressPercentage()} 
            className="h-2"
          />
        </div>

        {/* Time Display */}
        {state.isBlocked && timeLeft > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
            <Clock className="h-4 w-4" />
            <span>Reset in: {formatTime(timeLeft)}</span>
          </div>
        )}

        {/* Details (if enabled) */}
        {showDetails && (
          <div className="text-xs text-muted-foreground space-y-1">
            <div>Total attempts: {state.attempts}</div>
            <div>Remaining attempts: {state.remaining}</div>
            <div>Reset time: {formatTimeForDisplay24(new Date(state.resetTime).toISOString())}</div>
          </div>
        )}

        {/* Reset Button (if provided) */}
        {onReset && state.isBlocked && (
          <Button
            onClick={onReset}
            size="sm"
            variant="outline"
            className="w-full mt-3"
          >
            Reset Rate Limit
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// Compact version for inline display
export function RateLimitBadge({ state, action }: { state: RateLimitState; action: string }) {
  const [timeLeft, setTimeLeft] = useState(state.timeUntilReset);

  useEffect(() => {
    if (state.timeUntilReset <= 0) {
      setTimeLeft(0);
      return;
    }

    const interval = setInterval(() => {
      setTimeLeft(prev => Math.max(0, prev - 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [state.timeUntilReset]);

  const formatTime = (ms: number) => {
    if (ms <= 0) return '0s';
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return minutes > 0 ? `${minutes}m` : `${seconds}s`;
  };

  if (state.attempts === 0 && !state.isBlocked) {
    return null;
  }

  return (
    <Badge 
      variant={state.isBlocked ? 'destructive' : state.remaining <= 2 ? 'secondary' : 'default'}
      className="text-xs"
    >
      {state.isBlocked ? (
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {formatTime(timeLeft)}
        </span>
      ) : (
        <span>{state.remaining} left</span>
      )}
    </Badge>
  );
} 