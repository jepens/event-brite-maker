import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Registration } from './types';
import { Mail, MessageCircle, CheckCircle, AlertTriangle } from 'lucide-react';

interface BatchApproveDialogProps {
  selectedRegistrations: Registration[];
  isOpen: boolean;
  onClose: () => void;
  onApprove: (registrationIds: string[], notificationOptions: NotificationOptions) => void;
  loading?: boolean;
}

export interface NotificationOptions {
  sendEmail: boolean;
  sendWhatsApp: boolean;
}

export function BatchApproveDialog({ 
  selectedRegistrations, 
  isOpen, 
  onClose, 
  onApprove, 
  loading = false 
}: BatchApproveDialogProps) {
  const [notificationOptions, setNotificationOptions] = useState<NotificationOptions>({
    sendEmail: true,
    sendWhatsApp: true
  });

  const handleApprove = () => {
    const registrationIds = selectedRegistrations.map(reg => reg.id);
    onApprove(registrationIds, notificationOptions);
  };

  // Count registrations that can receive notifications
  const canSendEmailCount = selectedRegistrations.filter(reg => reg.participant_email).length;
  const canSendWhatsAppCount = selectedRegistrations.filter(reg => 
    reg.phone_number && reg.events?.whatsapp_enabled
  ).length;

  const totalCount = selectedRegistrations.length;

  if (selectedRegistrations.length === 0) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Batch Approve Registrations
          </DialogTitle>
          <DialogDescription>
            Approve <strong>{totalCount} registration{totalCount > 1 ? 's' : ''}</strong> and select notification options.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary */}
          <div className="bg-blue-50 p-3 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Summary</h4>
            <div className="text-sm text-blue-800 space-y-1">
              <div>• Total registrations to approve: {totalCount}</div>
              <div>• Can receive email: {canSendEmailCount}</div>
              <div>• Can receive WhatsApp: {canSendWhatsAppCount}</div>
            </div>
          </div>

          {/* Notification Options */}
          <div className="space-y-3">
            <h4 className="font-medium">Notification Options</h4>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="send-email-batch"
                  checked={notificationOptions.sendEmail}
                  onCheckedChange={(checked) => 
                    setNotificationOptions(prev => ({ ...prev, sendEmail: checked as boolean }))
                  }
                />
                <Label htmlFor="send-email-batch" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Send Email Tickets ({canSendEmailCount} participants)
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="send-whatsapp-batch"
                  checked={notificationOptions.sendWhatsApp}
                  onCheckedChange={(checked) => 
                    setNotificationOptions(prev => ({ ...prev, sendWhatsApp: checked as boolean }))
                  }
                />
                <Label htmlFor="send-whatsapp-batch" className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  Send WhatsApp Tickets ({canSendWhatsAppCount} participants)
                </Label>
              </div>
            </div>

            {!notificationOptions.sendEmail && !notificationOptions.sendWhatsApp && (
              <div className="text-sm text-amber-600 bg-amber-50 p-2 rounded flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                ⚠️ No notifications will be sent. Participants won't receive tickets.
              </div>
            )}
          </div>

          {/* Preview of selected registrations */}
          <div className="space-y-2">
            <h4 className="font-medium">Selected Participants</h4>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {selectedRegistrations.map((registration) => (
                <div key={registration.id} className="text-sm bg-gray-50 p-2 rounded">
                  <div className="font-medium">{registration.participant_name}</div>
                  <div className="text-gray-600">{registration.participant_email}</div>
                  <div className="text-gray-500 text-xs">{registration.events?.name}</div>
                </div>
              ))}
            </div>
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
            {loading ? 'Approving...' : `Approve ${totalCount} Registration${totalCount > 1 ? 's' : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 