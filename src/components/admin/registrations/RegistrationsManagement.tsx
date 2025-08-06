import { useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { downloadRegistrations, DownloadOptions } from '@/lib/download-service';
import { useRegistrations } from './useRegistrations';
import { RegistrationFilters } from './RegistrationFilters';
import { RegistrationActions } from './RegistrationActions';
import { RegistrationTable } from './RegistrationTable';
import { MobileRegistrationList } from './MobileRegistrationList';
import { Pagination } from './Pagination';
import { QRDialog } from './QRDialog';
import { DeleteDialog } from './DeleteDialog';
import { ApproveDialog, NotificationOptions } from './ApproveDialog';
import { BatchApproveDialog } from './BatchApproveDialog';
import { BatchDeleteDialog } from './BatchDeleteDialog';
import { ParticipantDialog } from './ParticipantDialog';
import { Registration, Ticket } from './types';
import { useMobile } from '@/hooks/use-mobile';

export function RegistrationsManagement() {
  const {
    registrations,
    loading,
    events,
    updateRegistrationStatus,
    deleteRegistrationById,
    batchApproveRegistrations,
    batchDeleteRegistrations,
  } = useRegistrations();
  
  const { isMobile } = useMobile();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [eventFilter, setEventFilter] = useState<string>('all');
  const [selectedTicket, setSelectedTicket] = useState<Registration | null>(null);
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [registrationToDelete, setRegistrationToDelete] = useState<Registration | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [registrationToApprove, setRegistrationToApprove] = useState<Registration | null>(null);
  const [approving, setApproving] = useState(false);

  // Batch operations state
  const [selectedRegistrations, setSelectedRegistrations] = useState<string[]>([]);
  const [showBatchApproveDialog, setShowBatchApproveDialog] = useState(false);
  const [showBatchDeleteDialog, setShowBatchDeleteDialog] = useState(false);
  const [batchApproving, setBatchApproving] = useState(false);
  const [batchDeleting, setBatchDeleting] = useState(false);

  // Participant dialog state
  const [showParticipantDialog, setShowParticipantDialog] = useState(false);
  const [participantToEdit, setParticipantToEdit] = useState<Registration | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10); // Default to 10 for better batch operations

  // Filter registrations based on search and filters
  const filteredRegistrations = useMemo(() => {
    return registrations.filter((registration) => {
      const matchesSearch = searchTerm === '' || 
        registration.participant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        registration.participant_email.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || registration.status === statusFilter;
      const matchesEvent = eventFilter === 'all' || registration.event_id === eventFilter;

      return matchesSearch && matchesStatus && matchesEvent;
    });
  }, [registrations, searchTerm, statusFilter, eventFilter]);

  // Get selected registrations data
  const selectedRegistrationsData = useMemo(() => {
    return registrations.filter(reg => selectedRegistrations.includes(reg.id));
  }, [registrations, selectedRegistrations]);

  // Get pending registrations count for batch operations
  const pendingRegistrations = filteredRegistrations.filter(reg => reg.status === 'pending');
  const selectedPendingCount = selectedRegistrations.filter(id => 
    registrations.find(reg => reg.id === id)?.status === 'pending'
  ).length;

  // Pagination logic
  const totalItems = filteredRegistrations.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedRegistrations = filteredRegistrations.slice(startIndex, endIndex);

  // Debug logging
  console.log('RegistrationsManagement Pagination Debug:', {
    totalItems,
    totalPages,
    currentPage,
    itemsPerPage,
    startIndex,
    endIndex,
    paginatedRegistrationsLength: paginatedRegistrations.length,
    filteredRegistrationsLength: filteredRegistrations.length
  });

  // Reset to first page when filters change
  const handleFilterChange = (newSearchTerm: string, newStatusFilter: string, newEventFilter: string) => {
    setSearchTerm(newSearchTerm);
    setStatusFilter(newStatusFilter);
    setEventFilter(newEventFilter);
    setCurrentPage(1); // Reset to first page
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  // Selection handlers
  const handleSelectionChange = (registrationId: string, selected: boolean) => {
    setSelectedRegistrations(prev => {
      if (selected) {
        return [...prev, registrationId];
      } else {
        return prev.filter(id => id !== registrationId);
      }
    });
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      const allIds = paginatedRegistrations.map(reg => reg.id);
      setSelectedRegistrations(allIds);
    } else {
      setSelectedRegistrations([]);
    }
  };

  const handleBatchApprove = () => {
    setShowBatchApproveDialog(true);
  };

  const handleBatchDelete = () => {
    setShowBatchDeleteDialog(true);
  };

  const handleBatchApproveConfirm = async (registrationIds: string[], notificationOptions: NotificationOptions) => {
    try {
      setBatchApproving(true);
      await batchApproveRegistrations(registrationIds, notificationOptions);
      setShowBatchApproveDialog(false);
      setSelectedRegistrations([]); // Clear selection after successful batch approve
    } catch (error) {
      console.error('Error batch approving registrations:', error);
    } finally {
      setBatchApproving(false);
    }
  };

  const handleBatchDeleteConfirm = async (registrationIds: string[]) => {
    try {
      setBatchDeleting(true);
      await batchDeleteRegistrations(registrationIds);
      setShowBatchDeleteDialog(false);
      setSelectedRegistrations([]); // Clear selection after successful batch delete
    } catch (error) {
      console.error('Error batch deleting registrations:', error);
    } finally {
      setBatchDeleting(false);
    }
  };

  const handleViewTicket = async (registration: Registration) => {
    setSelectedTicket(registration);
    setShowQRDialog(true);
  };

  const handleDownloadQR = async (ticket: Ticket) => {
    try {
      // Create a canvas element to generate QR code
      const canvas = document.createElement('canvas');
      const QRCode = await import('qrcode');
      await QRCode.toCanvas(canvas, ticket.qr_code, {
        width: 300,
        margin: 2,
      });

      // Convert canvas to blob and download
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `qr-ticket-${ticket.short_code || ticket.id}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      });
    } catch (error) {
      console.error('Error downloading QR code:', error);
      toast({
        title: 'Error',
        description: 'Failed to download QR code',
        variant: 'destructive',
      });
    }
  };

  const handleResendEmail = async (registration: Registration) => {
    try {
      const { error } = await supabase.functions.invoke('send-ticket-email', {
        body: {
          registration_id: registration.id,
        },
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Email sent successfully',
      });
    } catch (error) {
      console.error('Error resending email:', error);
      toast({
        title: 'Error',
        description: 'Failed to resend email',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteRegistration = async (registration: Registration) => {
    setRegistrationToDelete(registration);
    setShowDeleteDialog(true);
  };

  const handleShowApproveDialog = (registration: Registration) => {
    setRegistrationToApprove(registration);
    setShowApproveDialog(true);
  };

  const handleEditParticipant = (registration: Registration) => {
    setParticipantToEdit(registration);
    setShowParticipantDialog(true);
  };

  const handleAddParticipant = () => {
    setParticipantToEdit(null);
    setShowParticipantDialog(true);
  };

  const handleParticipantSuccess = () => {
    // Refresh registrations
    window.location.reload();
  };

  const handleApproveRegistration = async (notificationOptions: NotificationOptions) => {
    if (!registrationToApprove) return;

    try {
      setApproving(true);
      await updateRegistrationStatus(registrationToApprove.id, 'approved', notificationOptions);
      setShowApproveDialog(false);
      setRegistrationToApprove(null);
    } catch (error) {
      console.error('Error approving registration:', error);
    } finally {
      setApproving(false);
    }
  };

  const handleDownloadRegistrations = async (format: 'csv' | 'excel' = 'csv') => {
    try {
      setDownloading(true);

      const options: DownloadOptions = {
        format,
        status: statusFilter === 'all' ? undefined : statusFilter as 'pending' | 'approved' | 'rejected',
        eventId: eventFilter === 'all' ? undefined : eventFilter,
      };

      await downloadRegistrations(options);

      toast({
        title: 'Success',
        description: `${format.toUpperCase()} file downloaded successfully`,
      });
    } catch (error) {
      console.error('Error downloading registrations:', error);
      toast({
        title: 'Error',
        description: 'Failed to download registrations',
        variant: 'destructive',
      });
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadAll = () => {
    handleDownloadRegistrations('csv');
  };

  const handleImportComplete = () => {
    // Refresh registrations after import
    window.location.reload();
  };

  const confirmDelete = async () => {
    if (!registrationToDelete) return;

    try {
      setDeleting(true);
      await deleteRegistrationById(registrationToDelete.id);
      setShowDeleteDialog(false);
      setRegistrationToDelete(null);
    } catch (error) {
      console.error('Error confirming delete:', error);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-8">Loading registrations...</div>;
  }

  return (
    <div className="space-y-6">
      {!isMobile && (
        <>
          <RegistrationActions
            filteredRegistrationsCount={filteredRegistrations.length}
            downloading={downloading}
            events={events}
            currentFilters={{
              searchTerm,
              statusFilter,
              eventFilter
            }}
            onDownloadCSV={() => handleDownloadRegistrations('csv')}
            onDownloadExcel={() => handleDownloadRegistrations('excel')}
            onImportComplete={handleImportComplete}
            onAddParticipant={handleAddParticipant}
            onBatchApprove={handleBatchApprove}
            onBatchDelete={handleBatchDelete}
            selectedPendingCount={selectedPendingCount}
            selectedCount={selectedRegistrations.length}
          />

          <RegistrationFilters
            searchTerm={searchTerm}
            setSearchTerm={(term) => handleFilterChange(term, statusFilter, eventFilter)}
            statusFilter={statusFilter}
            setStatusFilter={(status) => handleFilterChange(searchTerm, status, eventFilter)}
            eventFilter={eventFilter}
            setEventFilter={(event) => handleFilterChange(searchTerm, statusFilter, event)}
            events={events}
          />

          <RegistrationTable
            registrations={paginatedRegistrations}
            selectedRegistrations={selectedRegistrations}
            onSelectionChange={handleSelectionChange}
            onSelectAll={handleSelectAll}
            onUpdateStatus={updateRegistrationStatus}
            onViewTicket={handleViewTicket}
            onResendEmail={handleResendEmail}
            onDeleteRegistration={handleDeleteRegistration}
            onShowApproveDialog={handleShowApproveDialog}
            onEditParticipant={handleEditParticipant}
          />

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            onPageChange={handlePageChange}
            onItemsPerPageChange={handleItemsPerPageChange}
          />
        </>
      )}

      {isMobile && (
        <>
          <MobileRegistrationList
            registrations={paginatedRegistrations}
            onUpdateStatus={updateRegistrationStatus}
            onViewTicket={handleViewTicket}
            onResendEmail={handleResendEmail}
            onDeleteRegistration={handleDeleteRegistration}
            onDownloadRegistrations={handleDownloadAll}
            onShowApproveDialog={handleShowApproveDialog}
          />

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            onPageChange={handlePageChange}
            onItemsPerPageChange={handleItemsPerPageChange}
          />
        </>
      )}

      <QRDialog
        open={showQRDialog}
        onOpenChange={setShowQRDialog}
        selectedRegistration={selectedTicket}
        onDownloadQR={handleDownloadQR}
      />

      <DeleteDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        registrationToDelete={registrationToDelete}
        deleting={deleting}
        onConfirmDelete={confirmDelete}
      />

      <ApproveDialog
        registration={registrationToApprove}
        isOpen={showApproveDialog}
        onClose={() => {
          setShowApproveDialog(false);
          setRegistrationToApprove(null);
        }}
        onApprove={handleApproveRegistration}
        loading={approving}
      />

      <BatchApproveDialog
        selectedRegistrations={selectedRegistrationsData}
        isOpen={showBatchApproveDialog}
        onClose={() => setShowBatchApproveDialog(false)}
        onApprove={handleBatchApproveConfirm}
        loading={batchApproving}
      />

      <BatchDeleteDialog
        selectedRegistrations={selectedRegistrationsData}
        isOpen={showBatchDeleteDialog}
        onClose={() => setShowBatchDeleteDialog(false)}
        onDelete={handleBatchDeleteConfirm}
        loading={batchDeleting}
      />

      <ParticipantDialog
        open={showParticipantDialog}
        onOpenChange={(open) => {
          setShowParticipantDialog(open);
          if (!open) setParticipantToEdit(null);
        }}
        participant={participantToEdit}
        events={events}
        onSuccess={handleParticipantSuccess}
      />
    </div>
  );
} 