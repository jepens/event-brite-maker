import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Registration, Event } from './types';
import { deleteRegistration } from '@/integrations/supabase/client';

export function useRegistrations() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<Event[]>([]);

  const fetchRegistrations = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('registrations')
        .select(`
          *,
          events (
            id,
            name,
            date,
            location,
            description,
            whatsapp_enabled
          ),
          tickets (
            id,
            qr_code,
            short_code,
            status,
            checkin_at,
            checkin_location,
            whatsapp_sent,
            whatsapp_sent_at,
            email_sent,
            email_sent_at,
            issued_at,
            qr_image_url
          )
        `)
        .order('registered_at', { ascending: false });

      if (error) {
        console.error('Error fetching registrations:', error);
        toast({
          title: 'Error',
          description: 'Failed to fetch registrations',
          variant: 'destructive',
        });
        return;
      }

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

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('date', { ascending: false });

      if (error) {
        console.error('Error fetching events:', error);
        return;
      }

      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  useEffect(() => {
    fetchRegistrations();
    fetchEvents();
  }, []);

  const updateRegistrationStatus = async (registrationId: string, status: 'approved' | 'rejected', notificationOptions?: { sendEmail: boolean; sendWhatsApp: boolean }) => {
    try {
      // Update registration status
      const { error: updateError } = await supabase
        .from('registrations')
        .update({ status })
        .eq('id', registrationId);

      if (updateError) throw updateError;

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

      // If approved, generate QR ticket and send notifications
      if (status === 'approved' && notificationOptions) {
        try {
          const { data: qrData, error: qrError } = await supabase.functions.invoke('generate-qr-ticket', {
            body: { 
              registration_id: registrationId,
              notification_options: notificationOptions
            }
          });

          if (qrError) {
            console.error('Error calling generate-qr-ticket function:', qrError);
            toast({
              title: 'Warning',
              description: 'Registration approved but failed to generate ticket. Please try again.',
              variant: 'destructive',
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

  const batchApproveRegistrations = async (registrationIds: string[], notificationOptions?: { sendEmail: boolean; sendWhatsApp: boolean }) => {
    try {
      // Update all registrations status to approved
      const { error: updateError } = await supabase
        .from('registrations')
        .update({ status: 'approved' })
        .in('id', registrationIds);

      if (updateError) throw updateError;

      // Update local state
      setRegistrations(prev => 
        prev.map(reg => 
          registrationIds.includes(reg.id) 
            ? { ...reg, status: 'approved' }
            : reg
        )
      );

      toast({
        title: 'Success',
        description: `${registrationIds.length} registration${registrationIds.length > 1 ? 's' : ''} approved successfully`,
      });

      // Generate QR tickets and send notifications for each approved registration with delay
      if (notificationOptions && (notificationOptions.sendEmail || notificationOptions.sendWhatsApp)) {
        console.log(`Starting batch notification for ${registrationIds.length} registrations`);
        
        const results = [];
        
        // Process registrations sequentially with delay to avoid rate limiting
        for (let i = 0; i < registrationIds.length; i++) {
          const registrationId = registrationIds[i];
          
          try {
            console.log(`Processing registration ${i + 1}/${registrationIds.length}:`, registrationId);
            
            // Add delay between requests to avoid rate limiting
            if (i > 0) {
              const delay = notificationOptions.sendWhatsApp ? 2000 : 500; // 2s for WhatsApp, 500ms for email only
              console.log(`Waiting ${delay}ms before next request...`);
              await new Promise(resolve => setTimeout(resolve, delay));
            }
            
            const { data: qrData, error: qrError } = await supabase.functions.invoke('generate-qr-ticket', {
              body: { 
                registration_id: registrationId,
                notification_options: notificationOptions
              }
            });

            if (qrError) {
              console.error('Error generating QR ticket for registration:', registrationId, qrError);
              results.push({ success: false, registrationId, error: qrError });
            } else {
              console.log('QR ticket generated successfully for registration:', registrationId, qrData);
              results.push({ success: true, registrationId });
            }
          } catch (error) {
            console.error('Error calling generate-qr-ticket function for registration:', registrationId, error);
            results.push({ success: false, registrationId, error });
          }
        }

        // Count successes and failures
        const successful = results.filter(result => result.success).length;
        const failed = results.length - successful;

        // Show summary toast
        if (successful > 0 && failed === 0) {
          const notifications = [];
          if (notificationOptions.sendEmail) notifications.push('Email');
          if (notificationOptions.sendWhatsApp) notifications.push('WhatsApp');
          
          const notificationText = notifications.length > 0 
            ? ` and ${notifications.join(' & ')} sent` 
            : ' (no notifications sent)';
          
          toast({
            title: 'Success',
            description: `All ${successful} tickets generated successfully!${notificationText}`,
          });
        } else if (successful > 0 && failed > 0) {
          toast({
            title: 'Partial Success',
            description: `${successful} tickets generated successfully, ${failed} failed. Check logs for details.`,
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Warning',
            description: 'Registrations approved but failed to generate tickets. Please try again.',
            variant: 'destructive',
          });
        }
      }

      // Refresh registrations to get updated data, then refresh again after a delay
      await fetchRegistrations();
      setTimeout(async () => {
        await fetchRegistrations();
      }, 3000);
    } catch (error) {
      console.error('Error batch approving registrations:', error);
      toast({
        title: 'Error',
        description: 'Failed to approve registrations',
        variant: 'destructive',
      });
    }
  };

  const batchDeleteRegistrations = async (registrationIds: string[]) => {
    try {
      console.log(`Starting batch delete for ${registrationIds.length} registrations`);
      
      // Delete all registrations using the complete deleteRegistration function
      const deletePromises = registrationIds.map(async (registrationId) => {
        try {
          console.log(`Deleting registration: ${registrationId}`);
          
          // Use the complete deleteRegistration function that includes QR code cleanup
          const result = await deleteRegistration(registrationId);

          if (result.error) {
            console.error('Error deleting registration:', registrationId, result.error);
            return { success: false, registrationId, error: result.error };
          }

          console.log('Registration deleted successfully:', registrationId);
          return { success: true, registrationId };
        } catch (error) {
          console.error('Error deleting registration:', registrationId, error);
          return { success: false, registrationId, error };
        }
      });

      // Wait for all deletions to complete
      const results = await Promise.allSettled(deletePromises);
      
      // Process results
      const successful = results.filter(result => 
        result.status === 'fulfilled' && result.value.success
      ).length;
      const failed = results.length - successful;

      // Update local state by removing deleted registrations
      setRegistrations(prev => 
        prev.filter(reg => !registrationIds.includes(reg.id))
      );

      // Show success/error messages
      if (successful > 0 && failed === 0) {
        toast({
          title: 'Success',
          description: `${successful} registration${successful > 1 ? 's' : ''} deleted successfully`,
        });
      } else if (successful > 0 && failed > 0) {
        toast({
          title: 'Partial Success',
          description: `${successful} registration${successful > 1 ? 's' : ''} deleted successfully, ${failed} failed. Check logs for details.`,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to delete registrations. Please try again.',
          variant: 'destructive',
        });
      }

      // Refresh registrations to get updated data
      await fetchRegistrations();
    } catch (error) {
      console.error('Error batch deleting registrations:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete registrations',
        variant: 'destructive',
      });
    }
  };

  return {
    registrations,
    loading,
    events,
    updateRegistrationStatus,
    deleteRegistrationById,
    batchApproveRegistrations,
    batchDeleteRegistrations,
  };
} 