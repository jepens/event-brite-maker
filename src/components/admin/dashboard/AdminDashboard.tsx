import { Navigate } from 'react-router-dom';
import { useAdminDashboard } from './useAdminDashboard';
import { LoadingState } from './LoadingState';
import { ErrorState } from './ErrorState';
import { DashboardHeader } from './DashboardHeader';
import { DashboardContent } from './DashboardContent';
import { MobileNavigation } from './MobileNavigation';
import { useMobile } from '@/hooks/use-mobile';

export function AdminDashboard() {
  const {
    user,
    profile,
    signOut,
    loading,
    error,
    retry,
    activeTab,
    setActiveTab,
  } = useAdminDashboard();
  
  const { isMobile } = useMobile();

  // Redirect to login if not authenticated
  if (!loading && !user) {
    return <Navigate to="/auth" replace />;
  }

  // Show loading state
  if (loading) {
    return <LoadingState />;
  }

  // Show error state
  if (error) {
    return <ErrorState error={error} onRetry={retry} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader profile={profile} signOut={signOut} />
      <DashboardContent activeTab={activeTab} onTabChange={setActiveTab} />
      {isMobile && (
        <MobileNavigation activeTab={activeTab} onTabChange={setActiveTab} />
      )}
    </div>
  );
} 