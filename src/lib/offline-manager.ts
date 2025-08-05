import { openDB, DBSchema, IDBPDatabase } from 'idb';

// Offline check-in data structure
export interface OfflineCheckinData {
  id: string;
  ticketId: string;
  qrCode: string;
  shortCode?: string;
  participantName: string;
  participantEmail: string;
  eventId: string;
  eventName: string;
  checkinAt: number;
  synced: boolean;
  location?: string;
  notes?: string;
  checkedInBy?: string;
}

// Cached ticket data for offline validation
export interface CachedTicketData {
  id: string;
  qrCode: string;
  shortCode?: string;
  participantName: string;
  participantEmail: string;
  eventId: string;
  eventName: string;
  status: 'approved' | 'pending' | 'rejected';
  cachedAt: number;
}

// Database schema for offline check-ins
interface OfflineCheckinDB extends DBSchema {
  checkins: {
    key: string;
    value: OfflineCheckinData;
    indexes: {
      'by-synced': boolean;
      'by-timestamp': number;
    };
  };
  tickets: {
    key: string;
    value: CachedTicketData;
    indexes: {
      'by-event': string;
    };
  };
}

// Offline manager class
export class OfflineManager {
  private db: IDBPDatabase<OfflineCheckinDB> | null = null;
  private isOnline = navigator.onLine;
  private syncInProgress = false;

