# 🚫 Rate Limiting Implementation

## 📋 Overview

Implementasi sistem rate limiting yang komprehensif untuk aplikasi event-brite-maker. Sistem ini melindungi aplikasi dari abuse dan spam, khususnya untuk fitur registrasi, login, dan operasi sensitif lainnya.

## 🎯 **Fitur Utama**

### **✅ Multi-Action Rate Limiting**
- **Registration**: 10 attempts per 5 minutes
- **Login**: 5 attempts per 15 minutes  
- **Email Send**: 20 attempts per hour
- **WhatsApp Send**: 50 attempts per hour
- **QR Scan**: 200 attempts per 5 minutes
- **Download**: 20 attempts per 10 minutes

### **✅ Smart Caching**
- LocalStorage-based rate limit tracking
- TTL management untuk automatic expiration
- Memory fallback jika localStorage gagal
- Version-based cache invalidation

### **✅ User-Friendly UI**
- Real-time rate limit indicators
- Progress bars dan countdown timers
- Toast notifications untuk warnings
- Reset functionality untuk admins

### **✅ Flexible Configuration**
- Configurable limits dan time windows
- User-specific vs global rate limiting
- Customizable toast notifications
- Easy to extend untuk new actions

## 🔧 **Implementasi**

### **1. Rate Limit Hook (`useRateLimit`)**

**File:** `src/hooks/useRateLimit.ts`

**Fitur:**
- ✅ Configurable rate limit settings
- ✅ LocalStorage caching dengan TTL
- ✅ User-specific atau global tracking
- ✅ Automatic window expiration
- ✅ Toast notifications
- ✅ Retry mechanism

**Usage:**
```typescript
const rateLimit = useRateLimit({
  limit: 5,
  window: 5 * 60 * 1000, // 5 minutes
  action: 'registration',
  userSpecific: false,
  showToast: true
});

// Check if allowed
const isAllowed = await rateLimit.isAllowed();

// Record attempt
const canProceed = await rateLimit.recordAttempt();

// Reset rate limit
await rateLimit.reset();
```

### **2. Predefined Configurations**

**Registration Rate Limit:**
```typescript
REGISTRATION: {
  limit: 10,
  window: 5 * 60 * 1000, // 5 minutes
  action: 'registration',
  userSpecific: false, // Global limit per IP
  showToast: true
}
```

**Login Rate Limit:**
```typescript
LOGIN: {
  limit: 5,
  window: 15 * 60 * 1000, // 15 minutes
  action: 'login',
  userSpecific: false,
  showToast: true
}
```

**WhatsApp Rate Limit:**
```typescript
WHATSAPP_SEND: {
  limit: 50,
  window: 60 * 60 * 1000, // 1 hour
  action: 'whatsapp_send',
  userSpecific: false,
  showToast: false
}
```

### **3. Rate Limit UI Components**

**File:** `src/components/RateLimitIndicator.tsx`

**Fitur:**
- ✅ Real-time countdown timer
- ✅ Progress bar untuk attempts
- ✅ Status indicators (Active/Warning/Blocked)
- ✅ Compact badge version
- ✅ Reset functionality

**Usage:**
```typescript
// Full indicator
<RateLimitIndicator 
  state={rateLimit} 
  action="registration" 
  onReset={rateLimit.reset}
  showDetails={false}
/>

// Compact badge
<RateLimitBadge state={rateLimit} action="registration" />
```

### **4. Integration dengan Registration Form**

**File:** `src/components/registration/RegistrationForm.tsx`

**Fitur:**
- ✅ Pre-submission rate limit check
- ✅ Automatic attempt recording
- ✅ Visual rate limit indicators
- ✅ Blocked state handling

**Implementation:**
```typescript
const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  
  // Check rate limit before submission
  const isAllowed = await rateLimit.isAllowed();
  if (!isAllowed) {
    return; // Rate limit exceeded, don't submit
  }
  
  const formData = new FormData(e.currentTarget);
  
  // Record the attempt
  const canProceed = await rateLimit.recordAttempt();
  if (!canProceed) {
    return; // Rate limit exceeded after recording
  }
  
  onSubmit(formData);
};
```

## 📊 **Rate Limit Configurations**

### **Registration (10 attempts per 5 minutes)**
- **Target**: Mencegah spam registrations
- **Scope**: Global (per IP address)
- **Window**: 5 minutes
- **Reset**: Automatic setelah window expires

### **Login (5 attempts per 15 minutes)**
- **Target**: Mencegah brute force attacks
- **Scope**: Global (per IP address)
- **Window**: 15 minutes
- **Reset**: Automatic setelah window expires

### **Email Send (20 attempts per hour)**
- **Target**: Mencegah email spam
- **Scope**: User-specific
- **Window**: 1 hour
- **Reset**: Automatic setelah window expires

### **WhatsApp Send (50 attempts per hour)**
- **Target**: Mencegah WhatsApp API abuse
- **Scope**: Global (per IP address)
- **Window**: 1 hour
- **Reset**: Automatic setelah window expires

### **QR Scan (200 attempts per 5 minutes)**
- **Target**: Mencegah QR scanner abuse
- **Scope**: Global (per IP address)
- **Window**: 5 minutes
- **Reset**: Automatic setelah window expires

### **Download (20 attempts per 10 minutes)**
- **Target**: Mencegah excessive downloads
- **Scope**: User-specific
- **Window**: 10 minutes
- **Reset**: Automatic setelah window expires

## 🎨 **UI/UX Features**

### **1. Rate Limit Indicator**
```typescript
// Shows current rate limit status
<RateLimitIndicator 
  state={rateLimit} 
  action="registration" 
  onReset={rateLimit.reset}
/>
```

