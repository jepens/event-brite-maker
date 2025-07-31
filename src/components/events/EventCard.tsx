import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, AlertCircle } from 'lucide-react';
import { Event } from './types';
import { useMobile } from '@/hooks/use-mobile';
import { formatDateForDisplay } from '@/lib/date-utils';

interface EventCardProps {
  event: Event;
  currentCount?: number;
  isFull?: boolean;
}

export function EventCard({ event, currentCount, isFull }: EventCardProps) {
  const { isMobile } = useMobile();
  
  return (
    <Card className={`hover:shadow-lg transition-shadow ${isMobile ? 'h-auto' : 'h-[400px]'} mobile-card`}>
      <CardHeader>
        {event.branding_config?.headerImage && typeof event.branding_config.headerImage === 'string' && (
          <img
            src={event.branding_config.headerImage}
            alt={event.name}
            className="w-full h-40 object-cover rounded-t-lg"
            loading="lazy"
          />
        )}
        <CardTitle className="line-clamp-2">{event.name}</CardTitle>
        <CardDescription className="line-clamp-3">
          {event.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          {event.event_date ? formatDateForDisplay(event.event_date) : 'Date TBA'}
        </div>
        
        {event.location && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            {event.location}
          </div>
        )}
        


        <div className="flex gap-2 flex-wrap">
          <Badge variant="secondary">Free</Badge>
          <Badge variant="outline">Registration Required</Badge>
          {isFull && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Full
            </Badge>
          )}
        </div>

        {isFull ? (
          <Button className={`w-full ${isMobile ? 'mobile-button' : ''}`} disabled variant="outline">
            Registration Closed
          </Button>
        ) : (
          <Link to={`/event/${event.id}`} className="block">
            <Button className={`w-full ${isMobile ? 'mobile-button' : ''}`}>Register Now</Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
} 