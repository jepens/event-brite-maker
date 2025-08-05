import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Registration } from './types';
import { Mail, MessageCircle, CheckCircle } from 'lucide-react';

interface ApproveDialogProps {
  registration: Registration | null;
  isOpen: boolean;
  onClose: () => void;
  onApprove: (notificationOptions: NotificationOptions) => void;
  loading?: boolean;
}

export interface NotificationOptions {
  sendEmail: boolean;
  sendWhatsApp: boolean;
}

export function ApproveDialog({ 
  registration, 
  isOpen, 
  onClose, 
  onApprove, 
  loading = false 
}: ApproveDialogProps) {
  const [notificationOptions, setNotificationOptions] = useState<NotificationOptions>({
    sendEmail: true,
    sendWhatsApp: true
  });

  const handleApprove = () => {
    onApprove(notificationOptions);
  };

  const canSendWhatsApp = registration?.phone_number && 
    registration?.events?.whatsapp_enabled;

  const canSendEmail = registration?.participant_email;

  if (!registration) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Approve Registration
          </DialogTitle>
          <DialogDescription>
            Approve registration for <strong>{registration.participant_name}</strong> and select notification options.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-gray-50 p-3 rounded-lg">
            <h4 className="font-medium text-sm mb-2">Registration Details</h4>
            <div className="text-sm space-y-1">
              <div><strong>Name:</strong> {registration.participant_name}</div>
              <div><strong>Email:</strong> {registration.participant_email}</div>
              {registration.phone_number && (
                <div><strong>Phone:</strong> {registration.phone_number}</div>
              )}
              <div><strong>Event:</strong> {registration.events?.name}</div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-medium text-sm">Notification Options</h4>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="send-email"
                  checked={notificationOptions.sendEmail}
                  onCheckedChange={(checked) => 
                    setNotificationOptions(prev => ({ ...prev, sendEmail: checked as boolean }))
                  }
                  disabled={!canSendEmail}
                />
                <Label htmlFor="send-email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Send Email Ticket
                  {!canSendEmail && <span className="text-xs text-gray-500">(No email)</span>}
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="send-whatsapp"
                  checked={notificationOptions.sendWhatsApp}
                  onCheckedChange={(checked) => 
                    setNotificationOptions(prev => ({ ...prev, sendWhatsApp: checked as boolean }))
                  }
                  disabled={!canSendWhatsApp}
                />
                <Label htmlFor="send-whatsapp" className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  Send WhatsApp Ticket
                  {!canSendWhatsApp && (
                    <span className="text-xs text-gray-500">
                      {!registration.phone_number ? '(No phone)' : '(Not enabled)'}
                    </span>
                  )}
                </Label>
              </div>
            </div>

            {!notificationOptions.sendEmail && !notificationOptions.sendWhatsApp && (
              <div className="text-sm text-amber-600 bg-amber-50 p-2 rounded">
                ⚠️ No notifications will be sent. Participant won't receive ticket.
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleApprove} 
            disabled={loading || (!notificationOptions.sendEmail && !notificationOptions.sendWhatsApp)}
            className="bg-green-600 hover:bg-green-700"
          >
            {loading ? 'Approving...' : 'Approve Registration'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 