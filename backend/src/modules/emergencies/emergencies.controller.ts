import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CreateEmergencyDto } from './dto/create-emergency.dto.js';
import { EmergenciesService } from './emergencies.service.js';
import { RoutesService } from '../routes/routes.service.js';

@Controller('emergencies')
export class EmergenciesController {
  constructor(private readonly emergencies: EmergenciesService, private readonly routes: RoutesService) {}

  @Post()
  create(@Body() body: CreateEmergencyDto) {
    return this.emergencies.create(body);
  }

  @Post(':id/optimize')
  optimize(@Param('id') id: string, @Query('availability') availability?: string) {
    return this.emergencies.optimize(id, availability === 'none');
  }

  @Post(':id/route')
  route(@Param('id') id: string, @Query('blockage') blockage?: string) {
    return this.routes.createForEmergency(id, blockage === 'true');
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.emergencies.get(id);
  }
}
