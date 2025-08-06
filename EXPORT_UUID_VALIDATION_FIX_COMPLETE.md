# Export UUID Validation Fix Complete ✅

## Problem
Error occurred when trying to export data with "all" events selected:
```
GET https://mjolfjoqfnszvvlbzhjn.supabase.co/rest/v1/export_templates?select=*&order=updated_at.desc&or=%28event_id.eq.all%2Cevent_id.is.null%29 400 (Bad Request)
Error fetching export templates: {code: '22P02', details: null, hint: null, message: 'invalid input syntax for type uuid: "all"'}
```

## Root Cause
The `ExportService.getTemplates()` method was receiving `eventId` with value "all" from the ExportDialog component, and trying to use it in a database query that expects a valid UUID format.

## Solution
Added validation in `ExportService` to handle "all" and invalid eventId values:

### 1. **Fixed `getTemplates()` method** (`src/lib/export-service.ts`)
```typescript
static async getTemplates(eventId?: string): Promise<ExportTemplate[]> {
  try {
    let query = supabase
      .from('export_templates')
      .select('*')
      .order('updated_at', { ascending: false });

    // Only add event filter if eventId is provided and not 'all'
    if (eventId && eventId !== 'all' && eventId.trim() !== '') {
      query = query.or(`event_id.eq.${eventId},event_id.is.null`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching export templates:', error);
    return [];
  }
}
```

### 2. **Fixed `getEventCustomFields()` method** (`src/lib/export-service.ts`)
```typescript
static async getEventCustomFields(eventId: string): Promise<CustomField[]> {
  try {
    // Return empty array if eventId is 'all' or invalid
    if (!eventId || eventId === 'all' || eventId.trim() === '') {
      return [];
    }

    const { data: event, error } = await supabase
      .from('events')
      .select('custom_fields')
      .eq('id', eventId)
      .single();

    if (error || !event) {
      throw new Error('Event not found');
    }

    return event.custom_fields as CustomField[] || [];
  } catch (error) {
    console.error('Error getting event custom fields:', error);
    return [];
  }
}
```

## Changes Made

### **Files Modified:**
1. **`src/lib/export-service.ts`**
   - Added validation in `getTemplates()` to skip event filtering when `eventId` is "all"
   - Added validation in `getEventCustomFields()` to return empty array when `eventId` is "all"

### **Validation Logic:**
- **Before**: `if (eventId)` - would process any non-empty string including "all"
- **After**: `if (eventId && eventId !== 'all' && eventId.trim() !== '')` - skips "all" and empty values

## Expected Behavior

### **When "All Events" is selected:**
- ✅ Export templates will load without error
- ✅ All templates (both event-specific and global) will be shown
- ✅ Custom fields will be empty (since no specific event is selected)
- ✅ Export will work for all registrations across all events

### **When specific event is selected:**
- ✅ Export templates will filter by event ID
- ✅ Custom fields will load for the specific event
- ✅ Export will work for registrations in that specific event

## Testing
The fix ensures that:
1. **Export dialog opens without errors** when "All Events" is selected
2. **Templates load correctly** for both "all" and specific events
3. **Custom fields load appropriately** based on event selection
4. **Export functionality works** for both scenarios

## Related Issues
This fix addresses the same pattern of UUID validation errors that occurred in:
- Import feature (previously fixed)
- Batch operations (previously fixed)
- Export feature (now fixed)

All these issues stemmed from passing "all" or empty strings to database queries expecting UUID format.