**Features:**
- Progress bar showing attempts vs limit
- Countdown timer untuk reset time
- Status badges (Active/Warning/Blocked)
- Reset button untuk admins

### **2. Compact Badge**
```typescript
// Inline rate limit indicator
<RateLimitBadge state={rateLimit} action="registration" />
```

**Features:**
- Small badge dengan remaining attempts
- Countdown timer ketika blocked
- Color-coded status (green/yellow/red)

### **3. Toast Notifications**
- **Warning**: Ketika approaching limit
- **Blocked**: Ketika rate limit exceeded
- **Reset**: Ketika rate limit di-reset

## 🔍 **Monitoring & Debugging**

### **1. Rate Limit State**
```typescript
const rateLimit = useRegistrationRateLimit();

console.log('Rate Limit State:', {
  attempts: rateLimit.attempts,
  remaining: rateLimit.remaining,
  isBlocked: rateLimit.isBlocked,
  timeUntilReset: rateLimit.timeUntilReset,
  formattedTime: rateLimit.getFormattedTimeUntilReset()
});
```

### **2. Cache Statistics**
```typescript
import { cacheManager } from '@/lib/cache-manager';

const stats = cacheManager.getStats();
console.log('Cache Stats:', {
  totalItems: stats.totalItems,
  totalSize: Math.round(stats.totalSize / 1024) + 'KB',
  expiredItems: stats.expiredItems
});
```

### **3. Test Script**
```bash
# Run rate limit tests
node test-rate-limit.cjs
```

**Test Scenarios:**
- Registration rate limiting
- Login rate limiting
- WhatsApp rate limiting
- Cache-based rate limiting
- Database integration

## 🚀 **Usage Examples**

### **1. Registration Form dengan Rate Limiting**
```typescript
function RegistrationForm() {
  const rateLimit = useRegistrationRateLimit();
  
  const handleSubmit = async (formData: FormData) => {
    // Check rate limit
    const isAllowed = await rateLimit.isAllowed();
    if (!isAllowed) return;
    
    // Record attempt
    const canProceed = await rateLimit.recordAttempt();
    if (!canProceed) return;
    
    // Submit registration
    await submitRegistration(formData);
  };
  
  return (
    <div>
      <RateLimitIndicator state={rateLimit} action="registration" />
      <form onSubmit={handleSubmit}>
        {/* Form fields */}
      </form>
    </div>
  );
}
```

### **2. Login dengan Rate Limiting**
```typescript
function LoginForm() {
  const rateLimit = useLoginRateLimit();
  
  const handleLogin = async (credentials: LoginCredentials) => {
    const isAllowed = await rateLimit.isAllowed();
    if (!isAllowed) return;
    
    const canProceed = await rateLimit.recordAttempt();
    if (!canProceed) return;
    
    await login(credentials);
  };
}
```

### **3. WhatsApp Send dengan Rate Limiting**
```typescript
function WhatsAppSender() {
  const rateLimit = useWhatsAppRateLimit();
  
  const sendWhatsApp = async (message: string) => {
    const isAllowed = await rateLimit.isAllowed();
    if (!isAllowed) {
      throw new Error('WhatsApp rate limit exceeded');
    }
    
    await rateLimit.recordAttempt();
    await sendWhatsAppMessage(message);
  };
}
```

### **4. Custom Rate Limit**
```typescript
function CustomAction() {
  const rateLimit = useRateLimit({
    limit: 10,
    window: 60 * 1000, // 1 minute
    action: 'custom_action',
    userSpecific: true,
    showToast: true
  });
  
  const performAction = async () => {
    if (await rateLimit.isAllowed()) {
      await rateLimit.recordAttempt();
      // Perform action
    }
  };
}
```

## 🔧 **Configuration**

### **Environment Variables**
```bash
# Rate limiting configuration (optional)
RATE_LIMIT_REGISTRATION_LIMIT=5
RATE_LIMIT_REGISTRATION_WINDOW=300000
RATE_LIMIT_LOGIN_LIMIT=3
RATE_LIMIT_LOGIN_WINDOW=900000
```

### **Cache Configuration**
```typescript
// Cache TTL settings
const CACHE_TTL = {
  RATE_LIMIT: 60 * 60 * 1000, // 1 hour
  REGISTRATION: 5 * 60 * 1000, // 5 minutes
  LOGIN: 15 * 60 * 1000, // 15 minutes
  WHATSAPP: 60 * 60 * 1000, // 1 hour
};
```

## 📈 **Benefits**

### **Security:**
1. **Prevent Spam** - Mencegah registrasi spam
2. **Brute Force Protection** - Mencegah login attacks
3. **API Abuse Prevention** - Mencegah WhatsApp/Email abuse
4. **Resource Protection** - Mencegah excessive downloads

### **Performance:**
1. **Reduced Server Load** - Mengurangi beban server
2. **Better User Experience** - Mencegah abuse dari user lain
3. **Cost Optimization** - Mengurangi penggunaan API quota

### **User Experience:**
1. **Clear Feedback** - User tahu kenapa action blocked
2. **Countdown Timers** - User tahu kapan bisa retry
3. **Graceful Degradation** - Aplikasi tetap berfungsi
4. **Admin Controls** - Admin bisa reset rate limits

## 🎉 **Conclusion**

Rate limiting implementation ini memberikan:

1. **Comprehensive Protection** - Melindungi semua fitur sensitif
2. **User-Friendly** - Clear feedback dan countdown timers
3. **Flexible Configuration** - Mudah customize untuk kebutuhan berbeda
4. **Free Tier Compatible** - Tidak menggunakan database quota
5. **Scalable** - Siap untuk growth dan paid tier

Sistem ini memastikan aplikasi tetap aman dan performant meskipun menggunakan Supabase free tier. 