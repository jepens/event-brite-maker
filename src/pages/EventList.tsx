import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

interface Event {
  id: string;
  name: string;
  description: string;
  event_date: string;
  location: string;
  max_participants: number;
  branding_config: any;
}

const EventCard = ({ event }: { event: Event }) => (
  <Card className="hover:shadow-lg transition-shadow h-[400px]">
    <CardHeader>
      {event.branding_config?.headerImage && (
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
        {event.event_date ? format(new Date(event.event_date), 'PPP') : 'Date TBA'}
      </div>
      
      {event.location && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4" />
          {event.location}
        </div>
      )}
      
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Users className="h-4 w-4" />
        Max {event.max_participants} participants
      </div>

      <div className="flex gap-2">
        <Badge variant="secondary">Free</Badge>
        <Badge variant="outline">Registration Required</Badge>
      </div>

      <Link to={`/event/${event.id}`} className="block">
        <Button className="w-full">Register Now</Button>
      </Link>
    </CardContent>
  </Card>
);

const EventCardSkeleton = () => (
  <Card className="h-[400px]">
    <CardHeader>
      <Skeleton className="w-full h-40" />
      <Skeleton className="h-6 w-3/4 mt-4" />
      <Skeleton className="h-4 w-full mt-2" />
      <Skeleton className="h-4 w-2/3 mt-1" />
    </CardHeader>
    <CardContent className="space-y-4">
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-8 w-full mt-4" />
    </CardContent>
  </Card>
);

const EventList = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('event_date', { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array(6).fill(0).map((_, i) => (
            <EventCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/10">
      <div className="container mx-auto py-8 px-4">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-foreground">Upcoming Events</h1>
            <p className="text-muted-foreground mt-2">Discover and register for amazing events</p>
          </div>
          <Link to="/auth">
            <Button variant="outline">Admin Login</Button>
          </Link>
        </div>

        {events.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <h2 className="text-2xl font-semibold mb-4">No Events Available</h2>
              <p className="text-muted-foreground">There are currently no events to register for.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default EventList;