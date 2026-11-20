import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service.js';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  health() {
    return {
      status: 'ok',
      service: 'ambulance-transport-api',
      environment: process.env.NODE_ENV ?? 'development',
      database: process.env.DATABASE_MODE ?? 'memory',
      mapProvider: process.env.MAP_PROVIDER ?? 'osrm',
      timestamp: new Date().toISOString(),
    };
  }
}
