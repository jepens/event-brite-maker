import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

interface Profile {
  full_name?: string;
  email?: string;
}

interface DashboardHeaderProps {
  profile: Profile | null;
  signOut: () => void;
}

export function DashboardHeader({ profile, signOut }: DashboardHeaderProps) {
  return (
    <div className="border-b">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back, {profile?.full_name || profile?.email || 'Admin'}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {profile?.email}
            </span>
            <Button onClick={signOut} variant="outline" size="sm">
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
} 