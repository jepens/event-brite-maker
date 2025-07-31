import { toast } from '@/hooks/use-toast';

export interface AppError {
  code: string;
  message: string;
  details?: unknown;
  timestamp: Date;
  userFriendly?: boolean;
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorLog: AppError[] = [];
  private readonly MAX_LOG_SIZE = 100;

  private constructor() {}

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  // Handle different types of errors
  handleError(error: unknown, context?: string): AppError {
    const appError = this.normalizeError(error, context);
    
    // Log error
    this.logError(appError);
    
    // Show user-friendly message
    this.showUserMessage(appError);
    
    // Console log for debugging
    console.error(`[${context || 'App'}] Error:`, appError);
    
    return appError;
  }

  // Normalize different error types
  private normalizeError(error: unknown, context?: string): AppError {
    if (error instanceof Error) {
      return {
        code: this.getErrorCode(error),
        message: error.message,
        details: {
          name: error.name,
          stack: error.stack,
          context
        },
        timestamp: new Date(),
        userFriendly: this.isUserFriendly(error)
      };
    }

    if (typeof error === 'string') {
      return {
        code: 'UNKNOWN_ERROR',
        message: error,
        details: { context },
        timestamp: new Date(),
        userFriendly: false
      };
    }

    return {
      code: 'UNKNOWN_ERROR',
      message: 'An unexpected error occurred',
      details: { error, context },
      timestamp: new Date(),
      userFriendly: false
    };
  }

  // Get error code based on error type
  private getErrorCode(error: Error): string {
    // Supabase errors
    if (error.message.includes('JWT')) return 'AUTH_ERROR';
    if (error.message.includes('network')) return 'NETWORK_ERROR';
    if (error.message.includes('timeout')) return 'TIMEOUT_ERROR';
    if (error.message.includes('permission')) return 'PERMISSION_ERROR';
    if (error.message.includes('not found')) return 'NOT_FOUND_ERROR';
    if (error.message.includes('duplicate')) return 'DUPLICATE_ERROR';
    if (error.message.includes('validation')) return 'VALIDATION_ERROR';
    
    // Custom error codes
    if (error.name === 'NetworkError') return 'NETWORK_ERROR';
    if (error.name === 'TimeoutError') return 'TIMEOUT_ERROR';
    if (error.name === 'ValidationError') return 'VALIDATION_ERROR';
    
    return 'UNKNOWN_ERROR';
  }

  // Check if error should show user-friendly message
  private isUserFriendly(error: Error): boolean {
    const userFriendlyErrors = [
      'AUTH_ERROR',
      'NETWORK_ERROR',
      'TIMEOUT_ERROR',
      'PERMISSION_ERROR',
      'NOT_FOUND_ERROR',
      'DUPLICATE_ERROR',
      'VALIDATION_ERROR'
    ];
    
    return userFriendlyErrors.includes(this.getErrorCode(error));
  }

  // Show user-friendly error message
  private showUserMessage(error: AppError): void {
    if (!error.userFriendly) return;

    const messages: Record<string, string> = {
      'AUTH_ERROR': 'Please log in again to continue',
      'NETWORK_ERROR': 'Please check your internet connection and try again',
      'TIMEOUT_ERROR': 'Request timed out. Please try again',
      'PERMISSION_ERROR': 'You don\'t have permission to perform this action',
      'NOT_FOUND_ERROR': 'The requested resource was not found',
      'DUPLICATE_ERROR': 'This item already exists',
      'VALIDATION_ERROR': 'Please check your input and try again'
    };

    const message = messages[error.code] || error.message;

    toast({
      title: 'Error',
      description: message,
      variant: 'destructive',
    });
  }

  // Log error for debugging
  private logError(error: AppError): void {
    this.errorLog.push(error);
    
    // Keep log size manageable
    if (this.errorLog.length > this.MAX_LOG_SIZE) {
      this.errorLog = this.errorLog.slice(-this.MAX_LOG_SIZE);
    }
  }

  // Get error log for debugging
  getErrorLog(): AppError[] {
    return [...this.errorLog];
  }

  // Clear error log
  clearErrorLog(): void {
    this.errorLog = [];
  }

  // Retry mechanism for failed operations
  async retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (attempt === maxRetries) {
          throw error;
        }

        // Exponential backoff
        const waitTime = delay * Math.pow(2, attempt - 1);
        await this.delay(waitTime);
      }
    }

    throw lastError;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Global error handler instance
export const errorHandler = ErrorHandler.getInstance(); 