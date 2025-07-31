import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { lazy, Suspense, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorFallback } from "@/lib/error-handler";
import { supabase } from './integrations/supabase/client';

// Lazy load page components with proper default export transformation
const EventList = lazy(() => import("./pages/EventList").then(module => ({ default: module.EventList })));
const EventRegistration = lazy(() => import("./pages/EventRegistration").then(module => ({ default: module.EventRegistration })));
const Auth = lazy(() => import("./pages/Auth").then(module => ({ default: module.Auth })));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard").then(module => ({ default: module.AdminDashboard })));
const NotFound = lazy(() => import("./pages/NotFound").then(module => ({ default: module.NotFound })));

// Loading component
const PageLoader = () => (
  <div className="p-8 space-y-4">
    <Skeleton className="h-8 w-[250px]" />
    <Skeleton className="h-72 w-full" />
    <Skeleton className="h-24 w-full" />
  </div>
);

// Configure QueryClient with better error handling and retries
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 5 * 60 * 1000, // Data remains fresh for 5 minutes
      gcTime: 30 * 60 * 1000, // Garbage collection after 30 minutes
    },
  },
});

function App() {
  useEffect(() => {
    // Test Supabase connection
    const testConnection = async () => {
      try {
        const { data, error } = await supabase
          .from('events')
          .select('id, name')
          .limit(1)
          .maybeSingle();
        
        if (error) {
          console.error('Supabase connection error:', error);
        } else {
          console.log('Supabase connected successfully', data ? 'Found event' : 'No events yet');
        }
      } catch (error) {
        console.error('Failed to connect to Supabase:', error);
      }
    };

    testConnection();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<EventList />} />
                <Route path="/event/:eventId" element={<EventRegistration />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/admin" element={<AdminDashboard />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
