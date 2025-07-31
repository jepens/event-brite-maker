import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Scan } from 'lucide-react';

interface ManualEntryProps {
  manualCode: string;
  setManualCode: (code: string) => void;
  onVerify: () => void;
}

export function ManualEntry({ manualCode, setManualCode, onVerify }: ManualEntryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scan className="h-5 w-5" />
          Manual Entry
        </CardTitle>
        <CardDescription>
          Enter QR code or short code manually
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="manual-code">QR Code / Short Code</Label>
          <Input
            id="manual-code"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder="Enter QR code or short code"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                onVerify();
              }
            }}
          />
        </div>
        <Button onClick={onVerify} className="w-full">
          <Scan className="h-4 w-4 mr-2" />
          Verify Ticket
        </Button>
      </CardContent>
    </Card>
  );
} 