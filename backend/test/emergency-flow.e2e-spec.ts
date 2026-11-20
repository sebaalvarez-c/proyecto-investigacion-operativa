import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.config.js';
import { RoutesService } from '../src/modules/routes/routes.service.js';

describe('emergency flow', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await app.close();
  });

  it('explains three dispatches and two pending people with a traceable fare', async () => {
    const catalog = await request(app.getHttpServer()).get('/hospitals').expect(200);
    expect(new Set(catalog.body.map((hospital: { id: string }) => hospital.id)).size).toBe(25);
    const hospitalIds = catalog.body.slice(0, 4).map((hospital: { id: string }) => hospital.id);
    vi.spyOn(app.get(RoutesService), 'streetRoute').mockImplementation(async (origin, destination) => ({
      origin, destination, primary: { distanceMeters: 2400, estimatedMinutes: 7.4, polyline: 'test' },
      alternatives: [], source: 'OSRM',
    }));
    const { body } = await request(app.getHttpServer()).post('/simulations/transport/solve').send({
      hospitalIds,
      patients: Array.from({ length: 5 }, (_, i) => ({ id: 'P' + (i + 1), latitude: -17.78, longitude: -63.17 })),
      units: hospitalIds.slice(0, 3).map((hospitalId: string, i: number) => ({ id: 'A' + (i + 1), hospitalId })),
      bedsUsed: [],
    }).expect(201);
    expect(body.assignments).toHaveLength(3);
    expect(new Set(body.assignments.map((item: { unit: { id: string } }) => item.unit.id)).size).toBe(3);
    expect(body.pending).toHaveLength(2);
    expect(body.trace.finalCost).toBe(222);
    expect(body.cells[0][0]).toMatchObject({ source: 'OSRM', meters: 2400, priceBs: 86.8 });
  });

  it('rejects invalid emergency coordinates and descriptions', async () => {
    await request(app.getHttpServer())
      .post('/emergencies')
      .send({ description: '', latitude: 300, longitude: -63 })
      .expect(400);
  });

  it('rejects unsupported ambulance statuses', async () => {
    await request(app.getHttpServer()).get('/ambulances?status=UNKNOWN').expect(400);
  });

  it('creates an emergency, optimizes an assignment, and returns a route', async () => {
    const emergency = await request(app.getHttpServer())
      .post('/emergencies')
      .send({ description: 'Accidente de prueba', latitude: -17.78, longitude: -63.17 })
      .expect(201);

    expect(emergency.body.status).toBe('PENDING');

    const solution = await request(app.getHttpServer())
      .post(`/emergencies/${emergency.body.id}/optimize`)
      .expect(201);

    expect(solution.body.totalCost).toBeGreaterThan(0);
    expect(solution.body.assignment).toBeDefined();

    const route = await request(app.getHttpServer())
      .post(`/emergencies/${emergency.body.id}/route`)
      .expect(201);

    expect(route.body.estimatedMinutes).toBeGreaterThan(0);
    expect(route.body.primary).toBeDefined();
  });

  it('reports a clear no-assignment response when no ambulance is available', async () => {
    const response = await request(app.getHttpServer())
      .post('/emergencies')
      .send({ description: 'Accidente sin unidad', latitude: -17.78, longitude: -63.17 })
      .expect(201);

    const result = await request(app.getHttpServer())
      .post(`/emergencies/${response.body.id}/optimize?availability=none`)
      .expect(409);

    expect(result.body.message).toContain('available ambulances');
  });
});
