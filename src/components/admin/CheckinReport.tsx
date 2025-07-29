import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  Users, 
  CheckCircle, 
  XCircle, 
  Download, 
  BarChart3, 
  Calendar,
  MapPin,
  Clock,
  UserCheck,
  UserX
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { downloadCheckinReport } from '@/lib/download-service';

interface CheckinStats {
  event_id: string;
  event_name: string;
  total_registrations: number;
  checked_in: number;
  not_checked_in: number;
  attendance_rate: number;
}

interface CheckinReportData {
  event_id: string;
  event_name: string;
  event_date?: string;
  event_location?: string;
  participant_name: string;
  participant_email: string;
  phone_number?: string;
  ticket_code?: string;
  ticket_short_code?: string;
  attendance_status: string;
  checkin_at?: string;
  checkin_location?: string;
  checkin_notes?: string;
  checked_in_by_name?: string;
}

export function CheckinReport() {
  const [stats, setStats] = useState<CheckinStats[]>([]);
  const [reportData, setReportData] = useState<CheckinReportData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [eventFilter, setEventFilter] = useState<string>('all');
  const [events, setEvents] = useState<{ id: string; name: string }[]>([]);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    fetchStats();
    fetchReportData();
    fetchEvents();
  }, [eventFilter]);

  const fetchStats = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_checkin_stats', {
          event_id_param: eventFilter === 'all' ? null : eventFilter
        });

      if (error) throw error;
      setStats(data || []);
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch check-in statistics',
        variant: 'destructive',
      });
    }
  };

  const fetchReportData = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('checkin_reports')
        .select('*')
        .order('event_name', { ascending: true })
        .order('participant_name', { ascending: true });

      if (eventFilter !== 'all') {
        query = query.eq('event_id', eventFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setReportData(data || []);
    } catch (error) {
      console.error('Error fetching report data:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch check-in report data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  const handleDownload = async (format: 'csv' | 'excel' | 'pdf' = 'csv') => {
    try {
      setDownloading(true);
      await downloadCheckinReport(eventFilter === 'all' ? undefined : eventFilter, format);
      toast({
        title: 'Success',
        description: `Check-in report downloaded successfully as ${format.toUpperCase()}`,
      });
    } catch (error) {
      console.error('Error downloading report:', error);
      toast({
        title: 'Error',
        description: 'Failed to download check-in report',
        variant: 'destructive',
      });
    } finally {
      setDownloading(false);
    }
  };

  const getAttendanceStatusIcon = (status: string) => {
    switch (status) {
      case 'checked_in':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'not_checked_in':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getAttendanceStatusBadge = (status: string) => {
    switch (status) {
      case 'checked_in':
        return <Badge variant="default" className="bg-green-100 text-green-800">Hadir</Badge>;
      case 'not_checked_in':
        return <Badge variant="destructive">Tidak Hadir</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  const filteredData = reportData.filter(item =>
    item.participant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.participant_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.ticket_short_code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalStats = stats.reduce((acc, stat) => ({
    total_registrations: acc.total_registrations + stat.total_registrations,
    checked_in: acc.checked_in + stat.checked_in,
    not_checked_in: acc.not_checked_in + stat.not_checked_in,
  }), { total_registrations: 0, checked_in: 0, not_checked_in: 0 });

  const overallAttendanceRate = totalStats.total_registrations > 0 
    ? Math.round((totalStats.checked_in / totalStats.total_registrations) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Check-in Report</h2>
          <p className="text-muted-foreground">
            Monitor attendance and generate reports for events
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => handleDownload('csv')}
            disabled={downloading}
            variant="outline"
          >
            <Download className="h-4 w-4 mr-2" />
            {downloading ? 'Downloading...' : 'Download CSV'}
          </Button>
          <Button
            onClick={() => handleDownload('excel')}
            disabled={downloading}
            variant="outline"
          >
            <Download className="h-4 w-4 mr-2" />
            {downloading ? 'Downloading...' : 'Download Excel'}
          </Button>
          <Button
            onClick={() => handleDownload('pdf')}
            disabled={downloading}
            variant="outline"
            className="bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
          >
            <Download className="h-4 w-4 mr-2" />
            {downloading ? 'Downloading...' : 'Download PDF'}
          </Button>
        </div>
        {eventFilter !== 'all' && (
          <div className="text-sm text-muted-foreground mt-2">
            📋 Filtered by: {events.find(e => e.id === eventFilter)?.name || 'Selected Event'}
          </div>
        )}
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Registrations</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStats.total_registrations}</div>
            <p className="text-xs text-muted-foreground">
              Across all events
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Checked In</CardTitle>
            <UserCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{totalStats.checked_in}</div>
            <p className="text-xs text-muted-foreground">
              Successfully attended
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Not Checked In</CardTitle>
            <UserX className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{totalStats.not_checked_in}</div>
            <p className="text-xs text-muted-foreground">
              Did not attend
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
            <BarChart3 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{overallAttendanceRate}%</div>
            <p className="text-xs text-muted-foreground">
              Overall attendance
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Event-specific Stats */}
      {stats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Event Statistics</CardTitle>
            <CardDescription>
              Detailed attendance statistics by event
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {stats.map((stat) => (
                <div key={stat.event_id} className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-2">{stat.event_name}</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Total:</span>
                      <span className="font-medium">{stat.total_registrations}</span>
                    </div>
                    <div className="flex justify-between text-green-600">
                      <span>Hadir:</span>
                      <span className="font-medium">{stat.checked_in}</span>
                    </div>
                    <div className="flex justify-between text-red-600">
                      <span>Tidak Hadir:</span>
                      <span className="font-medium">{stat.not_checked_in}</span>
                    </div>
                    <div className="flex justify-between text-blue-600">
                      <span>Rate:</span>
                      <span className="font-medium">{stat.attendance_rate}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or ticket code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Event</label>
              <Select value={eventFilter} onValueChange={setEventFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Select event" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Events</SelectItem>
                  {events.map((event) => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Table */}
      <Card>
        <CardHeader>
          <CardTitle>Check-in Details</CardTitle>
          <CardDescription>
            {filteredData.length} participants found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Loading check-in data...</p>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="text-lg font-semibold mb-2">No Data Found</h3>
              <p className="text-muted-foreground">
                {reportData.length === 0 
                  ? "No check-in data available yet."
                  : "No participants match your current filters."
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Participant</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Ticket Code</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Check-in Time</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Checked by</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((item) => (
                    <TableRow key={`${item.event_id}-${item.participant_email}`}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{item.participant_name}</div>
                          <div className="text-sm text-muted-foreground">{item.participant_email}</div>
                          {item.phone_number && (
                            <div className="text-sm text-muted-foreground">{item.phone_number}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{item.event_name}</div>
                          {item.event_date && (
                            <div className="text-sm text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(item.event_date), 'PPp')}
                            </div>
                          )}
                          {item.event_location && (
                            <div className="text-sm text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {item.event_location}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-mono text-sm">
                          {item.ticket_short_code || item.ticket_code}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getAttendanceStatusIcon(item.attendance_status)}
                          {getAttendanceStatusBadge(item.attendance_status)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {item.checkin_at ? (
                          <div className="text-sm flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(item.checkin_at), 'PPp')}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.checkin_location || '-'}
                      </TableCell>
                      <TableCell>
                        {item.checked_in_by_name || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 