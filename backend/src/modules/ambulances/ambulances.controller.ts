import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { AmbulanceRepository } from '../../database/in-memory.repositories.js';
import type { AmbulanceStatus } from '../../database/in-memory-store.js';

const statuses: AmbulanceStatus[] = ['AVAILABLE', 'DISPATCHED', 'ON_ROUTE', 'ARRIVED', 'UNAVAILABLE'];

@Controller('ambulances')
export class AmbulancesController {
  constructor(private readonly ambulances: AmbulanceRepository) {}

  @Get()
  list(@Query('status') status?: string) {
    if (status && !statuses.includes(status as AmbulanceStatus)) throw new BadRequestException('Unsupported ambulance status');
    return this.ambulances.list(status as AmbulanceStatus | undefined);
  }
}
