/**
 * Import Performance Optimization Service
 * Handles caching, lazy loading, and memory management for import operations
 */

import { ImportTemplate, ImportHistory } from '@/components/admin/registrations/import-types';

// Cache interfaces
interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

interface PerformanceMetrics {
  operation: string;
  duration: number;
  timestamp: number;
  success: boolean;
}

// Cache storage
class ImportCache {
  private cache = new Map<string, CacheItem<unknown>>();
  private readonly defaultTTL = 5 * 60 * 1000; // 5 minutes

  set<T>(key: string, data: T, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL
    });
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    const isExpired = Date.now() - item.timestamp > item.ttl;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return item.data as T;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Clean expired items
  cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
      }
    }
  }

  // Get cache statistics
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Performance monitoring
class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private readonly maxMetrics = 1000;

  record(operation: string, duration: number, success: boolean): void {
    this.metrics.push({
      operation,
      duration,
      timestamp: Date.now(),
      success
    });

    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  getMetrics(operation?: string): PerformanceMetrics[] {
    if (operation) {
      return this.metrics.filter(m => m.operation === operation);
    }
    return [...this.metrics];
  }

  getAverageDuration(operation: string): number {
    const operationMetrics = this.getMetrics(operation);
    if (operationMetrics.length === 0) return 0;

    const total = operationMetrics.reduce((sum, m) => sum + m.duration, 0);
    return total / operationMetrics.length;
  }

  getSuccessRate(operation: string): number {
    const operationMetrics = this.getMetrics(operation);
    if (operationMetrics.length === 0) return 0;

    const successful = operationMetrics.filter(m => m.success).length;
    return (successful / operationMetrics.length) * 100;
  }

  clear(): void {
    this.metrics = [];
  }
}

// Memory management
class MemoryManager {
  private readonly maxMemoryUsage = 50 * 1024 * 1024; // 50MB
  private readonly cleanupThreshold = 0.8; // 80% of max memory

  getMemoryUsage(): number {
    if ('memory' in performance) {
      return (performance as { memory: { usedJSHeapSize: number } }).memory.usedJSHeapSize;
    }
    return 0;
  }

  shouldCleanup(): boolean {
    const usage = this.getMemoryUsage();
    return usage > this.maxMemoryUsage * this.cleanupThreshold;
  }

  forceCleanup(): void {
    // Force garbage collection if available
    if ('gc' in window) {
      (window as { gc: () => void }).gc();
    }
  }
}

// Lazy loading utilities
class LazyLoader {
  private loadedModules = new Set<string>();

  async loadModule<T>(moduleName: string, loader: () => Promise<T>): Promise<T> {
    if (this.loadedModules.has(moduleName)) {
      return loader();
    }

    const startTime = Date.now();
    try {
      const result = await loader();
      this.loadedModules.add(moduleName);
      
      performanceMonitor.record(
        `lazy_load_${moduleName}`,
        Date.now() - startTime,
        true
      );
      
      return result;
    } catch (error) {
      performanceMonitor.record(
        `lazy_load_${moduleName}`,
        Date.now() - startTime,
        false
      );
      throw error;
    }
  }

  isLoaded(moduleName: string): boolean {
    return this.loadedModules.has(moduleName);
  }

  clear(): void {
    this.loadedModules.clear();
  }
}

// Batch processing optimization
class BatchProcessor {
  private readonly defaultBatchSize = 100;
  private readonly maxConcurrentBatches = 3;
  private activeBatches = 0;

  async processBatch<T, R>(
    items: T[],
    processor: (batch: T[]) => Promise<R[]>,
    batchSize: number = this.defaultBatchSize,
    onProgress?: (progress: number) => void
  ): Promise<R[]> {
    const batches = this.createBatches(items, batchSize);
    const results: R[] = [];
    let processed = 0;

    for (let i = 0; i < batches.length; i += this.maxConcurrentBatches) {
      const batchGroup = batches.slice(i, i + this.maxConcurrentBatches);
      
      const batchPromises = batchGroup.map(async (batch) => {
        this.activeBatches++;
        try {
          const batchResults = await processor(batch);
          return batchResults;
        } finally {
          this.activeBatches--;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      
      for (const batchResult of batchResults) {
        results.push(...batchResult);
        processed += batchResult.length;
        
        if (onProgress) {
          onProgress((processed / items.length) * 100);
        }
      }

      // Small delay to prevent overwhelming the system
      if (i + this.maxConcurrentBatches < batches.length) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }

    return results;
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  getActiveBatches(): number {
    return this.activeBatches;
  }
}

// Debounce utility
function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Throttle utility
function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// File processing optimization
class FileProcessor {
  private readonly maxFileSize = 10 * 1024 * 1024; // 10MB
  private readonly chunkSize = 64 * 1024; // 64KB chunks

  async processLargeFile(
    file: File,
    processor: (chunk: string) => Promise<void>,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    if (file.size > this.maxFileSize) {
      return this.processInChunks(file, processor, onProgress);
    }

    const content = await file.text();
    await processor(content);
  }

  private async processInChunks(
    file: File,
    processor: (chunk: string) => Promise<void>,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    const reader = new FileReader();
    let offset = 0;

    return new Promise((resolve, reject) => {
      reader.onload = async (e) => {
        try {
          const chunk = e.target?.result as string;
          await processor(chunk);
          
          offset += chunk.length;
          if (onProgress) {
            onProgress((offset / file.size) * 100);
          }

          if (offset < file.size) {
            this.readNextChunk(reader, file, offset);
          } else {
            resolve();
          }
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(reader.error);
      this.readNextChunk(reader, file, offset);
    });
  }

  private readNextChunk(reader: FileReader, file: File, offset: number): void {
    const chunk = file.slice(offset, offset + this.chunkSize);
    reader.readAsText(chunk);
  }
}

// Export instances
export const importCache = new ImportCache();
export const performanceMonitor = new PerformanceMonitor();
export const memoryManager = new MemoryManager();
export const lazyLoader = new LazyLoader();
export const batchProcessor = new BatchProcessor();
export const fileProcessor = new FileProcessor();

// Export utilities
export { debounce, throttle };

// Auto-cleanup every 5 minutes
setInterval(() => {
  importCache.cleanup();
  
  if (memoryManager.shouldCleanup()) {
    importCache.clear();
    memoryManager.forceCleanup();
  }
}, 5 * 60 * 1000);

// Performance monitoring for import operations
export const withPerformanceMonitoring = <T extends unknown[], R>(
  operation: string,
  fn: (...args: T) => Promise<R>
) => {
  return async (...args: T): Promise<R> => {
    const startTime = Date.now();
    try {
      const result = await fn(...args);
      performanceMonitor.record(operation, Date.now() - startTime, true);
      return result;
    } catch (error) {
      performanceMonitor.record(operation, Date.now() - startTime, false);
      throw error;
    }
  };
};

// Cache decorator for template operations
export const withCaching = <T extends unknown[], R>(
  cacheKey: string,
  ttl?: number,
  fn?: (...args: T) => Promise<R>
) => {
  return async (...args: T): Promise<R> => {
    const key = `${cacheKey}_${JSON.stringify(args)}`;
    const cached = importCache.get<R>(key);
    
    if (cached) {
      return cached;
    }

    if (!fn) {
      throw new Error('Function not provided for caching');
    }

    const result = await fn(...args);
    importCache.set(key, result, ttl);
    return result;
  };
}; 