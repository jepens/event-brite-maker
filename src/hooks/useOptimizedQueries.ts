import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PaginationOptions {
  page: number;
  pageSize: number;
  total?: number;
}

interface UseOptimizedQueriesOptions {
  table: string;
  select?: string;
  filters?: Record<string, unknown>;
  orderBy?: { column: string; ascending?: boolean };
  enablePagination?: boolean;
  pageSize?: number;
  cacheKey?: string;
}

export function useOptimizedQueries<T = unknown>(options: UseOptimizedQueriesOptions) {
  const {
    table,
    select = '*',
    filters = {},
    orderBy,
    enablePagination = true,
    pageSize = 20,
    cacheKey
  } = options;

  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationOptions>({
    page: 1,
    pageSize,
    total: 0
  });

  // Simple in-memory cache for free tier
  const cache = useMemo(() => new Map<string, { data: T[]; timestamp: number; ttl: number }>(), []);
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  const getCacheKey = useCallback(() => {
    return cacheKey || `${table}_${JSON.stringify(filters)}_${pagination.page}_${pagination.pageSize}`;
  }, [cacheKey, table, filters, pagination.page, pagination.pageSize]);

  const getCachedData = useCallback((key: string) => {
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data;
    }
    cache.delete(key);
    return null;
  }, [cache]);

  const setCachedData = useCallback((key: string, data: T[]) => {
    cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: CACHE_TTL
    });
  }, [cache, CACHE_TTL]);

  const buildQuery = useCallback(() => {
    let query = supabase.from(table).select(select);

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (typeof value === 'object' && value !== null && 'operator' in value && 'value' in value) {
          const filterValue = value as { operator: string; value: unknown };
          query = query.filter(key, filterValue.operator, filterValue.value);
        } else {
          query = query.eq(key, value);
        }
      }
    });

    // Apply ordering
    if (orderBy) {
      query = query.order(orderBy.column, {
        ascending: orderBy.ascending ?? true
      });
    }

    // Apply pagination
    if (enablePagination) {
      const from = (pagination.page - 1) * pagination.pageSize;
      const to = from + pagination.pageSize - 1;
      query = query.range(from, to);
    }

    return query;
  }, [table, select, filters, orderBy, enablePagination, pagination]);

  const fetchData = useCallback(async (useCache = true) => {
    try {
      setLoading(true);
      setError(null);

      const key = getCacheKey();
      
      // Check cache first
      if (useCache) {
        const cachedData = getCachedData(key);
        if (cachedData) {
          setData(cachedData);
          setLoading(false);
          return;
        }
      }

      const query = buildQuery();
      const { data: result, error: queryError, count } = await query;

      if (queryError) {
        throw new Error(queryError.message);
      }

      // Update pagination with total count
      if (count !== null) {
        setPagination(prev => ({ ...prev, total: count }));
      }

      setData((result as T[]) || []);
      
      // Cache the result
      if (result) {
        setCachedData(key, result as T[]);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      console.error(`Error fetching ${table}:`, err);
    } finally {
      setLoading(false);
    }
  }, [getCacheKey, getCachedData, buildQuery, setCachedData, table]);

  const refreshData = useCallback(() => {
    fetchData(false); // Skip cache
  }, [fetchData]);

  const goToPage = useCallback((page: number) => {
    setPagination(prev => ({ ...prev, page }));
  }, []);

  const changePageSize = useCallback((newPageSize: number) => {
    setPagination(prev => ({ ...prev, pageSize: newPageSize, page: 1 }));
  }, []);

  // Auto-fetch when dependencies change
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Clear cache when component unmounts
  useEffect(() => {
    return () => {
      if (cacheKey) {
        cache.delete(cacheKey);
      }
    };
  }, [cacheKey, cache]);

  return {
    data,
    loading,
    error,
    pagination,
    refreshData,
    goToPage,
    changePageSize,
    hasNextPage: pagination.total ? pagination.page * pagination.pageSize < pagination.total : false,
    hasPrevPage: pagination.page > 1
  };
}

// Specialized hooks for common use cases
export function useOptimizedEvents(filters?: Record<string, unknown>) {
  return useOptimizedQueries({
    table: 'events',
    select: `
      id,
      name,
      description,
      event_date,
      location,
      max_participants,
      custom_fields
    `,
    filters,
    orderBy: { column: 'event_date', ascending: false },
    enablePagination: true,
    pageSize: 12,
    cacheKey: 'events'
  });
}

export function useOptimizedRegistrations(eventId?: string, status?: string) {
  const filters: Record<string, unknown> = {};
  if (eventId && eventId !== 'all') filters.event_id = eventId;
  if (status && status !== 'all') filters.status = status;

  return useOptimizedQueries({
    table: 'registrations',
    select: `
      id,
      participant_name,
      participant_email,
      phone_number,
      status,
      registered_at,
      events (
        id,
        name,
        event_date,
        location,
        whatsapp_enabled
      )
    `,
    filters,
    orderBy: { column: 'registered_at', ascending: false },
    enablePagination: true,
    pageSize: 25,
    cacheKey: `registrations_${eventId}_${status}`
  });
} 