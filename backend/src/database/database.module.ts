import { Global, Module } from '@nestjs/common';
import { AmbulanceRepository, CommunicationRepository, DispatchEventRepository, EmergencyRepository, HospitalRepository, RouteRepository, TransportSolutionRepository } from './in-memory.repositories.js';
import { InMemoryStore } from './in-memory-store.js';

@Global()
@Module({
  providers: [InMemoryStore, EmergencyRepository, AmbulanceRepository, HospitalRepository, RouteRepository, TransportSolutionRepository, DispatchEventRepository, CommunicationRepository],
  exports: [InMemoryStore, EmergencyRepository, AmbulanceRepository, HospitalRepository, RouteRepository, TransportSolutionRepository, DispatchEventRepository, CommunicationRepository],
})
export class DatabaseModule {}
