import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  Search, 
  Filter, 
  Download, 
  Eye,
  Calendar,
  User,
  FileText,
  CheckCircle,
  AlertCircle,
  Clock,
  RefreshCw,
  BarChart3,
  XCircle,
  Info
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { ImportTemplateService } from '@/lib/import-template-service';
import type { ImportHistory, ImportHistoryDetail } from './import-types';

interface ImportHistoryProps {
  eventId: string;
}

export function ImportHistory({ eventId }: ImportHistoryProps) {
  const [history, setHistory] = useState<ImportHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('started_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedHistory, setSelectedHistory] = useState<ImportHistory | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [historyDetails, setHistoryDetails] = useState<ImportHistoryDetail[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const pageSize = 10;

  // Load import history
  const loadHistory = useCallback(async () => {
    try {
      setLoading(true);
      const result = await ImportTemplateService.getImportHistory(
        eventId, 
        currentPage, 
        pageSize,
        searchTerm,
        filterStatus,
        sortBy,
        sortOrder
      );
      setHistory(result.data);
      setTotalPages(Math.ceil(result.total / pageSize));
      setTotalRecords(result.total);
    } catch (error) {
      console.error('Error loading import history:', error);
      toast({
        title: 'Error',
        description: 'Gagal memuat riwayat import',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [eventId, currentPage, pageSize, searchTerm, filterStatus, sortBy, sortOrder]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Load history details
  const loadHistoryDetails = useCallback(async (historyId: string) => {
    try {
      setLoadingDetails(true);
      const details = await ImportTemplateService.getImportHistoryDetails(historyId);
      setHistoryDetails(details);
    } catch (error) {
      console.error('Error loading history details:', error);
      toast({
        title: 'Error',
        description: 'Gagal memuat detail import',
        variant: 'destructive'
      });
    } finally {
      setLoadingDetails(false);
    }
  }, []);

  // Handle history selection
  const handleHistorySelect = async (historyItem: ImportHistory) => {
    setSelectedHistory(historyItem);
    setShowDetails(true);
    await loadHistoryDetails(historyItem.id);
  };

  // Export history details
  const handleExportDetails = async (historyItem: ImportHistory) => {
    try {
      const details = await ImportTemplateService.getImportHistoryDetails(historyItem.id);
      const csvContent = generateCSVFromDetails(details);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `import_details_${historyItem.filename.replace(/[^a-z0-9]/gi, '_')}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({
        title: 'Success',
        description: 'Detail import berhasil diekspor'
      });
    } catch (error) {
      console.error('Error exporting details:', error);
      toast({
        title: 'Error',
        description: 'Gagal mengekspor detail import',
        variant: 'destructive'
      });
    }
  };

  // Generate CSV from details
  const generateCSVFromDetails = (details: ImportHistoryDetail[]): string => {
    if (details.length === 0) return '';
    
    const headers = ['Row', 'Status', 'Field', 'Value', 'Error Message'];
    const rows = details.map(detail => [
      detail.row_number,
      detail.status,
      detail.field_name || '',
      detail.field_value || '',
      detail.error_message || ''
    ]);
    
    return [headers, ...rows].map(row => 
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'in_progress': return <RefreshCw className="h-4 w-4 text-yellow-600 animate-spin" />;
      case 'cancelled': return <XCircle className="h-4 w-4 text-gray-600" />;
      default: return <Info className="h-4 w-4 text-gray-600" />;
    }
  };

  // Calculate success rate
  const getSuccessRate = (historyItem: ImportHistory) => {
    if (historyItem.total_records === 0) return 0;
    return Math.round((historyItem.successful_imports / historyItem.total_records) * 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Memuat riwayat import...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Riwayat Import</h2>
          <p className="text-muted-foreground">
            Riwayat lengkap semua import yang telah dilakukan
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadHistory}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Cari berdasarkan nama file..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Urutkan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="started_at">Tanggal Import</SelectItem>
            <SelectItem value="filename">Nama File</SelectItem>
            <SelectItem value="total_records">Jumlah Records</SelectItem>
            <SelectItem value="successful_imports">Berhasil</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
        >
          {sortOrder === 'asc' ? '↑' : '↓'}
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Import</p>
                <p className="text-2xl font-bold">{totalRecords}</p>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-green-600">
                  {history.filter(h => h.import_status === 'completed').length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Failed</p>
                <p className="text-2xl font-bold text-red-600">
                  {history.filter(h => h.import_status === 'failed').length}
                </p>
              </div>
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {history.filter(h => h.import_status === 'in_progress').length}
                </p>
              </div>
              <RefreshCw className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* History Table */}
      {history.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Tidak ada riwayat import</h3>
          <p className="text-muted-foreground">
            {searchTerm || filterStatus !== 'all' 
              ? 'Tidak ada riwayat yang sesuai dengan filter'
              : 'Riwayat import akan muncul di sini setelah Anda melakukan import'
            }
          </p>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Riwayat Import</CardTitle>
            <CardDescription>
              Daftar semua import yang telah dilakukan untuk event ini
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Records</TableHead>
                  <TableHead>Success Rate</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{item.filename}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.created_by_name || 'Unknown'}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(item.import_status)}
                        <Badge className={getStatusColor(item.import_status)}>
                          {item.import_status}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>Total: {item.total_records}</p>
                        <p className="text-green-600">✓ {item.successful_imports}</p>
                        <p className="text-red-600">✗ {item.failed_imports}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-600 h-2 rounded-full" 
                            style={{ width: `${getSuccessRate(item)}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium">{getSuccessRate(item)}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>{new Date(item.started_at).toLocaleDateString()}</p>
                        <p className="text-muted-foreground">
                          {new Date(item.started_at).toLocaleTimeString()}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {item.completed_at ? (
                        <div className="text-sm">
                          {Math.round((new Date(item.completed_at).getTime() - new Date(item.started_at).getTime()) / 1000)}s
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">-</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleHistorySelect(item)}
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleExportDetails(item)}
                        >
                          <Download className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious 
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
              />
            </PaginationItem>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const page = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
              return (
                <PaginationItem key={page}>
                  <PaginationLink
                    onClick={() => setCurrentPage(page)}
                    isActive={currentPage === page}
                    className="cursor-pointer"
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              );
            })}
            <PaginationItem>
              <PaginationNext 
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      {/* Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detail Import</DialogTitle>
            <DialogDescription>
              Informasi detail tentang import ini
            </DialogDescription>
          </DialogHeader>
          {selectedHistory && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{selectedHistory.successful_imports}</p>
                  <p className="text-sm text-muted-foreground">Berhasil</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-red-600">{selectedHistory.failed_imports}</p>
                  <p className="text-sm text-muted-foreground">Gagal</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold">{selectedHistory.total_records}</p>
                  <p className="text-sm text-muted-foreground">Total</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold">{getSuccessRate(selectedHistory)}%</p>
                  <p className="text-sm text-muted-foreground">Success Rate</p>
                </div>
              </div>

              <Separator />

              {/* Details Table */}
              <div>
                <h4 className="font-medium mb-4">Detail Records</h4>
                {loadingDetails ? (
                  <div className="flex items-center justify-center p-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Memuat detail...</p>
                  </div>
                ) : historyDetails.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Tidak ada detail yang tersedia</p>
                  </div>
                ) : (
                  <div className="max-h-96 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Row</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Field</TableHead>
                          <TableHead>Value</TableHead>
                          <TableHead>Error</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {historyDetails.map((detail, index) => (
                          <TableRow key={index}>
                            <TableCell>{detail.row_number}</TableCell>
                            <TableCell>
                              <Badge className={detail.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                                {detail.status}
                              </Badge>
                            </TableCell>
                            <TableCell>{detail.field_name || '-'}</TableCell>
                            <TableCell className="max-w-32 truncate" title={detail.field_value || ''}>
                              {detail.field_value || '-'}
                            </TableCell>
                            <TableCell className="max-w-48 truncate" title={detail.error_message || ''}>
                              {detail.error_message || '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 