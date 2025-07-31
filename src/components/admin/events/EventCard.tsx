import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Calendar, MapPin, Users, Share2, ExternalLink } from 'lucide-react';
import { Event } from './types';
import { copyToClipboard } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { formatDateForDisplay, formatTimeForDisplay24 } from '@/lib/date-utils';

interface EventCardProps {
  event: Event;
  onEdit: (event: Event) => void;
  onDelete: (eventId: string) => void;
}

export function EventCard({ event, onEdit, onDelete }: EventCardProps) {
  const registrationLink = `${window.location.origin}/event/${event.id}`;

  const handleShareLink = async () => {
    const success = await copyToClipboard(registrationLink);
    if (success) {
      toast({
        title: "Link copied!",
        description: "Registration link has been copied to clipboard.",
      });
    } else {
      toast({
        title: "Failed to copy",
        description: "Could not copy link to clipboard. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleViewRegistration = () => {
    window.open(registrationLink, '_blank');
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-xl font-bold text-gray-900 mb-2">
              {event.name}
            </CardTitle>
            <CardDescription className="text-gray-600 line-clamp-2">
              {event.description}
            </CardDescription>
          </div>
          {event.branding_config?.logo_url && (
            <img
              src={event.branding_config.logo_url as string}
              alt="Event Logo"
              className="w-12 h-12 object-contain rounded-lg ml-4"
            />
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="h-4 w-4" />
            <span>
              {event.event_date ? `${formatDateForDisplay(event.event_date)} ${formatTimeForDisplay24(event.event_date)}` : 'Date TBA'}
            </span>
          </div>
          
          {event.location && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <MapPin className="h-4 w-4" />
              <span>{event.location}</span>
            </div>
          )}
          
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Users className="h-4 w-4" />
            <span>Max {event.max_participants} participants</span>
          </div>

          <div className="flex items-center gap-2 pt-2">
            {event.whatsapp_enabled && (
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                📱 WhatsApp Enabled
              </Badge>
            )}
            {event.custom_fields && event.custom_fields.length > 0 && (
              <Badge variant="outline">
                {event.custom_fields.length} Custom Fields
              </Badge>
            )}
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <Button
            onClick={handleViewRegistration}
            variant="outline"
            size="sm"
            className="flex-1"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            View Registration
          </Button>
          <Button
            onClick={handleShareLink}
            variant="outline"
            size="sm"
            className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
          >
            <Share2 className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex gap-2 mt-2">
          <Button
            onClick={() => onEdit(event)}
            variant="outline"
            size="sm"
            className="flex-1"
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button
            onClick={() => onDelete(event.id)}
            variant="outline"
            size="sm"
            className="text-red-600 hover:text-red-800 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 