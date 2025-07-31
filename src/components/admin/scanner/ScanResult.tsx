import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle, RotateCcw } from 'lucide-react';
import { ScanResult as ScanResultType } from './types';

interface ScanResultProps {
  result: ScanResultType;
  onReset: () => void;
}

export function ScanResult({ result, onReset }: ScanResultProps) {
  return (
    <Card className={result.success ? 'border-green-200' : 'border-red-200'}>
      <CardHeader>
        <div className="flex items-center gap-2">
          {result.success ? (
            <CheckCircle className="h-5 w-5 text-green-600" />
          ) : (
            <XCircle className="h-5 w-5 text-red-600" />
          )}
          <CardTitle className={result.success ? 'text-green-600' : 'text-red-600'}>
            {result.success ? 'Check-in Successful' : 'Check-in Failed'}
          </CardTitle>
        </div>
        <CardDescription>{result.message}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {result.participant && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium">Name:</span>
              <span>{result.participant.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium">Email:</span>
              <span>{result.participant.email}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium">Event:</span>
              <span>{result.participant.event_name}</span>
            </div>
            <div className="flex items-center justify-center pt-2">
              <Badge variant={result.success ? 'default' : 'secondary'}>
                {result.success ? 'CHECKED IN' : 'ALREADY USED'}
              </Badge>
            </div>
          </div>
        )}
        <Button onClick={onReset} variant="outline" className="w-full">
          <RotateCcw className="h-4 w-4 mr-2" />
          Scan Another
        </Button>
      </CardContent>
    </Card>
  );
} 