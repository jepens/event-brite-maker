export interface Event {
  id: string;
  name: string;
  description: string;
  event_date: string;
  location: string;
  max_participants: number;
  branding_config: Record<string, unknown>;
  custom_fields: CustomField[];
  whatsapp_enabled?: boolean;
  dresscode?: string;
  registration_status?: 'open' | 'closed';
}

export interface CustomField {
  name: string;
  label: string;
  required: boolean;
  type: string;
  placeholder?: string;
  validation?: {
    pattern?: string;
    unique?: boolean;
    message?: string;
  };
}

export interface RegistrationFormData {
  participantName: string;
  participantEmail: string;
  participantPhone?: string;
  [key: string]: string | undefined; // For custom fields
} 