import { useEffect, useState } from 'react';
import { ensureDemoSession } from '../../lib/supabase';
import { createTrackingState, subscribeToAmbulance, type PositionUpdate } from '../../services/realtime';

export function useAmbulanceTracking(ambulanceId?: string) {
  const [position, setPosition] = useState<PositionUpdate | null>(null);
  const hasSupabaseConfig = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
  const [connection, setConnection] = useState<'connecting' | 'connected' | 'reconnecting' | 'arrived'>(hasSupabaseConfig ? 'connecting' : 'connected');

  useEffect(() => {
    if (!ambulanceId) return undefined;
    const state = createTrackingState();
    if (!hasSupabaseConfig) return undefined;
    let active = true;
    let cleanup: (() => void) | undefined;
    void ensureDemoSession().then(() => {
      if (!active) return;
      cleanup = subscribeToAmbulance(ambulanceId, (update) => {
        state.accept(update);
        setPosition(state.position);
        setConnection(state.connection);
      });
    }).catch(() => {
      if (active) setConnection('reconnecting');
    });
    return () => { active = false; state.disconnect(); setConnection(state.connection); cleanup?.(); };
  }, [ambulanceId, hasSupabaseConfig]);

  return { position, connection };
}
