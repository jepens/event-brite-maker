import { useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { downloadRegistrations, DownloadOptions } from '@/lib/download-service';
import { useRegistrations } from './useRegistrations';
import { RegistrationFilters } from './RegistrationFilters';
import { RegistrationActions } from './RegistrationActions';
import { RegistrationTable } from './RegistrationTable';
import { MobileRegistrationList } from './MobileRegistrationList';
import { QRDialog } from './QRDialog';
import { DeleteDialog } from './DeleteDialog';
import { Registration, Ticket } from './types';
import { useMobile } from '@/hooks/use-mobile';

export function RegistrationsManagement() {
  const {
    registrations,
    loading,
    events,
    updateRegistrationStatus,
    deleteRegistrationById,
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
            onDownloadCSV={() => handleDownloadRegistrations('csv')}
            onDownloadExcel={() => handleDownloadRegistrations('excel')}
          />

          <RegistrationFilters
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            eventFilter={eventFilter}
            setEventFilter={setEventFilter}
            events={events}
          />

          <RegistrationTable
            registrations={filteredRegistrations}
            onUpdateStatus={updateRegistrationStatus}
            onViewTicket={handleViewTicket}
            onResendEmail={handleResendEmail}
            onDeleteRegistration={handleDeleteRegistration}
          />
        </>
      )}

      {isMobile && (
        <MobileRegistrationList
          registrations={filteredRegistrations}
          onUpdateStatus={updateRegistrationStatus}
          onViewTicket={handleViewTicket}
          onResendEmail={handleResendEmail}
          onDeleteRegistration={handleDeleteRegistration}
          onDownloadRegistrations={handleDownloadAll}
        />
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
    </div>
  );
} 