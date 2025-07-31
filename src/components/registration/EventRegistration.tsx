import { useParams, Navigate } from 'react-router-dom';
import { Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEventRegistration } from './useEventRegistration';
import { EventDetails } from './EventDetails';
import { RegistrationForm } from './RegistrationForm';
import { RegistrationStatus } from './RegistrationStatus';
import { SuccessView } from './SuccessView';
import { AlertCircle } from 'lucide-react';
import { copyToClipboard } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

export function EventRegistration() {
  const { eventId } = useParams();
  const { 
    event, 
    loading, 
    submitting, 
    submitted, 
    checkingEmail,
    emailExists,
    checkEmailExists,
    checkingMemberNumber,
    memberNumberExists,
    memberNumberValid,
    checkMemberNumberExists,
    checkMemberNumberRegistered,
    submitRegistration,
    currentRegistrationCount,
    isRegistrationFull
  } = useEventRegistration(eventId);

  const handleShareLink = async () => {
    const currentUrl = window.location.href;
    const success = await copyToClipboard(currentUrl);
    if (success) {
      toast({
        title: "Link copied!",
        description: "Registration link has been copied to clipboard.",
      });
    } else {
      toast({
        title: "Failed to copy",
        description: "Could not copy link to clipboard. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (!eventId) {
    return <Navigate to="/" replace />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-blue-400 rounded-full animate-ping mx-auto"></div>
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900">Loading Event Details</h2>
            <p className="text-gray-600">Please wait while we fetch the event information...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-6">
        <div className="text-center space-y-8 max-w-md">
          <div className="space-y-4">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-10 h-10 text-red-600" />
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-gray-900">Event Not Found</h1>
              <p className="text-gray-600 text-lg">The event you're looking for doesn't exist or has been removed.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (submitted) {
    return <SuccessView eventName={event.name} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Main Container with improved spacing */}
      <div className="container mx-auto px-4 py-8 lg:py-12">
        
        {/* Header Section with better visual hierarchy */}
        <header className="mb-8 lg:mb-12">
          <nav className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Event Registration
            </div>
            <Button
              onClick={handleShareLink}
              variant="outline"
              size="sm"
              className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
            >
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          </nav>
        </header>

        {/* Main Content Grid */}
        <div className="max-w-4xl mx-auto space-y-8 lg:space-y-12">
          
          {/* Event Details Section */}
          <section className="space-y-6">
            <EventDetails 
              event={event} 
              currentCount={currentRegistrationCount} 
              isFull={isRegistrationFull} 
            />
          </section>

          {/* Registration Status Section */}
          <section>
            <RegistrationStatus 
              event={event}
              currentCount={currentRegistrationCount}
              isFull={isRegistrationFull}
            />
          </section>

          {/* Registration Form Section - Only show if registration is not full */}
          {!isRegistrationFull && (
            <section className="space-y-6">
              <RegistrationForm 
                event={event}
                submitting={submitting}
                onSubmit={submitRegistration}
                checkEmailExists={checkEmailExists}
                checkingEmail={checkingEmail}
                emailExists={emailExists}
                checkMemberNumberExists={checkMemberNumberExists}
                checkMemberNumberRegistered={checkMemberNumberRegistered}
                checkingMemberNumber={checkingMemberNumber}
                memberNumberExists={memberNumberExists}
                memberNumberValid={memberNumberValid}
              />
            </section>
          )}
        </div>

        {/* Footer Section */}
        <footer className="mt-16 lg:mt-24 pt-8 border-t border-gray-200">
          <div className="text-center text-sm text-gray-500 space-y-2">
            <p>Need help? Contact our support team</p>
            <p>© 2025 Digital Event Registration System - Sailendra.co.id . All rights reserved.</p>
          </div>
        </footer>
      </div>
    </div>
  );
} 