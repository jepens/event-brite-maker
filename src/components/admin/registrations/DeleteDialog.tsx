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
          <DialogDescription>
            Are you sure you want to delete the registration for{' '}
            <strong>{registrationToDelete.participant_name}</strong>?
            <br />
            <br />
            This action will:
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Delete the registration record</li>
              <li>Delete all associated tickets</li>
              <li>Remove all related data permanently</li>
            </ul>
            <br />
            <strong>This action cannot be undone.</strong>
          </DialogDescription>
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