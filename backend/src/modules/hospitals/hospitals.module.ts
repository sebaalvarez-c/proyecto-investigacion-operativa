import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module.js';
import { HospitalsController } from './hospitals.controller.js';

@Module({ imports: [DatabaseModule], controllers: [HospitalsController] })
export class HospitalsModule {}