  constructor() {
    this.initDatabase();
    this.setupNetworkListeners();
    
    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
      this.closeDatabase();
    });
  }

  // Close database connection
  private async closeDatabase() {
    if (this.db) {
      try {
        this.db.close();
        console.log('Offline Manager: Database closed');
      } catch (error) {
        console.error('Offline Manager: Error closing database', error);
      }
    }
    this.db = null;
  }

  // Initialize IndexedDB
  private async initDatabase() {
    try {
      // If database already exists, return early
      if (this.db) {
        return;
      }

      this.db = await openDB('offline-checkin-db', 1, {
        upgrade(db) {
          // Create checkins store
          const checkinsStore = db.createObjectStore('checkins', { keyPath: 'id' });
          checkinsStore.createIndex('by-synced', 'synced');
          checkinsStore.createIndex('by-timestamp', 'checkinAt');

          // Create tickets store
          const ticketsStore = db.createObjectStore('tickets', { keyPath: 'id' });
          ticketsStore.createIndex('by-event', 'eventId');
        },
        blocked() {
          console.warn('Offline Manager: Database upgrade blocked');
        },
        blocking() {
          console.warn('Offline Manager: Database upgrade blocking');
        },
      });
      console.log('Offline Manager: Database initialized');
    } catch (error) {
      console.error('Offline Manager: Database initialization failed', error);
      this.db = null;
      throw error;
    }
  }

  // Setup network status listeners
  private setupNetworkListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      console.log('Offline Manager: Network online');
      this.syncOfflineCheckins();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      console.log('Offline Manager: Network offline');
    });
  }

  // Check if currently online
  public isNetworkOnline(): boolean {
    return this.isOnline;
  }

  // Store offline check-in
  public async storeOfflineCheckin(checkinData: Omit<OfflineCheckinData, 'id' | 'synced'>): Promise<string> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const id = `offline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const offlineCheckin: OfflineCheckinData = {
      ...checkinData,
      id,
      synced: false,
    };

    await this.db.add('checkins', offlineCheckin);
    console.log('Offline Manager: Stored offline check-in', id);
    return id;
  }

  // Get all offline check-ins
  public async getOfflineCheckins(): Promise<OfflineCheckinData[]> {
    if (!this.db) {
      return [];
    }

    return await this.db.getAll('checkins');
  }

  // Get unsynced check-ins
  public async getUnsyncedCheckins(): Promise<OfflineCheckinData[]> {
    if (!this.db) {
      return [];
    }

    return await this.db.getAllFromIndex('checkins', 'by-synced', false);
  }

  // Mark check-in as synced
  public async markCheckinSynced(id: string): Promise<void> {
    if (!this.db) {
      return;
    }

    const checkin = await this.db.get('checkins', id);
    if (checkin) {
      checkin.synced = true;
      await this.db.put('checkins', checkin);
      console.log('Offline Manager: Marked check-in as synced', id);
    }
  }

  // Delete synced check-in
  public async deleteSyncedCheckin(id: string): Promise<void> {
    if (!this.db) {
      return;
    }

    await this.db.delete('checkins', id);
    console.log('Offline Manager: Deleted synced check-in', id);
  }

  // Cache ticket data for offline validation
  public async cacheTicketData(ticketData: CachedTicketData): Promise<void> {
    if (!this.db) {
      return;
    }

    await this.db.put('tickets', ticketData);
    console.log('Offline Manager: Cached ticket data', ticketData.id);
  }

  // Get cached ticket by QR code or short code
  public async getCachedTicket(code: string): Promise<CachedTicketData | null> {
    if (!this.db) {
      return null;
    }

    const tickets = await this.db.getAll('tickets');
    return tickets.find(ticket => 
      ticket.qrCode === code || ticket.shortCode === code
    ) || null;
  }

  // Get cached tickets for an event
  public async getCachedTicketsForEvent(eventId: string): Promise<CachedTicketData[]> {
    if (!this.db) {
      return [];
    }

    return await this.db.getAllFromIndex('tickets', 'by-event', eventId);
  }

  // Clear old cached data
  public async clearOldCachedData(maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<void> {
    if (!this.db) {
      return;
    }

    const cutoffTime = Date.now() - maxAge;
    
    // Clear old tickets
    const tickets = await this.db.getAll('tickets');
    for (const ticket of tickets) {
      if (ticket.cachedAt < cutoffTime) {
        await this.db.delete('tickets', ticket.id);
      }
    }

    // Clear old synced check-ins
    const checkins = await this.db.getAll('checkins');
    for (const checkin of checkins) {
      if (checkin.synced && checkin.checkinAt < cutoffTime) {
        await this.db.delete('checkins', checkin.id);
      }
    }

    console.log('Offline Manager: Cleared old cached data');
  }

  // Sync offline check-ins to server
  public async syncOfflineCheckins(): Promise<void> {
    if (this.syncInProgress || !this.isOnline) {
      return;
    }

    this.syncInProgress = true;
    console.log('Offline Manager: Starting sync...');

    try {
      const unsyncedCheckins = await this.getUnsyncedCheckins();
      
      if (unsyncedCheckins.length === 0) {
        console.log('Offline Manager: No check-ins to sync');
        return;
      }

      console.log(`Offline Manager: Syncing ${unsyncedCheckins.length} check-ins`);

      for (const checkin of unsyncedCheckins) {
        try {
          // Convert offline check-in to server format
          const serverCheckin = {
            ticket_id: checkin.ticketId,
            qr_code: checkin.qrCode,
            short_code: checkin.shortCode,
            participant_name: checkin.participantName,
            participant_email: checkin.participantEmail,
            event_id: checkin.eventId,
            checkin_at: new Date(checkin.checkinAt).toISOString(),
            location: checkin.location,
            notes: checkin.notes,
            checked_in_by: checkin.checkedInBy,
          };

          // Send to server
          const response = await fetch('/api/checkin', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(serverCheckin),
          });

          if (response.ok) {
            await this.markCheckinSynced(checkin.id);
            console.log('Offline Manager: Synced check-in', checkin.id);
          } else {
            console.error('Offline Manager: Failed to sync check-in', checkin.id);
          }
        } catch (error) {
          console.error('Offline Manager: Error syncing check-in', checkin.id, error);
        }
      }

      // Clean up old synced data
      await this.clearOldCachedData();
      
      console.log('Offline Manager: Sync completed');
    } catch (error) {
      console.error('Offline Manager: Sync failed', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  // Get sync status
  public async getSyncStatus(): Promise<{
    total: number;
    synced: number;
    unsynced: number;
    lastSync?: number;
  }> {
    // Wait for database to be initialized
    if (!this.db) {
      try {
        await this.initDatabase();
      } catch (error) {
        console.error('Failed to initialize database for sync status:', error);
        return { total: 0, synced: 0, unsynced: 0 };
      }
    }

    // Check if database is still null after initialization
    if (!this.db) {
      return { total: 0, synced: 0, unsynced: 0 };
    }

    try {
      const allCheckins = await this.db.getAll('checkins') as OfflineCheckinData[];
      const syncedCheckins = allCheckins.filter((c: OfflineCheckinData) => c.synced);
      const unsyncedCheckins = allCheckins.filter((c: OfflineCheckinData) => !c.synced);

      return {
        total: allCheckins.length,
        synced: syncedCheckins.length,
        unsynced: unsyncedCheckins.length,
        lastSync: syncedCheckins.length > 0 
          ? Math.max(...syncedCheckins.map((c: OfflineCheckinData) => c.checkinAt))
          : undefined,
      };
    } catch (error) {
      console.error('Error getting sync status:', error);
      
      // If it's a connection error, try to reinitialize
      if (error instanceof Error && error.name === 'InvalidStateError') {
        console.warn('Database connection error, attempting to reinitialize...');
        try {
          this.db = null;
          await this.initDatabase();
        } catch (reinitError) {
          console.error('Failed to reinitialize database:', reinitError);
        }
      }
      
      return { total: 0, synced: 0, unsynced: 0 };
    }
  }

  // Export offline data for debugging
  public async exportOfflineData(): Promise<{
    checkins: OfflineCheckinData[];
    tickets: CachedTicketData[];
    syncStatus: {
      total: number;
      synced: number;
      unsynced: number;
      lastSync?: number;
    };
  }> {
    if (!this.db) {
      return { 
        checkins: [], 
        tickets: [], 
        syncStatus: { total: 0, synced: 0, unsynced: 0 }
      };
    }

    const checkins = await this.db.getAll('checkins');
    const tickets = await this.db.getAll('tickets');
    const syncStatus = await this.getSyncStatus();

    return { checkins, tickets, syncStatus };
  }

  // Clear all offline data
  public async clearAllData(): Promise<void> {
    if (!this.db) {
      return;
    }

    await this.db.clear('checkins');
    await this.db.clear('tickets');
    console.log('Offline Manager: Cleared all offline data');
  }
}

// Singleton instance
export const offlineManager = new OfflineManager(); 