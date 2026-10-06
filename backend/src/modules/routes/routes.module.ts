import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module.js';
import { DeterministicRouteProvider } from './route-provider.js';
import { RoutesService } from './routes.service.js';

@Module({
  imports: [DatabaseModule],
  providers: [DeterministicRouteProvider, RoutesService],
  exports: [DeterministicRouteProvider, RoutesService],
})
export class RoutesModule {}
