import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { EventsManagement } from '@/components/admin/EventsManagement';
import { RegistrationsManagement } from '@/components/admin/RegistrationsManagement';
import { QRScanner } from '@/components/admin/QRScanner';
import { LogOut, RefreshCw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';

const LoadingState = () => (
  <div className="min-h-screen bg-background animate-in fade-in-50">
    <div className="border-b">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-[200px]" />
          <div className="flex items-center gap-4">
            <Skeleton className="h-4 w-[150px]" />
            <Skeleton className="h-10 w-[100px]" />
          </div>
        </div>
      </div>
    </div>

    <main className="container mx-auto px-4 py-6">
      <div className="space-y-6">
        <Skeleton className="h-10 w-full" />
        <div className="grid gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[200px] w-full" />
          ))}
        </div>
      </div>
    </main>
  </div>
);

const ErrorState = ({ error, onRetry }: { error: Error; onRetry: () => void }) => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
      <p className="text-muted-foreground mb-4">{error.message}</p>
      <Button onClick={onRetry} className="gap-2">
        <RefreshCw className="h-4 w-4" />
        Try Again
      </Button>
    </div>
  </div>
);

const AdminDashboard = () => {
  const { user, profile, signOut, loading, error, retry } = useAuth();
  const [activeTab, setActiveTab] = useState('events');
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    // Set a timeout to handle stuck loading states
    const timeoutId = setTimeout(() => {
      if (loading) {
        toast({
          title: "Loading taking longer than expected",
          description: "Please refresh the page if this persists.",
          variant: "destructive",
        });
      }
    }, 10000); // 10 seconds timeout

    return () => clearTimeout(timeoutId);
  }, [loading]);

  useEffect(() => {
    // Handle initial load state
    if (!loading && isInitialLoad) {
      setIsInitialLoad(false);
    }
  }, [loading]);

  // Show loading skeleton during initial load
  if (loading && isInitialLoad) {
    return <LoadingState />;
  }

  // Show error state
  if (error) {
    return <ErrorState error={error} onRetry={retry} />;
  }

  // Redirect if not authenticated
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Show access denied if not admin
  if (profile?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-muted-foreground mb-4">You don't have admin privileges.</p>
          <p className="text-sm text-muted-foreground mb-4">Current role: {profile?.role || 'No role found'}</p>
          <Button onClick={() => signOut()}>Sign Out</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Welcome, {profile?.full_name || user.email}
            </span>
            <Button variant="outline" onClick={() => signOut()}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="events">Events</TabsTrigger>
            <TabsTrigger value="registrations">Registrations</TabsTrigger>
            <TabsTrigger value="scanner">QR Scanner</TabsTrigger>
          </TabsList>
          
          <TabsContent value="events" className="mt-6">
            <EventsManagement />
          </TabsContent>
          
          <TabsContent value="registrations" className="mt-6">
            <RegistrationsManagement />
          </TabsContent>
          
          <TabsContent value="scanner" className="mt-6">
            <QRScanner />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminDashboard;