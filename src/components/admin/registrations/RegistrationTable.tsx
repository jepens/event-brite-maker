import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckCircle, XCircle, Clock, QrCode, Mail, Trash2, Edit, MessageCircle } from 'lucide-react';
import { Registration } from './types';
import { formatDateForDisplay, formatTimeForDisplay24 } from '@/lib/date-utils';

interface RegistrationTableProps {
  registrations: Registration[];
  selectedRegistrations: string[];
  onSelectionChange: (registrationId: string, selected: boolean) => void;
  onSelectAll: (selected: boolean) => void;
  onUpdateStatus: (registrationId: string, status: 'approved' | 'rejected', notificationOptions?: { sendEmail: boolean; sendWhatsApp: boolean }) => void;
  onViewTicket: (registration: Registration) => void;
  onResendEmail: (registration: Registration) => void;
  onResendWhatsApp: (registration: Registration) => void;
  onDeleteRegistration: (registration: Registration) => void;
  onShowApproveDialog: (registration: Registration) => void;
  onEditParticipant: (registration: Registration) => void;
}

export function RegistrationTable({
  registrations,
  selectedRegistrations,
  onSelectionChange,
  onSelectAll,
  onUpdateStatus,
  onViewTicket,
  onResendEmail,
  onResendWhatsApp,
  onDeleteRegistration,
  onShowApproveDialog,
  onEditParticipant,
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

  // Get pending registrations for select all functionality
  const pendingRegistrations = registrations.filter(reg => reg.status === 'pending');
  const selectedPendingCount = selectedRegistrations.filter(id => 
    registrations.find(reg => reg.id === id)?.status === 'pending'
  ).length;

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
              <TableHead className="w-12">
                <Checkbox
                  checked={registrations.length > 0 && selectedRegistrations.length === registrations.length}
                  onCheckedChange={(checked) => onSelectAll(checked as boolean)}
                  disabled={registrations.length === 0}
                />
              </TableHead>
              <TableHead>Participant</TableHead>
              <TableHead>Event</TableHead>
              <TableHead>Registration Date</TableHead>
              <TableHead>Status</TableHead>
                             <TableHead>Email</TableHead>
               <TableHead>WhatsApp</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {registrations.map((registration) => (
              <TableRow key={registration.id}>
                <TableCell>
                  <Checkbox
                    checked={selectedRegistrations.includes(registration.id)}
                    onCheckedChange={(checked) => onSelectionChange(registration.id, checked as boolean)}
                  />
                </TableCell>
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
                     <div className="text-sm">
                       <span className="font-medium">📧 {registration.participant_email}</span>
                       <div className="text-xs text-muted-foreground">
                         {registration.tickets?.[0]?.email_sent ? (
                           <span className="text-green-600 flex items-center gap-1">
                             <span>✓</span>
                             <span>Sent</span>
                             {registration.tickets[0].email_sent_at && (
                               <span className="text-xs">
                                 ({new Date(registration.tickets[0].email_sent_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })})
                               </span>
                             )}
                           </span>
                         ) : (
                           <span className="text-orange-600 flex items-center gap-1">
                             <span>⏳</span>
                             <span>Pending</span>
                           </span>
                         )}
                       </div>
                     </div>
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
                               <span className="text-green-600 flex items-center gap-1">
                                 <span>✓</span>
                                 <span>Sent</span>
                                 {registration.tickets[0].whatsapp_sent_at && (
                                   <span className="text-xs">
                                     ({new Date(registration.tickets[0].whatsapp_sent_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })})
                                   </span>
                                 )}
                               </span>
                             ) : (
                               <span className="text-orange-600 flex items-center gap-1">
                                 <span>⏳</span>
                                 <span>Pending</span>
                               </span>
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
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onEditParticipant(registration)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    {registration.status === 'pending' ? (
                      <>
                        <Button
                          size="sm"
                          onClick={() => onShowApproveDialog(registration)}
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
                        {registration.phone_number && registration.events?.whatsapp_enabled && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => onResendWhatsApp(registration)}
                          >
                            <MessageCircle className="h-4 w-4 mr-2" />
                            Resend WhatsApp
                          </Button>
                        )}
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