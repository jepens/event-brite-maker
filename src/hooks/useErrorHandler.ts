import { useCallback } from 'react';
import { errorHandler } from '@/lib/error-handler';

// Hook for error handling in components
export function useErrorHandler() {
  const handleError = useCallback((error: unknown, context?: string) => {
    return errorHandler.handleError(error, context);
  }, []);

  const retryOperation = useCallback(<T,>(
    operation: () => Promise<T>,
    maxRetries?: number,
    delay?: number
  ) => {
    return errorHandler.retryOperation(operation, maxRetries, delay);
  }, []);

  return { handleError, retryOperation };
} 