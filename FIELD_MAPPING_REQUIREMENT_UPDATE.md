# Field Mapping Requirement Update

## Overview
Updated the field mapping requirements to only make "Nama Peserta" (participant_name) mandatory and removed the mandatory requirement for "Email" (participant_email), allowing email to be handled as a custom field.

## Changes Made

### 1. Import Service Validation (`src/lib/import-service.ts`)
- **Modified `validateDataEnhanced` function**:
  - Removed mandatory validation for `participant_email`
  - Email is now only validated for format if provided (not required)
  - Updated duplicate email check to only run if email is provided
  - Added comments to clarify that only `participant_name` is required

### 2. Import Template Service (`src/lib/import-template-service.ts`)
- **Modified `validateFieldMapping` function**:
  - Removed validation error for missing `participant_email` mapping
  - Added comment explaining that email can be handled as custom field

### 3. Field Mapping Step Component (`src/components/admin/registrations/import-steps/FieldMappingStep.tsx`)
- **Modified `isFieldRequired` function**:
  - Changed to only return `true` for `participant_name`
  - Removed `participant_email` from required fields
- **Updated `getFieldDescription` function**:
  - Added "(wajib)" to participant_name description
  - Added "(opsional)" to participant_email description

## Impact

### Benefits
1. **Flexibility**: Users can now import participant data without requiring email addresses
2. **Custom Field Support**: Email can be added as a custom field if needed
3. **Simplified Import**: Reduces barriers for importing participant lists that may not have email data

### Validation Behavior
- **Required**: Only "Nama Peserta" (participant_name) is mandatory
- **Optional**: Email, phone number, and custom fields are all optional
- **Format Validation**: Email format is still validated if email is provided
- **Duplicate Check**: Email duplicates are still checked if email is provided

### Backward Compatibility
- Existing templates and imports will continue to work
- Email validation still occurs when email data is present
- No breaking changes to existing functionality

## Files Modified
1. `src/lib/import-service.ts` - Core validation logic
2. `src/lib/import-template-service.ts` - Template validation
3. `src/components/admin/registrations/import-steps/FieldMappingStep.tsx` - UI validation and display

## Testing Recommendations
1. Test import with only participant names (no email)
2. Test import with participant names and email
3. Test import with participant names and custom email field
4. Verify validation messages are appropriate
5. Confirm template creation works without email mapping

## Date
Updated: January 2025 