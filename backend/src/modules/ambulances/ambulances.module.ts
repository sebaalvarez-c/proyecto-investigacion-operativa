import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module.js';
import { AmbulancesController } from './ambulances.controller.js';

@Module({ imports: [DatabaseModule], controllers: [AmbulancesController] })
export class AmbulancesModule {}
