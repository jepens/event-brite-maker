import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Users, Clock, Tag } from 'lucide-react';
import { format } from 'date-fns';
import { Event } from './types';
import { useMobile } from '@/hooks/use-mobile';
interface EventDetailsProps {
  event: Event;
  currentCount?: number;
  isFull?: boolean;
}

export function EventDetails({ event, currentCount, isFull }: EventDetailsProps) {
  const { isMobile } = useMobile();
  
  const shouldShowLogo = event.branding_config?.logo_url && typeof event.branding_config.logo_url === 'string';
  
  return (
    <Card className="overflow-hidden border-0 shadow-lg bg-white/80 backdrop-blur-sm">
      {/* Hero Section with Logo */}
      <div className="relative bg-gradient-to-r from-blue-600 to-indigo-700 p-8 lg:p-12">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div className="flex-1 space-y-4">
            <div className="space-y-2">
              <CardTitle className="text-3xl lg:text-4xl font-bold text-white leading-tight">
                {event.name}
              </CardTitle>
              <CardDescription className="text-lg text-blue-100 leading-relaxed">
                {event.description}
              </CardDescription>
            </div>
          </div>
          
          {shouldShowLogo && (
            <div className="flex-shrink-0">
              <div className="relative">
                <img
                  src={event.branding_config.logo_url as string}
                  alt="Event Logo"
                  className="w-20 h-20 lg:w-24 lg:h-24 object-contain rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 shadow-lg"
                />
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/20 to-transparent"></div>
              </div>
            </div>
          )}
          

        </div>
      </div>

      {/* Event Information Section */}
      <CardContent className="p-8 lg:p-12">
        <div className="space-y-8">
          
          {/* Key Information Grid */}
          <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'lg:grid-cols-2'}`}>
            
            {/* Date & Time */}
            <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
              <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-gray-900">Date & Time</h3>
                <p className="text-lg font-medium text-blue-900">
                  {format(new Date(event.event_date), 'EEEE, MMMM d, yyyy')}
                </p>
                <p className="text-sm text-blue-700 flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {format(new Date(event.event_date), 'h:mm a')}
                </p>
              </div>
            </div>
            
            {/* Location */}
            <div className="flex items-start gap-4 p-4 bg-red-50 rounded-xl border border-red-100">
              <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <MapPin className="h-6 w-6 text-red-600" />
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-gray-900">Location</h3>
                <p className="text-lg font-medium text-red-900">{event.location}</p>
                <p className="text-sm text-red-700">Event venue</p>
              </div>
            </div>
          </div>

          {/* Additional Information */}
          <div className="space-y-4">
            
            {/* Dress Code */}
            {event.dresscode && (
              <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-100">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Tag className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-semibold text-gray-900">Dress Code</h3>
                    <p className="text-purple-800 font-medium">{event.dresscode}</p>
                  </div>
                </div>
              </div>
            )}

            {/* WhatsApp Notification */}
            {event.whatsapp_enabled && (
              <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-100">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <span className="text-xl">📱</span>
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-semibold text-gray-900">WhatsApp Notifications</h3>
                    <p className="text-green-800 text-sm">Receive your ticket and updates via WhatsApp</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Trust Indicators */}
          <div className="pt-6 border-t border-gray-200">
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Secure Registration</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>Instant Confirmation</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span>Mobile Optimized</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 