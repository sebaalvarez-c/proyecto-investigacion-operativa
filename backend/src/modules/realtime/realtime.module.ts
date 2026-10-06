import { Module } from '@nestjs/common';
import { InMemoryRealtimePublisher, AmbulanceSimulationService } from './realtime.service.js';

@Module({ providers: [InMemoryRealtimePublisher, AmbulanceSimulationService], exports: [InMemoryRealtimePublisher, AmbulanceSimulationService] })
export class RealtimeModule {}
