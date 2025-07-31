import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, X } from 'lucide-react';

interface BrandingEditorProps {
  logoPreview: string;
  onLogoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveLogo: () => void;
  primaryColor: string;
  onPrimaryColorChange: (color: string) => void;
}

export function BrandingEditor({
  logoPreview,
  onLogoChange,
  onRemoveLogo,
  primaryColor,
  onPrimaryColorChange,
}: BrandingEditorProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Branding & Styling</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Logo Upload */}
        <div className="space-y-4">
          <Label className="text-base font-medium">Event Logo</Label>
          
          {logoPreview ? (
            <div className="space-y-4">
              <div className="relative inline-block">
                <img
                  src={logoPreview}
                  alt="Event Logo"
                  className="w-24 h-24 object-contain border rounded-lg"
                />
                <Button
                  onClick={onRemoveLogo}
                  size="sm"
                  variant="destructive"
                  className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Logo will be displayed on the event registration page
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 mb-2">Upload event logo</p>
                <p className="text-xs text-gray-500">PNG, JPG up to 2MB</p>
              </div>
              <Button
                onClick={() => document.getElementById('logo-upload')?.click()}
                variant="outline"
                className="w-full"
              >
                <Upload className="h-4 w-4 mr-2" />
                Choose Logo
              </Button>
            </div>
          )}
          
          <input
            id="logo-upload"
            type="file"
            accept="image/*"
            onChange={onLogoChange}
            className="hidden"
          />
        </div>

        {/* Primary Color */}
        <div className="space-y-4">
          <Label className="text-base font-medium">Primary Color</Label>
          <div className="flex items-center space-x-4">
            <div
              className="w-12 h-12 rounded-lg border-2 border-gray-200"
              style={{ backgroundColor: primaryColor }}
            />
            <Input
              type="color"
              value={primaryColor}
              onChange={(e) => onPrimaryColorChange(e.target.value)}
              className="w-20 h-12 p-1 border-2 border-gray-200 rounded-lg"
            />
            <Input
              value={primaryColor}
              onChange={(e) => onPrimaryColorChange(e.target.value)}
              placeholder="#3B82F6"
              className="flex-1"
            />
          </div>
          <p className="text-sm text-muted-foreground">
            This color will be used for buttons and highlights on the event page
          </p>
        </div>
      </CardContent>
    </Card>
  );
} 