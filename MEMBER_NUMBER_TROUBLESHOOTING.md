# Member Number Option Troubleshooting Guide

## 🔍 Issue: "Member Number (with validation)" option not visible in dropdown

### ✅ Verification Results
All implementation files are correctly configured:
- ✅ CustomFieldsEditor.tsx: Member Number option properly added
- ✅ useEventForm.ts: member_number handling implemented
- ✅ Database migration: Complete and ready
- ✅ All validation logic: Working correctly

### 🚀 Step-by-Step Solution

#### Step 1: Restart Development Server
```bash
# Stop all Node.js processes
taskkill /f /im node.exe

# Start development server
npm run dev
```

#### Step 2: Clear Browser Cache
1. **Chrome/Edge**: Press `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
2. **Firefox**: Press `Ctrl + F5` (Windows) or `Cmd + Shift + R` (Mac)
3. **Alternative**: Open Developer Tools (F12) → Right-click refresh button → "Empty Cache and Hard Reload"

#### Step 3: Try Incognito/Private Mode
1. Open browser in incognito/private mode
2. Navigate to `http://localhost:5173/admin`
3. Login and check the dropdown

#### Step 4: Verify Development Server
1. Check if server is running on correct port (usually 5173)
2. Look for any error messages in terminal
3. Verify the URL in browser matches the server URL

### 🔧 Advanced Troubleshooting

#### Check Browser Console
1. Open Developer Tools (F12)
2. Go to Console tab
3. Look for any JavaScript errors
4. If errors found, restart server and clear cache

#### Verify File Changes
Run the verification script:
```bash
node verify-member-number-implementation.cjs
```

#### Check Network Tab
1. Open Developer Tools → Network tab
2. Refresh the page
3. Look for any failed requests (red entries)
4. Check if all JavaScript files are loading correctly

### 📋 Expected Behavior

When working correctly, you should see:
1. **Dropdown Options**: Text Input, Email, Phone Number, **Member Number (with validation)**, Text Area, Number, Website URL
2. **Member Number Selection**: When selected, validation rules are automatically configured
3. **No JavaScript Errors**: Clean console without errors

### 🎯 Quick Test

1. Navigate to Admin Dashboard
2. Click "Edit Event" on any event
3. Go to "Custom Fields" tab
4. Click "+ Add Field"
5. Click on "Field Type" dropdown
6. Look for "Member Number (with validation)" option

### 🔄 If Still Not Working

#### Option 1: Force Refresh
```bash
# Stop server
Ctrl + C

# Clear node_modules cache
npm cache clean --force

# Reinstall dependencies
npm install

# Start server
npm run dev
```

#### Option 2: Check File Permissions
Ensure all files are readable and not locked by another process.

#### Option 3: Verify Git Status
```bash
git status
git log --oneline -5
```
Make sure you're on the latest version with all changes.

### 📞 Final Verification

If the option still doesn't appear after all steps:

1. **Check the exact line in CustomFieldsEditor.tsx**:
   ```tsx
   <SelectItem value="member_number">Member Number (with validation)</SelectItem>
   ```

2. **Verify the file is saved and not corrupted**

3. **Try a different browser** (Chrome, Firefox, Edge)

4. **Check if there are any TypeScript compilation errors**

### ✅ Success Indicators

When the implementation is working:
- ✅ "Member Number (with validation)" appears in dropdown
- ✅ Selecting it automatically configures validation rules
- ✅ No JavaScript errors in console
- ✅ Form saves correctly with member number field
- ✅ Registration form shows validation for member numbers

---
**Last Updated**: July 30, 2025  
**Status**: All implementation files verified and working 