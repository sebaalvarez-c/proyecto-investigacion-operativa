import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { DatabaseModule } from './database/database.module.js';
import { AmbulancesModule } from './modules/ambulances/ambulances.module.js';
import { EmergenciesModule } from './modules/emergencies/emergencies.module.js';
import { HospitalsModule } from './modules/hospitals/hospitals.module.js';
import { RoutesModule } from './modules/routes/routes.module.js';
import { RealtimeModule } from './modules/realtime/realtime.module.js';

@Module({
  imports: [DatabaseModule, AmbulancesModule, HospitalsModule, RoutesModule, EmergenciesModule, RealtimeModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
