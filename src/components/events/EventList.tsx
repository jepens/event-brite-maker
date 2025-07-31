import { useEventList } from './useEventList';
import { EventCard } from './EventCard';
import { EventCardSkeleton } from './EventCardSkeleton';
import { useMobile } from '@/hooks/use-mobile';

export function EventList() {
  const { events, loading, getRegistrationCount, isRegistrationFull } = useEventList();
  const { isMobile } = useMobile();

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Upcoming Events</h1>
          <p className="text-muted-foreground">Discover and register for exciting events</p>
        </div>
        <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'md:grid-cols-2 lg:grid-cols-3'}`}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <EventCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Upcoming Events</h1>
        <p className="text-muted-foreground">Discover and register for exciting events</p>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold mb-2">No events available</h2>
          <p className="text-muted-foreground">Check back later for upcoming events</p>
        </div>
      ) : (
        <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'md:grid-cols-2 lg:grid-cols-3'}`}>
          {events.map((event) => (
            <EventCard 
              key={event.id} 
              event={event}
              currentCount={getRegistrationCount(event.id)}
              isFull={isRegistrationFull(event.id, event.max_participants)}
            />
          ))}
        </div>
      )}
    </div>
  );
} 