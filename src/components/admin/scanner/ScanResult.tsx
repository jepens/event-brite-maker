import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { formatDateTimeForDisplay } from '@/lib/date-utils';

interface ScanResultProps {
  result: {
    success: boolean;
    message: string;
    participant?: {
      name: string;
      email: string;
      event_name: string;
      ticket_id?: string;
    };
    ticket_info?: {
      used_at?: string;
      checkin_at?: string;
      checkin_location?: string;
      checkin_notes?: string;
    };
    offline?: boolean;
  } | null;
}

export function ScanResult({ result }: ScanResultProps) {
  if (!result) return null;

  const getStatusIcon = () => {
    if (result.success) {
      return <CheckCircle className="h-6 w-6 text-green-600 mt-1" />;
    }
    
    // Check if it's a "already used" message
    if (result.message.includes('sudah digunakan') || result.message.includes('already used')) {
      return <Clock className="h-6 w-6 text-orange-600 mt-1" />;
    }
    
    return <XCircle className="h-6 w-6 text-red-600 mt-1" />;
  };

  const getStatusBadge = () => {
    if (result.success) {
      return <Badge variant="default" className="bg-green-100 text-green-800">Check-in Berhasil</Badge>;
    }
    
    if (result.message.includes('sudah digunakan') || result.message.includes('already used')) {
      return <Badge variant="secondary" className="bg-orange-100 text-orange-800">Ticket Sudah Digunakan</Badge>;
    }
    
    return <Badge variant="destructive">Ticket Tidak Valid</Badge>;
  };

  const getCardStyle = () => {
    if (result.success) {
      return 'border-green-200 bg-green-50';
    }
    
    if (result.message.includes('sudah digunakan') || result.message.includes('already used')) {
      return 'border-orange-200 bg-orange-50';
    }
    
    return 'border-red-200 bg-red-50';
  };

  const getMessageStyle = () => {
    if (result.success) {
      return 'text-green-800';
    }
    
    if (result.message.includes('sudah digunakan') || result.message.includes('already used')) {
      return 'text-orange-800';
    }
    
    return 'text-red-800';
  };

  return (
    <Card className={getCardStyle()}>
      <CardContent className="pt-6">
        <div className="flex items-start gap-3">
          {getStatusIcon()}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {getStatusBadge()}
              {result.offline && (
                <Badge variant="outline">Mode Offline</Badge>
              )}
            </div>
            <p className={`font-medium ${getMessageStyle()}`}>
              {result.message}
            </p>
            {result.participant && (
              <div className="mt-3 space-y-1 text-sm bg-white/50 p-3 rounded-lg">
                <p><strong>Peserta:</strong> {result.participant.name}</p>
                <p><strong>Email:</strong> {result.participant.email}</p>
                <p><strong>Event:</strong> {result.participant.event_name}</p>
                {result.participant.ticket_id && (
                  <p><strong>ID Ticket:</strong> {result.participant.ticket_id}</p>
                )}
              </div>
            )}
            
            {result.ticket_info && (result.ticket_info.used_at || result.ticket_info.checkin_at) && (
              <div className="mt-3 space-y-1 text-sm bg-orange-50 p-3 rounded-lg border border-orange-200">
                <p className="font-medium text-orange-800 mb-2">Informasi Penggunaan Sebelumnya:</p>
                {result.ticket_info.used_at && (
                  <p><strong>Digunakan pada:</strong> {formatDateTimeForDisplay(result.ticket_info.used_at)}</p>
                )}
                {result.ticket_info.checkin_at && (
                  <p><strong>Check-in pada:</strong> {formatDateTimeForDisplay(result.ticket_info.checkin_at)}</p>
                )}
                {result.ticket_info.checkin_location && (
                  <p><strong>Lokasi:</strong> {result.ticket_info.checkin_location}</p>
                )}
                {result.ticket_info.checkin_notes && (
                  <p><strong>Catatan:</strong> {result.ticket_info.checkin_notes}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 