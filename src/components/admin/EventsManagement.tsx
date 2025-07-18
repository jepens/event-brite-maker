import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Calendar, MapPin, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { EventFormDialog } from './EventFormDialog';

interface Event {
  id: string;
  name: string;
  description: string;
  event_date: string;
  location: string;
  max_participants: number;
  branding_config: any;
  custom_fields: any[];
  created_at: string;
}

export function EventsManagement() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEvents(data as Event[] || []);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch events',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event? This will also delete all registrations.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Event deleted successfully',
      });
      
      fetchEvents();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleEditEvent = (event: Event) => {
    setEditingEvent(event);
    setDialogOpen(true);
  };

  const handleCreateEvent = () => {
    setEditingEvent(null);
    setDialogOpen(true);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-8">Loading events...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Events Management</h2>
          <p className="text-muted-foreground">Create and manage your events</p>
        </div>
        <Button onClick={handleCreateEvent}>
          <Plus className="h-4 w-4 mr-2" />
          Create Event
        </Button>
      </div>

      {events.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <h3 className="text-lg font-semibold mb-2">No Events Yet</h3>
            <p className="text-muted-foreground mb-4">Get started by creating your first event</p>
            <Button onClick={handleCreateEvent}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Event
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {events.map((event) => (
            <Card key={event.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl">{event.name}</CardTitle>
                    <CardDescription className="mt-2">{event.description}</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditEvent(event)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteEvent(event.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4" />
                    {event.event_date ? format(new Date(event.event_date), 'PPP') : 'Date TBA'}
                  </div>
                  
                  {event.location && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4" />
                      {event.location}
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4" />
                    Max {event.max_participants} participants
                  </div>
                </div>

                <div className="flex gap-2 mb-2">
                  <Badge variant="secondary">Free Event</Badge>
                  {event.custom_fields && event.custom_fields.length > 0 && (
                    <Badge variant="outline">
                      {event.custom_fields.length} Custom Fields
                    </Badge>
                  )}
                </div>

                <p className="text-xs text-muted-foreground">
                  Created {format(new Date(event.created_at), 'PPp')}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <EventFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        event={editingEvent}
        onSuccess={fetchEvents}
      />
    </div>
  );
}