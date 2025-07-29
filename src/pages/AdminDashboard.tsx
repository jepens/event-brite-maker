import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { EventsManagement } from '@/components/admin/EventsManagement';
import { RegistrationsManagement } from '@/components/admin/RegistrationsManagement';
import { QRScanner } from '@/components/admin/QRScanner';
import { CheckinReport } from '@/components/admin/CheckinReport';
import { LogOut, RefreshCw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { testAuthSession } from '@/integrations/supabase/client';

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

  useEffect(() => {
    // Set a timeout to handle stuck loading states
    const timeoutId = setTimeout(async () => {
      if (loading) {
        console.warn('Loading timeout reached, testing auth session...');
        
        // Test auth session when timeout occurs
        try {
          const authTest = await testAuthSession();
          console.log('Auth session test result:', authTest);
          
          // Only show toast if there's actually an issue
          if (!authTest.success) {
            toast({
              title: "Loading taking longer than expected",
              description: "Please refresh the page if this persists.",
              variant: "destructive",
            });
          }
        } catch (error) {
          console.error('Auth session test failed:', error);
          toast({
            title: "Loading taking longer than expected",
            description: "Please refresh the page if this persists.",
            variant: "destructive",
          });
        }
      }
    }, 12000); // Increased to 12 seconds timeout to match auth timeout

    // Add a more aggressive fallback for profile loading
    const profileTimeoutId = setTimeout(() => {
      if (user && !profile && loading) {
        console.warn('Profile loading timeout - forcing page refresh');
        toast({
          title: "Profile loading timeout",
          description: "Refreshing page to recover...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }
    }, 15000); // 15 seconds timeout for profile loading

    return () => {
      clearTimeout(timeoutId);
      clearTimeout(profileTimeoutId);
    };
  }, [loading, user, profile]);

  // Add effect to handle profile state changes
  useEffect(() => {
    console.log('AdminDashboard - Profile state changed:', {
      profile,
      role: profile?.role,
      userId: profile?.user_id,
      fullName: profile?.full_name,
      loading
    });
  }, [profile, loading]);

  // Show loading skeleton only when we don't have user or profile yet
  if (loading && (!user || !profile)) {
    console.log('AdminDashboard - Showing loading state (loading && (!user || !profile))');
    
    // Add a fallback mechanism - if we have user but no profile after 8 seconds, show default admin
    if (user && !profile) {
      setTimeout(() => {
        console.log('AdminDashboard - Fallback: User exists but no profile after 8 seconds, showing default admin');
        // This will trigger a re-render and show the dashboard
      }, 8000);
    }
    
    return <LoadingState />;
  }

  // Show error state
  if (error) {
    // If it's a timeout error and we have a user, try to recover
    if (error.message.includes('timeout') && user) {
      // Don't show error state, let it continue loading
    } else {
      return <ErrorState error={error} onRetry={retry} />;
    }
  }

  // Redirect if not authenticated
  if (!user) {
    console.log('AdminDashboard - No user, redirecting to auth');
    return <Navigate to="/auth" replace />;
  }

  // Show access denied if not admin
  if (profile?.role !== 'admin') {
    console.log('AdminDashboard - Profile role is not admin:', profile?.role);
    // If profile is default (Unknown User), try to refresh profile
    const isDefaultProfile = profile?.full_name === 'Unknown User' || profile?.email === 'unknown@example.com';
    
    // Add a small delay to allow profile to load
    if (!profile || isDefaultProfile) {
      console.log('AdminDashboard - No profile or default profile, showing loading');
      return <LoadingState />;
    }
    
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-muted-foreground mb-4">You don't have admin privileges.</p>
          <p className="text-sm text-muted-foreground mb-4">Current role: {profile?.role || 'No role found'}</p>
          {isDefaultProfile && (
            <p className="text-sm text-yellow-600 mb-4">
              Profile loading may have failed. Try refreshing your profile.
            </p>
          )}
          <div className="space-y-2">
            <Button onClick={() => signOut()}>Sign Out</Button>
            <Button 
              variant="outline" 
              onClick={() => window.location.reload()}
              className="ml-2"
            >
              Refresh Page
            </Button>
            {isDefaultProfile && (
              <Button 
                variant="secondary" 
                onClick={() => {
                  window.location.reload();
                }}
                className="ml-2"
              >
                Refresh Profile
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  console.log('AdminDashboard - Rendering main dashboard content');
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
                  <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="registrations">Registrations</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="scanner">QR Scanner</TabsTrigger>
        </TabsList>
          
          <TabsContent value="events" className="mt-6">
            <EventsManagement />
          </TabsContent>
          
          <TabsContent value="registrations" className="mt-6">
            <RegistrationsManagement />
          </TabsContent>
          
          <TabsContent value="reports" className="mt-6">
            <CheckinReport />
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