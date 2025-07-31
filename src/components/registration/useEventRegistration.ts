import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Event } from './types';

export function useEventRegistration(eventId: string | undefined) {
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [emailExists, setEmailExists] = useState(false);
  const [checkingMemberNumber, setCheckingMemberNumber] = useState(false);
  const [memberNumberExists, setMemberNumberExists] = useState(false);
  const [memberNumberValid, setMemberNumberValid] = useState(false);
  const [currentRegistrationCount, setCurrentRegistrationCount] = useState(0);
  const [isRegistrationFull, setIsRegistrationFull] = useState(false);

  const fetchEvent = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .limit(1);

      if (error) throw error;
      
      if (data && data.length > 0) {
        setEvent(data[0] as Event);
      } else {
        throw new Error('Event not found');
      }
    } catch (error) {
      console.error('Error fetching event:', error);
      toast({
        title: 'Error',
        description: 'Failed to load event details',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  // Check current registration count for this event
  const checkRegistrationCount = useCallback(async () => {
    if (!eventId) return;
    
    try {
      const { count, error } = await supabase
        .from('registrations')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', eventId);

      if (error) {
        console.error('Error checking registration count:', error);
        return;
      }

      const currentCount = count || 0;
      setCurrentRegistrationCount(currentCount);
      
      // Check if registration is full
      if (event && currentCount >= event.max_participants) {
        setIsRegistrationFull(true);
      } else {
        setIsRegistrationFull(false);
      }
    } catch (error) {
      console.error('Error checking registration count:', error);
    }
  }, [eventId, event]);

  useEffect(() => {
    if (eventId) {
      fetchEvent();
    }
  }, [eventId, fetchEvent]);

  useEffect(() => {
    if (event) {
      checkRegistrationCount();
    }
  }, [event, checkRegistrationCount]);

  // Check if email already exists for this event
  const checkEmailExists = useCallback(async (email: string) => {
    if (!email || !eventId) return false;
    
    setCheckingEmail(true);
    try {
      const { data, error } = await supabase
        .from('registrations')
        .select('id')
        .eq('event_id', eventId)
        .eq('participant_email', email.toLowerCase().trim())
        .limit(1);

      if (error) {
        throw error;
      }

      const exists = data && data.length > 0;
      setEmailExists(exists);
      return exists;
    } catch (error) {
      console.error('Error checking email:', error);
      return false;
    } finally {
      setCheckingEmail(false);
    }
  }, [eventId]);

  // Check if member number exists in members table
  const checkMemberNumberExists = useCallback(async (memberNumber: string) => {
    if (!memberNumber) return false;
    
    setCheckingMemberNumber(true);
    try {
      const { data, error } = await supabase
        .from('members')
        .select('full_name')
        .eq('member_number', memberNumber.trim())
        .limit(1);

      if (error) {
        throw error;
      }

      const exists = data && data.length > 0;
      setMemberNumberValid(exists);
      return exists;
    } catch (error) {
      console.error('Error checking member number:', error);
      setMemberNumberValid(false);
      return false;
    } finally {
      setCheckingMemberNumber(false);
    }
  }, []);

  // Check if member number already registered for this event
  const checkMemberNumberRegistered = useCallback(async (memberNumber: string) => {
    if (!memberNumber || !eventId) return false;
    
    try {
      // Check if member number already exists in registrations for this event
      // Note: The key in custom_data is 'Nomor Anggota' (with space and capital letters)
      const { data, error } = await supabase
        .from('registrations')
        .select('id')
        .eq('event_id', eventId)
        .contains('custom_data', { 'Nomor Anggota': memberNumber.trim() })
        .limit(1);

      if (error) {
        console.error('Error checking member number registration:', error);
        throw error;
      }

      const exists = data && data.length > 0;
      setMemberNumberExists(exists);
      
      if (exists) {
        console.log(`Member number ${memberNumber} already registered for event ${eventId}`);
      }
      
      return exists;
    } catch (error) {
      console.error('Error checking member number registration:', error);
      setMemberNumberExists(false);
      return false;
    }
  }, [eventId]);

  const submitRegistration = async (formData: FormData) => {
    if (submitting) return;
    
    // Check if registration is full
    if (isRegistrationFull) {
      toast({
        title: 'Registration Full',
        description: 'Sorry, this event has reached its maximum capacity. Registration is now closed.',
        variant: 'destructive',
      });
      return;
    }
    
    setSubmitting(true);

    const participantName = formData.get('participantName') as string;
    const participantEmail = formData.get('participantEmail') as string;
    const participantPhone = formData.get('participantPhone') as string;

    // Basic validation
    if (!participantName?.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter your full name',
        variant: 'destructive',
      });
      setSubmitting(false);
      return;
    }

    if (!participantEmail?.trim()) {
      toast({
        title: 'Validation Error', 
        description: 'Please enter your email address',
        variant: 'destructive',
      });
      setSubmitting(false);
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(participantEmail)) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a valid email address',
        variant: 'destructive',
      });
      setSubmitting(false);
      return;
    }

    // Check if email already exists for this event
    const emailAlreadyExists = await checkEmailExists(participantEmail);
    if (emailAlreadyExists) {
      toast({
        title: 'Email Already Registered',
        description: 'This email address is already registered for this event. Please use a different email address.',
        variant: 'destructive',
      });
      setSubmitting(false);
      return;
    }

    // Double-check registration capacity before submitting
    await checkRegistrationCount();
    if (isRegistrationFull) {
      toast({
        title: 'Registration Full',
        description: 'Sorry, this event has reached its maximum capacity. Registration is now closed.',
        variant: 'destructive',
      });
      setSubmitting(false);
      return;
    }

    // Validate WhatsApp number format if provided
    if (participantPhone?.trim()) {
      const phoneNumber = participantPhone.trim();
      
      // Remove all non-digit characters
      const digitsOnly = phoneNumber.replace(/\D/g, '');
      
      // Check if it's a valid Indonesian phone number
      let formattedPhone = '';
      
      // Indonesian mobile number validation rules:
      // - Total length: 10-13 digits (including country code)
      // - Valid formats: 628xxxxxxxxxx (13 digits), 08xxxxxxxxxx (12 digits), 8xxxxxxxxx (11 digits), xxxxxxxxxx (10 digits)
      
      if (digitsOnly.startsWith('62') && digitsOnly.length === 13) {
        // Already in correct format: 628xxxxxxxxxx (13 digits)
        formattedPhone = digitsOnly;
      } else if (digitsOnly.startsWith('08') && digitsOnly.length === 12) {
        // Convert from 08xxxxxxxxxx to 628xxxxxxxxxx (12 digits -> 13 digits)
        formattedPhone = '62' + digitsOnly.substring(1);
      } else if (digitsOnly.startsWith('8') && digitsOnly.length === 11) {
        // Convert from 8xxxxxxxxx to 628xxxxxxxxxx (11 digits -> 13 digits)
        formattedPhone = '62' + digitsOnly;
      } else if (digitsOnly.length === 10 && !digitsOnly.startsWith('0') && !digitsOnly.startsWith('8')) {
        // Convert from xxxxxxxxxx to 628xxxxxxxxxx (10 digits -> 13 digits)
        // Only for numbers that don't start with 0 or 8
        formattedPhone = '62' + digitsOnly;
      } else {
        toast({
          title: 'Invalid WhatsApp Number',
          description: 'Please enter a valid Indonesian phone number. Examples: 081314942012, 81314942012, or 6281314942012',
          variant: 'destructive',
        });
        setSubmitting(false);
        return;
      }
      
      // Update the phone number with formatted version
      formData.set('participantPhone', formattedPhone);
    }

    try {
      // Prepare custom data and validate member numbers
      const customData: Record<string, unknown> = {};
      if (event?.custom_fields) {
        for (const field of event.custom_fields) {
          const value = formData.get(field.name);
          if (value) {
            // Special validation for member_number type
            if (field.type === 'member_number') {
              const memberNumber = value.toString().trim();
              
              // Validate member number format
              const memberNumberRegex = /^\d{10}$/;
              if (!memberNumberRegex.test(memberNumber)) {
                toast({
                  title: 'Invalid Member Number',
                  description: 'Member number must be exactly 10 digits',
                  variant: 'destructive',
                });
                setSubmitting(false);
                return;
              }

              // Check if member number exists in members table
              const memberExists = await checkMemberNumberExists(memberNumber);
              if (!memberExists) {
                toast({
                  title: 'Invalid Member Number',
                  description: 'This member number is not found in our database',
                  variant: 'destructive',
                });
                setSubmitting(false);
                return;
              }

              // Check if member number already registered for this event
              const memberAlreadyRegistered = await checkMemberNumberRegistered(memberNumber);
              if (memberAlreadyRegistered) {
                toast({
                  title: 'Member Already Registered',
                  description: 'This member number is already registered for this event. Please use a different member number.',
                  variant: 'destructive',
                });
                setSubmitting(false);
                return;
              }
            }
            
            customData[field.name] = value;
          }
        }
      }

      // Create registration
      const { data: registration, error: registrationError } = await supabase
        .from('registrations')
        .insert({
          event_id: eventId,
          participant_name: participantName,
          participant_email: participantEmail,
          phone_number: participantPhone || null,
          custom_data: Object.keys(customData).length > 0 ? customData : null,
          status: 'pending',
        })
        .select()
        .single();

      if (registrationError) {
        // Handle capacity limit error from database trigger
        if (registrationError.message?.includes('maximum capacity')) {
          toast({
            title: 'Registration Full',
            description: 'Sorry, this event has reached its maximum capacity. Registration is now closed.',
            variant: 'destructive',
          });
          // Refresh registration count
          await checkRegistrationCount();
        } else {
          throw registrationError;
        }
        setSubmitting(false);
        return;
      }

      setSubmitted(true);
      toast({
        title: 'Registration Submitted!',
        description: 'Your registration has been submitted successfully. You will receive a confirmation email once approved.',
      });

    } catch (error) {
      console.error('Error submitting registration:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit registration. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return {
    event,
    loading,
    submitting,
    submitted,
    checkingEmail,
    emailExists,
    checkEmailExists,
    checkingMemberNumber,
    memberNumberExists,
    memberNumberValid,
    checkMemberNumberExists,
    checkMemberNumberRegistered,
    submitRegistration,
    currentRegistrationCount,
    isRegistrationFull,
  };
} 