import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface RegistrationCounts {
  [eventId: string]: number;
}

export function useRegistrationCounts(eventIds: string[]) {
  const [counts, setCounts] = useState<RegistrationCounts>({});
  const [loading, setLoading] = useState(false);

  const fetchCounts = useCallback(async () => {
    if (eventIds.length === 0) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('registrations')
        .select('event_id')
        .in('event_id', eventIds);

      if (error) {
        console.error('Error fetching registration counts:', error);
        return;
      }

      // Count registrations per event
      const countMap: RegistrationCounts = {};
      eventIds.forEach(id => {
        countMap[id] = 0;
      });

      data?.forEach(registration => {
        if (countMap[registration.event_id] !== undefined) {
          countMap[registration.event_id]++;
        }
      });

      setCounts(countMap);
    } catch (error) {
      console.error('Error fetching registration counts:', error);
    } finally {
      setLoading(false);
    }
  }, [eventIds]);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  const getCount = useCallback((eventId: string) => {
    return counts[eventId] || 0;
  }, [counts]);

  const isFull = useCallback((eventId: string, maxParticipants: number) => {
    const count = getCount(eventId);
    return count >= maxParticipants;
  }, [getCount]);

  return {
    counts,
    loading,
    getCount,
    isFull,
    refresh: fetchCounts
  };
} 