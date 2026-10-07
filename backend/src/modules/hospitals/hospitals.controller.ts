import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { HospitalRepository } from '../../database/in-memory.repositories.js';

@Controller('hospitals')
export class HospitalsController {
  constructor(private readonly hospitals: HospitalRepository) {}

  @Get()
  list(@Query('emergency') emergency?: string) {
    if (emergency && !['true', 'false'].includes(emergency)) throw new BadRequestException('The emergency filter must be true or false');
    return this.hospitals.list(emergency === 'true');
  }
}
