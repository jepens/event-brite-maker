import { useState } from 'react';
import { SwipeableRegistrationCard } from '@/components/ui/swipeable-card';
import { Registration } from './types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter, Download } from 'lucide-react';

interface MobileRegistrationListProps {
  registrations: Registration[];
  onUpdateStatus: (registrationId: string, status: 'approved' | 'rejected') => void;
  onViewTicket: (registration: Registration) => void;
  onResendEmail: (registration: Registration) => void;
  onDeleteRegistration: (registration: Registration) => void;
  onDownloadRegistrations?: () => void;
}

export function MobileRegistrationList({
  registrations,
  onUpdateStatus,
  onViewTicket,
  onResendEmail,
  onDeleteRegistration,
  onDownloadRegistrations,
}: MobileRegistrationListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredRegistrations = registrations.filter((registration) => {
    const matchesSearch = 
      registration.participant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      registration.participant_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      registration.events?.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || registration.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleApprove = (registration: Registration) => {
    onUpdateStatus(registration.id, 'approved');
  };

  const handleReject = (registration: Registration) => {
    onUpdateStatus(registration.id, 'rejected');
  };

  if (registrations.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-semibold mb-2">No Registrations Found</h3>
        <p className="text-muted-foreground">
          No registrations have been submitted yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Mobile Search and Filter */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search registrations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 mobile-input"
          />
        </div>
        
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="flex-1 mobile-button">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
          
          {onDownloadRegistrations && (
            <Button 
              onClick={onDownloadRegistrations} 
              variant="outline" 
              className="mobile-button"
            >
              <Download className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Results Count */}
      <div className="text-sm text-muted-foreground">
        {filteredRegistrations.length} of {registrations.length} registrations
      </div>

      {/* Mobile Registration Cards */}
      <div className="space-y-3 touch-spacing">
        {filteredRegistrations.map((registration) => (
          <SwipeableRegistrationCard
            key={registration.id}
            registration={registration}
            onApprove={() => handleApprove(registration)}
            onReject={() => handleReject(registration)}
            onViewTicket={() => onViewTicket(registration)}
            onResendEmail={() => onResendEmail(registration)}
            onDelete={() => onDeleteRegistration(registration)}
          />
        ))}
      </div>

      {/* Empty State for Filtered Results */}
      {filteredRegistrations.length === 0 && registrations.length > 0 && (
        <div className="text-center py-8">
          <h3 className="text-lg font-semibold mb-2">No Matching Registrations</h3>
          <p className="text-muted-foreground">
            Try adjusting your search or filter criteria.
          </p>
        </div>
      )}
    </div>
  );
} 