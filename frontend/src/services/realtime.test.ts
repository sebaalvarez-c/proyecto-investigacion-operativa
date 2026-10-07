import { describe, expect, it, vi } from 'vitest';
import { createTrackingState, subscribeToAmbulance, type RealtimeClient, type PositionUpdate } from './realtime';

describe('ambulance realtime client', () => {
  it('ignores stale positions and preserves the last position while reconnecting', () => {
    const state = createTrackingState();
    const first: PositionUpdate = { ambulanceId: 'AMB-SC-01', latitude: -17.78, longitude: -63.17, status: 'ON_ROUTE', occurredAt: '2026-10-06T01:00:02.000Z' };
    const stale: PositionUpdate = { ...first, latitude: -17.79, occurredAt: '2026-10-06T01:00:01.000Z' };

    state.accept(first);
    state.accept(stale);
    state.disconnect();

    expect(state.position).toEqual(first);
    expect(state.connection).toBe('reconnecting');
  });

  it('subscribes to one ambulance channel and cleans it up', () => {
    const unsubscribe = vi.fn();
    const subscribe = vi.fn();
    const channel = { on: vi.fn().mockReturnThis(), subscribe, unsubscribe };
    const client: RealtimeClient = { channel: vi.fn().mockReturnValue(channel) };

    const cleanup = subscribeToAmbulance('AMB-SC-01', vi.fn(), client);

    expect(client.channel).toHaveBeenCalledWith('ambulance:AMB-SC-01');
    expect(channel.on).toHaveBeenCalledWith('broadcast', { event: 'position.updated' }, expect.any(Function));
    cleanup();
    expect(unsubscribe).toHaveBeenCalledOnce();
  });
});
