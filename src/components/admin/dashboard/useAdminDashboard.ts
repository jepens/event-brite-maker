import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { testAuthSession } from '@/integrations/supabase/client';

export function useAdminDashboard() {
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
    }, 15000); // 15 seconds for profile loading

    return () => {
      clearTimeout(timeoutId);
      clearTimeout(profileTimeoutId);
    };
  }, [loading, user, profile]);

  return {
    user,
    profile,
    signOut,
    loading,
    error,
    retry,
    activeTab,
    setActiveTab,
  };
} 