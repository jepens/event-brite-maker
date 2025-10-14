import { Calendar, Users, MessageSquare, QrCode, BarChart3, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileNavigationProps {
  activeTab: string;
  onTabChange: (value: string) => void;
}

export function MobileNavigation({ activeTab, onTabChange }: MobileNavigationProps) {
  const tabs = [
    { value: 'events', label: 'Events', icon: Calendar },
    { value: 'registrations', label: 'Registrations', icon: Users },
    { value: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
    { value: 'scanner', label: 'Scanner', icon: QrCode },
    { value: 'reports', label: 'Reports', icon: BarChart3 },
    { value: 'pwa', label: 'PWA', icon: Smartphone },
  ];

  return (
    <nav className="mobile-nav">
      <div className="grid grid-cols-6 gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.value;
          
          return (
            <button
              key={tab.value}
              onClick={() => onTabChange(tab.value)}
              className={cn(
                'flex flex-col items-center justify-center py-2 px-1 rounded-lg transition-colors mobile-transition',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="h-5 w-5 mb-1" />
              <span className="text-xs font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}