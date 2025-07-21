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
      className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5"
      style={brandingStyle}
    >
      <div className="container mx-auto py-8 px-4">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors group">
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          Back to Events
        </Link>

        <div className="max-w-2xl mx-auto">
          {/* Event Information Card */}
          <Card className="mb-8 border-0 shadow-lg bg-gradient-to-r from-white to-gray-50/50">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                    {event.name}
                  </CardTitle>
                  {event.description && (
                    <CardDescription className="text-lg mt-2 text-muted-foreground">
                      {event.description}
                    </CardDescription>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-3 gap-6">
                <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <div className="p-2 bg-blue-100 rounded-full">
                    <Calendar className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-blue-900">Date</p>
                    <p className="text-blue-700">
                      {event.event_date ? format(new Date(event.event_date), 'PPP') : 'Date TBA'}
                    </p>
                  </div>
                </div>
                
                {event.location && (
                  <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg border border-green-100">
                    <div className="p-2 bg-green-100 rounded-full">
                      <MapPin className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-green-900">Location</p>
                      <p className="text-green-700">{event.location}</p>
                    </div>
                  </div>
                )}
                
                <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-lg border border-purple-100">
                  <div className="p-2 bg-purple-100 rounded-full">
                    <Users className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-purple-900">Capacity</p>
                    <p className="text-purple-700">Max {event.max_participants} participants</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
                  Free Event
                </Badge>
                <Badge variant="outline" className="border-orange-200 text-orange-700">
                  Registration Required
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Registration Form */}
          <Card className="shadow-xl border-0 bg-white">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-2xl font-bold text-gray-900">
                Register for this Event
              </CardTitle>
              <CardDescription className="text-base">
                Please fill out the form below to secure your spot. All fields marked with * are required.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="participantName" className="text-sm font-semibold text-gray-700">
                      Full Name *
                    </Label>
                    <Input
                      id="participantName"
                      name="participantName"
                      type="text"
                      placeholder="Enter your full name"
                      required
                      className="h-12 text-base border-2 border-gray-200 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="participantEmail" className="text-sm font-semibold text-gray-700">
                      Email Address *
                    </Label>
                    <Input
                      id="participantEmail"
                      name="participantEmail"
                      type="email"
                      placeholder="Enter your email address"
                      required
                      className="h-12 text-base border-2 border-gray-200 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                </div>

                {/* Dynamic Custom Fields */}
                {event.custom_fields && event.custom_fields.length > 0 && (
                  <div className="space-y-4">
                    <div className="border-t pt-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h3>
                      <div className="space-y-4">
                        {event.custom_fields.map((field: any, index: number) => (
                          <div key={index} className="space-y-2">
                            <Label htmlFor={field.name} className="text-sm font-semibold text-gray-700">
                              {field.label}
                              {field.required && <span className="text-red-500 ml-1">*</span>}
                            </Label>
                            {field.type === 'textarea' ? (
                              <Textarea
                                id={field.name}
                                name={field.name}
                                placeholder={field.placeholder || ''}
                                required={field.required}
                                rows={3}
                                className="text-base border-2 border-gray-200 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                              />
                            ) : (
                              <Input
                                id={field.name}
                                name={field.name}
                                type={field.type || 'text'}
                                placeholder={field.placeholder || ''}
                                required={field.required}
                                className="h-12 text-base border-2 border-gray-200 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-6 border-t">
                  <Button 
                    type="submit" 
                    className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5" 
                    disabled={submitting}
                  >
                    {submitting ? (
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Submitting Registration...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        Register for Event
                      </div>
                    )}
                  </Button>
                </div>

                <div className="text-center text-sm text-muted-foreground">
                  <p>By registering, you agree to receive email notifications about this event.</p>
                  <p className="mt-1">Your registration will be reviewed and you'll receive confirmation via email.</p>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default EventRegistration;