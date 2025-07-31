import { useState, useEffect } from 'react';

// PWA Install Prompt Event interface
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PWAStatus {
  isInstalled: boolean;
  isOnline: boolean;
  hasUpdate: boolean;
  canInstall: boolean;
  deferredPrompt: BeforeInstallPromptEvent | null;
}

export function usePWA() {
  const [pwaStatus, setPwaStatus] = useState<PWAStatus>({
    isInstalled: false,
    isOnline: navigator.onLine,
    hasUpdate: false,
    canInstall: false,
    deferredPrompt: null,
  });

  useEffect(() => {
    // Check if app is installed
    const checkIfInstalled = () => {
      const isInstalled = window.matchMedia('(display-mode: standalone)').matches ||
                         (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
      
      setPwaStatus(prev => ({ ...prev, isInstalled }));
    };

    // Network status
    const handleOnline = () => setPwaStatus(prev => ({ ...prev, isOnline: true }));
    const handleOffline = () => setPwaStatus(prev => ({ ...prev, isOnline: false }));

      // Before install prompt
  const handleBeforeInstallPrompt = (e: Event) => {
    e.preventDefault();
    setPwaStatus(prev => ({ 
      ...prev, 
      canInstall: true, 
      deferredPrompt: e as BeforeInstallPromptEvent 
    }));
  };

    // App installed
    const handleAppInstalled = () => {
      setPwaStatus(prev => ({ 
        ...prev, 
        isInstalled: true, 
        canInstall: false,
        deferredPrompt: null 
      }));
    };

    // Service worker update
    const handleServiceWorkerUpdate = () => {
      setPwaStatus(prev => ({ ...prev, hasUpdate: true }));
    };

    // Register event listeners
    checkIfInstalled();
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Service worker update detection
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', handleServiceWorkerUpdate);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('controllerchange', handleServiceWorkerUpdate);
      }
    };
  }, []);

  // Install PWA
  const installPWA = async () => {
    if (!pwaStatus.deferredPrompt) {
      console.log('PWA: No install prompt available');
      return false;
    }

    try {
      pwaStatus.deferredPrompt.prompt();
      const { outcome } = await pwaStatus.deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('PWA: User accepted the install prompt');
        setPwaStatus(prev => ({ 
          ...prev, 
          canInstall: false, 
          deferredPrompt: null 
        }));
        return true;
      } else {
        console.log('PWA: User dismissed the install prompt');
        return false;
      }
    } catch (error) {
      console.error('PWA: Install failed', error);
      return false;
    }
  };

  // Update PWA
  const updatePWA = async () => {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration && registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          setPwaStatus(prev => ({ ...prev, hasUpdate: false }));
          return true;
        }
      } catch (error) {
        console.error('PWA: Update failed', error);
      }
    }
    return false;
  };

  // Reload page after update
  const reloadAfterUpdate = () => {
    window.location.reload();
  };

  return {
    ...pwaStatus,
    installPWA,
    updatePWA,
    reloadAfterUpdate,
  };
} 