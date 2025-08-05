import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Registration } from './types';

interface DeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  registrationToDelete: Registration | null;
  deleting: boolean;
  onConfirmDelete: () => void;
}

export function DeleteDialog({
  open,
  onOpenChange,
  registrationToDelete,
  deleting,
  onConfirmDelete,
}: DeleteDialogProps) {
  if (!registrationToDelete) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Registration</DialogTitle>
          <div className="space-y-4">
            <DialogDescription>
              Are you sure you want to delete the registration for{' '}
              <strong>{registrationToDelete.participant_name}</strong>?
            </DialogDescription>
            
            <div>
              <p className="text-sm text-muted-foreground mb-2">This action will:</p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Delete the registration record</li>
                <li>Delete all associated tickets</li>
                <li>Remove QR code images from storage</li>
                <li>Remove all related data permanently</li>
              </ul>
            </div>
            
            <p className="text-sm font-semibold text-destructive">
              This action cannot be undone.
            </p>
          </div>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirmDelete}
            disabled={deleting}
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 