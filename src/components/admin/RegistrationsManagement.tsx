import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Search, CheckCircle, XCircle, Clock, Users, QrCode, Eye, Download, Mail, Trash2, FileDown } from 'lucide-react';
import { supabase, deleteRegistration, testConnectionAndEvents } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { downloadRegistrations, DownloadOptions } from '@/lib/download-service';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { QRCodeCanvas } from 'qrcode.react';

interface Ticket {
  id: string;
  qr_code: string;
  short_code?: string;
  qr_image_url: string;
  status: 'unused' | 'used';
  whatsapp_sent?: boolean;
  whatsapp_sent_at?: string;
}

interface Registration {
  id: string;
  participant_name: string;
  participant_email: string;
  phone_number?: string;
  status: 'pending' | 'approved' | 'rejected';
  registered_at: string;
  custom_data: Record<string, unknown>;
  event_id: string;
  events: {
    id: string;
    name: string;
    whatsapp_enabled?: boolean; // Type-safe property access
  } | null;
  tickets: Ticket[];
}

export function RegistrationsManagement() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [eventFilter, setEventFilter] = useState<string>('all');
  const [events, setEvents] = useState<{ id: string; name: string }[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Registration | null>(null);
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [registrationToDelete, setRegistrationToDelete] = useState<Registration | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    // Test connection and events data first
    testConnectionAndEvents().then(result => {
      console.log('Connection test result:', result);
    });
    
    fetchRegistrations();
    fetchEvents();
  }, []);

  useEffect(() => {
    console.log('Current registrations:', registrations);
  }, [registrations]);

  const fetchRegistrations = async () => {
    try {
      setLoading(true);
      console.log('Fetching registrations...');
      
      // First, get all registrations
      const { data: registrationsData, error: registrationsError } = await supabase
        .from('registrations')
        .select(`
          id,
          participant_name,
          participant_email,
          phone_number,
          status,
          registered_at,
          custom_data,
          event_id,
          events (
            id,
            name,
            whatsapp_enabled
          )
        `)
        .order('registered_at', { ascending: false });

      if (registrationsError) throw registrationsError;

      console.log('Raw registrations data:', registrationsData);
      
      // Debug: Check if event_id matches any events
      if (registrationsData && registrationsData.length > 0) {
        console.log('Registration event_ids:', registrationsData.map(r => r.event_id));
        console.log('Events from join:', registrationsData.map(r => r.events));
      }

      // Then, for each registration, get its ticket and ensure event data
      const registrationsWithTickets = await Promise.all(
        (registrationsData || []).map(async (registration) => {
          const { data: ticketsData, error: ticketsError } = await supabase
            .from('tickets')
            .select('*')
            .eq('registration_id', registration.id);

          // Get event data from join or fetch directly if needed
          let eventData: { id: string; name: string; whatsapp_enabled?: boolean } | null = null;
          
          // Check if events data exists from join
          if (registration.events && typeof registration.events === 'object' && !Array.isArray(registration.events)) {
            eventData = registration.events as { id: string; name: string; whatsapp_enabled?: boolean };
          }
          
          if (!eventData) {
            console.log(`Fetching event data directly for registration ${registration.id}, event_id: ${registration.event_id}`);
            const { data: directEventData, error: directEventError } = await supabase
              .from('events')
              .select('id, name, whatsapp_enabled')
              .eq('id', registration.event_id)
              .single();
            
            if (directEventError) {
              console.error('Error fetching event directly:', directEventError);
              eventData = { 
                id: registration.event_id, 
                name: 'Unknown Event', 
                whatsapp_enabled: false 
              };
            } else {
              console.log('Direct event fetch successful:', directEventData);
              eventData = directEventData;
            }
          }

          if (ticketsError) {
            console.error('Error fetching tickets for registration:', registration.id, ticketsError);
            return {
              ...registration,
              events: eventData,
              tickets: []
            };
          }

          console.log(`Tickets for registration ${registration.id}:`, ticketsData);
          return {
            ...registration,
            events: eventData,
            tickets: ticketsData || []
          };
        })
      );

      console.log('Registrations with tickets:', registrationsWithTickets);
      setRegistrations(registrationsWithTickets as unknown as Registration[]);
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

  const updateRegistrationStatus = async (registrationId: string, status: 'approved' | 'rejected') => {
    try {
      setLoading(true);
      
      // Update registration status
      const { error } = await supabase
        .from('registrations')
        .update({ 
          status,
          processed_at: new Date().toISOString()
        })
        .eq('id', registrationId);

      if (error) throw error;

      // If approved, generate QR ticket and send email
      if (status === 'approved') {
        console.log('Generating QR ticket for registration:', registrationId);
        
        const { data, error: qrError } = await supabase.functions.invoke('generate-qr-ticket', {
          body: { registration_id: registrationId }
        });

        console.log('QR generation response:', { data, error: qrError });

        if (qrError) {
          console.error('QR ticket generation failed:', qrError);
          toast({
            title: 'Warning',
            description: `Registration approved but ticket generation failed: ${qrError.message || 'Unknown error'}`,
            variant: 'destructive',
          });
        } else if (!data) {
          console.error('QR ticket generation returned no data');
          toast({
            title: 'Warning',
            description: 'Registration approved but ticket generation returned no data. Please try again.',
            variant: 'destructive',
          });
        } else {
          console.log('QR ticket generated successfully:', data);
          toast({
            title: 'Success',
            description: 'Registration approved and ticket sent via email!',
          });
          // Refresh registrations to get the new ticket
          await fetchRegistrations();
        }
      } else {
        toast({
          title: 'Success',
          description: `Registration ${status} successfully`,
        });
        await fetchRegistrations();
      }
    } catch (error: unknown) {
      console.error('Error updating registration:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredRegistrations = registrations.filter((registration) => {
    const matchesSearch = 
      registration.participant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      registration.participant_email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || registration.status === statusFilter;
    const matchesEvent = eventFilter === 'all' || registration.event_id === eventFilter;

    return matchesSearch && matchesStatus && matchesEvent;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge variant="default" className="bg-green-500">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  const handleViewTicket = async (registration: Registration) => {
    try {
      console.log('Fetching ticket for registration:', registration);
      
      // Fetch fresh ticket data
      const { data: ticketData, error: ticketError } = await supabase
        .from('tickets')
        .select('*')
        .eq('registration_id', registration.id)
        .single();

      if (ticketError) throw ticketError;

      if (ticketData) {
        // Log the fetched ticket data to debug short_code
        console.log('Fetched ticket data:', ticketData);
        console.log('Short code in ticket data:', ticketData.short_code);
        
        // Fetch event details to ensure we have the latest data
        const { data: eventData, error: eventError } = await supabase
          .from('events')
          .select('name')
          .eq('id', registration.event_id)
          .single();

        if (eventError) {
          console.error('Error fetching event details:', eventError);
        }

        setSelectedTicket({
          ...registration,
          events: {
            id: registration.event_id,
            name: eventData?.name 
              || (typeof registration.events === 'object' && registration.events && 'name' in registration.events 
                  ? (registration.events as Record<string, unknown>).name as string
                  : 'Unknown Event'),
            whatsapp_enabled: eventData?.whatsapp_enabled 
              ?? (typeof registration.events === 'object' && registration.events && 'whatsapp_enabled' in registration.events
                  ? (registration.events as Record<string, unknown>).whatsapp_enabled as boolean
                  : false)
          },
          tickets: [ticketData]
        });
        setShowQRDialog(true);
      } else {
        toast({
          title: 'Error',
          description: 'No ticket found for this registration',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error fetching ticket:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch ticket details',
        variant: 'destructive',
      });
    }
  };

  const handleDownloadQR = async (ticket: Ticket) => {
    try {
      const response = await fetch(ticket.qr_image_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ticket-${ticket.id}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading QR code:', error);
      toast({
        title: 'Error',
        description: 'Failed to download QR code',
        variant: 'destructive',
      });
    }
  };

  const handleResendEmail = async (registration: Registration) => {
    try {
      console.log('Resending email for registration:', registration.id);
      
      // First, get the ticket details
      const { data: ticket, error: ticketError } = await supabase
        .from('tickets')
        .select('*')
        .eq('registration_id', registration.id)
        .single();

      if (ticketError) throw ticketError;
      if (!ticket) throw new Error('No ticket found for this registration');

      // Get event details
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('name, event_date, location')
        .eq('id', registration.event_id)
        .single();

      if (eventError) throw eventError;
      if (!event) throw new Error('Event not found');

      // Call send-ticket-email function
      const { data, error: emailError } = await supabase.functions.invoke('send-ticket-email', {
        body: {
          participant_email: registration.participant_email,
          participant_name: registration.participant_name,
          event_name: event.name,
          event_date: event.event_date,
          event_location: event.location || 'TBA',
          qr_code_data: ticket.qr_code,
          qr_image_url: ticket.qr_image_url
        }
      });

      if (emailError) throw emailError;

      toast({
        title: 'Success',
        description: 'Ticket email resent successfully!',
      });
    } catch (error: unknown) {
      console.error('Error resending email:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to resend email',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteRegistration = async (registration: Registration) => {
    console.log('Registration to delete:', registration);
    console.log('Event data:', registration.events);
    setRegistrationToDelete(registration);
    setShowDeleteDialog(true);
  };

  const handleDownloadRegistrations = async (format: 'csv' | 'excel' = 'csv') => {
    try {
      setDownloading(true);
      
      const options: DownloadOptions = {
        eventId: eventFilter === 'all' ? undefined : eventFilter,
        status: statusFilter === 'all' ? 'all' : statusFilter as 'pending' | 'approved' | 'rejected',
        format
      };

      await downloadRegistrations(options);
      
      toast({
        title: 'Success',
        description: `Registrations downloaded successfully as ${format.toUpperCase()}`,
      });
    } catch (error) {
      console.error('Error downloading registrations:', error);
      toast({
        title: 'Error',
        description: 'Failed to download registrations',
        variant: 'destructive',
      });
    } finally {
      setDownloading(false);
    }
  };

  const confirmDelete = async () => {
    if (!registrationToDelete) return;

    try {
      setDeleting(true);
      console.log('Deleting registration:', registrationToDelete.id);
      
      const { error } = await deleteRegistration(registrationToDelete.id);

      if (error) {
        console.error('Delete error:', error);
        throw error;
      }

      console.log('Registration deleted successfully from database');

      // Remove from local state
      setRegistrations(prev => {
        const filtered = prev.filter(r => r.id !== registrationToDelete.id);
        console.log('Updated local state, remaining registrations:', filtered.length);
        return filtered;
      });

      // Force refresh registrations to ensure UI is in sync
      console.log('Forcing refresh of registrations...');
      await fetchRegistrations();
      
      // Double-check that the registration was actually deleted
      console.log('Double-checking deletion...');
      const { data: checkData, error: checkError } = await supabase
        .from('registrations')
        .select('*')
        .eq('id', registrationToDelete.id)
        .single();
      
      if (checkError && checkError.code === 'PGRST116') {
        console.log('✅ Confirmed: Registration successfully deleted from database');
      } else if (checkError) {
        console.log('❌ Error checking deletion:', checkError.message);
      } else {
        console.log('❌ WARNING: Registration still exists in database!');
        console.log('Remaining registration:', checkData);
      }

      toast({
        title: 'Success',
        description: 'Registration deleted successfully',
      });

      setShowDeleteDialog(false);
      setRegistrationToDelete(null);
    } catch (error: unknown) {
      console.error('Error deleting registration:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete registration',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  const QRDialog = () => {
    if (!selectedTicket) {
      console.log('No selected ticket data');
      return null;
    }

    const ticket = selectedTicket.tickets?.[0];
    if (!ticket) {
      console.log('No ticket data found in selected registration');
      return null;
    }

    console.log('Displaying ticket:', {
      ticket,
      registration: selectedTicket,
      eventName: selectedTicket.events?.name
    });
    console.log('Short code in ticket object:', ticket.short_code);
    console.log('Has short code:', !!ticket.short_code);

    return (
      <Dialog open={showQRDialog} onOpenChange={setShowQRDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ticket QR Code</DialogTitle>
            <DialogDescription>
              Scan this QR code or use the short verification code below for manual entry
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-6 py-4">
            <div className="bg-white p-4 rounded-lg relative group">
              {ticket.qr_image_url ? (
                <>
                  <img 
                    src={ticket.qr_image_url} 
                    alt="QR Code" 
                    className="w-[200px] h-[200px] object-contain"
                    onError={(e) => {
                      console.error('Error loading QR image, falling back to QR canvas');
                      e.currentTarget.style.display = 'none';
                      // Show QRCodeCanvas as fallback
                      const canvas = e.currentTarget.parentElement?.querySelector('canvas');
                      if (canvas) {
                        canvas.style.display = 'block';
                      }
                    }}
                  />
                  <div style={{ display: ticket.qr_image_url ? 'none' : 'block' }}>
                    <QRCodeCanvas value={ticket.qr_code} size={200} level="H" />
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleDownloadQR(ticket)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <QRCodeCanvas value={ticket.qr_code} size={200} level="H" />
              )}
            </div>
            <div className="text-center space-y-3">
              {/* Short Code - Primary Display */}
              {ticket.short_code && (
                <>
                  <div>
                    <div className="text-sm text-muted-foreground mb-2">Short Verification Code</div>
                    <div className="font-mono text-xl bg-green-50 border border-green-200 p-3 rounded-lg select-all font-bold text-green-800">
                      {ticket.short_code}
                    </div>
                    <div className="text-xs text-green-600 mt-1">
                      Use this short code for manual entry
                    </div>
                  </div>
                </>
              )}
              
              {/* Full Code - Secondary Display */}
              <div>
                <div className="text-sm text-muted-foreground mb-2">
                  {ticket.short_code ? 'Full QR Code Data' : 'Manual Verification Code'}
                </div>
                <div className="font-mono text-sm bg-muted p-2 rounded select-all text-gray-600">
                  {ticket.qr_code}
                </div>
                {ticket.short_code && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Full QR code data for scanning
                  </div>
                )}
              </div>
            </div>
            <div className="text-center text-sm text-muted-foreground">
              <p>Event: {selectedTicket.events?.name || 'Unknown Event'}</p>
              <p>Participant: {selectedTicket.participant_name}</p>
              <p>Status: {ticket.status === 'unused' ? 'Not Used' : 'Used'}</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  const DeleteConfirmationDialog = () => (
    <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Registration</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this registration? This action cannot be undone.
            <br />
            <br />
            <strong>Participant:</strong> {registrationToDelete?.participant_name}
            <br />
            <strong>Email:</strong> {registrationToDelete?.participant_email}
            <br />
            <strong>Event:</strong> {registrationToDelete?.events?.name || 'Unknown Event'}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setShowDeleteDialog(false);
              setRegistrationToDelete(null);
            }}
            disabled={deleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={confirmDelete}
            disabled={deleting}
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  if (loading) {
    return <div className="flex items-center justify-center py-8">Loading registrations...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Registrations Management</h2>
          <p className="text-muted-foreground">Review and manage event registrations</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            {filteredRegistrations.length} registrations
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => handleDownloadRegistrations('csv')}
              disabled={downloading}
              variant="outline"
              size="sm"
            >
              <FileDown className="h-4 w-4 mr-2" />
              {downloading ? 'Downloading...' : 'Download CSV'}
            </Button>
            <Button
              onClick={() => handleDownloadRegistrations('excel')}
              disabled={downloading}
              variant="outline"
              size="sm"
            >
              <FileDown className="h-4 w-4 mr-2" />
              {downloading ? 'Downloading...' : 'Download Excel'}
            </Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Event</label>
              <Select value={eventFilter} onValueChange={setEventFilter}>
                <SelectTrigger>
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
        </CardContent>
      </Card>

      {/* Registrations Table */}
      <Card>
        <CardContent className="p-0">
          {filteredRegistrations.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="text-lg font-semibold mb-2">No Registrations Found</h3>
              <p className="text-muted-foreground">
                {registrations.length === 0 
                  ? "No registrations have been submitted yet."
                  : "No registrations match your current filters."
                }
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Participant</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Registration Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>WhatsApp</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRegistrations.map((registration) => (
                  <TableRow key={registration.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{registration.participant_name}</div>
                        <div className="text-sm text-muted-foreground">{registration.participant_email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{registration.events?.name}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {format(new Date(registration.registered_at), 'PPp')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(registration.status)}
                        {getStatusBadge(registration.status)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {registration.phone_number ? (
                          <div className="text-sm">
                            <span className="font-medium">📱 {registration.phone_number}</span>
                            {typeof registration.events === 'object' && registration.events && 'whatsapp_enabled' in registration.events && (registration.events as Record<string, unknown>).whatsapp_enabled && (
                              <div className="text-xs text-muted-foreground">
                                {registration.tickets?.[0]?.whatsapp_sent ? (
                                  <span className="text-green-600">✓ Sent</span>
                                ) : (
                                  <span className="text-orange-600">⏳ Pending</span>
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Not provided</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {registration.status === 'pending' ? (
                          <>
                            <Button
                              size="sm"
                              onClick={() => updateRegistrationStatus(registration.id, 'approved')}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => updateRegistrationStatus(registration.id, 'rejected')}
                            >
                              Reject
                            </Button>
                          </>
                        ) : registration.status === 'approved' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewTicket(registration)}
                            >
                              <QrCode className="h-4 w-4 mr-2" />
                              View Ticket
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleResendEmail(registration)}
                            >
                              <Mail className="h-4 w-4 mr-2" />
                              Resend Email
                            </Button>
                          </>
                        )}
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteRegistration(registration)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <QRDialog />
      <DeleteConfirmationDialog />
    </div>
  );
}