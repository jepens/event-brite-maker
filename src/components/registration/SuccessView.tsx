import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, Share2 } from 'lucide-react';
import { copyToClipboard } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

interface SuccessViewProps {
  eventName: string;
}

export function SuccessView({ eventName }: SuccessViewProps) {
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <div className="h-8 w-8 text-green-600">✓</div>
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Registration Submitted!
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <p className="text-gray-600">
              Thank you for registering for <strong>{eventName}</strong>!
            </p>
            <p className="text-sm text-gray-500">
              Your registration has been submitted successfully and is currently under review.
            </p>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 text-blue-800 mb-2">
              <Mail className="h-4 w-4" />
              <span className="font-medium">What's Next?</span>
            </div>
            <ul className="text-sm text-blue-700 space-y-1 text-left">
              <li>• You'll receive a confirmation email once approved</li>
              <li>• Check your email (and spam folder) for updates</li>
              <li>• Your ticket will be sent via email after approval</li>
            </ul>
          </div>

          <div className="space-y-3">
            <Button
              onClick={handleShareLink}
              variant="outline"
              className="w-full text-blue-600 hover:text-blue-800 hover:bg-blue-50"
            >
              <Share2 className="h-4 w-4 mr-2" />
              Share Registration Link
            </Button>
            
            <p className="text-xs text-gray-500">
              Need help? Contact the event organizer for assistance.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 