import { describe, expect, it, vi } from 'vitest';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { configureApp } from './app.config.js';

describe('AppController', () => {
  it('exposes a health response suitable for deployment checks', () => {
    const controller = new AppController(new AppService());

    expect(controller.health()).toMatchObject({ status: 'ok', service: 'ambulance-transport-api' });
    expect(controller.health().timestamp).toEqual(expect.any(String));
  });

  it('uses an explicit production CORS allowlist', () => {
    const enableCors = vi.fn();
    const previous = { node: process.env.NODE_ENV, origins: process.env.CORS_ORIGINS };
    process.env.NODE_ENV = 'production';
    process.env.CORS_ORIGINS = 'https://ambulance.example,https://www.ambulance.example';

    configureApp({ enableCors, useGlobalPipes: vi.fn() } as never);

    expect(enableCors).toHaveBeenCalledWith(expect.objectContaining({ origin: ['https://ambulance.example', 'https://www.ambulance.example'] }));
    if (previous.node === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previous.node;
    if (previous.origins === undefined) delete process.env.CORS_ORIGINS; else process.env.CORS_ORIGINS = previous.origins;
  });
});
