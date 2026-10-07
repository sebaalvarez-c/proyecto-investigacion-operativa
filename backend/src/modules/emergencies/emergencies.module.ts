import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module.js';
import { RoutesModule } from '../routes/routes.module.js';
import { EmergenciesController } from './emergencies.controller.js';
import { EmergenciesService } from './emergencies.service.js';

@Module({ imports: [DatabaseModule, RoutesModule], controllers: [EmergenciesController], providers: [EmergenciesService] })
export class EmergenciesModule {}
