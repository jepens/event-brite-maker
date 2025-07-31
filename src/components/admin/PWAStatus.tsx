import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Download, RefreshCw, Wifi, WifiOff, CheckCircle, AlertCircle } from 'lucide-react';
import { usePWA } from '@/hooks/usePWA';
import { offlineManager } from '@/lib/offline-manager';
import { useState, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';

export function PWAStatus() {
  const { isOnline, isInstalled, canInstall, hasUpdate, installPWA, updatePWA, reloadAfterUpdate } = usePWA();
  const [syncStatus, setSyncStatus] = useState({ total: 0, synced: 0, unsynced: 0 });

  useEffect(() => {
    loadSyncStatus();
    const interval = setInterval(loadSyncStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadSyncStatus = async () => {
    try {
      const status = await offlineManager.getSyncStatus();
      setSyncStatus(status);
    } catch (error) {
      console.error('Failed to load sync status:', error);
    }
  };

  const handleInstall = async () => {
    const success = await installPWA();
    if (success) {
      toast({
        title: 'PWA Installed',
        description: 'The app has been installed successfully!',
      });
    }
  };

  const handleUpdate = async () => {
    const success = await updatePWA();
    if (success) {
      toast({
        title: 'Update Available',
        description: 'Click to reload and apply the update',
        action: (
          <Button onClick={reloadAfterUpdate} size="sm">
            Reload Now
          </Button>
        ),
      });
    }
  };

  const handleSync = async () => {
    try {
      await offlineManager.syncOfflineCheckins();
      await loadSyncStatus();
      toast({
        title: 'Sync Complete',
        description: 'Offline check-ins have been synced',
      });
    } catch (error) {
      toast({
        title: 'Sync Failed',
        description: 'Failed to sync offline check-ins',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* PWA Installation Status */}
      {!isInstalled && canInstall && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <Download className="h-5 w-5" />
              Install App
            </CardTitle>
            <CardDescription className="text-blue-600">
              Install this app for better offline experience and quick access
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleInstall} className="bg-blue-600 hover:bg-blue-700">
              <Download className="h-4 w-4 mr-2" />
              Install App
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Update Available */}
      {hasUpdate && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <RefreshCw className="h-5 w-5" />
              Update Available
            </CardTitle>
            <CardDescription className="text-orange-600">
              A new version of the app is available
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleUpdate} className="bg-orange-600 hover:bg-orange-700">
              <RefreshCw className="h-4 w-4 mr-2" />
              Update App
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Network Status */}
      <Card className={isOnline ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            {isOnline ? (
              <Wifi className="h-5 w-5 text-green-600" />
            ) : (
              <WifiOff className="h-5 w-5 text-yellow-600" />
            )}
            <span className={isOnline ? 'text-green-800' : 'text-yellow-800'}>
              {isOnline ? 'Online Mode' : 'Offline Mode'}
            </span>
            <Badge variant={isOnline ? 'default' : 'secondary'}>
              {isOnline ? 'Connected' : 'Offline'}
            </Badge>
          </CardTitle>
          <CardDescription className={isOnline ? 'text-green-600' : 'text-yellow-600'}>
            {isOnline 
              ? 'Real-time check-ins with server sync' 
              : 'Check-ins stored locally, will sync when online'
            }
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Sync Status */}
      {syncStatus.total > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <CheckCircle className="h-5 w-5" />
              Sync Status
            </CardTitle>
            <CardDescription className="text-blue-600">
              Offline check-in synchronization
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Total Check-ins:</span>
                <span className="text-sm">{syncStatus.total}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Synced:</span>
                <span className="text-sm text-green-600">{syncStatus.synced}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Pending:</span>
                <span className="text-sm text-orange-600">{syncStatus.unsynced}</span>
              </div>
              
              {syncStatus.unsynced > 0 && (
                <div className="pt-2">
                  <Button 
                    onClick={handleSync} 
                    disabled={!isOnline}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Sync {syncStatus.unsynced} Check-ins
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* PWA Features Info */}
      <Card className="border-gray-200 bg-gray-50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            PWA Features
          </CardTitle>
          <CardDescription>
            Progressive Web App capabilities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>Offline QR scanning and check-in</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>Automatic data synchronization</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>Native app-like experience</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>Quick access from home screen</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 