# Template Builder Email Field Removal - Complete

## Masalah
User melaporkan bahwa field "Email" masih muncul di field mapping saat membuat template baru, padahal sudah diminta untuk dihilangkan karena bisa ditambahkan melalui custom field.

## Penyebab
Di `src/components/admin/registrations/ImportTemplateBuilder.tsx`, field mapping default dan validation rules default masih menyertakan `participant_email`:

1. **State initialization** (baris 58-59): Field mapping default masih menyertakan `participant_email: ''`
2. **resetForm function** (baris 200-201): Reset form juga masih menyertakan `participant_email`

## Solusi
Menghapus `participant_email` dari field mapping default dan validation rules default di kedua lokasi:

### 1. State Initialization
```typescript
// SEBELUM
const [form, setForm] = useState<ImportTemplateForm>({
  name: '',
  description: '',
  event_id: eventId,
  field_mapping: {
    participant_name: '',
    participant_email: '', // ❌ DIHAPUS
  },
  validation_rules: {
    participant_email: VALIDATION_PRESETS.email, // ❌ DIHAPUS
    participant_name: VALIDATION_PRESETS.name,
  },
  default_status: 'pending',
  is_public: false,
});

// SESUDAH
const [form, setForm] = useState<ImportTemplateForm>({
  name: '',
  description: '',
  event_id: eventId,
  field_mapping: {
    participant_name: '',
  },
  validation_rules: {
    participant_name: VALIDATION_PRESETS.name,
  },
  default_status: 'pending',
  is_public: false,
});
```

### 2. Reset Form Function
```typescript
// SEBELUM
const resetForm = () => {
  setForm({
    name: '',
    description: '',
    event_id: eventId,
    field_mapping: {
      participant_name: '',
      participant_email: '', // ❌ DIHAPUS
    },
    validation_rules: {
      participant_email: VALIDATION_PRESETS.email, // ❌ DIHAPUS
      participant_name: VALIDATION_PRESETS.name,
    },
    default_status: 'pending',
    is_public: false,
  });
  setErrors([]);
};

// SESUDAH
const resetForm = () => {
  setForm({
    name: '',
    description: '',
    event_id: eventId,
    field_mapping: {
      participant_name: '',
    },
    validation_rules: {
      participant_name: VALIDATION_PRESETS.name,
    },
    default_status: 'pending',
    is_public: false,
  });
  setErrors([]);
};
```

## Hasil
- ✅ Field "Email" tidak lagi muncul secara default saat membuat template baru
- ✅ Hanya field "Nama Peserta" yang wajib
- ✅ Field "Email" masih bisa ditambahkan sebagai custom field jika diperlukan
- ✅ Build berhasil tanpa error
- ✅ Linter clean (0 errors, 8 warnings yang sudah ada sebelumnya)

## File yang Diubah
- `src/components/admin/registrations/ImportTemplateBuilder.tsx`

## Status
**COMPLETE** - Field "Email" berhasil dihapus dari template builder default dan user sekarang hanya melihat field "Nama Peserta" sebagai field wajib saat membuat template baru. 