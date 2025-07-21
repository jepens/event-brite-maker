import { useState, useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Users, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

interface Event {
  id: string;
  name: string;
  description: string;
  event_date: string;
  location: string;
  max_participants: number;
  branding_config: any;
  custom_fields: any[];
}

const EventRegistration = () => {
  const { eventId } = useParams();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (eventId) {
      fetchEvent();
    }
  }, [eventId]);

  const fetchEvent = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (error) throw error;
      setEvent(data as Event);
    } catch (error) {
      console.error('Error fetching event:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;
    
    setSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const participantName = formData.get('participantName') as string;
    const participantEmail = formData.get('participantEmail') as string;

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

    // Collect custom field data
    const customData: Record<string, any> = {};
    if (event?.custom_fields) {
      for (const field of event.custom_fields) {
        const value = formData.get(field.name) as string;
        if (field.required && !value?.trim()) {
          toast({
            title: 'Validation Error',
            description: `${field.label} is required`,
            variant: 'destructive',
          });
          setSubmitting(false);
          return;
        }
        customData[field.name] = value?.trim() || '';
      }
    }

    try {
      console.log('Submitting registration for event:', eventId);
      console.log('Registration data:', {
        event_id: eventId,
        participant_name: participantName.trim(),
        participant_email: participantEmail.trim(),
        custom_data: customData,
      });

      const { data, error } = await supabase
        .from('registrations')
        .insert({
          event_id: eventId,
          participant_name: participantName.trim(),
          participant_email: participantEmail.trim(),
          custom_data: customData,
        })
        .select();

      if (error) {
        console.error('Registration error:', error);
        throw error;
      }

      console.log('Registration successful:', data);
      setSubmitted(true);
      toast({
        title: 'Registration Successful!',
        description: 'Your registration is pending approval. You will receive an email with your ticket once approved.',
      });
    } catch (error: any) {
      console.error('Registration failed:', error);
      toast({
        title: 'Registration Failed',
        description: error.message || 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!event) {
    return <Navigate to="/" replace />;
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-green-600">Registration Submitted!</CardTitle>
            <CardDescription>
              Thank you for registering for {event.name}. Your registration is pending approval.
              You will receive an email with your ticket once approved.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link to="/">
              <Button>Back to Events</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Apply branding if configured
  const brandingStyle = event.branding_config?.primaryColor 
    ? { '--primary': event.branding_config.primaryColor } as React.CSSProperties
    : {};

  return (
    <div 
      className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/10"
      style={brandingStyle}
    >
      <div className="container mx-auto py-8 px-4">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" />
          Back to Events
        </Link>

        <div className="max-w-2xl mx-auto">
          {/* Event Information */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-2xl">{event.name}</CardTitle>
              <CardDescription>{event.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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

              <div className="flex gap-2">
                <Badge variant="secondary">Free Event</Badge>
                <Badge variant="outline">Registration Required</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Registration Form */}
          <Card>
            <CardHeader>
              <CardTitle>Register for this Event</CardTitle>
              <CardDescription>
                Please fill out the form below to register. All fields are required.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="participantName">Full Name</Label>
                  <Input
                    id="participantName"
                    name="participantName"
                    type="text"
                    placeholder="Enter your full name"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="participantEmail">Email Address</Label>
                  <Input
                    id="participantEmail"
                    name="participantEmail"
                    type="email"
                    placeholder="Enter your email address"
                    required
                  />
                </div>

                {/* Dynamic Custom Fields */}
                {event.custom_fields && event.custom_fields.map((field: any, index: number) => (
                  <div key={index} className="space-y-2">
                    <Label htmlFor={field.name}>
                      {field.label}
                      {field.required && <span className="text-red-500">*</span>}
                    </Label>
                    {field.type === 'textarea' ? (
                      <Textarea
                        id={field.name}
                        name={field.name}
                        placeholder={field.placeholder || ''}
                        required={field.required}
                        rows={3}
                      />
                    ) : (
                      <Input
                        id={field.name}
                        name={field.name}
                        type={field.type || 'text'}
                        placeholder={field.placeholder || ''}
                        required={field.required}
                      />
                    )}
                  </div>
                ))}

                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? 'Submitting Registration...' : 'Register for Event'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default EventRegistration;