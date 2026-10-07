import { getSupabaseClient } from '../lib/supabase';

export interface PositionUpdate { ambulanceId: string; latitude: number; longitude: number; status: string; occurredAt: string; }
export interface RealtimeChannel { on: (type: string, filter: { event: string }, callback: (message: { payload: PositionUpdate }) => void) => RealtimeChannel; subscribe: () => RealtimeChannel; unsubscribe: () => void; }
export interface RealtimeClient { channel: (topic: string) => RealtimeChannel; }

export function subscribeToAmbulance(ambulanceId: string, onUpdate: (update: PositionUpdate) => void, client = getSupabaseClient() as unknown as RealtimeClient): () => void {
  const channel = client.channel(`ambulance:${ambulanceId}`);
  channel.on('broadcast', { event: 'position.updated' }, ({ payload }) => onUpdate(payload)).subscribe();
  return () => channel.unsubscribe();
}

export function createTrackingState() {
  let lastTimestamp = 0;
  const state: { position: PositionUpdate | null; connection: 'connecting' | 'connected' | 'reconnecting' | 'arrived'; accept: (update: PositionUpdate) => void; disconnect: () => void } = {
    position: null,
    connection: 'connecting',
    accept(update) {
      const timestamp = Date.parse(update.occurredAt);
      if (timestamp < lastTimestamp) return;
      lastTimestamp = timestamp;
      state.position = update;
      state.connection = update.status === 'ARRIVED' ? 'arrived' : 'connected';
    },
    disconnect() { state.connection = 'reconnecting'; },
  };
  return state;
}
