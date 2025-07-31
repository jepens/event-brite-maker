import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useEventForm } from './useEventForm';
import { EventForm } from './EventForm';
import { CustomFieldsEditor } from './CustomFieldsEditor';
import { BrandingEditor } from './BrandingEditor';
import { Event } from './types';

interface EventFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: Event | null;
  onSuccess: () => void;
}

export function EventFormDialog({ open, onOpenChange, event, onSuccess }: EventFormDialogProps) {
  const [primaryColor, setPrimaryColor] = useState('#3B82F6');
  
  const {
    submitting,
    customFields,
    logoPreview,
    handleLogoChange,
    removeLogo,
    addCustomField,
    updateCustomField,
    removeCustomField,
    submitEvent,
  } = useEventForm(event, onSuccess);

  const handleSubmit = (formData: FormData) => {
    // Add primary color to form data
    formData.append('primaryColor', primaryColor);
    submitEvent(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {event ? 'Edit Event' : 'Create New Event'}
          </DialogTitle>
          <DialogDescription>
            {event 
              ? 'Update your event details, custom fields, and branding.'
              : 'Create a new event with custom fields and branding options.'
            }
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="custom">Custom Fields</TabsTrigger>
            <TabsTrigger value="branding">Branding</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <EventForm
              event={event}
              submitting={submitting}
              onSubmit={handleSubmit}
            />
          </TabsContent>

          <TabsContent value="custom" className="space-y-4">
            <CustomFieldsEditor
              customFields={customFields}
              onAddField={addCustomField}
              onUpdateField={updateCustomField}
              onRemoveField={removeCustomField}
            />
          </TabsContent>

          <TabsContent value="branding" className="space-y-4">
            <BrandingEditor
              logoPreview={logoPreview}
              onLogoChange={handleLogoChange}
              onRemoveLogo={removeLogo}
              primaryColor={primaryColor}
              onPrimaryColorChange={setPrimaryColor}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
} 