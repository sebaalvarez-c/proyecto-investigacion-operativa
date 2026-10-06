import { useEffect, useState } from 'react';
import { createTrackingState, subscribeToAmbulance, type PositionUpdate } from '../../services/realtime';

export function useAmbulanceTracking(ambulanceId?: string) {
  const [position, setPosition] = useState<PositionUpdate | null>(null);
  const [connection, setConnection] = useState<'connecting' | 'connected' | 'reconnecting' | 'arrived'>('connecting');

  useEffect(() => {
    if (!ambulanceId) return undefined;
    const state = createTrackingState();
    const hasSupabaseConfig = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
    if (!hasSupabaseConfig) {
      setConnection('connected');
      return undefined;
    }
    const cleanup = subscribeToAmbulance(ambulanceId, (update) => {
      state.accept(update);
      setPosition(state.position);
      setConnection(state.connection);
    });
    return () => { state.disconnect(); setConnection(state.connection); cleanup(); };
  }, [ambulanceId]);

  return { position, connection };
}
