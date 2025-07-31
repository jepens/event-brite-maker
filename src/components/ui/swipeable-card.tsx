import React from 'react';
import { useSwipeable } from 'react-swipeable';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';
import { cn } from '@/lib/utils';

interface SwipeableCardProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  className?: string;
  disabled?: boolean;
  swipeThreshold?: number;
  preventDefaultTouchmoveEvent?: boolean;
  trackMouse?: boolean;
}

export function SwipeableCard({
  children,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  className,
  disabled = false,
  swipeThreshold = 50,
  preventDefaultTouchmoveEvent = true,
  trackMouse = false,
}: SwipeableCardProps) {
  const handlers = useSwipeable({
    onSwipedLeft: onSwipeLeft,
    onSwipedRight: onSwipeRight,
    onSwipedUp: onSwipeUp,
    onSwipedDown: onSwipeDown,
    swipeDuration: 500,
    preventScrollOnSwipe: true,
    trackMouse,
    delta: swipeThreshold,
    trackTouch: true,
  });

  return (
    <div
      {...handlers}
      className={cn(
        'touch-friendly mobile-transition',
        className
      )}
    >
      {children}
    </div>
  );
}

interface SwipeableRegistrationCardProps {
  registration: {
    id: string;
    participant_name: string;
    participant_email: string;
    status: string;
    events?: {
      name: string;
    };
  };
  onApprove?: () => void;
  onReject?: () => void;
  onViewTicket?: () => void;
  onResendEmail?: () => void;
  onDelete?: () => void;
  className?: string;
}

export function SwipeableRegistrationCard({
  registration,
  onApprove,
  onReject,
  onViewTicket,
  onResendEmail,
  onDelete,
  className,
}: SwipeableRegistrationCardProps) {
  const handleSwipeLeft = () => {
    if (onDelete) {
      onDelete();
    }
  };

  const handleSwipeRight = () => {
    if (registration.status === 'pending' && onApprove) {
      onApprove();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'border-green-200 bg-green-50';
      case 'rejected':
        return 'border-red-200 bg-red-50';
      case 'pending':
        return 'border-yellow-200 bg-yellow-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <SwipeableCard
      onSwipeLeft={handleSwipeLeft}
      onSwipeRight={handleSwipeRight}
      className={cn('mobile-card', className)}
    >
      <Card className={cn('mobile-transition', getStatusColor(registration.status))}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-1">{registration.participant_name}</h3>
              <p className="text-sm text-muted-foreground mb-2">{registration.participant_email}</p>
              <div className="flex items-center gap-2 mb-2">
                <span className={cn('px-2 py-1 rounded-full text-xs font-medium', getStatusBadge(registration.status))}>
                  {registration.status}
                </span>
              </div>
              <p className="text-sm font-medium">{registration.events?.name}</p>
            </div>
          </div>
          
          <div className="mobile-actions">
            {registration.status === 'pending' && (
              <div className="flex gap-2 mb-2">
                <button
                  onClick={onApprove}
                  className="action-button flex-1 bg-green-600 text-white px-3 py-2 rounded-md text-sm font-medium mobile-transition"
                >
                  Approve
                </button>
                <button
                  onClick={onReject}
                  className="action-button flex-1 bg-red-600 text-white px-3 py-2 rounded-md text-sm font-medium mobile-transition"
                >
                  Reject
                </button>
              </div>
            )}
            
            <div className="flex gap-2">
              <button
                onClick={onViewTicket}
                className="action-button flex-1 bg-blue-600 text-white px-3 py-2 rounded-md text-sm font-medium mobile-transition"
              >
                View Ticket
              </button>
              <button
                onClick={onResendEmail}
                className="action-button flex-1 bg-gray-600 text-white px-3 py-2 rounded-md text-sm font-medium mobile-transition"
              >
                Resend Email
              </button>
            </div>
            
            <button
              onClick={onDelete}
              className="action-button w-full bg-red-600 text-white px-3 py-2 rounded-md text-sm font-medium mobile-transition mt-2"
            >
              Delete
            </button>
          </div>
        </CardContent>
      </Card>
    </SwipeableCard>
  );
} 