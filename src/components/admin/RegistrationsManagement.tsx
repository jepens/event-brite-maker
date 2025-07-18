import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, XCircle, Clock, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface Registration {
  id: string;
  event_id: string;
  participant_name: string;
  participant_email: string;
  custom_data: any;
  status: 'pending' | 'approved' | 'rejected';
  registered_at: string;
  processed_at: string;
  events: {
    name: string;
  };
}

interface Event {
  id: string;
  name: string;
}

export function RegistrationsManagement() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
    fetchRegistrations();
  }, []);

  useEffect(() => {
    fetchRegistrations();
  }, [selectedEvent]);

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  const fetchRegistrations = async () => {
    try {
      let query = supabase
        .from('registrations')
        .select(`
          *,
          events (
            name
          )
        `)
        .order('registered_at', { ascending: false });

      if (selectedEvent !== 'all') {
        query = query.eq('event_id', selectedEvent);
      }

      const { data, error } = await query;

      if (error) throw error;
      setRegistrations(data || []);
    } catch (error) {
      console.error('Error fetching registrations:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch registrations',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateRegistrationStatus = async (registrationId: string, status: 'approved' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('registrations')
        .update({
          status,
          processed_at: new Date().toISOString(),
        })
        .eq('id', registrationId);

      if (error) throw error;

      // If approved, generate QR code ticket
      if (status === 'approved') {
        await generateTicket(registrationId);
      }

      toast({
        title: 'Success',
        description: `Registration ${status} successfully`,
      });

      fetchRegistrations();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const generateTicket = async (registrationId: string) => {
    try {
      // Generate unique QR code
      const qrCode = `TICKET_${registrationId}_${Date.now()}`;

      const { error } = await supabase
        .from('tickets')
        .insert({
          registration_id: registrationId,
          qr_code: qrCode,
        });

      if (error) throw error;

      // Here you would typically send email with ticket
      // For now, we'll just show a success message
      toast({
        title: 'Ticket Generated',
        description: 'QR code ticket has been generated for the participant',
      });
    } catch (error: any) {
      console.error('Error generating ticket:', error);
      toast({
        title: 'Warning',
        description: 'Registration approved but ticket generation failed',
        variant: 'destructive',
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-8">Loading registrations...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Registration Management</h2>
          <p className="text-muted-foreground">Review and approve event registrations</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={selectedEvent} onValueChange={setSelectedEvent}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Events</SelectItem>
              {events.map((event) => (
                <SelectItem key={event.id} value={event.id}>
                  {event.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {registrations.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <h3 className="text-lg font-semibold mb-2">No Registrations Found</h3>
            <p className="text-muted-foreground">
              {selectedEvent === 'all' 
                ? 'No registrations have been submitted yet.'
                : 'No registrations found for the selected event.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Registrations ({registrations.length})</CardTitle>
            <CardDescription>
              Click approve or reject to process pending registrations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Participant</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Registration Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {registrations.map((registration) => (
                  <TableRow key={registration.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{registration.participant_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {registration.participant_email}
                        </div>
                        {registration.custom_data && Object.keys(registration.custom_data).length > 0 && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {Object.entries(registration.custom_data).map(([key, value]) => (
                              <div key={key}>
                                {key}: {String(value)}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{registration.events.name}</TableCell>
                    <TableCell>
                      {format(new Date(registration.registered_at), 'PPp')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(registration.status)}
                        {getStatusBadge(registration.status)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {registration.status === 'pending' ? (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => updateRegistrationStatus(registration.id, 'approved')}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => updateRegistrationStatus(registration.id, 'rejected')}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">
                          {registration.processed_at 
                            ? `Processed ${format(new Date(registration.processed_at), 'PPp')}`
                            : 'Processed'}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}