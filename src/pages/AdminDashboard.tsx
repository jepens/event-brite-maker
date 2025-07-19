import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { EventsManagement } from '@/components/admin/EventsManagement';
import { RegistrationsManagement } from '@/components/admin/RegistrationsManagement';
import { QRScanner } from '@/components/admin/QRScanner';
import { LogOut } from 'lucide-react';

const AdminDashboard = () => {
  const { user, profile, signOut, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Show loading while profile is being fetched
  if (!profile && user) {
    return <div className="min-h-screen flex items-center justify-center">Loading profile...</div>;
  }

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
        <Tabs defaultValue="events" className="w-full">
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