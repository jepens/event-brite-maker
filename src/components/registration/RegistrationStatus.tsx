import { Users, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Event } from './types';

interface RegistrationStatusProps {
  event: Event;
  currentCount: number;
  isFull: boolean;
}

export function RegistrationStatus({ event, currentCount, isFull }: RegistrationStatusProps) {
  // Only show registration status if the event is full
  if (!isFull) {
    return null;
  }

  return (
    <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-r from-red-50 to-orange-50">
      <CardContent className="p-0">
        <div className="relative">
          {/* Background Pattern */}
          <div className="absolute inset-0 bg-gradient-to-br from-red-100/50 to-orange-100/50"></div>
          
          {/* Content */}
          <div className="relative p-8 lg:p-12">
            <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6">
              
              {/* Icon Section */}
              <div className="flex-shrink-0">
                <div className="w-16 h-16 lg:w-20 lg:h-20 bg-red-100 rounded-full flex items-center justify-center border-4 border-red-200">
                  <XCircle className="w-8 h-8 lg:w-10 lg:h-10 text-red-600" />
                </div>
              </div>
              
              {/* Text Content */}
              <div className="flex-1 space-y-4">
                <div className="space-y-2">
                  <h2 className="text-2xl lg:text-3xl font-bold text-red-900">
                    Registration Closed
                  </h2>
                  <p className="text-lg text-red-800 leading-relaxed">
                    This event has reached its maximum capacity of{' '}
                    <span className="font-semibold">{event.max_participants} participants</span>. 
                    No more registrations are being accepted at this time.
                  </p>
                </div>
                
                {/* Additional Information */}
                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <Badge variant="secondary" className="bg-red-100 text-red-800 border border-red-200 px-3 py-1">
                    <Users className="w-4 h-4 mr-1" />
                    {currentCount}/{event.max_participants} Registered
                  </Badge>
                  
                  <div className="flex items-center gap-2 text-sm text-red-700">
                    <AlertCircle className="w-4 h-4" />
                    <span>Event is at full capacity</span>
                  </div>
                </div>
                
                {/* Alternative Actions */}
                <div className="pt-4 border-t border-red-200">
                  <p className="text-sm text-red-700">
                    <strong>What's next?</strong> You can check back later for cancellations or contact the organizer for waitlist options.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 