import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Event } from './types';
import { useOptimizedEvents } from '@/hooks/useOptimizedQueries';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { useCache } from '@/lib/cache-manager';
import { CACHE_KEYS, CACHE_VERSIONS } from '@/lib/cache-manager';
import { useRegistrationCounts } from '@/hooks/useRegistrationCounts';

export function useEventList() {
  const { handleError, retryOperation } = useErrorHandler();
  const { getCache, setCache } = useCache();
  
  // Use optimized query hook
  const {
    data: events,
    loading,
    error,
    refreshData,
    pagination
  } = useOptimizedEvents();

  // Extract event IDs for registration counts
  const eventIds = useMemo(() => {
    return events?.map(event => event.id) || [];
  }, [events]);

  // Get registration counts for all events
  const { getCount, isFull, loading: countsLoading } = useRegistrationCounts(eventIds);

  // Check cache first
  useEffect(() => {
    const cachedEvents = getCache<Event[]>(CACHE_KEYS.EVENTS, {
      version: CACHE_VERSIONS.EVENTS,
      ttl: 30 * 60 * 1000 // 30 minutes for events (increased from 10)
    });

    if (cachedEvents && cachedEvents.length > 0) {
      // Cache hit - data will be loaded from cache
      console.log('Events loaded from cache');
    }
  }, [getCache]);

  // Cache successful data
  useEffect(() => {
    if (events && events.length > 0 && !loading && !error) {
      setCache(CACHE_KEYS.EVENTS, events, {
        version: CACHE_VERSIONS.EVENTS,
        ttl: 30 * 60 * 1000 // 30 minutes (increased from 10)
      });
    }
  }, [events, loading, error, setCache]);

  // Handle errors
  useEffect(() => {
    if (error) {
      handleError(error, 'EventList');
    }
  }, [error, handleError]);

  const refreshEvents = async () => {
    try {
      await retryOperation(async () => {
        await refreshData();
      }, 3, 1000);
    } catch (error) {
      handleError(error, 'EventList refresh');
    }
  };

  return { 
    events, 
    loading: loading || countsLoading,
    error,
    refreshEvents,
    pagination,
    getRegistrationCount: getCount,
    isRegistrationFull: isFull
  };
} 