import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Upload, FileText, AlertCircle, CheckCircle, XCircle, Download, MessageSquare } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import * as XLSX from 'xlsx';

interface CreateCampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface ParsedRecipient {
  phone_number: string;
  name?: string;
  row: number;
}

interface ValidationError {
  row: number;
  phone_number: string;
  error: string;
}

export function CreateCampaignDialog({ open, onOpenChange, onSuccess }: CreateCampaignDialogProps) {
  const TEMPLATE_NAME = 'event_details_reminder_duage';
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<'details' | 'upload' | 'preview' | 'creating'>('details');
  const [campaignName, setCampaignName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [recipients, setRecipients] = useState<ParsedRecipient[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [creating, setCreating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [templateParams, setTemplateParams] = useState({
    participant_name: '',
    location: '',
    address: '',
    date: '',
    time: ''
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetDialog = () => {
    setCurrentStep('details');
    setCampaignName('');
    setFile(null);
    setRecipients([]);
    setValidationErrors([]);
    setCreating(false);
    setProgress(0);
    setTemplateParams({
      participant_name: '',
      location: '',
      address: '',
      date: '',
      time: ''
    });
  };

  const handleClose = () => {
    if (!creating) {
      resetDialog();
      onOpenChange(false);
    }
  };

  const validatePhoneNumber = (phone: string): boolean => {
    if (!phone || typeof phone !== 'string' || phone.trim() === '') {
      return false;
    }
    
    const digitsOnly = phone.replace(/\D/g, '');
    
    // Check if it's already in correct format: 628xxxxxxxxxx
    if (digitsOnly.startsWith('62') && (digitsOnly.length === 13 || digitsOnly.length === 11)) {
      return true;
    }
    
    // Check if it can be converted to correct format
    if (digitsOnly.startsWith('08') && (digitsOnly.length >= 10 && digitsOnly.length <= 13)) {
      return true;
    }
    
    // Check if it's a local number without prefix
    if (digitsOnly.startsWith('8') && (digitsOnly.length >= 9 && digitsOnly.length <= 12)) {
      return true;
    }
    
    return false;
  };

  const formatPhoneNumber = (phone: string): string => {
    const digitsOnly = phone.replace(/\D/g, '');
    
    // If already in correct format
    if (digitsOnly.startsWith('62')) {
      return digitsOnly;
    }
    
    // Convert 08xxxxxxxxxx to 628xxxxxxxxxx
    if (digitsOnly.startsWith('08')) {
      return '62' + digitsOnly.substring(1);
    }
    
    // Convert 8xxxxxxxxxx to 628xxxxxxxxxx
    if (digitsOnly.startsWith('8')) {
      return '62' + digitsOnly;
    }
    
    return digitsOnly;
  };

  const downloadTemplate = () => {
    const templateData = [
      { phone_number: '08123456789', name: 'John Doe' },
      { phone_number: '08987654321', name: 'Jane Smith' },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Recipients');
    
    // Set column widths
    ws['!cols'] = [
      { width: 15 }, // phone_number
      { width: 20 }, // name
    ];

    XLSX.writeFile(wb, 'whatsapp_blast_template.xlsx');
    
    toast({
      title: 'Template Downloaded',
      description: 'Template Excel telah didownload',
    });
  };

  const handleFileSelect = async (selectedFile: File) => {
    try {
      setFile(selectedFile);
      
      // Validate file type
      const fileType = selectedFile.name.toLowerCase();
      if (!fileType.endsWith('.csv') && !fileType.endsWith('.xlsx') && !fileType.endsWith('.xls')) {
        throw new Error('File harus berformat CSV atau Excel');
      }

      // Validate file size (max 10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        throw new Error('Ukuran file maksimal 10MB');
      }

      // Parse file
      const arrayBuffer = await selectedFile.arrayBuffer();
      let workbook: XLSX.WorkBook;
      
      if (fileType.endsWith('.csv')) {
        const text = new TextDecoder().decode(arrayBuffer);
        workbook = XLSX.read(text, { type: 'string' });
      } else {
        workbook = XLSX.read(arrayBuffer, { type: 'array' });
      }

      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      if (jsonData.length < 2) {
        throw new Error('File harus memiliki minimal 1 baris data (selain header)');
      }

      // Parse recipients
      const parsedRecipients: ParsedRecipient[] = [];
      const errors: ValidationError[] = [];
      
      // Find phone_number column
      const headers = jsonData[0] as string[];
      const phoneColumnIndex = headers.findIndex(h => 
        h && h.toLowerCase().includes('phone') || h.toLowerCase().includes('nomor')
      );
      const nameColumnIndex = headers.findIndex(h => 
        h && (h.toLowerCase().includes('name') || h.toLowerCase().includes('nama'))
      );

      if (phoneColumnIndex === -1) {
        throw new Error('Kolom phone_number tidak ditemukan. Pastikan ada kolom dengan nama yang mengandung "phone" atau "nomor"');
      }

      // Process data rows
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i] as unknown[];
        const phoneNumber = row[phoneColumnIndex]?.toString().trim();
        const name = nameColumnIndex !== -1 ? row[nameColumnIndex]?.toString().trim() : undefined;

        if (!phoneNumber) {
          errors.push({
            row: i + 1,
            phone_number: '',
            error: 'Nomor telepon kosong'
          });
          continue;
        }

        if (!validatePhoneNumber(phoneNumber)) {
          errors.push({
            row: i + 1,
            phone_number: phoneNumber,
            error: 'Format nomor telepon tidak valid'
          });
          continue;
        }

        const formattedPhone = formatPhoneNumber(phoneNumber);
        
        // Check for duplicates
        const isDuplicate = parsedRecipients.some(r => r.phone_number === formattedPhone);
        if (isDuplicate) {
          errors.push({
            row: i + 1,
            phone_number: phoneNumber,
            error: 'Nomor telepon duplikat'
          });
          continue;
        }

        parsedRecipients.push({
          phone_number: formattedPhone,
          name: name || undefined,
          row: i + 1
        });
      }

      setRecipients(parsedRecipients);
      setValidationErrors(errors);
      setCurrentStep('preview');

      toast({
        title: 'File Parsed',
        description: `${parsedRecipients.length} recipients valid, ${errors.length} errors`,
      });

    } catch (error) {
      console.error('File parsing error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Gagal memproses file',
        variant: 'destructive',
      });
    }
  };

  const handleCreateCampaign = async () => {
    if (!campaignName.trim()) {
      toast({
        title: 'Error',
        description: 'Nama campaign harus diisi',
        variant: 'destructive',
      });
      return;
    }

    if (recipients.length === 0) {
      toast({
        title: 'Error',
        description: 'Tidak ada recipients yang valid',
        variant: 'destructive',
      });
      return;
    }

    try {
      setCreating(true);
      setCurrentStep('creating');
      setProgress(10);

      // Create campaign
      const campaignData = {
        name: campaignName.trim(),
        template_name: TEMPLATE_NAME,
        status: 'draft',
        total_recipients: recipients.length,
        created_by: user?.id,
        template_params: templateParams,
      };
      
      console.log('Creating campaign with data:', campaignData);
      
      const { data: campaign, error: campaignError } = await supabase
        .from('whatsapp_blast_campaigns')
        .insert(campaignData)
        .select()
        .single();

      if (campaignError) {
        throw campaignError;
      }

      setProgress(30);

      // Insert recipients
      const recipientData = recipients.map(recipient => ({
        campaign_id: campaign.id,
        phone_number: recipient.phone_number,
        name: recipient.name || null,
        status: 'pending' as const,
      }));

      const { error: recipientsError } = await supabase
        .from('whatsapp_blast_recipients')
        .insert(recipientData);

      if (recipientsError) {
        throw recipientsError;
      }

      setProgress(100);

      toast({
        title: 'Success',
        description: `Campaign "${campaignName}" berhasil dibuat dengan ${recipients.length} recipients. Gunakan tombol "Start Campaign" untuk memulai pengiriman.`,
      });

      setTimeout(() => {
        onSuccess();
        handleClose();
      }, 1000);

    } catch (error) {
      console.error('Campaign creation error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Gagal membuat campaign',
        variant: 'destructive',
      });
      setCreating(false);
      setCurrentStep('preview');
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'details':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="campaignName">Nama Campaign</Label>
              <Input
                id="campaignName"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder="e.g., Blast Pengambilan Tiket Jan 2025"
                className="mt-1"
              />
            </div>
            
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <MessageSquare className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900">Template Information</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    Campaign ini akan menggunakan template "{TEMPLATE_NAME}" yang sudah di-approve.
                    Pesan yang sama akan dikirim ke semua recipients.
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Parameter Template Default</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Atur parameter default yang akan digunakan jika tidak ada data spesifik untuk penerima.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="participantName">Nama Peserta Default</Label>
                  <Input
                    id="participantName"
                    value={templateParams.participant_name}
                    onChange={(e) => setTemplateParams(prev => ({ ...prev, participant_name: e.target.value }))}
                    placeholder="e.g., Peserta Event"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="location">Lokasi</Label>
                  <Input
                    id="location"
                    value={templateParams.location}
                    onChange={(e) => setTemplateParams(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="e.g., Gedung Serbaguna"
                    className="mt-1"
                  />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="address">Alamat</Label>
                  <Input
                    id="address"
                    value={templateParams.address}
                    onChange={(e) => setTemplateParams(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="e.g., Jl. Contoh No. 123, Jakarta"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="date">Tanggal</Label>
                  <Input
                    id="date"
                    value={templateParams.date}
                    onChange={(e) => setTemplateParams(prev => ({ ...prev, date: e.target.value }))}
                    placeholder="e.g., 15 Januari 2025"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="time">Waktu</Label>
                  <Input
                    id="time"
                    value={templateParams.time}
                    onChange={(e) => setTemplateParams(prev => ({ ...prev, time: e.target.value }))}
                    placeholder="e.g., 19:00 WIB"
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button 
                onClick={() => setCurrentStep('upload')}
                disabled={!campaignName.trim()}
              >
                Next: Upload Recipients
              </Button>
            </div>
          </div>
        );

      case 'upload':
        return (
          <div className="space-y-4">
            <div>
              <Label>Upload File Recipients</Label>
              <div className="mt-2 space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 mb-2">
                    Drag & drop file Excel/CSV atau klik untuk browse
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Pilih File
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleFileSelect(file);
                      }
                    }}
                    className="hidden"
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">Butuh template?</span>
                  <Button variant="outline" size="sm" onClick={downloadTemplate}>
                    <Download className="h-4 w-4 mr-2" />
                    Download Template
                  </Button>
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    File harus memiliki kolom "phone_number" (wajib) dan "name" (opsional).
                    Format nomor: 08xxxxxxxxxx atau 628xxxxxxxxxx
                  </AlertDescription>
                </Alert>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep('details')}>
                Back
              </Button>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
            </div>
          </div>
        );

      case 'preview':
        return (
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Preview Data</h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{recipients.length}</div>
                  <div className="text-sm text-green-700">Valid Recipients</div>
                </div>
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{validationErrors.length}</div>
                  <div className="text-sm text-red-700">Errors</div>
                </div>
              </div>
            </div>

            {/* Preview Template Pesan WhatsApp */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="h-5 w-5 text-blue-600" />
                <h4 className="font-medium text-blue-800">Preview Pesan WhatsApp</h4>
              </div>
              <div className="bg-white p-3 rounded border border-blue-200">
                <div className="text-sm text-gray-600 mb-2">Template: {TEMPLATE_NAME}</div>
                <div className="bg-green-100 p-3 rounded-lg border-l-4 border-green-500">
                  <div className="text-sm font-medium text-green-800 mb-2">📅 Reminder Event Details</div>
                  <div className="text-sm text-green-700">
                    Halo! Ini adalah pengingat untuk event yang akan datang. 
                    Pastikan Anda sudah mempersiapkan diri dan hadir tepat waktu. 
                    Terima kasih atas partisipasi Anda!
                  </div>
                  <div className="text-xs text-green-600 mt-2 italic">
                    *Pesan ini dikirim menggunakan WhatsApp Business API
                  </div>
                </div>
              </div>
            </div>

            {validationErrors.length > 0 && (
              <div>
                <h4 className="font-medium text-red-600 mb-2">Validation Errors</h4>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {validationErrors.slice(0, 10).map((error, index) => (
                    <div key={index} className="text-sm p-2 bg-red-50 border border-red-200 rounded">
                      Row {error.row}: {error.phone_number} - {error.error}
                    </div>
                  ))}
                  {validationErrors.length > 10 && (
                    <div className="text-sm text-gray-500">
                      ... and {validationErrors.length - 10} more errors
                    </div>
                  )}
                </div>
              </div>
            )}

            {recipients.length > 0 && (
              <div>
                <h4 className="font-medium text-green-600 mb-2">Valid Recipients (Preview)</h4>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {recipients.slice(0, 5).map((recipient, index) => (
                    <div key={index} className="text-sm p-2 bg-green-50 border border-green-200 rounded">
                      {recipient.phone_number} {recipient.name && `- ${recipient.name}`}
                    </div>
                  ))}
                  {recipients.length > 5 && (
                    <div className="text-sm text-gray-500">
                      ... and {recipients.length - 5} more recipients
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep('upload')}>
                Back
              </Button>
              <Button 
                onClick={handleCreateCampaign}
                disabled={recipients.length === 0}
              >
                Create Campaign
              </Button>
            </div>
          </div>
        );

      case 'creating':
        return (
          <div className="space-y-4 text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
              <MessageSquare className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h3 className="font-medium mb-2">Creating Campaign...</h3>
              <Progress value={progress} className="w-full" />
              <p className="text-sm text-gray-600 mt-2">
                {progress < 30 ? 'Creating campaign...' :
                 progress < 60 ? 'Adding recipients...' :
                 progress < 100 ? 'Starting message sending...' :
                 'Campaign created successfully!'}
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Buat Campaign WhatsApp Blast</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Step Indicator */}
          <div className="flex items-center justify-center space-x-4">
            {['details', 'upload', 'preview', 'creating'].map((step, index) => (
              <div key={step} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep === step ? 'bg-primary text-primary-foreground' :
                  ['details', 'upload', 'preview', 'creating'].indexOf(currentStep) > index ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  {index + 1}
                </div>
                {index < 3 && (
                  <div className={`w-8 h-0.5 ${
                    ['details', 'upload', 'preview', 'creating'].indexOf(currentStep) > index ? 'bg-green-500' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>

          {/* Step Content */}
          <div className="space-y-6">
            {renderStepContent()}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}