import { useState, useCallback, useRef } from 'react';
import { toast } from '@/hooks/use-toast';
import { cacheManager } from '@/lib/cache-manager';

export interface RateLimitConfig {
  limit: number; // Maximum attempts
  window: number; // Time window in milliseconds
  action: string; // Action identifier
  userSpecific?: boolean; // Whether to track per user or globally
  showToast?: boolean; // Whether to show toast notifications
}

export interface RateLimitState {
  attempts: number;
  remaining: number;
  resetTime: number;
  isBlocked: boolean;
  timeUntilReset: number;
}

export function useRateLimit(config: RateLimitConfig) {
  const { limit, window: timeWindow, action, userSpecific = true, showToast = true } = config;
  const [state, setState] = useState<RateLimitState>({
    attempts: 0,
    remaining: limit,
    resetTime: 0,
    isBlocked: false,
    timeUntilReset: 0
  });

  const lastAttemptRef = useRef<number>(0);

  // Get rate limit key
  const getRateLimitKey = useCallback((userId?: string) => {
    const baseKey = `rate_limit_${action}`;
    return userSpecific && userId ? `${baseKey}_${userId}` : baseKey;
  }, [action, userSpecific]);

  // Load rate limit state from cache
  const loadRateLimitState = useCallback(async (userId?: string) => {
    try {
      const key = getRateLimitKey(userId);
      const cached = cacheManager.get<RateLimitState>(key);
      
      if (cached) {
        const now = Date.now();
        const timeUntilReset = Math.max(0, cached.resetTime - now);
        
        // Check if window has expired
        if (timeUntilReset === 0) {
          // Reset rate limit
          setState({
            attempts: 0,
            remaining: limit,
            resetTime: 0,
            isBlocked: false,
            timeUntilReset: 0
          });
          cacheManager.delete(key);
          return;
        }

        // Check if still blocked
        const isBlocked = cached.attempts >= limit;
        
        setState({
          ...cached,
          timeUntilReset,
          isBlocked
        });

        return cached;
      }
    } catch (error) {
      console.warn('Failed to load rate limit state:', error);
    }

    return null;
  }, [getRateLimitKey, limit]);

  // Save rate limit state to cache
  const saveRateLimitState = useCallback(async (state: RateLimitState, userId?: string) => {
    try {
      const key = getRateLimitKey(userId);
      const ttl = Math.max(state.timeUntilReset, 60000); // At least 1 minute TTL
      
      cacheManager.set(key, state, {
        ttl,
        version: 'v1.0'
      });
    } catch (error) {
      console.warn('Failed to save rate limit state:', error);
    }
  }, [getRateLimitKey]);

  // Check if action is allowed
  const isAllowed = useCallback(async (userId?: string): Promise<boolean> => {
    const now = Date.now();
    
    // Load current state
    const currentState = await loadRateLimitState(userId);
    
    if (currentState) {
      const { attempts, resetTime, isBlocked } = currentState;
      
      // Check if window has expired
      if (now >= resetTime) {
        // Reset rate limit
        const newState: RateLimitState = {
          attempts: 0,
          remaining: limit,
          resetTime: 0,
          isBlocked: false,
          timeUntilReset: 0
        };
        
        setState(newState);
        await saveRateLimitState(newState, userId);
        return true;
      }
      
      // Check if blocked
      if (isBlocked) {
        const timeUntilReset = resetTime - now;
        setState(prev => ({ ...prev, timeUntilReset }));
        
        if (showToast) {
          const minutes = Math.ceil(timeUntilReset / 60000);
          toast({
            title: 'Rate Limit Exceeded',
            description: `Please wait ${minutes} minute${minutes > 1 ? 's' : ''} before trying again.`,
            variant: 'destructive',
          });
        }
        
        return false;
      }
      
      return true;
    }
    
    return true;
  }, [loadRateLimitState, saveRateLimitState, limit, showToast]);

  // Record an attempt
  const recordAttempt = useCallback(async (userId?: string): Promise<boolean> => {
    const now = Date.now();
    const currentState = await loadRateLimitState(userId);
    
    let newAttempts: number;
    let newResetTime: number;
    
    if (currentState && now < currentState.resetTime) {
      // Within current window
      newAttempts = currentState.attempts + 1;
      newResetTime = currentState.resetTime;
    } else {
      // New window
      newAttempts = 1;
      newResetTime = now + timeWindow;
    }
    
    const newRemaining = Math.max(0, limit - newAttempts);
    const newTimeUntilReset = Math.max(0, newResetTime - now);
    const newIsBlocked = newAttempts >= limit;
    
    const newState: RateLimitState = {
      attempts: newAttempts,
      remaining: newRemaining,
      resetTime: newResetTime,
      isBlocked: newIsBlocked,
      timeUntilReset: newTimeUntilReset
    };
    
    setState(newState);
    await saveRateLimitState(newState, userId);
    
    // Show warning when approaching limit
    if (newRemaining <= 2 && newRemaining > 0 && showToast) {
      toast({
        title: 'Rate Limit Warning',
        description: `${newRemaining} attempt${newRemaining > 1 ? 's' : ''} remaining.`,
        variant: 'default',
      });
    }
    
    return !newIsBlocked;
  }, [loadRateLimitState, saveRateLimitState, limit, timeWindow, showToast]);

  // Reset rate limit
  const reset = useCallback(async (userId?: string) => {
    const newState: RateLimitState = {
      attempts: 0,
      remaining: limit,
      resetTime: 0,
      isBlocked: false,
      timeUntilReset: 0
    };
    
    setState(newState);
    await saveRateLimitState(newState, userId);
  }, [limit, saveRateLimitState]);

  // Get formatted time until reset
  const getFormattedTimeUntilReset = useCallback(() => {
    const { timeUntilReset } = state;
    if (timeUntilReset <= 0) return '';
    
    const minutes = Math.ceil(timeUntilReset / 60000);
    const seconds = Math.ceil((timeUntilReset % 60000) / 1000);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  }, [state]);

  return {
    // State
    ...state,
    
    // Actions
    isAllowed,
    recordAttempt,
    reset,
    
    // Utilities
    getFormattedTimeUntilReset,
    loadRateLimitState
  };
}

