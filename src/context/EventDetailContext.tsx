import React, { createContext, useContext, useState, useCallback } from 'react';
import { Show, EventDay } from '../types';

interface EventDetailState {
  show: Show | null;
  eventDate: string | null;
  eventsForSuggestions: EventDay[];
}

interface EventDetailContextValue extends EventDetailState {
  setSelected: (show: Show, eventDate: string | null, events: EventDay[]) => void;
  clearSelected: () => void;
}

const EventDetailContext = createContext<EventDetailContextValue | null>(null);

export function EventDetailProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<EventDetailState>({
    show: null,
    eventDate: null,
    eventsForSuggestions: [],
  });

  const setSelected = useCallback((show: Show, eventDate: string | null, events: EventDay[]) => {
    setState({ show, eventDate, eventsForSuggestions: events });
  }, []);

  const clearSelected = useCallback(() => {
    setState({ show: null, eventDate: null, eventsForSuggestions: [] });
  }, []);

  return (
    <EventDetailContext.Provider value={{ ...state, setSelected, clearSelected }}>
      {children}
    </EventDetailContext.Provider>
  );
}

export function useEventDetail(): EventDetailContextValue {
  const ctx = useContext(EventDetailContext);
  if (!ctx) throw new Error('useEventDetail must be used within EventDetailProvider');
  return ctx;
}
