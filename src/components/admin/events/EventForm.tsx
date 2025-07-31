import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Event } from './types';
import { formatDateForInput } from '@/lib/date-utils';

interface EventFormProps {
  event: Event | null;
  submitting: boolean;
  onSubmit: (formData: FormData) => void;
}

export function EventForm({ event, submitting, onSubmit }: EventFormProps) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Event Name *</Label>
            <Input
              id="name"
              name="name"
              defaultValue={event?.name || ''}
              placeholder="Enter event name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={event?.description || ''}
              placeholder="Describe your event"
              rows={4}
              required
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="event_date">Event Date *</Label>
              <Input
                id="event_date"
                name="event_date"
                type="datetime-local"
                defaultValue={event?.event_date ? formatDateForInput(event.event_date) : ''}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location *</Label>
              <Input
                id="location"
                name="location"
                defaultValue={event?.location || ''}
                placeholder="Event location"
                required
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="max_participants">Maximum Participants *</Label>
              <Input
                id="max_participants"
                name="max_participants"
                type="number"
                min="1"
                defaultValue={event?.max_participants || 100}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dresscode">Dress Code (Optional)</Label>
              <Input
                id="dresscode"
                name="dresscode"
                defaultValue={event?.dresscode || ''}
                placeholder="e.g., Business Casual, Formal"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="whatsapp_enabled"
              name="whatsapp_enabled"
              defaultChecked={event?.whatsapp_enabled || false}
            />
            <Label htmlFor="whatsapp_enabled">Enable WhatsApp notifications</Label>
          </div>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <div className="flex justify-end">
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Saving...' : event ? 'Update Event' : 'Create Event'}
        </Button>
      </div>
    </form>
  );
} 