import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EventsManagement } from '../events/EventsManagement';
import { RegistrationsManagement } from '../registrations/RegistrationsManagement';
import { OfflineQRScanner } from '../scanner/OfflineQRScanner';
import { CheckinReport } from '../CheckinReport';
import { PWAStatus } from '../PWAStatus';
import { WhatsAppBlastManagement } from '../whatsapp/WhatsAppBlastManagement';
import { useMobile } from '@/hooks/use-mobile';

interface DashboardContentProps {
  activeTab: string;
  onTabChange: (value: string) => void;
}

export function DashboardContent({ activeTab, onTabChange }: DashboardContentProps) {
  const { isMobile } = useMobile();
  
  return (
    <main className="container mx-auto px-4 py-6 dashboard-content">
      <Tabs value={activeTab} onValueChange={onTabChange} className="space-y-6">
        {!isMobile && (
          <TabsList className="grid w-full grid-cols-6 tabs-list">
            <TabsTrigger value="events" className="tabs-trigger">Events</TabsTrigger>
            <TabsTrigger value="registrations" className="tabs-trigger">Registrations</TabsTrigger>
            <TabsTrigger value="whatsapp" className="tabs-trigger">WhatsApp Blast</TabsTrigger>
            <TabsTrigger value="scanner" className="tabs-trigger">QR Scanner</TabsTrigger>
            <TabsTrigger value="reports" className="tabs-trigger">Reports</TabsTrigger>
            <TabsTrigger value="pwa" className="tabs-trigger">PWA Status</TabsTrigger>
          </TabsList>
        )}

        <TabsContent value="events" className="space-y-6">
          <EventsManagement />
        </TabsContent>

        <TabsContent value="registrations" className="space-y-6">
          <RegistrationsManagement />
        </TabsContent>

        <TabsContent value="whatsapp" className="space-y-6">
          <WhatsAppBlastManagement />
        </TabsContent>

        <TabsContent value="scanner" className="space-y-6">
          <OfflineQRScanner />
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <CheckinReport />
        </TabsContent>

        <TabsContent value="pwa" className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold">PWA Status</h2>
            <p className="text-muted-foreground">Progressive Web App information and offline capabilities</p>
          </div>
          <PWAStatus />
        </TabsContent>
      </Tabs>
    </main>
  );
}