// Predefined rate limit configurations
export const RATE_LIMIT_CONFIGS = {
  REGISTRATION: {
    limit: 10,
    window: 5 * 60 * 1000, // 5 minutes
    action: 'registration',
    userSpecific: false, // Global limit per IP
    showToast: true
  },
  
  LOGIN: {
    limit: 5,
    window: 15 * 60 * 1000, // 15 minutes
    action: 'login',
    userSpecific: false,
    showToast: true
  },
  
  EMAIL_SEND: {
    limit: 20,
    window: 60 * 60 * 1000, // 1 hour
    action: 'email_send',
    userSpecific: true,
    showToast: false
  },
  
  WHATSAPP_SEND: {
    limit: 50,
    window: 60 * 60 * 1000, // 1 hour
    action: 'whatsapp_send',
    userSpecific: false,
    showToast: false
  },
  
  QR_SCAN: {
    limit: 200,
    window: 5 * 60 * 1000, // 5 minutes
    action: 'qr_scan',
    userSpecific: false,
    showToast: false
  },
  
  DOWNLOAD: {
    limit: 20,
    window: 10 * 60 * 1000, // 10 minutes
    action: 'download',
    userSpecific: true,
    showToast: true
  }
} as const;

// Specialized hooks for common use cases
export function useRegistrationRateLimit() {
  return useRateLimit(RATE_LIMIT_CONFIGS.REGISTRATION);
}

export function useLoginRateLimit() {
  return useRateLimit(RATE_LIMIT_CONFIGS.LOGIN);
}

export function useEmailRateLimit() {
  return useRateLimit(RATE_LIMIT_CONFIGS.EMAIL_SEND);
}

export function useWhatsAppRateLimit() {
  return useRateLimit(RATE_LIMIT_CONFIGS.WHATSAPP_SEND);
}

export function useQRScanRateLimit() {
  return useRateLimit(RATE_LIMIT_CONFIGS.QR_SCAN);
}

export function useDownloadRateLimit() {
  return useRateLimit(RATE_LIMIT_CONFIGS.DOWNLOAD);
} 