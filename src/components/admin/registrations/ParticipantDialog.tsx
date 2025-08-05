import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Registration, Event } from './types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface ParticipantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  participant?: Registration | null;
  events: Event[];
  onSuccess: () => void;
}

interface ParticipantFormData {
  participant_name: string;
  participant_email: string;
  phone_number: string;
  event_id: string;
  custom_data: Record<string, string>;
}

export function ParticipantDialog({ 
  open, 
  onOpenChange, 
  participant, 
  events, 
  onSuccess 
}: ParticipantDialogProps) {
  const [formData, setFormData] = useState<ParticipantFormData>({
    participant_name: '',
    participant_email: '',
    phone_number: '',
    event_id: '',
    custom_data: {}
  });
  const [loading, setLoading] = useState(false);
  const [customFields, setCustomFields] = useState<Array<{ name: string; label: string; type: string; required: boolean }>>([]);

  const isEditing = !!participant;

  useEffect(() => {
    if (participant) {
      setFormData({
        participant_name: participant.participant_name || '',
        participant_email: participant.participant_email || '',
        phone_number: participant.phone_number || '',
        event_id: participant.event_id || '',
        custom_data: participant.custom_data || {}
      });
    } else {
      setFormData({
        participant_name: '',
        participant_email: '',
        phone_number: '',
        event_id: '',
        custom_data: {}
      });
    }
  }, [participant]);

  useEffect(() => {
    if (formData.event_id) {
      loadCustomFields(formData.event_id);
    } else {
      setCustomFields([]);
    }
  }, [formData.event_id]);

  const loadCustomFields = async (eventId: string) => {
    try {
      const { data: event, error } = await supabase
        .from('events')
        .select('custom_fields')
        .eq('id', eventId)
        .single();

      if (error) throw error;

      if (event?.custom_fields) {
        setCustomFields(event.custom_fields);
      } else {
        setCustomFields([]);
      }
    } catch (error) {
      console.error('Error loading custom fields:', error);
      setCustomFields([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.participant_name.trim() || !formData.participant_email.trim() || !formData.event_id) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      if (isEditing && participant) {
        // Update existing participant
        const { error } = await supabase
          .from('registrations')
          .update({
            participant_name: formData.participant_name.trim(),
            participant_email: formData.participant_email.trim(),
            phone_number: formData.phone_number.trim() || null,
            custom_data: formData.custom_data,
            updated_at: new Date().toISOString()
          })
          .eq('id', participant.id);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Participant updated successfully',
        });
      } else {
        // Create new participant
        const { error } = await supabase
          .from('registrations')
          .insert({
            participant_name: formData.participant_name.trim(),
            participant_email: formData.participant_email.trim(),
            phone_number: formData.phone_number.trim() || null,
            event_id: formData.event_id,
            custom_data: formData.custom_data,
            status: 'pending'
          });

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Participant created successfully',
        });
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving participant:', error);
      toast({
        title: 'Error',
        description: 'Failed to save participant',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCustomFieldChange = (fieldName: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      custom_data: {
        ...prev.custom_data,
        [fieldName]: value
      }
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Participant' : 'Add New Participant'}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Update participant information and custom fields.' 
              : 'Add a new participant to the selected event.'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Basic Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="participant_name">Full Name *</Label>
                <Input
                  id="participant_name"
                  value={formData.participant_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, participant_name: e.target.value }))}
                  placeholder="Enter full name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="participant_email">Email *</Label>
                <Input
                  id="participant_email"
                  type="email"
                  value={formData.participant_email}
                  onChange={(e) => setFormData(prev => ({ ...prev, participant_email: e.target.value }))}
                  placeholder="Enter email address"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone_number">Phone Number</Label>
                <Input
                  id="phone_number"
                  value={formData.phone_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone_number: e.target.value }))}
                  placeholder="Enter phone number"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="event_id">Event *</Label>
                <Select
                  value={formData.event_id}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, event_id: value }))}
                  disabled={isEditing}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an event" />
                  </SelectTrigger>
                  <SelectContent>
                    {events.map((event) => (
                      <SelectItem key={event.id} value={event.id}>
                        {event.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Custom Fields */}
          {customFields.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Custom Fields</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {customFields.map((field) => (
                  <div key={field.name} className="space-y-2">
                    <Label htmlFor={field.name}>
                      {field.label}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </Label>
                    {field.type === 'textarea' ? (
                      <Textarea
                        id={field.name}
                        value={formData.custom_data[field.name] || ''}
                        onChange={(e) => handleCustomFieldChange(field.name, e.target.value)}
                        placeholder={`Enter ${field.label.toLowerCase()}`}
                        required={field.required}
                      />
                    ) : (
                      <Input
                        id={field.name}
                        type={field.type === 'email' ? 'email' : 'text'}
                        value={formData.custom_data[field.name] || ''}
                        onChange={(e) => handleCustomFieldChange(field.name, e.target.value)}
                        placeholder={`Enter ${field.label.toLowerCase()}`}
                        required={field.required}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : (isEditing ? 'Update Participant' : 'Create Participant')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 