import { Button } from '@/components/ui/button';
import { Users, FileDown, Plus, CheckCircle, Upload, Trash2, RefreshCw } from 'lucide-react';
import { ImportWizard } from './ImportWizard';
import { ExportDialog } from './ExportDialog';
import { Event } from './types';

interface RegistrationActionsProps {
  filteredRegistrationsCount: number;
  downloading: boolean;
  events: Event[];
  selectedPendingCount: number;
  selectedCount: number;
  currentFilters?: {
    searchTerm?: string;
    statusFilter?: string;
    eventFilter?: string;
  };
  onDownloadCSV: () => void;
  onDownloadExcel: () => void;
  onImportComplete: () => void;
  onAddParticipant: () => void;
  onBatchApprove: () => void;
  onBatchDelete: () => void;
  onRefresh: () => void;
  onForceRefresh?: () => void;
  refreshing?: boolean;
}

export function RegistrationActions({
  filteredRegistrationsCount,
  downloading,
  events,
  selectedPendingCount,
  selectedCount,
  currentFilters,
  onDownloadCSV,
  onDownloadExcel,
  onImportComplete,
  onAddParticipant,
  onBatchApprove,
  onBatchDelete,
  onRefresh,
  onForceRefresh,
  refreshing,
}: RegistrationActionsProps) {
  // Debug logging for events
  console.log('RegistrationActions - Events:', events);
  console.log('RegistrationActions - Events length:', events.length);
  console.log('RegistrationActions - First event ID:', events[0]?.id);

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
          {selectedCount > 0 && (
            <span className="text-blue-600 font-medium">
              ({selectedCount} selected)
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {selectedPendingCount > 0 && (
            <Button
              onClick={onBatchApprove}
              disabled={downloading}
              className="bg-green-600 hover:bg-green-700"
              size="sm"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Batch Approve ({selectedPendingCount})
            </Button>
          )}
          {selectedCount > 0 && (
            <Button
              onClick={onBatchDelete}
              disabled={downloading}
              variant="destructive"
              size="sm"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Batch Delete ({selectedCount})
            </Button>
          )}
          {events.length > 0 ? (
            <ImportWizard 
              eventId={events[0].id} 
              onImportComplete={onImportComplete}
            />
          ) : (
            <Button
              disabled
              variant="outline"
              size="sm"
              title="No events available for import"
            >
              <Upload className="h-4 w-4 mr-2" />
              Import Data
            </Button>
          )}
          <ExportDialog 
            events={events}
            currentFilters={currentFilters}
          />
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
          <Button
            onClick={onAddParticipant}
            disabled={downloading}
            variant="outline"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Participant
          </Button>
          <Button
            onClick={onRefresh}
            disabled={refreshing || downloading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
          {onForceRefresh && (
            <Button
              onClick={onForceRefresh}
              disabled={refreshing || downloading}
              variant="outline"
              size="sm"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Force Refresh
            </Button>
          )}
        </div>
      </div>
    </div>
  );
} 