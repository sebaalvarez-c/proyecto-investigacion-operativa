import { describe, expect, it, vi } from 'vitest';
import { InMemoryStore } from '../../database/in-memory-store.js';
import { AmbulanceRepository, EmergencyRepository, HospitalRepository, TransportSolutionRepository } from '../../database/in-memory.repositories.js';
import { DeterministicRouteProvider } from '../routes/route-provider.js';
import type { RoutesService } from '../routes/routes.service.js';
import { EmergenciesService } from './emergencies.service.js';

function setup() {
  const store = new InMemoryStore();
  const emergencies = new EmergencyRepository(store);
  const roads = { streetRoute: vi.fn(async (origin, destination) => ({ origin, destination, primary: { distanceMeters: 2000, estimatedMinutes: 4, polyline: 'abc' }, alternatives: [] })) } as unknown as RoutesService;
  const service = new EmergenciesService(emergencies, new AmbulanceRepository(store), new HospitalRepository(store), new TransportSolutionRepository(store), store, new DeterministicRouteProvider(), roads);
  const emergency = service.create({ description: 'Accidente simulado', latitude: -17.78, longitude: -63.17 });
  return { store, service, emergency };
}

describe('simulated ambulance choice', () => {
  it('shows available units and calculates demo prices without reserving them', async () => {
    const { store, service, emergency } = setup();
    const options = await service.options(emergency.id);
    expect(options).toHaveLength(5);
    expect(options.find((option) => option.code === 'AMB-SC-03')?.priceBs).toBe(77);
    expect(store.ambulances.every((ambulance) => ambulance.status === 'AVAILABLE')).toBe(true);
  });

  it('reserves the selected ambulance, returns two legs and releases it on completion', async () => {
    const { store, service, emergency } = setup();
    const selectedId = store.ambulances[2].id;
    const dispatch = await service.dispatch(emergency.id, selectedId);
    expect(dispatch.ambulance.id).toBe(selectedId);
    expect(dispatch.pickup.primary.polyline).toBeTruthy();
    expect(dispatch.transfer.primary.polyline).toBeTruthy();
    expect(store.ambulances[2].status).toBe('DISPATCHED');
    expect(await service.dispatch(emergency.id, selectedId)).toEqual(dispatch);
    service.complete(emergency.id);
    expect(store.ambulances[2].status).toBe('AVAILABLE');
  });
});
