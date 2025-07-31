import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2 } from 'lucide-react';
import { CustomField } from './types';

interface CustomFieldsEditorProps {
  customFields: CustomField[];
  onAddField: () => void;
  onUpdateField: (index: number, field: Partial<CustomField>) => void;
  onRemoveField: (index: number) => void;
}

export function CustomFieldsEditor({
  customFields,
  onAddField,
  onUpdateField,
  onRemoveField,
}: CustomFieldsEditorProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Custom Fields</CardTitle>
          <Button onClick={onAddField} size="sm" variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Add Field
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {customFields.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No custom fields added yet.</p>
            <p className="text-sm">Add custom fields to collect additional information from participants.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {customFields.map((field, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary">Field {index + 1}</Badge>
                  <Button
                    onClick={() => onRemoveField(index)}
                    size="sm"
                    variant="ghost"
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`field-name-${index}`}>Field Name</Label>
                    <Input
                      id={`field-name-${index}`}
                      value={field.name}
                      onChange={(e) => onUpdateField(index, { name: e.target.value })}
                      placeholder="e.g., company, dietary_preferences"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`field-label-${index}`}>Display Label</Label>
                    <Input
                      id={`field-label-${index}`}
                      value={field.label}
                      onChange={(e) => onUpdateField(index, { label: e.target.value })}
                      placeholder="e.g., Company Name, Dietary Preferences"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`field-type-${index}`}>Field Type</Label>
                    <Select
                      value={field.type}
                      onValueChange={(value) => onUpdateField(index, { type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Text Input</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="tel">Phone Number</SelectItem>
                        <SelectItem value="member_number">Member Number (with validation)</SelectItem>
                        <SelectItem value="textarea">Text Area</SelectItem>
                        <SelectItem value="number">Number</SelectItem>
                        <SelectItem value="url">Website URL</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`field-placeholder-${index}`}>Placeholder Text</Label>
                    <Input
                      id={`field-placeholder-${index}`}
                      value={field.placeholder || ''}
                      onChange={(e) => onUpdateField(index, { placeholder: e.target.value })}
                      placeholder="Optional placeholder text"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id={`field-required-${index}`}
                    checked={field.required}
                    onCheckedChange={(checked) => onUpdateField(index, { required: checked })}
                  />
                  <Label htmlFor={`field-required-${index}`}>Required field</Label>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 