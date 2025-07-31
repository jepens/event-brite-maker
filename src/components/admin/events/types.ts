export interface Event {
  id: string;
  name: string;
  description: string;
  event_date: string;
  location: string;
  max_participants: number;
  dresscode?: string;
  branding_config: Record<string, unknown>;
  custom_fields: CustomField[];
  whatsapp_enabled?: boolean;
}

export interface CustomField {
  name: string;
  label: string;
  type: string;
  required: boolean;
  placeholder?: string;
  validation?: {
    pattern?: string;
    unique?: boolean;
    message?: string;
  };
}

export interface EventFormData {
  name: string;
  description: string;
  event_date: string;
  location: string;
  max_participants: number;
  dresscode?: string;
  whatsapp_enabled: boolean;
  branding_config: Record<string, unknown>;
  custom_fields: CustomField[];
} 