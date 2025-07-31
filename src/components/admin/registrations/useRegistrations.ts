import { useState, useEffect } from 'react';
import { supabase, deleteRegistration, testConnectionAndEvents } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Registration, Event } from './types';

export function useRegistrations() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    // Test connection and events data first
    testConnectionAndEvents().then(result => {
      console.log('Connection test result:', result);
    });
    
    fetchRegistrations();
    fetchEvents();
  }, []);

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

      if (registrationsError) {
        console.error('Error fetching registrations:', registrationsError);
        toast({
          title: 'Error',
          description: 'Failed to fetch registrations',
          variant: 'destructive',
        });
        return;
      }

      console.log('Registrations fetched:', registrationsData);

      // Then, get tickets for each registration
      const registrationsWithTickets = await Promise.all(
        (registrationsData || []).map(async (registration) => {
          const { data: ticketsData, error: ticketsError } = await supabase
            .from('tickets')
            .select('*')
            .eq('registration_id', registration.id);

          if (ticketsError) {
            console.error('Error fetching tickets for registration:', registration.id, ticketsError);
            return { ...registration, tickets: [] };
          }

          return { 
            ...registration, 
            tickets: ticketsData || [],
            events: Array.isArray(registration.events) ? registration.events[0] || null : registration.events
          };
        })
      );

      setRegistrations(registrationsWithTickets as Registration[]);
    } catch (error) {
      console.error('Error in fetchRegistrations:', error);
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
      const { error } = await supabase
        .from('registrations')
        .update({ status })
        .eq('id', registrationId);

      if (error) throw error;

      // Update local state
      setRegistrations(prev => 
        prev.map(reg => 
          reg.id === registrationId 
            ? { ...reg, status }
            : reg
        )
      );

      toast({
        title: 'Success',
        description: `Registration ${status} successfully`,
      });

      // If status is approved, generate QR ticket and send notifications
      if (status === 'approved') {
        try {
          console.log('Generating QR ticket for approved registration:', registrationId);
          
          const { data: qrData, error: qrError } = await supabase.functions.invoke('generate-qr-ticket', {
            body: { registration_id: registrationId }
          });

          if (qrError) {
            console.error('Error generating QR ticket:', qrError);
            toast({
              title: 'Warning',
              description: 'Registration approved but failed to generate ticket. Please try again.',
              variant: 'destructive',
            });
          } else {
            console.log('QR ticket generated successfully:', qrData);
            toast({
              title: 'Success',
              description: 'Registration approved and ticket generated successfully!',
            });
          }
        } catch (qrError) {
          console.error('Error calling generate-qr-ticket function:', qrError);
          toast({
            title: 'Warning',
            description: 'Registration approved but failed to generate ticket. Please try again.',
            variant: 'destructive',
          });
        }
      }

      // Refresh registrations to get updated data
      await fetchRegistrations();
    } catch (error) {
      console.error('Error updating registration status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update registration status',
        variant: 'destructive',
      });
    }
  };

  const deleteRegistrationById = async (registrationId: string) => {
    try {
      const result = await deleteRegistration(registrationId);
      
      if (!result.error) {
        // Update local state
        setRegistrations(prev => prev.filter(reg => reg.id !== registrationId));
        
        toast({
          title: 'Success',
          description: 'Registration deleted successfully',
        });
      } else {
        throw new Error(result.error.message || 'Failed to delete registration');
      }
    } catch (error) {
      console.error('Error deleting registration:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete registration',
        variant: 'destructive',
      });
    }
  };

  return {
    registrations,
    loading,
    events,
    fetchRegistrations,
    updateRegistrationStatus,
    deleteRegistrationById,
  };
} 