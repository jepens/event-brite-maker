import { Button } from '@/components/ui/button';
import { Users, FileDown } from 'lucide-react';

interface RegistrationActionsProps {
  filteredRegistrationsCount: number;
  downloading: boolean;
  onDownloadCSV: () => void;
  onDownloadExcel: () => void;
}

export function RegistrationActions({
  filteredRegistrationsCount,
  downloading,
  onDownloadCSV,
  onDownloadExcel,
}: RegistrationActionsProps) {
  return (
    <div className="flex justify-between items-center">
      <div>
        <h2 className="text-2xl font-bold">Registrations Management</h2>
        <p className="text-muted-foreground">Review and manage event registrations</p>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          {filteredRegistrationsCount} registrations
        </div>
        <div className="flex gap-2">
          <Button
            onClick={onDownloadCSV}
            disabled={downloading}
            variant="outline"
            size="sm"
          >
            <FileDown className="h-4 w-4 mr-2" />
            {downloading ? 'Downloading...' : 'Download CSV'}
          </Button>
          <Button
            onClick={onDownloadExcel}
            disabled={downloading}
            variant="outline"
            size="sm"
          >
            <FileDown className="h-4 w-4 mr-2" />
            {downloading ? 'Downloading...' : 'Download Excel'}
          </Button>
        </div>
      </div>
    </div>
  );
} 