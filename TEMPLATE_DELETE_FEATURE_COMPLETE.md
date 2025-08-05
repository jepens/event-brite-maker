# Template Delete Feature - Complete

## Fitur yang Ditambahkan
Fitur untuk menghapus template import di halaman template selection.

## Implementasi

### 1. ImportTemplateBuilder.tsx
**Fitur yang ditambahkan:**
- State untuk dialog konfirmasi delete
- Handler untuk delete template
- Dialog konfirmasi delete dengan detail konsekuensi

**Perubahan:**
- Menambahkan import `useToast` dan `Trash2` icon
- Menambahkan prop `onTemplateDeleted` ke interface
- Menambahkan state untuk delete dialog:
  ```typescript
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<ImportTemplate | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();
  ```
- Menambahkan handler untuk delete template:
  ```typescript
  const handleDeleteTemplate = (template: ImportTemplate) => {
    setTemplateToDelete(template);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteTemplate = async () => {
    if (!templateToDelete) return;
    
    setDeleting(true);
    try {
      await ImportTemplateService.deleteTemplate(templateToDelete.id);
      setExistingTemplates(prev => prev.filter(t => t.id !== templateToDelete.id));
      
      toast({
        title: 'Berhasil',
        description: 'Template berhasil dihapus'
      });
      
      if (onTemplateDeleted) {
        onTemplateDeleted(templateToDelete.id);
      }
      
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
    } catch (error) {
      console.error('Error deleting template:', error);
      toast({
        title: 'Error',
        description: 'Gagal menghapus template',
        variant: 'destructive'
      });
    } finally {
      setDeleting(false);
    }
  };
  ```
- Menambahkan dialog konfirmasi delete dengan detail konsekuensi
- Membungkus return statement dengan React Fragment (`<>`) untuk mendukung multiple dialogs

### 2. TemplateSelectionStep.tsx
**Fitur yang ditambahkan:**
- Tombol delete di setiap template card
- Handler untuk delete template
- Dialog konfirmasi delete

**Perubahan:**
- Menambahkan import `Trash2` icon dan `useToast`
- Menambahkan state untuk delete dialog:
  ```typescript
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<ImportTemplate | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();
  ```
- Menambahkan handler untuk delete template:
  ```typescript
  const handleDeleteTemplate = (template: ImportTemplate) => {
    setTemplateToDelete(template);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteTemplate = async () => {
    if (!templateToDelete) return;
    
    setDeleting(true);
    try {
      await ImportTemplateService.deleteTemplate(templateToDelete.id);
      setTemplates(prev => prev.filter(t => t.id !== templateToDelete.id));
      
      // If the deleted template was selected, clear the selection
      if (selectedTemplate?.id === templateToDelete.id) {
        onTemplateSelect(null as unknown as ImportTemplate);
      }
      
      toast({
        title: 'Berhasil',
        description: 'Template berhasil dihapus'
      });
      
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
    } catch (error) {
      console.error('Error deleting template:', error);
      toast({
        title: 'Error',
        description: 'Gagal menghapus template',
        variant: 'destructive'
      });
    } finally {
      setDeleting(false);
    }
  };
  ```
- Menambahkan tombol delete di setiap template card:
  ```typescript
  <Button
    variant="ghost"
    size="sm"
    onClick={(e) => {
      e.stopPropagation();
      handleDeleteTemplate(template);
    }}
    className="text-red-600 hover:text-red-700 hover:bg-red-50"
  >
    <Trash2 className="h-3 w-3" />
  </Button>
  ```
- Menambahkan dialog konfirmasi delete dengan detail konsekuensi

## Fitur Utama

### 1. Tombol Delete
- **Lokasi:** Di setiap template card, di sebelah tombol "Pilih"
- **Icon:** Trash2 icon dengan warna merah
- **Behavior:** Mencegah event bubbling dengan `e.stopPropagation()`

### 2. Dialog Konfirmasi
- **Judul:** "Hapus Template"
- **Deskripsi:** Menampilkan nama template yang akan dihapus
- **Detail Konsekuensi:**
  - Menghapus template secara permanen
  - Menghapus semua konfigurasi field mapping
  - Menghapus semua aturan validasi
- **Peringatan:** "Tindakan ini tidak dapat dibatalkan"
- **Tombol:** "Batal" dan "Hapus Template"

### 3. Loading State
- **Tombol:** Disabled saat proses delete berlangsung
- **Text:** "Menghapus..." saat proses berlangsung

### 4. Error Handling
- **Toast Success:** "Template berhasil dihapus"
- **Toast Error:** "Gagal menghapus template"
- **Console Log:** Error detail untuk debugging

### 5. State Management
- **Template List:** Otomatis update setelah delete berhasil
- **Selection:** Clear selection jika template yang dipilih dihapus
- **Dialog:** Reset state setelah delete selesai

## UI/UX Features

### 1. Visual Feedback
- Tombol delete dengan warna merah untuk menandakan aksi destruktif
- Hover effect dengan background merah muda
- Loading state dengan disabled button

### 2. Safety Measures
- Dialog konfirmasi wajib sebelum delete
- Detail konsekuensi yang jelas
- Peringatan bahwa aksi tidak dapat dibatalkan

### 3. User Experience
- Event propagation dihentikan untuk mencegah template selection saat klik delete
- Toast notification untuk feedback
- Otomatis clear selection jika template yang dipilih dihapus

## Technical Implementation

### 1. Service Integration
- Menggunakan `ImportTemplateService.deleteTemplate(templateId)`
- Error handling dengan try-catch
- Async/await pattern

### 2. State Management
- Local state untuk dialog dan loading
- Optimistic update untuk template list
- Proper cleanup setelah operasi selesai

### 3. Type Safety
- Proper TypeScript types untuk semua state
- Type casting untuk null handling

## Hasil
- ✅ Fitur delete template berhasil ditambahkan
- ✅ UI/UX yang user-friendly dengan konfirmasi dialog
- ✅ Error handling yang robust
- ✅ Loading state yang smooth
- ✅ Build berhasil tanpa error
- ✅ Linter clean (0 errors, 8 warnings yang sudah ada sebelumnya)

## File yang Diubah
- `src/components/admin/registrations/ImportTemplateBuilder.tsx`
- `src/components/admin/registrations/import-steps/TemplateSelectionStep.tsx`

## Status
**COMPLETE** - Fitur delete template berhasil diimplementasikan dengan UI/UX yang baik dan error handling yang robust. 