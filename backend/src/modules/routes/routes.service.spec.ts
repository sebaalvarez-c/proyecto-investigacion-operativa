import { describe, expect, it, vi } from 'vitest';
import { RoutesService } from './routes.service.js';

describe('RoutesService', () => {
  it('uses OSRM first for the public academic deployment', async () => {
    const route = { primary: { distanceMeters: 1200, estimatedMinutes: 3, polyline: 'abc' }, alternatives: [] };
    const google = { getRoutes: vi.fn().mockResolvedValue(null) };
    const osrm = { getRoutes: vi.fn().mockResolvedValue(route) };
    const service = new RoutesService({} as never, {} as never, {} as never, {} as never, {} as never, {} as never, google as never, osrm as never);
    const result = await service.streetRoute({ latitude: -17.78, longitude: -63.17 }, { latitude: -17.79, longitude: -63.16 });

    expect(result.source).toBe('OSRM');
    expect(osrm.getRoutes).toHaveBeenCalledTimes(1);
    expect(google.getRoutes).not.toHaveBeenCalled();
  });
});
