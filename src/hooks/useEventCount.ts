import { useMemo } from 'react';
import { useEvents } from './useEvents';

/**
 * Hook to get total event count for badge display
 * Returns count of all events across all days
 */
export function useEventCount(): number {
  const { events } = useEvents();
  
  return useMemo(() => {
    return events.reduce((sum, day) => sum + (day.shows?.length || 0), 0);
  }, [events]);
}
