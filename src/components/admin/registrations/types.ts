export interface Ticket {
  id: string;
  qr_code: string;
  short_code?: string;
  qr_image_url: string;
  status: 'unused' | 'used';
  whatsapp_sent?: boolean;
  whatsapp_sent_at?: string;
  email_sent?: boolean;
  email_sent_at?: string;
  issued_at: string;
}

export interface Registration {
  id: string;
  participant_name: string;
  participant_email: string;
  phone_number?: string;
  status: 'pending' | 'approved' | 'rejected';
  registered_at: string;
  updated_at?: string;
  custom_data: Record<string, unknown>;
  event_id: string;
  events: {
    id: string;
    name: string;
    event_date?: string;
    location?: string;
    whatsapp_enabled?: boolean;
  } | null;
  tickets: Ticket[];
}

export interface Event {
  id: string;
  name: string;
} 