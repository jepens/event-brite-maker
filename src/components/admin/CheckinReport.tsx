import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useMobile } from '@/hooks/use-mobile';
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
import { formatDateTimeForDisplay } from '@/lib/date-utils';
import { useCache } from '@/lib/cache-manager';

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
  ticket_id?: string;
  qr_code?: string;
  short_code?: string;
  attendance_status: string;
  checkin_at?: string;
  checkin_location?: string;
  checkin_notes?: string;
  checked_in_by_name?: string;
}

export function CheckinReport() {
  const { isMobile } = useMobile();
  const [stats, setStats] = useState<CheckinStats[]>([]);
  const [reportData, setReportData] = useState<CheckinReportData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [eventFilter, setEventFilter] = useState<string>('all');
  const [events, setEvents] = useState<{ id: string; name: string }[]>([]);
  const [downloading, setDownloading] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalCount, setTotalCount] = useState(0);
  
  // Cache manager
  const { getCache, setCache } = useCache();

  const fetchStats = useCallback(async () => {
    try {
      // Check cache first for statistics
      const cacheKey = `checkin_stats_${eventFilter}`;
      const cachedStats = getCache<CheckinStats[]>(cacheKey, {
        ttl: 5 * 60 * 1000 // 5 minutes cache for statistics
      });
      
      if (cachedStats) {
        console.log('Statistics loaded from cache');
        setStats(cachedStats);
        return;
      }
      
      // If not cached, fetch from database
      const { data, error } = await supabase
        .rpc('get_checkin_stats', {
          event_id_param: eventFilter === 'all' ? null : eventFilter
        });

      if (error) throw error;
      
      const statsData = data || [];
      setStats(statsData);
      
      // Cache the results
      setCache(cacheKey, statsData, {
        ttl: 5 * 60 * 1000 // 5 minutes
      });
      
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch check-in statistics',
        variant: 'destructive',
      });
    }
  }, [eventFilter, getCache, setCache]);

  const fetchReportData = useCallback(async () => {
    try {
      setLoading(true);
      
      // First, get total count for pagination
      let countQuery = supabase
        .from('checkin_reports')
        .select('*', { count: 'exact', head: true });

      if (eventFilter !== 'all') {
        countQuery = countQuery.eq('event_id', eventFilter);
      }

      const { count, error: countError } = await countQuery;
      if (countError) throw countError;
      
      setTotalCount(count || 0);

      // Then, get paginated data
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;
      
      let query = supabase
        .from('checkin_reports')
        .select(`
          event_id,
          event_name,
          event_date,
          event_location,
          participant_name,
          participant_email,
          phone_number,
          ticket_id,
          qr_code,
          short_code,
          attendance_status,
          checkin_at,
          checkin_location,
          checkin_notes,
          checked_in_by_name
        `)
        .order('event_name', { ascending: true })
        .order('participant_name', { ascending: true })
        .range(from, to);

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
  }, [eventFilter, currentPage, pageSize]);

  const fetchEvents = useCallback(async () => {
    try {
      // Check cache first for events list
      const cacheKey = 'events_list';
      const cachedEvents = getCache<{ id: string; name: string }[]>(cacheKey, {
        ttl: 30 * 60 * 1000 // 30 minutes cache for events list
      });
      
      if (cachedEvents) {
        console.log('Events list loaded from cache');
        setEvents(cachedEvents);
        return;
      }
      
      // If not cached, fetch from database
      const { data, error } = await supabase
        .from('events')
        .select('id, name')
        .order('name');

      if (error) throw error;
      
      const eventsData = data || [];
      setEvents(eventsData);
      
      // Cache the results
      setCache(cacheKey, eventsData, {
        ttl: 30 * 60 * 1000 // 30 minutes
      });
      
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  }, [getCache, setCache]);

  // Initialize data on component mount
  useEffect(() => {
    fetchStats();
    fetchReportData();
    fetchEvents();
  }, []); // Only run once on mount

  // Refetch when filters or pagination change
  useEffect(() => {
    fetchStats();
    fetchReportData();
  }, [eventFilter, currentPage, pageSize]);

  // Reset pagination when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [eventFilter]);

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

  // Remove duplicates based on event_id and participant_email combination
  const uniqueReportData = reportData.filter((item, index, self) => 
    index === self.findIndex(t => 
      t.event_id === item.event_id && t.participant_email === item.participant_email
    )
  );

  const filteredData = uniqueReportData.filter(item =>
    item.participant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.participant_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.short_code?.toLowerCase().includes(searchTerm.toLowerCase())
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
        <div className={`flex gap-2 ${isMobile ? 'flex-col' : ''}`}>
          <Button
            onClick={() => handleDownload('csv')}
            disabled={downloading}
            variant="outline"
            className={isMobile ? 'mobile-button' : ''}
          >
            <Download className="h-4 w-4 mr-2" />
            {downloading ? 'Downloading...' : 'Download CSV'}
          </Button>
          <Button
            onClick={() => handleDownload('excel')}
            disabled={downloading}
            variant="outline"
            className={isMobile ? 'mobile-button' : ''}
          >
            <Download className="h-4 w-4 mr-2" />
            {downloading ? 'Downloading...' : 'Download Excel'}
          </Button>
          <Button
            onClick={() => handleDownload('pdf')}
            disabled={downloading}
            variant="outline"
            className={`bg-red-50 border-red-200 text-red-700 hover:bg-red-100 ${isMobile ? 'mobile-button' : ''}`}
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
      <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'md:grid-cols-2 lg:grid-cols-4'}`}>
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
                  {filteredData.map((item, index) => (
                    <TableRow key={`${item.event_id}-${item.participant_email}-${index}`}>
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
                              {formatDateTimeForDisplay(item.event_date)}
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
                          {item.short_code || item.qr_code}
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
                            {formatDateTimeForDisplay(item.checkin_at)}
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
          
          {/* Pagination Controls */}
          {!loading && filteredData.length > 0 && (
            <div className="flex items-center justify-between px-6 py-4 border-t">
              <div className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} participants
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className="text-sm">
                  Page {currentPage} of {Math.ceil(totalCount / pageSize)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(Math.ceil(totalCount / pageSize), prev + 1))}
                  disabled={currentPage >= Math.ceil(totalCount / pageSize)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 