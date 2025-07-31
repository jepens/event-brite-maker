import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Event, CustomField } from './types';
import { convertInputToISO } from '@/lib/date-utils';

export function useEventForm(event: Event | null, onSuccess: () => void) {
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');

  useEffect(() => {
    if (event) {
      setCustomFields(event.custom_fields || []);
      // Set logo preview if exists
      if (event.branding_config?.logo_url && typeof event.branding_config.logo_url === 'string') {
        setLogoPreview(event.branding_config.logo_url);
      }
    } else {
      setCustomFields([]);
      setLogoFile(null);
      setLogoPreview('');
    }
  }, [event]);

  const handleLogoUpload = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      // Determine content type based on file extension and MIME type
      let contentType = file.type;
      if (!contentType || contentType === 'application/octet-stream') {
        // Fallback content type based on file extension
        switch (fileExt?.toLowerCase()) {
          case 'png':
            contentType = 'image/png';
            break;
          case 'jpg':
          case 'jpeg':
            contentType = 'image/jpeg';
            break;
          case 'gif':
            contentType = 'image/gif';
            break;
          case 'webp':
            contentType = 'image/webp';
            break;
          default:
            contentType = 'image/png'; // Default fallback
        }
      }

      const { error: uploadError } = await supabase.storage
        .from('event-logos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: contentType,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('event-logos')
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Logo upload failed:', error);
      return null;
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview('');
  };

  const addCustomField = () => {
    const newField: CustomField = {
      name: `field_${Date.now()}`,
      label: '',
      type: 'text',
      required: false,
      placeholder: '',
    };
    setCustomFields([...customFields, newField]);
  };

  const updateCustomField = (index: number, field: Partial<CustomField>) => {
    const updatedFields = [...customFields];
    
    // Special handling for member_number type
    if (field.type === 'member_number') {
      updatedFields[index] = { 
        ...updatedFields[index], 
        ...field,
        validation: {
          pattern: '^\\d{10}$',
          unique: true,
          message: 'Member number must be 10 digits and must be unique per event'
        }
      };
    } else {
      updatedFields[index] = { ...updatedFields[index], ...field };
    }
    
    setCustomFields(updatedFields);
  };



  const removeCustomField = (index: number) => {
    setCustomFields(customFields.filter((_, i) => i !== index));
  };

  const submitEvent = async (formData: FormData) => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to create events',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    try {
      const name = formData.get('name') as string;
      const description = formData.get('description') as string;
      const event_date = formData.get('event_date') as string;
      const location = formData.get('location') as string;
      const max_participants = parseInt(formData.get('max_participants') as string);
      const dresscode = formData.get('dresscode') as string;
      const whatsapp_enabled = formData.get('whatsapp_enabled') === 'on';

      // Validate required fields
      if (!name?.trim() || !description?.trim() || !event_date || !location?.trim()) {
        toast({
          title: 'Validation Error',
          description: 'Please fill in all required fields',
          variant: 'destructive',
        });
        return;
      }

      // Handle logo upload
      let logoUrl = '';
      if (logoFile) {
        logoUrl = await handleLogoUpload(logoFile);
        if (!logoUrl) {
          toast({
            title: 'Error',
            description: 'Failed to upload logo',
            variant: 'destructive',
          });
          return;
        }
      } else if (logoPreview && !logoFile) {
        logoUrl = logoPreview;
      }

      // Prepare branding config
      const branding_config = {
        logo_url: logoUrl || null,
        primaryColor: formData.get('primaryColor') || '#3B82F6',
      };

      // Validate custom fields
      const validCustomFields = customFields.filter(field => 
        field.name.trim() && field.label.trim()
      );

      // Convert event_date dari datetime-local ke ISO dengan timezone WIB
      const eventDateISO = convertInputToISO(event_date);
      
      const eventData = {
        name: name.trim(),
        description: description.trim(),
        event_date: eventDateISO,
        location: location.trim(),
        max_participants,
        dresscode: dresscode?.trim() || null,
        whatsapp_enabled,
        branding_config,
        custom_fields: validCustomFields,
        created_by: user.id,
      };

      if (event) {
        // Update existing event
        const { error } = await supabase
          .from('events')
          .update(eventData)
          .eq('id', event.id);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Event updated successfully',
        });
      } else {
        // Create new event
        const { error } = await supabase
          .from('events')
          .insert(eventData);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Event created successfully',
        });
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving event:', error);
      toast({
        title: 'Error',
        description: 'Failed to save event',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return {
    submitting,
    customFields,
    logoFile,
    logoPreview,
    handleLogoChange,
    removeLogo,
    addCustomField,
    updateCustomField,
    removeCustomField,
    submitEvent,
  };
} 