import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.config.js';

describe('emergency flow', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
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
