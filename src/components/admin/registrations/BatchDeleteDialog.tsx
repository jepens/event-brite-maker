import { useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Registration } from './types';
import { Trash2, AlertTriangle, Users } from 'lucide-react';

interface BatchDeleteDialogProps {
  selectedRegistrations: Registration[];
  isOpen: boolean;
  onClose: () => void;
  onDelete: (registrationIds: string[]) => void;
  loading?: boolean;
}

export function BatchDeleteDialog({ 
  selectedRegistrations, 
  isOpen, 
  onClose, 
  onDelete, 
  loading = false 
}: BatchDeleteDialogProps) {
  const handleDelete = () => {
    const registrationIds = selectedRegistrations.map(reg => reg.id);
    onDelete(registrationIds);
  };

  const totalCount = selectedRegistrations.length;

  if (selectedRegistrations.length === 0) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Batch Delete Registrations
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
              <div className="space-y-2">
                <p className="font-medium text-destructive">
                  Warning: This action cannot be undone
                </p>
                <p className="text-sm text-muted-foreground">
                  You are about to permanently delete {totalCount} registration{totalCount > 1 ? 's' : ''}. 
                  This will also remove all associated tickets and QR codes.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4" />
              <span className="font-medium">Selected Participants ({totalCount})</span>
            </div>
            
            <div className="max-h-32 overflow-y-auto space-y-1">
              {selectedRegistrations.map((registration) => (
                <div key={registration.id} className="text-sm bg-gray-50 p-2 rounded border-l-2 border-destructive/30">
                  <div className="font-medium">{registration.participant_name}</div>
                  <div className="text-gray-600">{registration.participant_email}</div>
                  <div className="text-gray-500 text-xs">{registration.events?.name}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="text-sm text-amber-800">
              <strong>This action will:</strong>
            </div>
            <ul className="list-disc list-inside space-y-1 text-sm text-amber-700 mt-2">
              <li>Delete the registration records permanently</li>
              <li>Remove all associated tickets and QR codes</li>
              <li>Delete QR code images from storage</li>
              <li>Remove all related data permanently</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleDelete} 
            disabled={loading}
            variant="destructive"
            className="bg-red-600 hover:bg-red-700"
          >
            {loading ? 'Deleting...' : `Delete ${totalCount} Registration${totalCount > 1 ? 's' : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
