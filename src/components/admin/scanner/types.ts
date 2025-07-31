export interface ScanResult {
  success: boolean;
  message: string;
  participant?: {
    name: string;
    email: string;
    event_name: string;
  };
} 