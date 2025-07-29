# 👗 Event Form Dresscode Recommendation

## 📋 Overview

Untuk mengimplementasikan dresscode secara lengkap, saya merekomendasikan menambahkan field dresscode ke form pembuatan/editing event. Ini akan memberikan kontrol penuh kepada admin untuk mengatur dresscode per event.

## 🎯 Implementation Options

### Option 1: Simple Text Input (Recommended)

**Pros:**
- Fleksibel untuk berbagai jenis dresscode
- Mudah diimplementasikan
- User-friendly

**Cons:**
- Tidak ada validasi format
- Bisa ada inkonsistensi

### Option 2: Dropdown with Custom Option

**Pros:**
- Konsisten untuk dresscode umum
- Mudah dipilih
- Validasi otomatis

**Cons:**
- Terbatas pada pilihan yang tersedia
- Perlu maintenance untuk opsi baru

### Option 3: Hybrid Approach (Best)

**Pros:**
- Kombinasi dropdown + text input
- Fleksibilitas maksimal
- User experience terbaik

**Cons:**
- Implementasi sedikit lebih kompleks

## 🔧 Recommended Implementation

### 1. Update EventFormDialog Component

**File:** `src/components/admin/EventFormDialog.tsx`

```tsx
// Add dresscode field to form
const dresscodeOptions = [
  { value: '', label: 'Auto (based on time)' },
  { value: 'Formal / Business Attire', label: 'Formal / Business Attire' },
  { value: 'Smart Casual', label: 'Smart Casual' },
  { value: 'Business Casual', label: 'Business Casual' },
  { value: 'Casual / Comfortable', label: 'Casual / Comfortable' },
  { value: 'Semi Formal', label: 'Semi Formal' },
  { value: 'Black Tie', label: 'Black Tie' },
  { value: 'Traditional / Batik', label: 'Traditional / Batik' },
  { value: 'All White', label: 'All White' },
  { value: 'All Black', label: 'All Black' },
  { value: 'Colorful / Vibrant', label: 'Colorful / Vibrant' },
  { value: 'custom', label: 'Custom...' }
];

// Add to form state
const [dresscode, setDresscode] = useState('');
const [customDresscode, setCustomDresscode] = useState('');
const [showCustomDresscode, setShowCustomDresscode] = useState(false);

// Add to form JSX
<div className="grid gap-4 py-4">
  {/* Existing fields */}
  
  {/* Dresscode Field */}
  <div className="grid grid-cols-4 items-center gap-4">
    <Label htmlFor="dresscode" className="text-right">
      Dresscode
    </Label>
    <div className="col-span-3 space-y-2">
      <Select value={dresscode} onValueChange={(value) => {
        setDresscode(value);
        setShowCustomDresscode(value === 'custom');
      }}>
        <SelectTrigger>
          <SelectValue placeholder="Select dresscode" />
        </SelectTrigger>
        <SelectContent>
          {dresscodeOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {showCustomDresscode && (
        <Input
          id="custom-dresscode"
          placeholder="Enter custom dresscode..."
          value={customDresscode}
          onChange={(e) => setCustomDresscode(e.target.value)}
        />
      )}
      
      <p className="text-sm text-muted-foreground">
        Leave empty to use automatic dresscode based on event time
      </p>
    </div>
  </div>
</div>

// Update form submission
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  const finalDresscode = dresscode === 'custom' ? customDresscode : dresscode;
  
  const eventData = {
    name,
    description,
    event_date,
    location,
    max_participants: parseInt(maxParticipants) || null,
    dresscode: finalDresscode || null, // Add dresscode
    // ... other fields
  };
  
  // Submit logic
};
```

### 2. Update Event Interface

**File:** `src/components/admin/EventFormDialog.tsx`

```tsx
interface Event {
  id?: string;
  name: string;
  description: string;
  event_date: string;
  location: string;
  max_participants?: number;
  dresscode?: string; // Add dresscode
  // ... other fields
}
```

### 3. Add Dresscode Display in Event List

**File:** `src/components/admin/EventsManagement.tsx`

