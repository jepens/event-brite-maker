import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { QRCodeCanvas } from 'qrcode.react';
import { Download } from 'lucide-react';
import { Registration } from './types';
import { formatDateTimeForDisplay } from '@/lib/date-utils';

interface Ticket {
  id: string;
  qr_code: string;
  short_code?: string;
  status: string;
  issued_at: string;
}

interface QRDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedRegistration: Registration | null;
  onDownloadQR: (ticket: Ticket) => void;
}

export function QRDialog({
  open,
  onOpenChange,
  selectedRegistration,
  onDownloadQR,
}: QRDialogProps) {
  if (!selectedRegistration) return null;

  const ticket = selectedRegistration.tickets?.[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Ticket Details</DialogTitle>
          <DialogDescription>
            QR Code and ticket information for {selectedRegistration.participant_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-center">
            <div className="mb-4">
              <h3 className="font-semibold mb-2">Participant Information</h3>
              <p className="text-sm text-muted-foreground">
                <strong>Name:</strong> {selectedRegistration.participant_name}
              </p>
              <p className="text-sm text-muted-foreground">
                <strong>Email:</strong> {selectedRegistration.participant_email}
              </p>
              {selectedRegistration.phone_number && (
                <p className="text-sm text-muted-foreground">
                  <strong>Phone:</strong> {selectedRegistration.phone_number}
                </p>
              )}
            </div>

            <div className="mb-4">
              <h3 className="font-semibold mb-2">Event Information</h3>
              <p className="text-sm text-muted-foreground">
                <strong>Event:</strong> {selectedRegistration.events?.name}
              </p>
            </div>

            {ticket && (
              <>
                <div className="mb-4">
                  <h3 className="font-semibold mb-2">QR Code</h3>
                  <div className="flex justify-center">
                    <QRCodeCanvas
                      value={ticket.qr_code}
                      size={200}
                      level="H"
                      includeMargin={true}
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <h3 className="font-semibold mb-2">Ticket Information</h3>
                  <div className="space-y-1 text-sm">
                    <p><strong>QR Code:</strong> {ticket.qr_code}</p>
                    {ticket.short_code && (
                      <p><strong>Short Code:</strong> {ticket.short_code}</p>
                    )}
                    <p><strong>Status:</strong> {ticket.status}</p>
                    <p><strong>Issued:</strong> {ticket.issued_at ? formatDateTimeForDisplay(ticket.issued_at) : 'Not available'}</p>
                  </div>
                </div>

                <div className="flex justify-center">
                  <Button
                    onClick={() => onDownloadQR(ticket)}
                    variant="outline"
                    size="sm"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download QR Code
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 