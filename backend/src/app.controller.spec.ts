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

    const corsOptions = enableCors.mock.calls[0][0] as { origin: (origin: string, callback: (error: Error | null, allow?: boolean) => void) => void };
    const allowedCallback = vi.fn();
    corsOptions.origin('https://ambulance.example', allowedCallback);
    expect(allowedCallback).toHaveBeenCalledWith(null, true);

    const deniedCallback = vi.fn();
    corsOptions.origin('https://unknown.example', deniedCallback);
    expect(deniedCallback).toHaveBeenCalledWith(expect.any(Error), false);
    if (previous.node === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previous.node;
    if (previous.origins === undefined) delete process.env.CORS_ORIGINS; else process.env.CORS_ORIGINS = previous.origins;
  });
});
