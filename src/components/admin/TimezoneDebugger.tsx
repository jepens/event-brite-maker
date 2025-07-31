import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Globe, AlertTriangle } from 'lucide-react';
import { getTimezoneInfo, formatDateForDisplay, formatTimeForDisplay, formatDateForInput } from '@/lib/date-utils';

interface TimezoneDebuggerProps {
  eventDate?: string;
}

export function TimezoneDebugger({ eventDate }: TimezoneDebuggerProps) {
  const [timezoneInfo, setTimezoneInfo] = useState(getTimezoneInfo());
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
      setTimezoneInfo(getTimezoneInfo());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const testDate = eventDate || '2025-08-08T16:00:00.000Z';

  return (
    <Card className="border-yellow-200 bg-yellow-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-yellow-800">
          <Globe className="h-5 w-5" />
          Timezone Debugger
        </CardTitle>
        <CardDescription className="text-yellow-700">
          Debug timezone issues and date formatting
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current System Info */}
        <div className="space-y-2">
          <h4 className="font-medium text-yellow-800">System Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
            <div className="p-2 bg-white rounded border">
              <span className="font-medium">Timezone:</span> {timezoneInfo.timezone}
            </div>
            <div className="p-2 bg-white rounded border">
              <span className="font-medium">Offset:</span> {timezoneInfo.offset}
            </div>
            <div className="p-2 bg-white rounded border">
              <span className="font-medium">Current Time:</span> {currentTime.toLocaleTimeString()}
            </div>
          </div>
        </div>

        {/* Test Date Formatting */}
        {eventDate && (
          <div className="space-y-2">
            <h4 className="font-medium text-yellow-800">Event Date Formatting Test</h4>
            <div className="space-y-2 text-sm">
              <div className="p-2 bg-white rounded border">
                <span className="font-medium">Original:</span> {eventDate}
              </div>
              <div className="p-2 bg-white rounded border">
                <span className="font-medium">Display Format:</span> {formatDateForDisplay(eventDate)}
              </div>
              <div className="p-2 bg-white rounded border">
                <span className="font-medium">Time Format:</span> {formatTimeForDisplay(eventDate)}
              </div>
              <div className="p-2 bg-white rounded border">
                <span className="font-medium">Input Format:</span> {formatDateForInput(eventDate)}
              </div>
            </div>
          </div>
        )}

        {/* Sample Date Tests */}
        <div className="space-y-2">
          <h4 className="font-medium text-yellow-800">Sample Date Tests</h4>
          <div className="space-y-2 text-sm">
            <div className="p-2 bg-white rounded border">
              <span className="font-medium">Sample Date:</span> {testDate}
            </div>
            <div className="p-2 bg-white rounded border">
              <span className="font-medium">Display:</span> {formatDateForDisplay(testDate)}
            </div>
            <div className="p-2 bg-white rounded border">
              <span className="font-medium">Time:</span> {formatTimeForDisplay(testDate)}
            </div>
            <div className="p-2 bg-white rounded border">
              <span className="font-medium">Input:</span> {formatDateForInput(testDate)}
            </div>
          </div>
        </div>

        {/* Warnings */}
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
            <div className="text-sm text-red-800">
              <p className="font-medium">Timezone Issues Detected:</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Browser timezone: {timezoneInfo.timezone}</li>
                <li>Expected timezone: Asia/Jakarta (WIB)</li>
                <li>Current offset: {timezoneInfo.offset}</li>
                <li>Expected offset: +07:00</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Recommendations */}
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-2">
            <Clock className="h-4 w-4 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium">Recommendations:</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Set browser timezone to Asia/Jakarta</li>
                <li>Use consistent date formatting across all components</li>
                <li>Store dates in ISO format with timezone info</li>
                <li>Always convert to WIB timezone for display</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 