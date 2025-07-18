import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

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

interface CustomField {
  name: string;
  label: string;
  type: string;
  required: boolean;
  placeholder?: string;
}

interface EventFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: Event | null;
  onSuccess: () => void;
}

export function EventFormDialog({ open, onOpenChange, event, onSuccess }: EventFormDialogProps) {
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);

  useEffect(() => {
    if (event) {
      setCustomFields(event.custom_fields || []);
    } else {
      setCustomFields([]);
    }
  }, [event]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const eventDate = formData.get('eventDate') as string;
    const location = formData.get('location') as string;
    const maxParticipants = parseInt(formData.get('maxParticipants') as string);
    const primaryColor = formData.get('primaryColor') as string;

    const eventData = {
      name,
      description,
      event_date: eventDate ? new Date(eventDate).toISOString() : null,
      location,
      max_participants: maxParticipants,
      branding_config: {
        primaryColor: primaryColor || '#000000',
      } as any,
      custom_fields: customFields as any,
    };

    try {
      if (event) {
        // Update existing event
        const { error } = await supabase
          .from('events')
          .update(eventData)
          .eq('id', event.id);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Event updated successfully',
        });
      } else {
        // Create new event
        const { error } = await supabase
          .from('events')
          .insert({
            ...eventData,
            created_by: user?.id,
          });

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Event created successfully',
        });
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const addCustomField = () => {
    setCustomFields([
      ...customFields,
      {
        name: '',
        label: '',
        type: 'text',
        required: false,
        placeholder: '',
      },
    ]);
  };

  const updateCustomField = (index: number, field: Partial<CustomField>) => {
    const updatedFields = [...customFields];
    updatedFields[index] = { ...updatedFields[index], ...field };
    setCustomFields(updatedFields);
  };

  const removeCustomField = (index: number) => {
    setCustomFields(customFields.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {event ? 'Edit Event' : 'Create New Event'}
          </DialogTitle>
          <DialogDescription>
            {event ? 'Update the event details and custom fields.' : 'Create a new event with custom registration fields.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Event Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Event Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Event Name</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={event?.name || ''}
                  placeholder="Enter event name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  defaultValue={event?.description || ''}
                  placeholder="Enter event description"
                  rows={3}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="eventDate">Event Date & Time</Label>
                  <Input
                    id="eventDate"
                    name="eventDate"
                    type="datetime-local"
                    defaultValue={event?.event_date ? new Date(event.event_date).toISOString().slice(0, 16) : ''}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxParticipants">Max Participants</Label>
                  <Input
                    id="maxParticipants"
                    name="maxParticipants"
                    type="number"
                    defaultValue={event?.max_participants || 1000}
                    min="1"
                    max="1000"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  name="location"
                  defaultValue={event?.location || ''}
                  placeholder="Enter event location"
                />
              </div>
            </CardContent>
          </Card>

          {/* Branding Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Branding</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="primaryColor">Primary Color</Label>
                <Input
                  id="primaryColor"
                  name="primaryColor"
                  type="color"
                  defaultValue={event?.branding_config?.primaryColor || '#000000'}
                />
              </div>
            </CardContent>
          </Card>

          {/* Custom Fields */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">Custom Registration Fields</CardTitle>
                <Button type="button" variant="outline" size="sm" onClick={addCustomField}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Field
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {customFields.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No custom fields added. Click "Add Field" to create registration fields.
                </p>
              ) : (
                customFields.map((field, index) => (
                  <Card key={index} className="border-dashed">
                    <CardContent className="pt-4">
                      <div className="flex justify-between items-start mb-4">
                        <Badge variant="outline">Field {index + 1}</Badge>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeCustomField(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Field Name</Label>
                          <Input
                            value={field.name}
                            onChange={(e) => updateCustomField(index, { name: e.target.value })}
                            placeholder="e.g., company, phone"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Display Label</Label>
                          <Input
                            value={field.label}
                            onChange={(e) => updateCustomField(index, { label: e.target.value })}
                            placeholder="e.g., Company Name, Phone Number"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Field Type</Label>
                          <Select
                            value={field.type}
                            onValueChange={(value) => updateCustomField(index, { type: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="text">Text</SelectItem>
                              <SelectItem value="email">Email</SelectItem>
                              <SelectItem value="tel">Phone</SelectItem>
                              <SelectItem value="textarea">Textarea</SelectItem>
                              <SelectItem value="number">Number</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Placeholder</Label>
                          <Input
                            value={field.placeholder || ''}
                            onChange={(e) => updateCustomField(index, { placeholder: e.target.value })}
                            placeholder="Optional placeholder text"
                          />
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 mt-4">
                        <Switch
                          checked={field.required}
                          onCheckedChange={(checked) => updateCustomField(index, { required: checked })}
                        />
                        <Label>Required field</Label>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : event ? 'Update Event' : 'Create Event'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}