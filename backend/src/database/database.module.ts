import { Global, Module } from '@nestjs/common';
import { AmbulanceRepository, EmergencyRepository, HospitalRepository, RouteRepository, TransportSolutionRepository } from './in-memory.repositories.js';
import { InMemoryStore } from './in-memory-store.js';

@Global()
@Module({
  providers: [InMemoryStore, EmergencyRepository, AmbulanceRepository, HospitalRepository, RouteRepository, TransportSolutionRepository],
  exports: [InMemoryStore, EmergencyRepository, AmbulanceRepository, HospitalRepository, RouteRepository, TransportSolutionRepository],
})
export class DatabaseModule {}
