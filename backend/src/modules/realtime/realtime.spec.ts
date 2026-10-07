import { describe, expect, it } from 'vitest';
import { AmbulanceSimulationService, InMemoryRealtimePublisher } from './realtime.service.js';

describe('ambulance realtime simulation', () => {
  it('publishes ordered positions and stops at ARRIVED', async () => {
    const publisher = new InMemoryRealtimePublisher();
    const events: string[] = [];
    publisher.subscribe('AMB-SC-01', (event) => events.push(event.status));
    const simulation = new AmbulanceSimulationService(publisher);

    await simulation.simulate('AMB-SC-01', [
      { latitude: -17.78, longitude: -63.17 },
      { latitude: -17.77, longitude: -63.16 },
    ], 0);

    expect(events).toEqual(['ON_ROUTE', 'ARRIVED']);
  });
});
