import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle, XCircle, Clock, QrCode, Mail, Trash2 } from 'lucide-react';
import { Registration } from './types';
import { formatDateForDisplay, formatTimeForDisplay24 } from '@/lib/date-utils';

interface RegistrationTableProps {
  registrations: Registration[];
  onUpdateStatus: (registrationId: string, status: 'approved' | 'rejected') => void;
  onViewTicket: (registration: Registration) => void;
  onResendEmail: (registration: Registration) => void;
  onDeleteRegistration: (registration: Registration) => void;
}

export function RegistrationTable({
  registrations,
  onUpdateStatus,
  onViewTicket,
  onResendEmail,
  onDeleteRegistration,
}: RegistrationTableProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge variant="default" className="bg-green-100 text-green-800">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (registrations.length === 0) {
    return (
      <Card>
        <CardContent className="p-0">
          <div className="text-center py-12">
            <h3 className="text-lg font-semibold mb-2">No Registrations Found</h3>
            <p className="text-muted-foreground">
              No registrations have been submitted yet.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Participant</TableHead>
              <TableHead>Event</TableHead>
              <TableHead>Registration Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>WhatsApp</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {registrations.map((registration) => (
              <TableRow key={registration.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">{registration.participant_name}</div>
                    <div className="text-sm text-muted-foreground">{registration.participant_email}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="font-medium">{registration.events?.name}</div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {formatDateForDisplay(registration.registered_at)} {formatTimeForDisplay24(registration.registered_at)}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(registration.status)}
                    {getStatusBadge(registration.status)}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    {registration.phone_number ? (
                      <div className="text-sm">
                        <span className="font-medium">📱 {registration.phone_number}</span>
                        {typeof registration.events === 'object' && registration.events && 'whatsapp_enabled' in registration.events && (registration.events as Record<string, unknown>).whatsapp_enabled && (
                          <div className="text-xs text-muted-foreground">
                            {registration.tickets?.[0]?.whatsapp_sent ? (
                              <span className="text-green-600">✓ Sent</span>
                            ) : (
                              <span className="text-orange-600">⏳ Pending</span>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Not provided</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    {registration.status === 'pending' ? (
                      <>
                        <Button
                          size="sm"
                          onClick={() => onUpdateStatus(registration.id, 'approved')}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => onUpdateStatus(registration.id, 'rejected')}
                        >
                          Reject
                        </Button>
                      </>
                    ) : registration.status === 'approved' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onViewTicket(registration)}
                        >
                          <QrCode className="h-4 w-4 mr-2" />
                          View Ticket
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => onResendEmail(registration)}
                        >
                          <Mail className="h-4 w-4 mr-2" />
                          Resend Email
                        </Button>
                      </>
                    )}
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => onDeleteRegistration(registration)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
} 