```tsx
// Add dresscode column to table
<TableHeader>
  <TableRow>
    <TableHead>Name</TableHead>
    <TableHead>Date</TableHead>
    <TableHead>Location</TableHead>
    <TableHead>Dresscode</TableHead> {/* New column */}
    <TableHead>Actions</TableHead>
  </TableRow>
</TableHeader>

<TableBody>
  {events.map((event) => (
    <TableRow key={event.id}>
      <TableCell>{event.name}</TableCell>
      <TableCell>{formatDate(event.event_date)}</TableCell>
      <TableCell>{event.location}</TableCell>
      <TableCell>
        {event.dresscode ? (
          <Badge variant="secondary">{event.dresscode}</Badge>
        ) : (
          <Badge variant="outline">Auto</Badge>
        )}
      </TableCell>
      <TableCell>
        {/* Actions */}
      </TableCell>
    </TableRow>
  ))}
</TableBody>
```

## 🎨 UI/UX Recommendations

### 1. Visual Indicators

```tsx
// Dresscode badge with color coding
const getDresscodeBadge = (dresscode: string) => {
  const dresscodeColors = {
    'Formal': 'bg-red-100 text-red-800',
    'Smart Casual': 'bg-blue-100 text-blue-800',
    'Casual': 'bg-green-100 text-green-800',
    'Semi Formal': 'bg-purple-100 text-purple-800',
    'Traditional': 'bg-orange-100 text-orange-800',
    'Auto': 'bg-gray-100 text-gray-800'
  };
  
  const color = dresscodeColors[dresscode] || 'bg-gray-100 text-gray-800';
  
  return (
    <Badge className={color}>
      {dresscode || 'Auto'}
    </Badge>
  );
};
```

### 2. Help Text and Tooltips

```tsx
// Add helpful tooltips
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <InfoCircledIcon className="h-4 w-4 text-muted-foreground" />
    </TooltipTrigger>
    <TooltipContent>
      <p>Set custom dresscode or leave empty for automatic selection based on event time</p>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

### 3. Preview Functionality

```tsx
// Show dresscode preview based on time
const getDresscodePreview = (eventDate: string) => {
  const date = new Date(eventDate);
  const hour = date.getHours();
  
  if (hour >= 18 || hour < 6) {
    return "Smart Casual / Semi Formal";
  } else if (hour >= 12 && hour < 18) {
    return "Casual / Smart Casual";
  } else {
    return "Casual / Comfortable";
  }
};

// Display in form
{dresscode === '' && (
  <p className="text-sm text-muted-foreground">
    Auto dresscode: {getDresscodePreview(event_date)}
  </p>
)}
```

## 📊 Database Considerations

### 1. Migration Strategy

```sql
-- Add dresscode column if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'events' AND column_name = 'dresscode') THEN
    ALTER TABLE public.events ADD COLUMN dresscode TEXT;
  END IF;
END $$;

-- Add comment
COMMENT ON COLUMN public.events.dresscode IS 'Custom dresscode for the event. If NULL, will use automatic dresscode based on event time.';
```

### 2. Indexing

```sql
-- Add index for dresscode queries (optional)
CREATE INDEX IF NOT EXISTS idx_events_dresscode ON public.events(dresscode);
```

## 🚀 Implementation Steps

### Phase 1: Database & Backend
1. ✅ Deploy database migration
2. ✅ Update edge function
3. ✅ Update TypeScript types

### Phase 2: Frontend Form
1. Add dresscode field to EventFormDialog
2. Add dresscode display to EventsManagement
3. Add validation and error handling

### Phase 3: Testing & Polish
1. Test form submission with dresscode
2. Test automatic dresscode logic
3. Test WhatsApp template with dresscode
4. Add UI polish and tooltips

## 🎯 Benefits

### ✅ **Admin Control**
- Set custom dresscode per event
- Override automatic logic when needed
- Consistent branding

### ✅ **User Experience**
- Clear dresscode information
- Visual indicators
- Helpful tooltips

### ✅ **Flexibility**
- Manual or automatic dresscode
- Custom dresscode support
- Easy to extend

## 📝 Notes

1. **Default Behavior:** Jika dresscode kosong, sistem akan menggunakan logika otomatis
2. **Validation:** Dresscode tidak wajib diisi
3. **Character Limit:** Maksimal 100 karakter untuk dresscode
4. **Localization:** Dresscode dapat disimpan dalam bahasa apapun

---

**Status:** Ready for implementation
**Priority:** Medium
**Estimated Time:** 2-3 hours 